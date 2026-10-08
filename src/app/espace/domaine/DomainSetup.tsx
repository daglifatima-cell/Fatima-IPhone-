"use client";

import { useEffect, useRef, useState } from "react";
import { ELEMENTOR_TUTO, IONOS_TUTO, STUDIO, type TutoStep } from "@/lib/studio-config";
import { CREDENTIAL_SERVICES, type SetupData } from "@/lib/project";
import { deleteOwnCredential, saveSetup, sendCredentials } from "../actions";

type Credential = { id: string; service: string; created_at: string };
type Result = { domain: string; status: "disponible" | "pris" | "inconnu" };

export function DomainSetup(props: { briefId: string; initial: SetupData; credentials: Credential[] }) {
  const { briefId, credentials } = props;
  const [setup, setSetup] = useState<SetupData>(props.initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setSaved("saving");
      const res = await saveSetup(briefId, setup);
      dirty.current = false;
      setSaved(res.ok ? "saved" : "error");
    }, 700);
    return () => clearTimeout(t);
  }, [setup, briefId]);

  const update = (patch: Partial<SetupData>) => {
    dirty.current = true;
    setSetup((s) => ({ ...s, ...patch }));
  };

  const steps = [!!setup.domaine_choisi?.trim(), !!setup.ionos_fait, !!setup.elementor_fait, credentials.length >= 2];
  const doneCount = steps.filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Domaine & licences</h1>
        <p className="mt-2 text-muted">
          Pour que votre site vous appartienne à 100 %, c&apos;est vous qui achetez votre nom de domaine, votre
          hébergement et votre licence Elementor Pro. Suivez le guide, je m&apos;occupe de toute l&apos;installation ensuite.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div className="aspyre-gradient h-full transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">{doneCount}/4 étapes</span>
        </div>
        <p className="mt-1 h-4 text-xs text-muted">
          {saved === "saving" && "Enregistrement…"}
          {saved === "saved" && "Enregistré ✓"}
          {saved === "error" && <span className="text-danger">Échec de l&apos;enregistrement</span>}
        </p>
      </div>

      {/* 1. Nom de domaine */}
      <StepCard n={1} done={steps[0]} title="Votre nom de domaine" subtitle="L'adresse de votre site, par exemple boulangerie-lumiere.fr">
        <label className="mb-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!setup.domaine_existant}
            onChange={(e) => update({ domaine_existant: e.target.checked })}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          J&apos;ai déjà un nom de domaine
        </label>
        {setup.domaine_existant ? (
          <div>
            <label className="label" htmlFor="domaine-existant">Votre nom de domaine actuel</label>
            <input
              id="domaine-existant"
              className="input"
              placeholder="mon-entreprise.fr"
              value={setup.domaine_choisi ?? ""}
              onChange={(e) => update({ domaine_choisi: e.target.value })}
            />
            <p className="mt-2 text-xs text-muted">
              Gardez-le où il est : à l&apos;étape suivante, prenez uniquement l&apos;hébergement, je relierai votre domaine.
            </p>
          </div>
        ) : (
          <DomainChecker chosen={setup.domaine_choisi ?? ""} onChoose={(d) => update({ domaine_choisi: d })} />
        )}
      </StepCard>

      {/* 2. Ionos */}
      <StepCard n={2} done={steps[1]} title="Hébergement & domaine chez Ionos" subtitle="Là où votre site sera installé (abonnement à votre nom).">
        <Tuto steps={IONOS_TUTO} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={STUDIO.ionosHostingUrl} target="_blank" rel="noreferrer" className="btn-primary">Aller sur Ionos ↗</a>
          <DoneToggle checked={!!setup.ionos_fait} onChange={(v) => update({ ionos_fait: v })} label="C'est fait, j'ai acheté mon hébergement" />
        </div>
      </StepCard>

      {/* 3. Elementor */}
      <StepCard n={3} done={steps[2]} title="Licence Elementor Pro" subtitle="L'outil professionnel avec lequel je construis votre site.">
        <Tuto steps={ELEMENTOR_TUTO} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={STUDIO.elementorAffiliateUrl} target="_blank" rel="noreferrer sponsored" className="btn-primary">Acheter Elementor Pro ↗</a>
          <DoneToggle checked={!!setup.elementor_fait} onChange={(v) => update({ elementor_fait: v })} label="C'est fait, j'ai ma licence" />
        </div>
      </StepCard>

      {/* 4. Accès */}
      <StepCard n={4} done={steps[3]} title="Transmettez-moi vos accès" subtitle="Pour que j'installe WordPress et active votre licence.">
        <CredentialsForm briefId={briefId} credentials={credentials} />
      </StepCard>
    </div>
  );
}

