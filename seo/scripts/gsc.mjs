#!/usr/bin/env node
// Accès à Google Search Console via un compte de service (aucune dépendance).
//
// Variables d'environnement :
//   GSC_SERVICE_ACCOUNT_JSON  contenu de la clé JSON du compte de service (brut ou en base64)
//   GSC_SITE_URL              propriété Search Console, ex. "sc-domain:aspyre.fr" ou "https://aspyre.fr/"
//
// Commandes (résultat en JSON sur la sortie standard) :
//   sites                          propriétés accessibles (pour vérifier la connexion)
//   queries [--days 28]            recherches × pages : clics, impressions, CTR, position
//   opportunities [--days 28]      recherches en position 4 à 30 avec des impressions, les plus prometteuses d'abord
//   pages [--days 28]              pages, comparées à la période précédente de même durée
//   inspect <url>                  état d'indexation d'une URL
//   sitemaps                       sitemaps envoyés et leur état
//   submit-sitemap <url>           envoie (ou renvoie) un sitemap
//   snapshot                       met à jour seo/data/history.json et seo/data/latest.json (tableau de bord)

import { createSign } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const API = "https://searchconsole.googleapis.com";
// Les données Search Console arrivent avec 2 à 3 jours de retard.
const LAG_DAYS = 3;

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

function credentials() {
  // Le README fait coller la clé entre apostrophes : on les retire si elles sont restées.
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim().replace(/^'([\s\S]*)'$/, "$1").trim();
  if (!raw) fail("GSC_SERVICE_ACCOUNT_JSON n'est pas défini (voir seo/README.md).");
  const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  try {
    const json = JSON.parse(text);
    return { email: json.client_email, key: json.private_key };
  } catch {
    fail("GSC_SERVICE_ACCOUNT_JSON n'est pas un JSON valide.");
  }
}

function siteUrl() {
  const site = process.env.GSC_SITE_URL?.trim();
  if (!site) fail("GSC_SITE_URL n'est pas défini (ex. sc-domain:aspyre.fr).");
  return site;
}

const b64url = (input) => Buffer.from(input).toString("base64url");

async function accessToken() {
  const { email, key } = credentials();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  const json = await res.json();
  if (!res.ok) fail(`connexion Google refusée : ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

let token;
async function api(method, path, body) {
  token ??= await accessToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) fail(`Search Console ${res.status} : ${json.error?.message ?? text}`);
  return json;
}

const sitePath = () => `/webmasters/v3/sites/${encodeURIComponent(siteUrl())}`;

const isoDay = (d) => d.toISOString().slice(0, 10);
function period(days, offsetDays = 0) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - LAG_DAYS - offsetDays);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: isoDay(start), endDate: isoDay(end) };
}

async function searchAnalytics(dimensions, range, rowLimit = 5000) {
  const json = await api("POST", `${sitePath()}/searchAnalytics/query`, { ...range, dimensions, rowLimit });
  return (json.rows ?? []).map((r) => ({
    ...Object.fromEntries(dimensions.map((d, i) => [d, r.keys[i]])),
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Math.round(r.ctr * 1000) / 10,
    position: Math.round(r.position * 10) / 10,
  }));
}

function argValue(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const print = (data) => console.log(JSON.stringify(data, null, 2));

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const commands = {
  async sites() {
    print(await api("GET", "/webmasters/v3/sites"));
  },

  async queries() {
    const range = period(Number(argValue("days", 28)));
    print({ ...range, rows: await searchAnalytics(["query", "page"], range) });
  },

  async opportunities() {
    const range = period(Number(argValue("days", 28)));
    const rows = await searchAnalytics(["query", "page"], range);
    const picks = rows
      .filter((r) => r.position >= 4 && r.position <= 30 && r.impressions >= 5)
      // Beaucoup d'impressions et une position proche de la 1re page = gain le plus probable.
      .map((r) => ({ ...r, score: Math.round((r.impressions / Math.max(r.position - 2, 1)) * 10) / 10 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
    print({ ...range, rows: picks });
  },

  async pages() {
    const days = Number(argValue("days", 28));
    const current = period(days);
    const previous = period(days, days);
    const [now, before] = await Promise.all([
      searchAnalytics(["page"], current),
      searchAnalytics(["page"], previous),
    ]);
    const prev = new Map(before.map((r) => [r.page, r]));
    const rows = now.map((r) => {
      const p = prev.get(r.page);
      return {
        ...r,
        clicksBefore: p?.clicks ?? 0,
        impressionsBefore: p?.impressions ?? 0,
        positionBefore: p?.position ?? null,
      };
    });
    for (const [page, p] of prev) {
      if (!rows.some((r) => r.page === page)) rows.push({ page, clicks: 0, impressions: 0, ctr: 0, position: null, clicksBefore: p.clicks, impressionsBefore: p.impressions, positionBefore: p.position });
    }
    print({ current, previous, rows });
  },

  async inspect() {
    const url = process.argv[3];
    if (!url) fail("usage : gsc.mjs inspect <url>");
    const json = await api("POST", "/v1/urlInspection/index:inspect", {
      inspectionUrl: url,
      siteUrl: siteUrl(),
      languageCode: "fr-FR",
    });
    print(json.inspectionResult);
  },

  async sitemaps() {
    print(await api("GET", `${sitePath()}/sitemaps`));
  },

  async "submit-sitemap"() {
    const url = process.argv[3];
    if (!url) fail("usage : gsc.mjs submit-sitemap <url>");
    await api("PUT", `${sitePath()}/sitemaps/${encodeURIComponent(url)}`);
    print({ submitted: url });
  },

  async snapshot() {
    const range = period(90);
    const last28 = period(28);
    const [daily, topQueries, topPages] = await Promise.all([
      searchAnalytics(["date"], range),
      searchAnalytics(["query"], last28, 25),
      searchAnalytics(["page"], last28, 25),
    ]);

    await mkdir(DATA_DIR, { recursive: true });
    const historyFile = join(DATA_DIR, "history.json");
    const history = await readJson(historyFile, []);
    const byDate = new Map(history.map((d) => [d.date, d]));
    for (const r of daily) {
      byDate.set(r.date, { date: r.date, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
    }
    const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    await writeFile(historyFile, JSON.stringify(merged, null, 2) + "\n");
    await writeFile(
      join(DATA_DIR, "latest.json"),
      JSON.stringify({ updatedAt: isoDay(new Date()), ...last28, topQueries, topPages }, null, 2) + "\n",
    );
    print({ days: merged.length, lastDate: merged.at(-1)?.date ?? null });
  },
};

const command = commands[process.argv[2]];
if (!command) fail(`commande inconnue. Disponibles : ${Object.keys(commands).join(", ")}`);
await command();
