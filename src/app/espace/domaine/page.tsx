import { requireUser } from "@/lib/auth";
import { getOrCreateBrief } from "@/lib/brief";
import type { SetupData } from "@/lib/project";
import { DomainSetup } from "./DomainSetup";

export default async function DomainePage() {
  const ctx = await requireUser();
  const brief = await getOrCreateBrief(ctx);

  const [{ data: setup }, { data: credentials }] = await Promise.all([
    ctx.supabase.from("project_setup").select("data").eq("brief_id", brief.id).maybeSingle(),
    ctx.supabase
      .from("project_credentials")
      .select("id, service, created_at")
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: false }),
  ]);

  // Pré-remplissage depuis le brief (« Nom de domaine actuel ou souhaité »).
  const fromBrief = brief.data as Record<string, unknown>;
  const initial: SetupData = {
    domaine_existant: fromBrief.domaine_statut === "J'en possède déjà un",
    domaine_choisi: typeof fromBrief.domaine === "string" ? fromBrief.domaine : "",
    ...((setup?.data ?? {}) as SetupData),
  };

  return <DomainSetup briefId={brief.id} initial={initial} credentials={credentials ?? []} />;
}
