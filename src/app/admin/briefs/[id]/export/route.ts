import { briefToMarkdown } from "@/lib/brief-format";
import { loadBrief } from "../load";

// Télécharge le brief au format Markdown (liens vers les fichiers valables 7 jours).
export async function GET(_request: Request, ctx: RouteContext<"/admin/briefs/[id]/export">) {
  const { id } = await ctx.params;
  const { brief, fileUrls } = await loadBrief(id, 60 * 60 * 24 * 7);
  const markdown = briefToMarkdown({
    data: brief.data,
    status: brief.status,
    clientEmail: brief.client.email,
    updatedAt: brief.updated_at,
    fileUrls,
  });

  const name = String(brief.data.nom_entreprise || brief.client.email)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="brief-${name}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}
