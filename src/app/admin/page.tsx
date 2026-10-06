import Link from "next/link";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { briefProgress, type BriefData } from "@/lib/brief-schema";
import { InviteForm } from "./InviteForm";

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  created_at: string;
  briefs: { id: string; status: string; data: BriefData; updated_at: string; submitted_at: string | null }[];
};

const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin();

  const { data: clients, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company, created_at, briefs(id, status, data, updated_at, submitted_at)")
    .eq("role", "client")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  const rows = (clients ?? []).map((c) => {
    const brief = [...c.briefs].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    return { ...c, brief };
  });
  const toReview = rows.filter((r) => r.brief?.status === "envoye").length;

  return (
    <>
      <Header email={profile.email} home="/admin" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Tableau de bord</h1>
            <p className="text-muted">
              {rows.length} client{rows.length > 1 ? "s" : ""}
              {toReview > 0 && <> · <strong className="text-accent">{toReview} brief{toReview > 1 ? "s" : ""} à traiter</strong></>}
            </p>
          </div>
        </div>

        <InviteForm />

        {error && <p className="text-danger">Erreur de chargement : {error.message}</p>}

        <div className="card overflow-hidden !p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-muted">Aucun client pour l&apos;instant. Invitez votre premier client ci-dessus ✨</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-background text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Avancement</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="hidden px-5 py-3 font-semibold md:table-cell">Mis à jour</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const progress = r.brief ? briefProgress(r.brief.data) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-background/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{r.company || r.full_name || r.email}</p>
                        <p className="text-xs text-muted">{r.full_name ? `${r.full_name} · ` : ""}{r.email}</p>
                      </td>
                      <td className="hidden px-5 py-4 sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                            <div className="aspyre-gradient h-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={r.brief?.status ?? null} /></td>
                      <td className="hidden px-5 py-4 text-muted md:table-cell">{dateFr(r.brief?.updated_at ?? r.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        {r.brief && (
                          <Link href={`/admin/briefs/${r.brief.id}`} className="font-semibold text-brand hover:underline">
                            Ouvrir →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