function StepCard(props: { n: number; done: boolean; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="card !p-6 sm:!p-8">
      <div className="mb-5 flex items-start gap-4">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
            props.done ? "bg-success text-white" : "bg-brand-soft text-brand"
          }`}
        >
          {props.done ? "✓" : props.n}
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold">{props.title}</h2>
          <p className="text-sm text-muted">{props.subtitle}</p>
        </div>
      </div>
      {props.children}
    </section>
  );
}

function Tuto({ steps }: { steps: TutoStep[] }) {
  return (
    <ol className="space-y-3 border-l-2 border-line pl-5">
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-surface text-[11px] font-bold text-brand ring-2 ring-line">
            {i + 1}
          </span>
          <p className="text-sm font-semibold">{s.title}</p>
          <p className="text-sm text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

function DoneToggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
        props.checked ? "border-success bg-success/10 font-semibold text-success" : "border-line hover:border-success"
      }`}
    >
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} className="h-4 w-4 accent-[var(--success)]" />
      {props.label}
    </label>
  );
}

function DomainChecker({ chosen, onChoose }: { chosen: string; onChoose: (d: string) => void }) {
  const [query, setQuery] = useState(chosen.replace(/\.[a-z.]+$/, ""));
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/domaine?nom=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La vérification a échoué.");
    }
    setLoading(false);
  }

  const LABELS = {
    disponible: { text: "Disponible", tone: "text-success" },
    pris: { text: "Déjà pris", tone: "text-muted line-through" },
    inconnu: { text: "À vérifier chez Ionos", tone: "text-muted" },
  };

  return (
    <div className="space-y-3">
      <form onSubmit={check} className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Ex. : boulangerie-lumiere" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Nom de domaine souhaité" />
        <button className="btn-primary shrink-0" disabled={loading}>{loading ? "Vérification…" : "Vérifier"}</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {results && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {results.map((r) => (
            <li key={r.domain} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className={`font-semibold ${r.status === "pris" ? "text-muted line-through" : ""}`}>{r.domain}</span>
              <span className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${LABELS[r.status].tone}`}>{LABELS[r.status].text}</span>
                {r.status !== "pris" &&
                  (chosen === r.domain ? (
                    <span className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">Choisi ✓</span>
                  ) : (
                    <button type="button" className="rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand-soft" onClick={() => onChoose(r.domain)}>
                      Choisir
                    </button>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {chosen && !results && (
        <p className="text-sm">
          Domaine choisi : <strong>{chosen}</strong>
        </p>
      )}
      <p className="text-xs text-muted">
        Résultat indicatif : la disponibilité est confirmée au moment de l&apos;achat. Conseils : court, facile à épeler, sans accent ; le .fr inspire confiance en France.
      </p>
    </div>
  );
}

function CredentialsForm({ briefId, credentials }: { briefId: string; credentials: Credential[] }) {
  const [service, setService] = useState<string>(CREDENTIAL_SERVICES[0]);
  const [otherService, setOtherService] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await sendCredentials(briefId, {
      service: service === "Autre" ? otherService : service,
      login,
      password,
      note,
    });
    setPending(false);
    if (res.ok) {
      setLogin("");
      setPassword("");
      setNote("");
      setOtherService("");
      setMessage({ ok: true, text: "Accès envoyés de façon sécurisée. Merci !" });
    } else {
      setMessage({ ok: false, text: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
        🔒 Vos identifiants sont chiffrés dès l&apos;envoi : seule Aspyre Studio peut les lire, et ils sont supprimés
        après l&apos;installation. Ne les envoyez jamais par e-mail ou SMS.
      </p>

      {credentials.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {credentials.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">✓ {c.service}</span>
                <span className="ml-2 text-xs text-muted">
                  envoyé le {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </span>
              </span>
              <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => deleteOwnCredential(briefId, c.id)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cred-service">Service</label>
            <select id="cred-service" className="input" value={service} onChange={(e) => setService(e.target.value)}>
              {CREDENTIAL_SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {service === "Autre" && (
            <div>
              <label className="label" htmlFor="cred-other">Lequel ?</label>
              <input id="cred-other" className="input" value={otherService} onChange={(e) => setOtherService(e.target.value)} placeholder="Ex. : Google Business" />
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cred-login">Identifiant ou e-mail</label>
            <input id="cred-login" className="input" autoComplete="off" value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="cred-password">Mot de passe</label>
            <div className="relative">
              <input
                id="cred-password"
                className="input pr-20"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand" onClick={() => setShow((v) => !v)}>
                {show ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cred-note">Précision (facultatif)</label>
          <input
            id="cred-note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. : un code de validation est envoyé sur mon téléphone"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer ces accès en sécurité"}</button>
          {message && <p className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
        </div>
      </form>
      <p className="text-xs text-muted">
        Une fois votre site livré, je vous conseille de changer vos mots de passe.
      </p>
    </div>
  );
}
