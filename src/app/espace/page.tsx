import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { BriefForm } from "@/components/brief/BriefForm";
import { requireUser } from "@/lib/auth";

export default async function EspacePage() {
  const { supabase, user, profile } = await requireUser();
  if (profile.role === "admin") redirect("/admin");

  let { data: brief } = await supabase
    .from("briefs")
    .select("id, status, data, submitted_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Premier passage : on crée le brief, pré-rempli avec les infos de l'invitation.
  if (!brief) {
    const prefill: Record<string, string> = { contact_email: profile.email };
    if (profile.full_name) prefill.contact_nom = profile.full_name;
    if (profile.company) prefill.nom_entreprise = profile.company;

    const { data: created, error } = await supabase
      .from("briefs")
      .insert({ client_id: user.id, data: prefill })
      .select("id, status, data, submitted_at")
      .single();
    if (error) throw new Error(`Impossible de créer le brief : ${error.message}`);
    brief = created;
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "";

  return (
    <>
      <Header email={profile.email} home="/espace" />
      <main className="flex-1">
        <BriefForm brief={brief} userId={user.id} firstName={firstName} />
      </main>
    </>
  );
}
