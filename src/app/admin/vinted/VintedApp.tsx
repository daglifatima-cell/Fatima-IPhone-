"use client";

import { useState, useTransition } from "react";
import { CONDITIONS, REPUBLISH_AFTER_DAYS, TITLE_TARGET, daysSince, todayIso, type Listing, type ListingInput, type Optimisation } from "@/lib/vinted";
import { claudePrompt, claudeUrl, optimiseLocal, parseClaudeReply } from "@/lib/vinted-optimiser";
import { deleteListing, markRepublished, saveListing, setSold } from "./actions";

type Tab = "republier" | "en-vente" | "vendues";

const EMPTY: ListingInput = {
  title: "",
  description: "",
  brand: "",
  category: "",
  size: "",
  condition: "",
  color: "",
  price: null,
  notes: "",
  published_at: todayIso(),
};

const euro = (n: number | null) => (n === null ? "" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }));

export function VintedApp({ listings }: { listings: Listing[] }) {
  const toRepublish = listings.filter((l) => !l.sold_at && daysSince(l.published_at) >= REPUBLISH_AFTER_DAYS);
  const onSale = listings.filter((l) => !l.sold_at && daysSince(l.published_at) < REPUBLISH_AFTER_DAYS);
  const sold = listings.filter((l) => l.sold_at).sort((a, b) => (b.sold_at ?? "").localeCompare(a.sold_at ?? ""));

  const [tab, setTab] = useState<Tab>(toRepublish.length > 0 ? "republier" : "en-vente");
  const [editing, setEditing] = useState<ListingInput | null>(null);
  const [republishing, setRepublishing] = useState<Listing | null>(null);

  const shown = tab === "republier" ? toRepublish : tab === "en-vente" ? onSale : sold;

  if (editing) return <Editor initial={editing} onClose={() => setEditing(null)} />;
  if (republishing) return <Republish listing={republishing} onClose={() => setRepublishing(null)} />;

  return (
    <div className="space-y-5">
      <button className="btn-primary w-full sm:w-auto" onClick={() => setEditing({ ...EMPTY, published_at: todayIso() })}>
        + Ajouter une annonce
      </button>

      <div className="flex gap-2 overflow-x-auto">
        {([
          ["republier", `À republier (${toRepublish.length})`],
          ["en-vente", `En vente (${onSale.length})`],
          ["vendues", `Vendues (${sold.length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`btn shrink-0 !px-4 !py-2 ${tab === id ? "bg-brand text-brand-ink" : "border border-line bg-surface"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "republier" && toRepublish.length > 0 && (
        <p className="text-sm text-muted">
          Ces annonces sont en ligne depuis {REPUBLISH_AFTER_DAYS} jours ou plus sans être vendues. Une annonce republiée remonte en haut des résultats.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="card text-center text-muted">
          {tab === "republier" ? "Rien à republier pour l'instant 🎉" : tab === "en-vente" ? "Aucune annonce en vente. Ajoute ta première annonce ci-dessus." : "Aucune vente enregistrée pour l'instant."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((l) => (
            <ListingCard key={l.id} listing={l} onEdit={() => setEditing(l)} onRepublish={() => setRepublishing(l)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ListingCard({ listing: l, onEdit, onRepublish }: { listing: Listing; onEdit: () => void; onRepublish: () => void }) {
  const [pending, start] = useTransition();
  const days = daysSince(l.published_at);
  const late = !l.sold_at && days >= REPUBLISH_AFTER_DAYS;

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) alert(r.error);
    });

  return (
    <li className="card space-y-3 !p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{l.title}</p>
          <p className="text-sm text-muted">
            {[l.brand, l.size, l.condition].filter(Boolean).join(" · ")}
          </p>
        </div>
        {l.price !== null && <p className="shrink-0 font-semibold">{euro(l.price)}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {l.sold_at ? (
          <span className="rounded-full bg-success/15 px-2.5 py-1 font-semibold text-success">
            Vendue le {new Date(l.sold_at).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className={`rounded-full px-2.5 py-1 font-semibold ${late ? "bg-danger/15 text-danger" : "bg-brand-soft"}`}>
            En ligne depuis {days} jour{days > 1 ? "s" : ""}
          </span>
        )}
        {l.republish_count > 0 && <span className="text-muted">Republiée {l.republish_count} fois</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!l.sold_at && <button className={late ? "btn-primary !py-2" : "btn-ghost !py-2"} onClick={onRepublish}>↻ Republier</button>}
        <button className="btn-ghost !py-2" onClick={onEdit}>Modifier</button>
        <button className="btn-ghost !py-2" disabled={pending} onClick={() => run(() => setSold(l.id, !l.sold_at))}>
          {l.sold_at ? "Remettre en vente" : "✓ Vendue"}
        </button>
        <button
          className="btn !py-2 text-danger"
          disabled={pending}
          onClick={() => confirm("Supprimer cette annonce de ta liste ?") && run(() => deleteListing(l.id))}
        >
          Supprimer
        </button>
      </div>
    </li>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost !px-3 !py-1.5 text-xs"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}

function Suggestion({ result, onUseTitle, onUseDescription, onUseAll }: { result: Optimisation; onUseTitle: () => void; onUseDescription: () => void; onUseAll: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-accent bg-brand-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">✨ Proposition</p>
        <button type="button" className="btn-primary !px-4 !py-1.5 text-xs" onClick={onUseAll}>Tout utiliser</button>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Titre · {result.titre.length} car.</p>
        <p className="font-semibold">{result.titre}</p>
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onUseTitle}>Utiliser ce titre</button>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Description</p>
        <p className="whitespace-pre-line text-sm">{result.description}</p>
        <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={onUseDescription}>Utiliser cette description</button>
      </div>
      {result.conseil_prix && (
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Prix</p>
          <p>{result.conseil_prix}</p>
        </div>
      )}
      {result.infos_manquantes.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">À ajouter si tu peux</p>
          <ul className="list-disc pl-5">{result.infos_manquantes.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {result.conseils.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pour vendre plus vite</p>
          <ul className="list-disc pl-5">{result.conseils.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Editor({ initial, onClose }: { initial: ListingInput; onClose: () => void }) {
  const [form, setForm] = useState<ListingInput>(initial);
  const [result, setResult] = useState<Optimisation | null>(null);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();
  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  function save() {
    setError("");
    startSave(async () => {
      const r = await saveListing(form);
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  return (
    <div className="space-y-5">
      <button className="btn-ghost" onClick={onClose}>← Retour</button>
      <div className="card space-y-4">
        <h2 className="font-display text-xl font-semibold">{form.id ? "Modifier l'annonce" : "Nouvelle annonce"}</h2>
        <p className="text-sm text-muted">Colle ton titre et ta description actuels (ou juste quelques infos), puis demande une version optimisée.</p>

        <div>
          <label className="label" htmlFor="v-title">Titre</label>
          <input id="v-title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. Jean Levi's 501 bleu taille 38" />
          <p className={`mt-1 text-xs ${form.title.length > TITLE_TARGET ? "text-danger" : "text-muted"}`}>{form.title.length} / {TITLE_TARGET} caractères conseillés</p>
        </div>
        <div>
          <label className="label" htmlFor="v-desc">Description</label>
          <textarea id="v-desc" className="input min-h-40" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="v-brand">Marque</label>
            <input id="v-brand" className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="v-cat">Type d&apos;article</label>
            <input id="v-cat" className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Robe, baskets…" />
          </div>
          <div>
            <label className="label" htmlFor="v-size">Taille</label>
            <input id="v-size" className="input" value={form.size} onChange={(e) => set("size", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="v-color">Couleur</label>
            <input id="v-color" className="input" value={form.color} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="v-cond">État</label>
            <select id="v-cond" className="input" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              <option value="">—</option>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="v-price">Prix (€)</label>
            <input
              id="v-price"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={form.price ?? ""}
              onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="v-notes">Infos en plus pour l&apos;IA</label>
          <textarea
            id="v-notes"
            className="input min-h-20"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Matière, mesures, défauts, porté 2 fois, taille petit…"
          />
        </div>
        <div>
          <label className="label" htmlFor="v-date">Publiée sur Vinted le</label>
          <input id="v-date" className="input" type="date" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} />
        </div>

        <Optimiser listing={form} onResult={setResult} />

        {result && (
          <Suggestion
            result={result}
            onUseTitle={() => set("title", result.titre)}
            onUseDescription={() => set("description", result.description)}
            onUseAll={() => setForm((f) => ({ ...f, title: result.titre, description: result.description }))}
          />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          <CopyButton text={form.title} label="Copier le titre" />
          <CopyButton text={form.description} label="Copier la description" />
        </div>
      </div>
    </div>
  );
}

function Republish({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState<number | null>(listing.price);
  const [result, setResult] = useState<Optimisation | null>(null);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  // Petite baisse conseillée à chaque republication (5 %, arrondie au 0,50 € inférieur).
  const lowered = listing.price ? Math.max(1, Math.floor(listing.price * 0.95 * 2) / 2) : null;

  function done() {
    startSave(async () => {
      const r = await markRepublished(listing.id, { title, description, price });
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  return (
    <div className="space-y-5">
      <button className="btn-ghost" onClick={onClose}>← Retour</button>
      <div className="card space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Republier l&apos;annonce</h2>
          <p className="text-sm text-muted">{listing.title}</p>
        </div>

        <Optimiser listing={{ ...listing, title, description, price }} variante onResult={setResult} />
        {result && (
          <Suggestion
            result={result}
            onUseTitle={() => setTitle(result.titre)}
            onUseDescription={() => setDescription(result.description)}
            onUseAll={() => {
              setTitle(result.titre);
              setDescription(result.description);
            }}
          />
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="label !mb-0" htmlFor="r-title">Titre</label>
            <CopyButton text={title} label="Copier" />
          </div>
          <input id="r-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="label !mb-0" htmlFor="r-desc">Description</label>
            <CopyButton text={description} label="Copier" />
          </div>
          <textarea id="r-desc" className="input min-h-40" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="r-price">Prix (€)</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="r-price"
              className="input !w-32"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={price ?? ""}
              onChange={(e) => setPrice(e.target.value === "" ? null : Number(e.target.value))}
            />
            {lowered !== null && lowered < (listing.price ?? 0) && price !== lowered && (
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setPrice(lowered)}>
                Baisser à {euro(lowered)} (−5 %)
              </button>
            )}
          </div>
        </div>

        <ol className="list-decimal space-y-1 rounded-2xl bg-brand-soft p-4 pl-9 text-sm">
          <li>Dans l&apos;app Vinted, ouvre l&apos;annonce et <strong>enregistre les photos</strong> si tu ne les as plus.</li>
          <li><strong>Supprime</strong> l&apos;ancienne annonce.</li>
          <li>Crée une <strong>nouvelle annonce</strong> : mêmes photos (change la 1re photo si possible), colle le titre et la description copiés ici.</li>
          <li>Reviens ici et appuie sur « C&apos;est republié ».</li>
        </ol>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button className="btn-primary w-full" disabled={saving} onClick={done}>
          {saving ? "Enregistrement…" : "✓ C'est republié"}
        </button>
      </div>
    </div>
  );
}

/** Deux façons d'optimiser, sans clé API : instantanée (règles intégrées) ou avec l'app Claude. */
function Optimiser({ listing, variante = false, onResult }: { listing: ListingInput; variante?: boolean; onResult: (r: Optimisation) => void }) {
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  function openClaude() {
    const prompt = claudePrompt(listing, variante);
    // Copie aussi la demande : si Claude s'ouvre sans le texte, il suffit de la coller.
    navigator.clipboard?.writeText(prompt).catch(() => {});
    window.open(claudeUrl(prompt), "_blank", "noopener");
    setClaudeOpen(true);
  }

  function useReply() {
    const parsed = parseClaudeReply(reply);
    if (!parsed) {
      setError("Je ne trouve pas « TITRE : » et « DESCRIPTION : » dans le texte collé. Copie toute la réponse de Claude.");
      return;
    }
    setError("");
    setReply("");
    setClaudeOpen(false);
    onResult(parsed);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn-ghost" onClick={() => onResult(optimiseLocal(listing, variante))}>
          ⚡ {variante ? "Nouvelle version" : "Optimiser"} (instantané)
        </button>
        <button type="button" className="btn-ghost" onClick={openClaude}>
          ✨ {variante ? "Nouvelle version" : "Optimiser"} avec Claude
        </button>
      </div>
      {claudeOpen && (
        <div className="space-y-2 rounded-2xl border border-line p-4 text-sm">
          <p>
            Claude s&apos;est ouvert avec ta demande (elle est aussi copiée : colle-la si le champ est vide). Quand il a répondu,
            copie toute sa réponse et colle-la ici :
          </p>
          <textarea className="input min-h-28" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="TITRE : …" />
          {error && <p className="text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-2" disabled={!reply.trim()} onClick={useReply}>Utiliser la réponse</button>
            <button type="button" className="btn-ghost !py-2" onClick={() => setClaudeOpen(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
