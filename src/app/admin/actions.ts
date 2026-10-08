"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { createInviteLink, createLoginLink } from "@/lib/auth-links";
import { emailEnabled, notifyClient, sendInvitationEmail } from "@/lib/notify";
import { getSiteUrl } from "@/lib/site-url";
import { PROJECT_STEPS } from "@/lib/project";

export type InviteState = { status: "idle" | "ok" | "error"; message?: string };

export async function inviteClient(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Adresse e-mail invalide." };

  const meta = { full_name: fullName || null, company: company || null };
  const admin = createAdminClient();
  const exists = (msg: string) => /already|registered|exists/i.test(msg);

  // La fiche client est créée ici, sans dépendre du déclencheur SQL.
  async function ensureProfile(id: string) {
    const { data } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
    if (data) return false;
    const { error } = await admin.from("profiles").insert({ id, email, full_name: meta.full_name, company: meta.company, role: "client" });
    if (error) throw new Error(error.message);
    return true;
  }

  if (emailEnabled()) {
    let link: string | undefined;
    const invite = await createInviteLink(email, meta);
    if (invite.link && invite.userId) {
      await ensureProfile(invite.userId);
      link = invite.link;
    } else if (exists(invite.error ?? "")) {
      // Compte déjà créé (par exemple lors d'une invitation dont l'e-mail n'est pas parti).
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = data?.users.find((u) => u.email?.toLowerCase() === email);
      if (!user) return { status: "error", message: `L'invitation a échoué : ${invite.error}` };
      const created = await ensureProfile(user.id);
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if (!created && profile?.role === "admin") return { status: "error", message: "Cette adresse est celle d'un compte administrateur." };
      const login = await createLoginLink(email);
      if (!login.link) return { status: "error", message: `L'invitation a échoué : ${login.error}` };
      link = login.link;
    } else {
      return { status: "error", message: `L'invitation a échoué : ${invite.error}` };
    }

    revalidatePath("/admin");
    const failure = await sendInvitationEmail(email, link, fullName.split(" ")[0] || undefined);
    if (failure) {
      return {
        status: "error",
        message: `Compte créé, mais l'e-mail n'a pas pu partir (${failure}). En attendant, envoyez ce lien au client vous-même (valable 1 h) : ${link}`,
      };
    }
  } else {
    // Sans Resend : e-mail d'invitation par défaut de Supabase (limité).
    const site = await getSiteUrl();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo: `${site}/auth/callback` });
    if (error) {
      return {
        status: "error",
        message: exists(error.message)
          ? "Ce client a déjà un compte : il peut se connecter depuis la page Connexion avec son e-mail."
          : `L'invitation a échoué : ${error.message}`,
      };
    }
    if (data.user) await ensureProfile(data.user.id);
  }

  revalidatePath("/admin");
  return { status: "ok", message: `Invitation envoyée à ${email}.` };
}

const STATUSES = ["brouillon", "envoye", "en_cours", "termine"];

export async function updateBriefStatus(briefId: string, status: string) {
  if (!STATUSES.includes(status)) throw new Error("Statut inconnu");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("briefs").update({ status }).eq("id", briefId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/briefs/${briefId}`);
  revalidatePath("/admin");
}

export async function saveBriefNotes(briefId: string, notes: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("brief_notes")
    .upsert({ brief_id: briefId, notes, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Suivi de projet, accès et messages
// ---------------------------------------------------------------------

async function clientOfBrief(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], briefId: string) {
  const { data } = await supabase
    .from("briefs")
    .select("project_step, maquette_url, client:profiles(email)")
    .eq("id", briefId)
    .single<{ project_step: number; maquette_url: string | null; client: { email: string } }>();
  return data;
}

export async function updateProject(briefId: string, input: { project_step: number; maquette_url: string }) {
  const { supabase } = await requireAdmin();
  const step = Math.max(0, Math.min(PROJECT_STEPS.length - 1, Math.round(input.project_step)));
  const url = input.maquette_url.trim();
  if (url && !/^https?:\/\//.test(url)) throw new Error("Le lien de maquette doit commencer par https://");

  const before = await clientOfBrief(supabase, briefId);
  const { error } = await supabase
    .from("briefs")
    .update({ project_step: step, maquette_url: url || null })
    .eq("id", briefId);
  if (error) throw new Error(error.message);

  if (before?.client.email) {
    if (step !== before.project_step) {
      await notifyClient(
        before.client.email,
        `Votre projet avance : ${PROJECT_STEPS[step].title}`,
        `Bonne nouvelle ! Votre projet passe à l'étape « ${PROJECT_STEPS[step].title} ».\n${PROJECT_STEPS[step].text}`,
      );
    } else if (url && url !== before.maquette_url) {
      await notifyClient(before.client.email, "Votre maquette est prête 🎨", "Votre maquette est disponible dans votre espace client. J'attends vos retours !");
    }
  }
  revalidatePath(`/admin/briefs/${briefId}`);
  revalidatePath("/admin");
}

export async function adminSendMessage(briefId: string, body: string) {
  const { supabase, user } = await requireAdmin();
  const text = body.trim().slice(0, 5000);
  if (!text) return;
  const { error } = await supabase.from("project_messages").insert({ brief_id: briefId, author_id: user.id, body: text });
  if (error) throw new Error(error.message);
  const brief = await clientOfBrief(supabase, briefId);
  if (brief?.client.email) await notifyClient(brief.client.email, "Nouveau message d'Aspyre Studio", text);
  revalidatePath(`/admin/briefs/${briefId}`);
}

export async function revealCredential(id: string): Promise<{ login: string; password: string; note: string }> {
  await requireAdmin();
  // La colonne chiffrée n'est lisible qu'avec la clé service, côté serveur.
  const { data, error } = await createAdminClient().from("project_credentials").select("ciphertext").eq("id", id).single();
  if (error || !data) throw new Error("Accès introuvable");
  return JSON.parse(decrypt(data.ciphertext));
}

export async function deleteCredential(briefId: string, id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("project_credentials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/briefs/${briefId}`);
}
