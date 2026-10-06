"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Merci d'indiquer une adresse e-mail valide." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Seuls les clients invités peuvent se connecter : pas d'inscription libre.
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/espace`,
    },
  });

  // Erreur volontairement silencieuse si le compte n'existe pas, pour ne pas
  // révéler quelles adresses sont clientes. On signale seulement les limites d'envoi.
  if (error && error.status === 429) {
    return { status: "error", message: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  return { status: "sent", message: email };
}
