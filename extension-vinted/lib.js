// Fonctions partagées : stockage, appel Vinted, filtrage, score « bonne affaire », Telegram.

export const CONDITIONS = [
  { id: 6, label: "Neuf avec étiquette" },
  { id: 1, label: "Neuf sans étiquette" },
  { id: 2, label: "Très bon état" },
  { id: 3, label: "Bon état" },
  { id: 4, label: "Satisfaisant" },
];

export const DEFAULT_SETTINGS = {
  domain: "www.vinted.fr",
  intervalMinutes: 3,
  telegramToken: "",
  telegramChatId: "",
  desktopNotifications: true,
  paused: false,
};

const SEEN_LIMIT = 600;
const FINDS_LIMIT = 60;

// ---------- Stockage ----------

export async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export async function saveSettings(patch) {
  const settings = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings });
  return settings;
}

export async function getSearches() {
  const { searches } = await chrome.storage.local.get("searches");
  return searches || [];
}

export async function saveSearches(searches) {
  await chrome.storage.local.set({ searches });
}

export async function getFinds() {
  const { finds } = await chrome.storage.local.get("finds");
  return finds || [];
}

export function newSearch(fields) {
  return {
    id: crypto.randomUUID(),
    keyword: "",
    brand: "",
    priceMin: null,
    priceMax: null,
    conditions: [],
    dealsOnly: false,
    dealThreshold: 30, // % sous la médiane pour être une « bonne affaire »
    enabled: true,
    seen: [],
    initialized: false,
    lastCheck: null,
    lastError: null,
    lastCount: 0,
    ...fields,
  };
}

export function searchLabel(s) {
  const parts = [s.keyword, s.brand && `marque ${s.brand}`].filter(Boolean);
  let label = parts.join(" · ") || "Toutes annonces";
  if (s.priceMax != null) label += ` · ≤ ${s.priceMax} €`;
  return label;
}

// ---------- Vinted ----------

// Depuis septembre 2026, la recherche Vinted passe par api.vinted.<pays>/svc-catalogue/items,
// avec le jeton de session anonyme (cookie « access_token_web ») en en-tête Authorization.
const apiHost = (domain) => domain.replace(/^www\./, "api.");

function buildParams(domain, s) {
  const params = new URLSearchParams();
  // Évite « vans vans » quand le mot-clé contient déjà la marque.
  const brandInKeyword = s.brand && (s.keyword || "").toLowerCase().includes(s.brand.toLowerCase());
  const text = [s.keyword, brandInKeyword ? "" : s.brand].filter(Boolean).join(" ").trim();
  if (text) params.set("search_text", text);
  // Les filtres vides font répondre 400 à Vinted : on ne les envoie que s'ils sont remplis.
  if (s.priceMin != null) params.set("price_from", String(s.priceMin));
  if (s.priceMax != null) params.set("price_to", String(s.priceMax));
  params.set("currency", domain.endsWith("co.uk") ? "GBP" : "EUR");
  params.set("order", "newest_first");
  params.set("per_page", "60");
  params.set("page", "1");
  if (s.conditions?.length) params.set("attribute_ids[status]", s.conditions.join(","));
  return params;
}

async function cookie(domain, name) {
  const c = await chrome.cookies.get({ url: `https://${domain}/`, name }).catch(() => null);
  return c?.value || "";
}

// Visite la page d'accueil (sans ouvrir d'onglet) pour que Vinted donne un jeton de session.
async function refreshSession(domain) {
  await fetch(`https://${domain}/`, { credentials: "include", cache: "no-store" }).catch(() => {});
}

// Vinted vérifie que la requête vient de son site : on règle Origin/Referer pour les requêtes de l'extension.
async function ensureHeaderRule(domain) {
  const rule = {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "Origin", operation: "set", value: `https://${domain}` },
        { header: "Referer", operation: "set", value: `https://${domain}/catalog` },
      ],
    },
    condition: {
      requestDomains: [apiHost(domain)],
      initiatorDomains: [chrome.runtime.id],
      resourceTypes: ["xmlhttprequest", "other"],
    },
  };
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1], addRules: [rule] }).catch((e) => console.warn(e));
}

