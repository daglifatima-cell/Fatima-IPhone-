import "server-only";
import { cache } from "react";
import type { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Ctx = Awaited<ReturnType<typeof requireUser>>;

export type ClientBrief = {
  id: string;
  status: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  project_step: number;
  maquette_url: string | null;
};

const COLUMNS = "id, status, data, submitted_at, project_step, maquette_url";

/** Brief le plus récent du client connecté, créé au premier passage. */
export function getOrCreateBrief({ user, profile }: Ctx): Promise<ClientBrief> {
  return loadOrCreate(user.id, profile.email, profile.full_name, profile.company);
}

// Mis en commun pour toute la requête : la mise en page et la page de
// l'espace client le demandent en parallèle, sans créer deux briefs.
const loadOrCreate = cache(async (userId: string, email: string, fullName: string | null, company: string | null) => {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("briefs")
    .select(COLUMNS)
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ClientBrief>();
  if (existing) return existing;

  // Pré-rempli avec les infos de l'invitation.
  const prefill: Record<string, string> = { contact_email: email };
  if (fullName) prefill.contact_nom = fullName;
  if (company) prefill.nom_entreprise = company;

  const { data: created, error } = await supabase
    .from("briefs")
    .insert({ client_id: userId, data: prefill })
    .select(COLUMNS)
    .single<ClientBrief>();
  if (error || !created) throw new Error(`Impossible de créer le brief : ${error?.message}`);
  return created;
});
