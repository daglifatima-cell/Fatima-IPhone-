"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { todayIso, type ListingInput } from "@/lib/vinted";

type Result = { error?: string };

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function saveListing(input: ListingInput): Promise<Result> {
  const { supabase } = await requireAdmin();
  const price = typeof input.price === "number" && Number.isFinite(input.price) ? Math.round(input.price * 100) / 100 : null;
  const row = {
    title: str(input.title, 200),
    description: str(input.description),
    brand: str(input.brand, 100),
    category: str(input.category, 100),
    size: str(input.size, 50),
    condition: str(input.condition, 50),
    color: str(input.color, 50),
    notes: str(input.notes),
    price,
    published_at: /^\d{4}-\d{2}-\d{2}$/.test(input.published_at) ? input.published_at : todayIso(),
    updated_at: new Date().toISOString(),
  };
  if (!row.title) return { error: "Le titre est obligatoire." };

  const { error } = input.id
    ? await supabase.from("vinted_listings").update(row).eq("id", input.id)
    : await supabase.from("vinted_listings").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinted");
  return {};
}

/** Après avoir supprimé et recréé l'annonce sur Vinted : remet le compteur de jours à zéro. */
export async function markRepublished(id: string, changes: { title?: string; description?: string; price?: number | null }): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data: current, error: readError } = await supabase.from("vinted_listings").select("republish_count").eq("id", id).single();
  if (readError) return { error: readError.message };
  const update: Record<string, unknown> = {
    published_at: todayIso(),
    republish_count: (current?.republish_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  if (str(changes.title, 200)) update.title = str(changes.title, 200);
  if (str(changes.description)) update.description = str(changes.description);
  if (typeof changes.price === "number" && Number.isFinite(changes.price)) update.price = Math.round(changes.price * 100) / 100;
  const { error } = await supabase.from("vinted_listings").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinted");
  return {};
}

export async function setSold(id: string, sold: boolean): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("vinted_listings")
    .update({ sold_at: sold ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinted");
  return {};
}

export async function deleteListing(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("vinted_listings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vinted");
  return {};
}