async function callCatalogue(domain, params) {
  const token = await cookie(domain, "access_token_web");
  const anonId = await cookie(domain, "anon_id");
  const headers = { Accept: "application/json, text/plain, */*", "Accept-Language": "fr-FR,fr;q=0.9" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (anonId) headers["X-Anon-Id"] = anonId;
  return fetch(`https://${apiHost(domain)}/svc-catalogue/items?${params}`, { credentials: "include", headers });
}

export async function fetchItems(domain, s) {
  await ensureHeaderRule(domain);
  const params = buildParams(domain, s);
  if (!(await cookie(domain, "access_token_web"))) await refreshSession(domain);
  let res = await callCatalogue(domain, params);
  if (res.status === 401 || res.status === 403) {
    await refreshSession(domain);
    res = await callCatalogue(domain, params);
  }
  if (res.status === 429) throw new Error("Vinted limite les requêtes (429) : augmente l'intervalle dans les réglages.");
  if (res.status === 401 || res.status === 403)
    throw new Error(`Vinted refuse l'accès (${res.status}). Ouvre ${domain} dans un onglet, puis clique sur ↻ Vérifier.`);
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 120);
    throw new Error(`Vinted a répondu ${res.status}${detail ? ` : ${detail}` : ""}`);
  }
  const data = await res.json();
  return (data.items || []).map((it) => normalizeItem(domain, it));
}

function toNumber(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") return toNumber(v.amount);
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeItem(domain, it) {
  const price = toNumber(it.price);
  const total = toNumber(it.total_item_price) ?? price;
  const currency = it.price?.currency_code || it.currency || "EUR";
  // Nouvelle API : marque, taille et état sont parfois seulement dans item_box
  // (first_line = marque, second_line = « taille · état » ou « état »).
  const box = it.item_box || {};
  const brand = it.brand_title || (box.first_line && box.first_line !== it.title ? box.first_line : "");
  const parts = (box.second_line || "").split(" · ").filter(Boolean);
  const size = it.size_title || (parts.length > 1 ? parts[0] : "");
  const condition = (typeof it.status === "string" && it.status) || (parts.length ? parts[parts.length - 1] : "");
  return {
    id: it.id,
    title: it.title || "",
    brand,
    size,
    condition,
    price,
    total,
    currency,
    photo: it.photo?.url || it.photo?.full_size_url || (it.photos && it.photos[0]?.url) || "",
    url: it.url?.startsWith("http") ? it.url : `https://${domain}${it.url || `/items/${it.id}`}`,
    favourites: it.favourite_count ?? 0,
    seller: it.user?.login || "",
  };
}

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, ""); // « Levi's » = « Levis » = « LEVI'S »
}

function matchesBrand(item, s) {
  if (!s.brand) return true;
  const wanted = normalize(s.brand);
  return normalize(item.brand).includes(wanted) || normalize(item.title).includes(wanted);
}

export function matchesFilters(item, s) {
  if (!matchesBrand(item, s)) return false;
  if (s.priceMax != null && item.price != null && item.price > s.priceMax) return false;
  if (s.priceMin != null && item.price != null && item.price < s.priceMin) return false;
  return true;
}

function median(values) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const REFERENCE_TTL = 6 * 60 * 60 * 1000;

// Prix de référence du marché : médiane des annonces similaires SANS limite de prix,
// recalculée toutes les 6 h (sinon la médiane ne porterait que sur les annonces déjà sous le prix max).
async function referencePrice(domain, s) {
  if (s.refMedian && s.refAt && Date.now() - s.refAt < REFERENCE_TTL) return s.refMedian;
  const items = await fetchItems(domain, { ...s, priceMin: null, priceMax: null });
  const med = median(items.filter((i) => matchesBrand(i, s)).map((i) => i.price));
  if (med) {
    s.refMedian = med;
    s.refAt = Date.now();
  }
  return med;
}

