import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: "client" | "admin";
};

/** Renvoie l'utilisateur connecté et son profil, ou redirige vers la connexion. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, company, role")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/connexion?erreur=profil");

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/espace");
  return ctx;
}
