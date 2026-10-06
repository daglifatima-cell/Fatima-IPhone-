"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteState = { status: "idle" | "ok" | "error"; message?: string };

export async function inviteClient(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Adresse e-mail invalide." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || null, company: company || null },
    redirectTo: `${siteUrl}/auth/confirm?next=/espace`,
  });

  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return {
      status: "error",
      message: exists
        ? "Ce client a déjà un compte : il peut se connecter depuis la page Connexion avec son e-mail."
        : `L'invitation a échoué : ${error.message}`,
    };
  }

  revalidatePath("/admin");
  return { status: "ok", message: `Invitation envoyée à ${email}.` };
}

const STATUSES = ["brouillon", "envoye", "en_cours", "termine"];

export async function updateBriefStatus(briefId: string, status: string) {
  if (!STATUSES.includes(status)) throw new Error("Statut inconnu");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("briefs").update({ status }).eq("id", briefId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/briefs/${briefId}`);
  revalidatePath("/admin");
}

export async function saveBriefNotes(briefId: string, notes: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("brief_notes")
    .upsert({ brief_id: briefId, notes, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
