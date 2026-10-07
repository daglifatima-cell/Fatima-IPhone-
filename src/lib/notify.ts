import "server-only";

// Envoi d'e-mails de notification via Resend (https://resend.com).
// Sans RESEND_API_KEY, les notifications sont simplement ignorées.

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function send(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error("Notification e-mail échouée :", res.status, await res.text());
  } catch (err) {
    console.error("Notification e-mail échouée :", err);
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1d1b2f">
  <p style="font-size:18px;font-weight:700;margin:0 0 20px">Aspyre <span style="font-weight:400;color:#6b6880">Studio</span></p>
  <h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>
  <div style="line-height:1.6;color:#4a475e">${body}</div>
  ${cta ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#5b3df5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">${escape(cta.label)}</a></p>` : ""}
</div>`;
}

/** Notification pour toi (l'administratrice). */
export function notifyAdmin(subject: string, message: string, briefId: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL ?? "";
  return send(
    to,
    subject,
    layout(subject, `<p>${escape(message).replace(/\n/g, "<br>")}</p>`, {
      label: "Ouvrir le projet",
      href: `${siteUrl()}/admin/briefs/${briefId}`,
    }),
  );
}

/** Notification pour un client. */
export function notifyClient(to: string, subject: string, message: string) {
  return send(
    to,
    subject,
    layout(subject, `<p>${escape(message).replace(/\n/g, "<br>")}</p>`, {
      label: "Voir mon espace",
      href: `${siteUrl()}/espace/suivi`,
    }),
  );
}
