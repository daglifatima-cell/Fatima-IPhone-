import Link from "next/link";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { BRIEF_SECTIONS, briefProgress } from "@/lib/brief-schema";
import { briefToMarkdown, fieldFiles, formatAnswer } from "@/lib/brief-format";
import { loadBrief } from "./load";
import { CopyMarkdown, NotesEditor, StatusSelect } from "./AdminControls";

const dateTime = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminBriefPage(props: PageProps<"/admin/briefs/[id]">) {
  const { id } = await props.params;
  const { supabase, profile, brief, fileUrls } = await loadBrief(id, 60 * 60);
  const { data: noteRow } = await supabase.from("brief_notes").select("notes").eq("brief_id", id).maybeSingle();

  const title = String(brief.data.nom_entreprise || brief.client.company || brief.client.email);
  const markdown = briefToMarkdown({
    data: brief.data,
    status: brief.status,
    clientEmail: brief.client.email,
    updatedAt: brief.updated_at,
  });

  return (
    <>
      <Header email={profile.email} home="/admin" />
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Link href="/admin" className="text-sm text-muted hover:text-brand">← Tous les clients</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{title}</h1>
            <StatusBadge status={brief.status} />
          </div>

          {BRIEF_SECTIONS.map((section) => (
            <section key={section.id} className="card">
              <h2 className="mb-4 font-display text-xl font-semibold">{section.title}</h2>
              <dl className="space-y-4">
                {section.fields.map((field) => {
                  if (field.type === "files") {
                    const files = fieldFiles(field, brief.data);
                    return (
                      <div key={field.id}>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{field.label}</dt>
                        <dd className="mt-2">
                          {files.length === 0 ? (
                            <span className="text-sm text-muted/70">—</span>
                          ) : (
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {files.map((f) => (
                                <li key={f.path}>
                                  <a
                                    href={fileUrls[f.path]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-xl border border-line p-2 text-sm hover:border-brand"
                                  >
                                    {f.type.startsWith("image/") && fileUrls[f.path] ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={fileUrls[f.path]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                    ) : (
                                      <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft">📄</span>
                                    )}
                                    <span className="truncate">{f.name}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </dd>
                      </div>
                    );
                  }
                  const answer = formatAnswer(field, brief.data);
                  const colors = field.type === "colors" && Array.isArray(brief.data[field.id]) ? (brief.data[field.id] as string[]) : [];
                  return (
                    <div key={field.id}>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{field.label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm">
                        {colors.length > 0 && (
                          <span className="mb-1 flex gap-1.5">
                            {colors.map((c, i) => (
                              <span key={i} className="h-6 w-6 rounded-full ring-1 ring-line" style={{ background: c }} title={c} />
                            ))}
                          </span>
                        )}
                        {answer || <span className="text-muted/70">—</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card space-y-3">
            <h2 className="font-semibold">Client</h2>
            <p className="text-sm">
              {brief.client.full_name && <>{brief.client.full_name}<br /></>}
              <a href={`mailto:${brief.client.email}`} className="text-brand hover:underline">{brief.client.email}</a>
            </p>
            <p className="text-xs text-muted">
              Avancement : {briefProgress(brief.data)}%<br />
              Mis à jour : {dateTime(brief.updated_at)}
              {brief.submitted_at && <><br />Envoyé : {dateTime(brief.submitted_at)}</>}
            </p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Statut du projet</h2>
            <StatusSelect briefId={brief.id} status={brief.status} />
            <p className="text-xs text-muted">« Projet en cours » verrouille le brief côté client.</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Créer le site avec Claude</h2>
            <p className="text-xs text-muted">
              Exporte le brief en Markdown (avec liens vers les fichiers, valables 7 jours) et donne-le à Claude.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={`/admin/briefs/${brief.id}/export`} className="btn-primary">Télécharger (.md)</a>
              <CopyMarkdown markdown={markdown} />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Notes internes</h2>
            <NotesEditor briefId={brief.id} initial={noteRow?.notes ?? ""} />
          </div>
        </aside>
      </main>
    </>
  );
}
