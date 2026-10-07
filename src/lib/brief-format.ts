import {
  BRIEF_SECTIONS,
  STATUS_LABELS,
  type BriefData,
  type Field,
  type PageContent,
  type UploadedFile,
  blockHasContent,
  isPageContentList,
} from "@/lib/brief-schema";

const OTHER = "Autre";

/** Réponse lisible d'un champ (hors fichiers), avec le « Autre : … » résolu. */
export function formatAnswer(field: Field, data: BriefData): string {
  const value = data[field.id];
  const other = data[`${field.id}__autre`];
  const otherText = typeof other === "string" && other.trim() ? `Autre : ${other.trim()}` : OTHER;
  const resolve = (v: string) => (v === OTHER ? otherText : v);

  if (value === undefined || value === null) return "";
  if (field.type === "files" || field.type === "pages") return "";
  if (Array.isArray(value)) return (value as string[]).map(resolve).join(", ");
  if (field.type === "date" && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("fr-FR", { dateStyle: "long" });
  }
  return resolve(value);
}

/** Pages rédigées par le client, sans les sections restées vides. */
export function pageContents(field: Field, data: BriefData): PageContent[] {
  const v = data[field.id];
  if (field.type !== "pages" || !isPageContentList(v)) return [];
  return v
    .map((p) => ({ ...p, blocks: p.blocks.filter(blockHasContent) }))
    .filter((p) => p.blocks.length > 0);
}

export function fieldFiles(field: Field, data: BriefData): UploadedFile[] {
  if (field.type === "pages") return pageContents(field, data).flatMap((p) => p.blocks.flatMap((b) => b.images));
  if (field.type !== "files") return [];
  const v = data[field.id];
  return Array.isArray(v) ? (v as UploadedFile[]).filter((f) => typeof f === "object" && f?.path) : [];
}

/**
 * Export Markdown du brief, pensé pour être donné tel quel à Claude
 * afin de générer le site du client.
 */
export function briefToMarkdown(opts: {
  data: BriefData;
  status: string;
  clientEmail: string;
  updatedAt: string;
  fileUrls?: Record<string, string>;
}): string {
  const { data, status, clientEmail, updatedAt, fileUrls = {} } = opts;
  const name = (typeof data.nom_entreprise === "string" && data.nom_entreprise) || clientEmail;
  const lines: string[] = [
    `# Brief site internet — ${name}`,
    "",
    `> Brief recueilli via l'espace client Aspyre Studio. Statut : ${STATUS_LABELS[status] ?? status}.`,
    `> Compte client : ${clientEmail} — dernière mise à jour : ${new Date(updatedAt).toLocaleString("fr-FR")}.`,
    "",
  ];

  for (const section of BRIEF_SECTIONS) {
    lines.push(`## ${section.title}`, "");
    for (const field of section.fields) {
      if (field.type === "pages") {
        for (const page of pageContents(field, data)) {
          lines.push(`### Page « ${page.page} »`, "");
          for (const block of page.blocks) {
            if (block.title.trim()) lines.push(`#### ${block.title.trim()}`, "");
            if (block.text.trim()) lines.push(block.text.trim(), "");
            for (const img of block.images) {
              const url = fileUrls[img.path];
              lines.push(url ? `![${img.name}](${url})` : `- Image : ${img.name}`);
            }
            if (block.images.length) lines.push("");
          }
        }
        continue;
      }
      if (field.type === "files") {
        const files = fieldFiles(field, data);
        if (!files.length) continue;
        lines.push(`**${field.label}**`, "");
        for (const f of files) {
          const url = fileUrls[f.path];
          lines.push(url ? `- [${f.name}](${url})` : `- ${f.name}`);
        }
        lines.push("");
        continue;
      }
      const answer = formatAnswer(field, data).trim();
      if (!answer) continue;
      if (field.type === "textarea" || answer.includes("\n")) {
        lines.push(`**${field.label}**`, "", answer, "");
      } else {
        lines.push(`- **${field.label}** : ${answer}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
