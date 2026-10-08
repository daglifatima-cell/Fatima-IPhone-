import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

// Liens d'invitation et de connexion générés par Supabase mais envoyés
// par nos propres e-mails : aucun modèle à configurer côté Supabase.

export async function createInviteLink(email: string, data: Record<string, string | null>) {
  const { data: res, error } = await createAdminClient().auth.admin.generateLink({ type: "invite", email, options: { data } });
  if (error || !res) return { error: error?.message ?? "Lien impossible à créer" };
  const site = await getSiteUrl();
  return { link: `${site}/auth/confirm?token_hash=${res.properties.hashed_token}&type=invite&next=/espace` };
}

export async function createLoginLink(email: string) {
  const { data: res, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !res) return { error: error?.message ?? "Lien impossible à créer" };
  const site = await getSiteUrl();
  return { link: `${site}/auth/confirm?token_hash=${res.properties.hashed_token}&type=email&next=/espace`, hashedToken: res.properties.hashed_token };
}
