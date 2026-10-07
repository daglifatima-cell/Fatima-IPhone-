import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ALL_FIELDS, type BriefData } from "@/lib/brief-schema";
import { fieldFiles } from "@/lib/brief-format";

export type AdminBrief = {
  id: string;
  status: string;
  data: BriefData;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  project_step: number;
  maquette_url: string | null;
  client: { email: string; full_name: string | null; company: string | null };
};

/** Charge un brief et des liens temporaires vers ses fichiers. */
export async function loadBrief(id: string, urlTtlSeconds: number) {
  const ctx = await requireAdmin();
  const { data: brief } = await ctx.supabase
    .from("briefs")
    .select("id, status, data, created_at, updated_at, submitted_at, project_step, maquette_url, client:profiles(email, full_name, company)")
    .eq("id", id)
    .maybeSingle<AdminBrief>();
  if (!brief) notFound();

  const paths = ALL_FIELDS.flatMap((f) => fieldFiles(f, brief.data)).map((f) => f.path);
  const fileUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await ctx.supabase.storage.from("brief-files").createSignedUrls(paths, urlTtlSeconds);
    for (const s of signed ?? []) if (s.path && s.signedUrl) fileUrls[s.path] = s.signedUrl;
  }

  return { ...ctx, brief, fileUrls };
}
