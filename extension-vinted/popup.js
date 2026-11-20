import { CONDITIONS, getSettings, getSearches, saveSearches, getFinds, newSearch, searchLabel } from "./lib.js";

const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

function ago(ts) {
  if (!ts) return "jamais";
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
}

const euro = (n) => (n == null ? "?" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n));

// ---------- Formulaire ----------

for (const c of CONDITIONS) {
  $("conditions").append(
    el("label", { class: "chip" }, el("input", { type: "checkbox", value: c.id }), c.label),
  );
}

const num = (v) => (v === "" || v == null ? null : Math.max(0, Number(v)));

$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const keyword = $("keyword").value.trim();
  const brand = $("brand").value.trim();
  const priceMin = num($("priceMin").value);
  const priceMax = num($("priceMax").value);
  if (!keyword && !brand) return ($("formError").textContent = "Indique au moins un mot-clé ou une marque.");
  if (priceMin != null && priceMax != null && priceMin > priceMax)
    return ($("formError").textContent = "Le prix min dépasse le prix max.");
  $("formError").textContent = "";

  const search = newSearch({
    keyword,
    brand,
    priceMin,
    priceMax,
    conditions: [...$("conditions").querySelectorAll("input:checked")].map((i) => Number(i.value)),
    dealsOnly: $("dealsOnly").checked,
    dealThreshold: Math.min(90, Math.max(5, Number($("dealThreshold").value) || 30)),
  });
  await saveSearches([search, ...(await getSearches())]);
  e.target.reset();
  $("addBox").open = false;
  await render();
  // Premier passage : mémorise les annonces déjà en ligne pour n'alerter que sur les nouvelles.
  chrome.runtime.sendMessage({ type: "check-now", searchId: search.id }).then(render);
});

// ---------- Listes ----------

async function updateSearch(id, patch) {
  const searches = await getSearches();
  await saveSearches(searches.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  await render();
}

function searchCard(s) {
  const status = s.lastError
    ? el("div", { class: "error" }, s.lastError)
    : el(
        "div",
        { class: "muted" },
        !s.initialized
          ? "Initialisation en cours…"
          : `${s.lastCount} annonce(s) correspondante(s) · vérifié ${ago(s.lastCheck)}`,
      );
  const tags = [
    s.dealsOnly ? `🔥 bonnes affaires (−${s.dealThreshold} %)` : null,
    s.conditions?.length ? CONDITIONS.filter((c) => s.conditions.includes(c.id)).map((c) => c.label).join(", ") : null,
  ].filter(Boolean);
  return el(
    "div",
    { class: "card" },
    el(
      "div",
      { class: "row" },
      el(
        "label",
        { class: "switch", title: s.enabled ? "Désactiver" : "Activer" },
        el("input", {
          type: "checkbox",
          checked: s.enabled,
          onchange: (e) => updateSearch(s.id, { enabled: e.target.checked }),
        }),
        el("span"),
      ),
      el("div", { class: "grow search-title", title: searchLabel(s) }, searchLabel(s)),
      el(
        "button",
        {
          class: "link",
          title: "Supprimer",
          onclick: async () => {
            if (!confirm(`Supprimer « ${searchLabel(s)} » ?`)) return;
            await saveSearches((await getSearches()).filter((x) => x.id !== s.id));
            await render();
          },
        },
        "✕",
      ),
    ),
    tags.length ? el("div", { class: "muted" }, tags.join(" · ")) : null,
    status,
  );
}

function findRow(f) {
  return el(
    "a",
    { class: "find", href: f.url, target: "_blank", rel: "noopener" },
    el("img", { src: f.photo || "icons/icon48.png", alt: "" }),
    el(
      "div",
      { class: "grow" },
      el("div", { class: "t", title: f.title }, f.title),
      el(
        "div",
        { class: "row" },
        el("span", { class: "price" }, euro(f.price)),
        f.discount >= 15 ? el("span", { class: "badge" }, `−${f.discount} %`) : null,
        el("span", { class: "muted grow", style: "text-align:right" }, ago(f.foundAt)),
      ),
      el("div", { class: "muted t" }, [f.brand, f.size, f.condition].filter(Boolean).join(" · ")),
    ),
  );
}

async function render() {
  const [settings, searches, finds] = await Promise.all([getSettings(), getSearches(), getFinds()]);
  $("telegramWarn").hidden = Boolean(settings.telegramToken && settings.telegramChatId);

  $("searches").replaceChildren(
    ...(searches.length
      ? searches.map(searchCard)
      : [el("div", { class: "muted" }, "Aucune recherche. Ajoute ta première avec « Nouvelle recherche ».")]),
  );
  if (!searches.length) $("addBox").open = true;

  $("finds").replaceChildren(
    ...(finds.length
      ? finds.slice(0, 20).map(findRow)
      : [el("div", { class: "muted" }, "Les nouvelles annonces repérées s'afficheront ici.")]),
  );
}

$("checkNow").addEventListener("click", async (e) => {
  e.target.disabled = true;
  e.target.textContent = "…";
  await chrome.runtime.sendMessage({ type: "check-now" });
  e.target.disabled = false;
  e.target.textContent = "↻ Vérifier";
  await chrome.action.setBadgeText({ text: "" });
  render();
});

const openOptions = (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};
$("openOptions").addEventListener("click", openOptions);
$("setupLink").addEventListener("click", openOptions);

chrome.storage.onChanged.addListener(render);
chrome.action.setBadgeText({ text: "" });
render();
