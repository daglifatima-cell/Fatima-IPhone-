import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

// Tous les e-mails de la plateforme (invitations, liens de connexion, alertes)
// partent via Resend (https://resend.com), avec RESEND_API_KEY et EMAIL_FROM.

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Adresses de tes comptes admin (destinataires des alertes et des réponses). */
async function adminEmails(): Promise<string[]> {
  const { data } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
  return (data ?? []).map((p) => p.email);
}

/** Envoie un e-mail ; renvoie null si tout va bien, sinon la raison de l'échec. */
async function send(to: string | string[], subject: string, html: string): Promise<string | null> {
  if (!emailEnabled()) return "Resend n'est pas configuré (RESEND_API_KEY / EMAIL_FROM).";
  if (!to.length) return "Aucun destinataire.";
  // Tolère des guillemets ajoutés par erreur autour de l'expéditeur.
  const from = process.env.EMAIL_FROM!.trim().replace(/^["']|["']$/g, "");
  // Si un client clique sur « Répondre », sa réponse arrive dans ta boîte mail
  // (EMAIL_REPLY_TO, sinon l'e-mail de ton compte admin) : l'adresse
  // d'expédition n'a pas besoin d'être une vraie boîte mail.
  const replyTo = process.env.EMAIL_REPLY_TO ? [process.env.EMAIL_REPLY_TO] : await adminEmails();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo.length && { reply_to: replyTo }) }),
    });
    if (res.ok) return null;
    const body = await res.text();
    console.error("E-mail non envoyé :", res.status, body);
    try {
      return `Resend : ${JSON.parse(body).message ?? body}`;
    } catch {
      return `Resend : erreur ${res.status}`;
    }
  } catch (err) {
    console.error("E-mail non envoyé :", err);
    return "Resend injoignable.";
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const paragraphs = (text: string) => `<p>${escape(text).replace(/\n/g, "<br>")}</p>`;

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }, footer?: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1d1b2f">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px">Aspyre <span style="font-weight:400;color:#6b6880">Studio</span></p>
  <h1 style="font-size:22px;margin:0 0 12px">${escape(title)}</h1>
  <div style="line-height:1.6;color:#4a475e">${bodyHtml}</div>
  ${cta ? `<p style="margin:32px 0"><a href="${cta.href}" style="background:#5b3df5;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;display:inline-block">${escape(cta.label)}</a></p>` : ""}
  ${footer ? `<p style="font-size:13px;color:#6b6880;line-height:1.6">${escape(footer)}</p>` : ""}
</div>`;
}

/** Invitation d'un nouveau client (lien personnel vers son espace). */
export function sendInvitationEmail(to: string, link: string, firstName?: string) {
  return send(
    to,
    "Votre espace client Aspyre Studio est prêt ✨",
    layout(
      firstName ? `Bienvenue ${firstName} !` : "Bienvenue dans votre espace client",
      paragraphs(
        "Pour créer votre site internet, j'ai besoin de mieux connaître votre projet. J'ai préparé pour vous un espace en ligne : vous pouvez y remplir votre questionnaire à votre rythme (tout est enregistré automatiquement), y déposer votre logo, vos photos et vos textes, et suivre l'avancement de votre site.",
      ),
      { label: "Accéder à mon espace", href: link },
      "Ce lien est personnel et valable 1 h. Passé ce délai, rendez-vous sur la page de connexion de votre espace et demandez un nouveau lien avec votre adresse e-mail.",
    ),
  );
}

/** Lien de connexion (sans mot de passe). */
export function sendLoginEmail(to: string, link: string) {
  return send(
    to,
    "Votre lien de connexion Aspyre Studio",
    layout(
      "Votre lien de connexion",
      paragraphs("Cliquez ci-dessous pour retrouver votre espace."),
      { label: "Me connecter", href: link },
      "Ce lien est valable 1 h. Vous n'avez pas demandé ce lien ? Ignorez simplement cet e-mail.",
    ),
  );
}

/** Alerte pour toi : à ADMIN_NOTIFICATION_EMAIL, sinon à tous les comptes admin. */
export async function notifyAdmin(subject: string, message: string, briefId: string) {
  if (!emailEnabled()) return;
  let to: string[] = process.env.ADMIN_NOTIFICATION_EMAIL ? [process.env.ADMIN_NOTIFICATION_EMAIL] : [];
  if (!to.length) to = await adminEmails();
  const site = await getSiteUrl();
  await send(to, subject, layout(subject, paragraphs(message), { label: "Ouvrir le projet", href: `${site}/admin/briefs/${briefId}` }));
}

/** Notification pour un client. */
export async function notifyClient(to: string, subject: string, message: string) {
  if (!emailEnabled()) return;
  const site = await getSiteUrl();
  await send(to, subject, layout(subject, paragraphs(message), { label: "Voir mon espace", href: `${site}/espace/suivi` }));
}
