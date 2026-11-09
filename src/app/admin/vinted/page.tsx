import Link from "next/link";
import { Header } from "@/components/Header";
import { requireAdmin } from "@/lib/auth";
import type { Listing } from "@/lib/vinted";
import { VintedApp } from "./VintedApp";

export default async function VintedPage() {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase
    .from("vinted_listings")
    .select("id, title, description, brand, category, size, condition, color, price, notes, published_at, republish_count, sold_at, created_at")
    .order("published_at", { ascending: true })
    .returns<Listing[]>();

  const listings = (data ?? []).map((l) => ({ ...l, price: l.price === null ? null : Number(l.price) }));

  return (
    <>
      <Header email={profile.email} home="/admin" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Mes annonces Vinted</h1>
            <p className="text-muted">Optimise tes annonces et republie celles qui ne partent pas.</p>
          </div>
          <Link href="/admin" className="btn-ghost">← Tableau de bord</Link>
        </div>

        {error ? (
          <div className="card space-y-2">
            <p className="font-semibold text-danger">La table des annonces est introuvable.</p>
            <p className="text-sm text-muted">
              Dans Supabase → <strong>SQL Editor</strong>, colle le fichier <code>supabase/vinted.sql</code> puis clique sur <strong>Run</strong> (une seule fois).
            </p>
            <p className="text-xs text-muted">Détail : {error.message}</p>
          </div>
        ) : (
          <VintedApp listings={listings} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
        )}
      </main>
    </>
  );
}
