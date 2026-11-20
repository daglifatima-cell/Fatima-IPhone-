import {
  getSettings,
  getSearches,
  saveSearches,
  runSearch,
  recordFinds,
  sendTelegramItem,
  searchLabel,
} from "./lib.js";

const ALARM = "chineur-check";
const MAX_ALERTS_PER_SEARCH = 10;
let running = false;

async function schedule() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM);
  if (!settings.paused) {
    chrome.alarms.create(ALARM, { periodInMinutes: Math.max(1, Number(settings.intervalMinutes) || 3) });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkAll({ onlyId } = {}) {
  if (running) return { skipped: true };
  running = true;
  let total = 0;
  try {
    const settings = await getSettings();
    const searches = await getSearches();
    for (const search of searches) {
      if (onlyId ? search.id !== onlyId : !search.enabled) continue;
      let updated;
      try {
        const result = await runSearch(search, settings);
        updated = result.updated;
        // Les moins chères d'abord, en limitant le nombre d'alertes par passage.
        const alerts = result.alerts.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, MAX_ALERTS_PER_SEARCH);
        // Au premier passage, on garde les meilleures affaires actuelles dans l'historique (sans alerte).
        await recordFinds(search, alerts.length ? alerts : result.preview);
        for (const item of alerts) {
          await sendTelegramItem(settings, item, search).catch((e) => console.warn("Telegram", e));
          if (settings.desktopNotifications) notify(item, search);
          await sleep(400);
        }
        total += alerts.length;
      } catch (e) {
        updated = { ...search, lastCheck: Date.now(), lastError: String(e.message || e) };
      }
      // Relit la liste pour ne pas écraser une modification faite pendant la vérification.
      const current = await getSearches();
      await saveSearches(current.map((s) => (s.id === updated.id ? { ...s, ...pick(updated) } : s)));
      await sleep(1500 + Math.random() * 1500);
    }
    await chrome.action.setBadgeText({ text: total ? String(total) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#09b1ba" });
  } finally {
    running = false;
  }
  return { total };
}

// Champs mis à jour par la vérification (les réglages de la recherche restent ceux de l'utilisateur).
function pick(s) {
  const { seen, initialized, lastCheck, lastError, lastCount, refMedian, refAt } = s;
  return { seen, initialized, lastCheck, lastError, lastCount, refMedian, refAt };
}

function notify(item, search) {
  // L'URL est stockée dans l'identifiant : le service worker peut être endormi au moment du clic.
  chrome.notifications.create(`${item.url}#${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `${item.price ?? "?"} € · ${item.title}`.slice(0, 90),
    message: searchLabel(search),
    priority: 1,
  });
}

chrome.notifications.onClicked.addListener((id) => {
  const url = id.split("#")[0];
  if (url.startsWith("https://")) chrome.tabs.create({ url });
  chrome.notifications.clear(id);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  await schedule();
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(schedule);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) checkAll();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "check-now") {
    checkAll({ onlyId: msg.searchId }).then(sendResponse, (e) => sendResponse({ error: String(e) }));
    return true;
  }
  if (msg.type === "reschedule") {
    schedule().then(() => sendResponse({ ok: true }));
    return true;
  }
});
