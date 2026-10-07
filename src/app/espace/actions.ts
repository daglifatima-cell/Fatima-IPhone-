"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { notifyAdmin } from "@/lib/notify";
import type { SetupData } from "@/lib/project";

type Result = { ok: true } | { ok: false; error: string };

/** Vérifie que le brief appartient bien au client connecté. */
async function ownBrief(briefId: string) {
  const ctx = await requireUser();
  const { data: brief } = await ctx.supabase
    .from("briefs")
    .select("id, data")
    .eq("id", briefId)
    .eq("client_id", ctx.user.id)
    .maybeSingle();
  if (!brief) throw new Error("Brief introuvable");
  const name = String((brief.data as Record<string, unknown>)?.nom_entreprise || ctx.profile.company || ctx.profile.email);
  return { ...ctx, name };
}

export async function submitBrief(briefId: string): Promise<Result> {
  const { supabase, name } = await ownBrief(briefId);
  const { error } = await supabase
    .from("briefs")
    .update({ status: "envoye", submitted_at: new Date().toISOString() })
    .eq("id", briefId);
  if (error) return { ok: false, error: "L'envoi a échoué. Réessayez dans un instant." };
  await notifyAdmin(`📝 Brief reçu — ${name}`, `${name} vient d'envoyer son brief.`, briefId);
  return { ok: true };
}

export async function saveSetup(briefId: string, data: SetupData): Promise<Result> {
  const { supabase, name } = await ownBrief(briefId);
  const { data: previous } = await supabase.from("project_setup").select("data").eq("brief_id", briefId).maybeSingle();
  const before = (previous?.data ?? {}) as SetupData;

  const { error } = await supabase
    .from("project_setup")
    .upsert({ brief_id: briefId, data, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "L'enregistrement a échoué." };

  const done: string[] = [];
  if (data.ionos_fait && !before.ionos_fait) done.push("l'hébergement Ionos");
  if (data.elementor_fait && !before.elementor_fait) done.push("la licence Elementor Pro");
  if (done.length) {
    const domain = data.domaine_choisi ? `\nNom de domaine : ${data.domaine_choisi}` : "";
    await notifyAdmin(`🛒 Achat confirmé — ${name}`, `${name} a acheté ${done.join(" et ")}.${domain}`, briefId);
  }
  return { ok: true };
}

export async function sendCredentials(
  briefId: string,
  input: { service: string; login: string; password: string; note: string },
): Promise<Result> {
  const { supabase, name } = await ownBrief(briefId);
  const service = input.service.trim().slice(0, 80);
  if (!service || !input.login.trim() || !input.password) {
    return { ok: false, error: "Merci de remplir le service, l'identifiant et le mot de passe." };
  }

  let ciphertext: string;
  try {
    ciphertext = encrypt(JSON.stringify({ login: input.login.trim(), password: input.password, note: input.note.trim() }));
  } catch {
    return { ok: false, error: "L'envoi sécurisé n'est pas encore configuré. Prévenez Aspyre Studio." };
  }

  const { error } = await supabase.from("project_credentials").insert({ brief_id: briefId, service, ciphertext });
  if (error) return { ok: false, error: "L'envoi a échoué. Réessayez dans un instant." };

  await notifyAdmin(`🔐 Accès reçus — ${name}`, `${name} vous a transmis ses accès : ${service}.`, briefId);
  revalidatePath("/espace/domaine");
  return { ok: true };
}

export async function deleteOwnCredential(briefId: string, id: string): Promise<Result> {
  const { supabase } = await ownBrief(briefId);
  const { error } = await supabase.from("project_credentials").delete().eq("id", id).eq("brief_id", briefId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/espace/domaine");
  return { ok: true };
}

const KIND_LABELS = {
  message: "💬 Nouveau message",
  validation: "✅ Maquette validée",
  modifications: "✏️ Modifications demandées",
} as const;

export async function sendClientMessage(
  briefId: string,
  kind: keyof typeof KIND_LABELS,
  body: string,
): Promise<Result> {
  const { supabase, user, name } = await ownBrief(briefId);
  const text = body.trim().slice(0, 5000);
  if (!(kind in KIND_LABELS)) return { ok: false, error: "Type de message inconnu" };
  if (!text && kind !== "validation") return { ok: false, error: "Votre message est vide." };

  const { error } = await supabase.from("project_messages").insert({ brief_id: briefId, author_id: user.id, kind, body: text });
  if (error) return { ok: false, error: "L'envoi a échoué. Réessayez dans un instant." };

  await notifyAdmin(`${KIND_LABELS[kind]} — ${name}`, text || `${name} a validé la maquette.`, briefId);
  revalidatePath("/espace/suivi");
  return { ok: true };
}
