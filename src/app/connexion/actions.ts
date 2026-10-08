"use server";

import { createLoginLink } from "@/lib/auth-links";
import { emailEnabled, sendLoginEmail } from "@/lib/notify";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Merci d'indiquer une adresse e-mail valide." };
  }

  if (emailEnabled()) {
    // Seuls les clients invités (qui ont un profil) reçoivent un lien.
    // Réponse identique dans tous les cas, pour ne pas révéler qui est client.
    const { data: profile } = await createAdminClient().from("profiles").select("id").eq("email", email).maybeSingle();
    if (profile) {
      const res = await createLoginLink(email);
      if (res.link) await sendLoginEmail(email, res.link);
    }
    return { status: "sent", message: email };
  }

  // Sans Resend : e-mails par défaut de Supabase (limités).
  const supabase = await createClient();
  const site = await getSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${site}/auth/confirm?next=/espace` },
  });
  if (error && error.status === 429) {
    return { status: "error", message: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  return { status: "sent", message: email };
}
