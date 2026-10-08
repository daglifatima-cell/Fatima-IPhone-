"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createLoginLink } from "@/lib/auth-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error?: string };

const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/** Crée le compte administratrice (une seule fois) et te connecte directement. */
export async function createFirstAdmin(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const secret = String(formData.get("secret") ?? "").trim();
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Adresse e-mail invalide." };
  // Preuve que c'est bien toi : seule toi connais la clé secrète Supabase.
  if (!expected || !sameSecret(secret, expected)) return { error: "Cette clé ne correspond pas à la clé secrète Supabase." };

  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if (count) return { error: "Un compte administrateur existe déjà : connecte-toi depuis la page Connexion." };

  // Création du compte (ou récupération s'il existe déjà).
  let userId: string | undefined;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { aspyre_admin: "true" } });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = data?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (userId) await admin.auth.admin.updateUserById(userId, { app_metadata: { aspyre_admin: "true" } });
  }
  if (!userId) return { error: `Création du compte impossible : ${created.error?.message ?? "erreur inconnue"}` };

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name: "Aspyre Studio", role: "admin" });
  if (profileError) return { error: `Profil impossible à créer : ${profileError.message}. As-tu bien exécuté le fichier SQL ?` };

  // Connexion immédiate, sans attendre d'e-mail.
  const link = await createLoginLink(email);
  if (!link.hashedToken) return { error: `Connexion impossible : ${link.error}` };
  const { error } = await (await createClient()).auth.verifyOtp({ type: "email", token_hash: link.hashedToken });
  if (error) return { error: `Connexion impossible : ${error.message}` };

  redirect("/admin");
}