// Compare chaque annonce au prix médian du marché.
export function scoreItems(items, reference) {
  const med = reference || median(items.map((i) => i.price));
  return items.map((i) => {
    const discount = med && i.price != null ? Math.round((1 - i.price / med) * 100) : 0;
    return { ...i, median: med, discount };
  });
}

// ---------- Vérification d'une recherche ----------

export async function runSearch(search, settings) {
  search = { ...search };
  const items = (await fetchItems(settings.domain, search)).filter((i) => matchesFilters(i, search));
  const reference = await referencePrice(settings.domain, search).catch(() => null);
  const scored = scoreItems(items, reference);
  const seen = new Set(search.seen);
  const fresh = scored.filter((i) => !seen.has(i.id));
  // Première vérification : on mémorise l'existant sans alerter (évite 60 alertes d'un coup).
  const alerts = !search.initialized
    ? []
    : fresh.filter((i) => !search.dealsOnly || i.discount >= search.dealThreshold);
  const seenIds = [...fresh.map((i) => i.id), ...search.seen].slice(0, SEEN_LIMIT);
  const preview = search.initialized
    ? []
    : scored.filter((i) => i.discount > 0).sort((a, b) => b.discount - a.discount).slice(0, 5);
  return {
    alerts,
    preview,
    updated: {
      ...search,
      seen: seenIds,
      initialized: true,
      lastCheck: Date.now(),
      lastError: null,
      lastCount: items.length,
      refMedian: search.refMedian ?? null,
      refAt: search.refAt ?? null,
    },
  };
}

export async function recordFinds(search, items) {
  if (!items.length) return;
  const finds = await getFinds();
  const added = items.map((i) => ({ ...i, searchId: search.id, searchLabel: searchLabel(search), foundAt: Date.now() }));
  await chrome.storage.local.set({ finds: [...added, ...finds].slice(0, FINDS_LIMIT) });
}

// ---------- Telegram ----------

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatPrice(n, currency) {
  if (n == null) return "?";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(n);
}

export function itemCaption(item, search) {
  const lines = [
    `🛍️ <b>${escapeHtml(item.title)}</b>`,
    `💶 <b>${formatPrice(item.price, item.currency)}</b>` +
      (item.total && item.total !== item.price ? ` (${formatPrice(item.total, item.currency)} avec protection)` : ""),
  ];
  if (item.discount >= 15) lines.push(`🔥 ${item.discount} % sous le prix médian (${formatPrice(item.median, item.currency)})`);
  const details = [item.brand, item.size, item.condition].filter(Boolean).join(" · ");
  if (details) lines.push(`🏷️ ${escapeHtml(details)}`);
  lines.push(`🔎 ${escapeHtml(searchLabel(search))}`);
  return lines.join("\n");
}

async function telegram(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.description || `Telegram a répondu ${res.status}`);
  return data.result;
}

export async function sendTelegramItem(settings, item, search) {
  const { telegramToken: token, telegramChatId: chat_id } = settings;
  if (!token || !chat_id) return;
  const caption = itemCaption(item, search);
  const reply_markup = { inline_keyboard: [[{ text: "Voir l'annonce", url: item.url }]] };
  try {
    if (!item.photo) throw new Error("pas de photo");
    await telegram(token, "sendPhoto", { chat_id, photo: item.photo, caption, parse_mode: "HTML", reply_markup });
  } catch {
    await telegram(token, "sendMessage", { chat_id, text: caption, parse_mode: "HTML", reply_markup });
  }
}

export async function sendTelegramText(settings, text) {
  return telegram(settings.telegramToken, "sendMessage", { chat_id: settings.telegramChatId, text });
}

// Récupère le chat ID de la dernière personne ayant écrit au bot.
export async function detectChatId(token) {
  const updates = await telegram(token, "getUpdates", {});
  for (let i = updates.length - 1; i >= 0; i--) {
    const chat = updates[i].message?.chat || updates[i].my_chat_member?.chat;
    if (chat) return { id: String(chat.id), name: chat.first_name || chat.title || chat.username || "" };
  }
  return null;
}
