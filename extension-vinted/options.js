import { getSettings, saveSettings, detectChatId, sendTelegramText } from "./lib.js";

const $ = (id) => document.getElementById(id);

function status(id, text, ok = true) {
  $(id).className = ok ? "ok" : "error";
  $(id).textContent = text;
}

function readForm() {
  return {
    telegramToken: $("token").value.trim(),
    telegramChatId: $("chatId").value.trim(),
    domain: $("domain").value,
    intervalMinutes: Number($("interval").value),
    desktopNotifications: $("desktop").checked,
    paused: $("paused").checked,
  };
}

async function load() {
  const s = await getSettings();
  $("token").value = s.telegramToken;
  $("chatId").value = s.telegramChatId;
  $("domain").value = s.domain;
  $("interval").value = String(s.intervalMinutes);
  $("desktop").checked = s.desktopNotifications;
  $("paused").checked = s.paused;
}

async function save() {
  await saveSettings(readForm());
  await chrome.runtime.sendMessage({ type: "reschedule" });
}

$("save").addEventListener("click", async () => {
  await save();
  status("saveStatus", "✓ Enregistré");
});

$("detect").addEventListener("click", async () => {
  const token = $("token").value.trim();
  if (!token) return status("tgStatus", "Colle d'abord le jeton du bot.", false);
  status("tgStatus", "Recherche…");
  try {
    const chat = await detectChatId(token);
    if (!chat) return status("tgStatus", "Aucun message trouvé : envoie /start à ton bot puis réessaie.", false);
    $("chatId").value = chat.id;
    await save();
    status("tgStatus", `✓ Chat détecté${chat.name ? ` (${chat.name})` : ""} et enregistré.`);
  } catch (e) {
    status("tgStatus", `Erreur : ${e.message}`, false);
  }
});

$("test").addEventListener("click", async () => {
  const form = readForm();
  if (!form.telegramToken || !form.telegramChatId) return status("tgStatus", "Jeton et chat ID requis.", false);
  try {
    await sendTelegramText(form, "✅ Chineur Vinted est connecté ! Tu recevras ici les nouvelles annonces.");
    await save();
    status("tgStatus", "✓ Message envoyé, regarde Telegram.");
  } catch (e) {
    status("tgStatus", `Erreur : ${e.message}`, false);
  }
});

load();
