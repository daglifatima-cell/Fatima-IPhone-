import Link from "next/link";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { BRIEF_SECTIONS, briefProgress } from "@/lib/brief-schema";
import { briefToMarkdown, fieldFiles, formatAnswer, pageContents } from "@/lib/brief-format";
import { loadBrief } from "./load";
import { CopyMarkdown, NotesEditor, StatusSelect } from "./AdminControls";
import { AdminMessageComposer, CredentialRow, ProjectEditor } from "./ProjectControls";
import { MessageList } from "@/components/project/Messages";
import { loadMessages } from "@/lib/messages";
import { PROJECT_STEPS, type SetupData } from "@/lib/project";

const dateTime = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminBriefPage(props: PageProps<"/admin/briefs/[id]">) {
  const { id } = await props.params;
  const { supabase, profile, brief, fileUrls } = await loadBrief(id, 60 * 60);
  const [{ data: noteRow }, { data: setupRow }, { data: credentials }, messages] = await Promise.all([
    supabase.from("brief_notes").select("notes").eq("brief_id", id).maybeSingle(),
    supabase.from("project_setup").select("data").eq("brief_id", id).maybeSingle(),
    supabase.from("project_credentials").select("id, service, created_at").eq("brief_id", id).order("created_at"),
    loadMessages(supabase, id),
  ]);
  const setup = (setupRow?.data ?? {}) as SetupData;

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
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
              Étape {brief.project_step + 1} · {PROJECT_STEPS[brief.project_step]?.title}
            </span>
          </div>

          <section className="card">
            <h2 className="mb-4 font-display text-xl font-semibold">Messages</h2>
            <MessageList messages={messages} viewer="admin" />
            <div className="mt-5 border-t border-line pt-5">
              <AdminMessageComposer briefId={brief.id} />
            </div>
          </section>

          {BRIEF_SECTIONS.map((section) => (
            <section key={section.id} className="card">
              <h2 className="mb-4 font-display text-xl font-semibold">{section.title}</h2>
              <dl className="space-y-4">
                {section.fields.map((field) => {
                  if (field.type === "pages") {
                    const pages = pageContents(field, brief.data);
                    return (
                      <div key={field.id} className="space-y-6">
                        {pages.length === 0 && <p className="text-sm text-muted/70">Aucun texte rédigé pour l&apos;instant.</p>}
                        {pages.map((page) => (
                          <div key={page.page}>
                            <dt className="mb-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                              Page « {page.page} »
                            </dt>
                            <dd className="space-y-4 border-l-2 border-line pl-4">
                              {page.blocks.map((block) => (
                                <div key={block.id}>
                                  {block.title && <p className="font-semibold">{block.title}</p>}
                                  {block.text && <p className="mt-1 whitespace-pre-wrap text-sm">{block.text}</p>}
                                  {block.images.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {block.images.map((img) => (
                                        <a key={img.path} href={fileUrls[img.path]} target="_blank" rel="noreferrer" title={img.name}>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={fileUrls[img.path]} alt={img.name} className="h-24 w-24 rounded-lg object-cover ring-1 ring-line hover:ring-brand" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </dd>
                          </div>
                        ))}
                      </div>
                    );
                  }
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
            <h2 className="font-semibold">Suivi du projet (visible client)</h2>
            <ProjectEditor briefId={brief.id} step={brief.project_step} maquetteUrl={brief.maquette_url ?? ""} />
          </div>

          <div className="card space-y-2 text-sm">
            <h2 className="font-semibold">Domaine & licences</h2>
            <p>
              🌐 Domaine :{" "}
              {setup.domaine_choisi ? <strong>{setup.domaine_choisi}</strong> : <span className="text-muted">non choisi</span>}
              {setup.domaine_existant && <span className="text-muted"> (déjà possédé)</span>}
            </p>
            <p>{setup.ionos_fait ? "✅" : "⏳"} Hébergement Ionos</p>
            <p>{setup.elementor_fait ? "✅" : "⏳"} Licence Elementor Pro</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Accès transmis 🔐</h2>
            {credentials?.length ? (
              <ul className="space-y-2">
                {credentials.map((c) => (
                  <CredentialRow key={c.id} briefId={brief.id} id={c.id} service={c.service} createdAt={c.created_at} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucun accès reçu pour l&apos;instant.</p>
            )}
            <p className="text-xs text-muted">Pense à les supprimer une fois l&apos;installation terminée.</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Statut du brief</h2>
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
