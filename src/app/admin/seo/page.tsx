import Link from "next/link";
import { Header } from "@/components/Header";
import { requireAdmin } from "@/lib/auth";
import { ClicksChart } from "./ClicksChart";
// Données écrites chaque matin par la routine SEO (seo/RUN.md), relues à chaque déploiement.
import history from "../../../../seo/data/history.json";
import latest from "../../../../seo/data/latest.json";
import actions from "../../../../seo/data/actions.json";

type Day = { date: string; clicks: number; impressions: number; ctr: number; position: number };
type Row = { clicks: number; impressions: number; ctr: number; position: number; query?: string; page?: string };
type Action = { date: string; type: "article" | "refresh" | "technique"; title: string; url?: string };

const ACTION_LABELS: Record<Action["type"], string> = {
  article: "Nouvel article",
  refresh: "Article retravaillé",
  technique: "Technique",
};

const dateFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const num = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function totals(days: Day[]) {
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const impressions = days.reduce((s, d) => s + d.impressions, 0);
  const position = impressions ? days.reduce((s, d) => s + d.position * d.impressions, 0) / impressions : 0;
  return { clicks, impressions, ctr: impressions ? (clicks / impressions) * 100 : 0, position };
}

function Stat({ label, value, before, unit = "", lowerIsBetter = false }: { label: string; value: number; before: number; unit?: string; lowerIsBetter?: boolean }) {
  const diff = value - before;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{num(value)}{unit}</p>
      {before > 0 && diff !== 0 && (
        <p className={`mt-1 text-sm ${good ? "text-success" : "text-danger"}`}>
          {good ? "▲" : "▼"} {num(Math.abs(diff))}{unit} <span className="text-muted">vs 28 j. précédents</span>
        </p>
      )}
    </div>
  );
}

export default async function SeoPage() {
  const { profile } = await requireAdmin();

  const days = history as Day[];
  const now = totals(days.slice(-28));
  const before = totals(days.slice(-56, -28));
  const queries = (latest.topQueries as Row[]).slice(0, 10);
  const pages = (latest.topPages as Row[]).slice(0, 10);
  const recent = [...(actions as Action[])].reverse().slice(0, 15);

  return (
    <>
      <Header email={profile.email} home="/admin" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Tableau de bord</Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">Référencement d&apos;aspyre.fr</h1>
          <p className="text-muted">
            {latest.updatedAt
              ? <>Données Google Search Console, mises à jour le {dateFr(latest.updatedAt)} par les agents SEO.</>
              : <>Les agents SEO n&apos;ont pas encore tourné : les chiffres apparaîtront après leur première routine.</>}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Clics (28 j.)" value={now.clicks} before={before.clicks} />
          <Stat label="Impressions (28 j.)" value={now.impressions} before={before.impressions} />
          <Stat label="CTR moyen" value={Math.round(now.ctr * 10) / 10} before={Math.round(before.ctr * 10) / 10} unit=" %" />
          <Stat label="Position moyenne" value={Math.round(now.position * 10) / 10} before={Math.round(before.position * 10) / 10} lowerIsBetter />
        </section>

        <section className="card">
          <h2 className="font-semibold">Clics depuis Google, par jour</h2>
          <div className="mt-4">
            <ClicksChart days={days.slice(-90)} />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <TopTable title="Recherches les plus cliquées" rows={queries} label={(r) => r.query ?? ""} />
          <TopTable title="Pages les plus visitées" rows={pages} label={(r) => (r.page ?? "").replace(/^https?:\/\/[^/]+/, "") || "/"} />
        </div>

        <section className="card">
          <h2 className="font-semibold">Ce que les agents ont fait</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Rien pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {recent.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="w-24 shrink-0 text-muted">{dateFr(a.date)}</span>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold">{ACTION_LABELS[a.type] ?? a.type}</span>
                  {a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="underline">{a.title}</a> : <span>{a.title}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function TopTable({ title, rows, label }: { title: string; rows: Row[]; label: (r: Row) => string }) {
  return (
    <section className="card overflow-hidden !p-0">
      <h2 className="px-5 pt-5 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">Pas encore de données.</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="border-y border-line bg-background text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-2 font-semibold">&nbsp;</th>
              <th className="px-2 py-2 text-right font-semibold">Clics</th>
              <th className="px-5 py-2 text-right font-semibold">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="max-w-0 truncate px-5 py-2" title={label(r)}>{label(r)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.clicks}</td>
                <td className="px-5 py-2 text-right tabular-nums">{num(r.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
