import "server-only";
import type { requireUser } from "@/lib/auth";

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
export async function getOrCreateBrief({ supabase, user, profile }: Ctx): Promise<ClientBrief> {
  const { data: existing } = await supabase
    .from("briefs")
    .select(COLUMNS)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ClientBrief>();
  if (existing) return existing;

  // Pré-rempli avec les infos de l'invitation.
  const prefill: Record<string, string> = { contact_email: profile.email };
  if (profile.full_name) prefill.contact_nom = profile.full_name;
  if (profile.company) prefill.nom_entreprise = profile.company;

  const { data: created, error } = await supabase
    .from("briefs")
    .insert({ client_id: user.id, data: prefill })
    .select(COLUMNS)
    .single<ClientBrief>();
  if (error || !created) throw new Error(`Impossible de créer le brief : ${error?.message}`);
  return created;
}
