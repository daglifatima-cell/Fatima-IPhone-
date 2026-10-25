#!/usr/bin/env node
// Lecture et publication sur le WordPress d'aspyre.fr via l'API REST (aucune dépendance).
//
// Variables d'environnement :
//   WP_URL           adresse du site, ex. https://aspyre.fr
//   WP_USER          identifiant WordPress
//   WP_APP_PASSWORD  mot de passe d'application (Profil → Mots de passe d'application)
//
// Commandes (résultat en JSON) :
//   check                       vérifie la connexion et le plugin « Aspyre SEO Agents »
//   posts                       tous les articles (id, titre, slug, lien, dates, statut)
//   pages                       toutes les pages (Elementor compris), sans leur contenu
//   get <id>                    un article avec son contenu HTML et ses métadonnées SEO
//   create <fichier.json>       crée un article
//   update <id> <fichier.json>  modifie un article (seuls les champs fournis changent)
//
// Format du fichier JSON :
//   { "title", "slug", "content" (HTML), "excerpt", "status" ("publish" | "draft"),
//     "categories": ["Nom de catégorie"], "meta_title", "meta_description", "focus_keyword" }

import { readFile } from "node:fs/promises";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const base = process.env.WP_URL?.replace(/\/$/, "");
if (!base) fail("WP_URL n'est pas défini (voir seo/README.md).");
const user = process.env.WP_USER;
const password = process.env.WP_APP_PASSWORD?.replace(/\s+/g, "");
if (!user || !password) fail("WP_USER et WP_APP_PASSWORD doivent être définis.");
const auth = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

async function api(method, path, body) {
  const res = await fetch(`${base}/wp-json/wp/v2${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`réponse inattendue de WordPress (${res.status}) : ${text.slice(0, 300)}`);
  }
  if (!res.ok) fail(`WordPress ${res.status} : ${json.message ?? text.slice(0, 300)}`);
  return { json, total: Number(res.headers.get("x-wp-totalpages") ?? 1) };
}

async function all(path) {
  const items = [];
  for (let page = 1; ; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const { json, total } = await api("GET", `${path}${sep}per_page=100&page=${page}`);
    items.push(...json);
    if (page >= total) return items;
  }
}

// Les clés des deux extensions SEO les plus courantes : WordPress ignore celles qui
// ne sont pas déclarées, et le plugin Aspyre SEO Agents déclare celles de l'extension installée.
function seoMeta({ meta_title, meta_description, focus_keyword }) {
  const meta = {};
  if (meta_title !== undefined) Object.assign(meta, { _yoast_wpseo_title: meta_title, rank_math_title: meta_title });
  if (meta_description !== undefined) Object.assign(meta, { _yoast_wpseo_metadesc: meta_description, rank_math_description: meta_description });
  if (focus_keyword !== undefined) Object.assign(meta, { _yoast_wpseo_focuskw: focus_keyword, rank_math_focus_keyword: focus_keyword });
  return meta;
}

async function categoryIds(names) {
  const existing = await all("/categories?_fields=id,name");
  const ids = [];
  for (const name of names) {
    const found = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
    ids.push(found ? found.id : (await api("POST", "/categories", { name })).json.id);
  }
  return ids;
}

async function toPayload(input) {
  const payload = {};
  for (const key of ["title", "slug", "content", "excerpt", "status"]) {
    if (input[key] !== undefined) payload[key] = input[key];
  }
  if (input.categories) payload.categories = await categoryIds(input.categories);
  const meta = seoMeta(input);
  if (Object.keys(meta).length) payload.meta = meta;
  return payload;
}

const summary = (p) => ({
  id: p.id,
  title: p.title?.rendered ?? p.title,
  slug: p.slug,
  link: p.link,
  status: p.status,
  date: p.date,
  modified: p.modified,
});

const print = (data) => console.log(JSON.stringify(data, null, 2));

async function readInput(file) {
  if (!file) fail("indique le fichier JSON de l'article.");
  return JSON.parse(await readFile(file, "utf8"));
}

const commands = {
  async check() {
    const { json: me } = await api("GET", "/users/me?context=edit&_fields=id,name,roles,capabilities");
    const { json: types } = await api("GET", "/types/post?context=edit");
    const res = await fetch(`${base}/wp-json/aspyre-seo/v1/status`, { headers: { Authorization: auth } });
    print({
      connected: true,
      user: me.name,
      roles: me.roles,
      canPublish: Boolean(me.capabilities?.publish_posts),
      seoPlugin: res.ok ? await res.json() : "plugin « Aspyre SEO Agents » non installé : les métadonnées SEO ne seront pas enregistrées",
      postType: types.name,
    });
  },

  async posts() {
    const posts = await all("/posts?status=publish,draft,future&context=edit&_fields=id,title,slug,link,status,date,modified");
    print(posts.map((p) => ({ ...summary(p), title: p.title.raw ?? p.title.rendered })));
  },

  async pages() {
    const pages = await all("/pages?status=publish&_fields=id,title,slug,link,status,date,modified");
    print(pages.map(summary));
  },

  async get() {
    const id = process.argv[3];
    if (!id) fail("usage : wp.mjs get <id>");
    const { json: p } = await api("GET", `/posts/${id}?context=edit`);
    print({
      ...summary(p),
      title: p.title.raw,
      excerpt: p.excerpt.raw,
      content: p.content.raw,
      categories: p.categories,
      meta: p.meta,
    });
  },

  async create() {
    const input = await readInput(process.argv[3]);
    if (!input.title || !input.content) fail("le fichier doit contenir au moins title et content.");
    const payload = await toPayload({ status: "publish", ...input });
    const { json } = await api("POST", "/posts", payload);
    print(summary(json));
  },

  async update() {
    const id = process.argv[3];
    if (!id) fail("usage : wp.mjs update <id> <fichier.json>");
    const payload = await toPayload(await readInput(process.argv[4]));
    const { json } = await api("POST", `/posts/${id}`, payload);
    print(summary(json));
  },
};

const command = commands[process.argv[2]];
if (!command) fail(`commande inconnue. Disponibles : ${Object.keys(commands).join(", ")}`);
await command();
