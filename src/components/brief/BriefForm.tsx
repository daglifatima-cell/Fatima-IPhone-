"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BRIEF_SECTIONS,
  briefProgress,
  isFilled,
  missingRequired,
  type BriefData,
  type FieldValue,
} from "@/lib/brief-schema";
import { createClient } from "@/lib/supabase/client";
import { submitBrief } from "@/app/espace/actions";
import { FieldInput, otherKey } from "./FieldInput";

type Brief = {
  id: string;
  status: string;
  data: BriefData;
  submitted_at: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function BriefForm({ brief, userId, firstName }: { brief: Brief; userId: string; firstName: string }) {
  const [data, setData] = useState<BriefData>(brief.data ?? {});
  const [status, setStatus] = useState(brief.status);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dirty = useRef(false);

  const locked = status === "en_cours" || status === "termine";
  const isRecap = step === BRIEF_SECTIONS.length;
  const section = BRIEF_SECTIONS[step];
  const progress = briefProgress(data);
  const missing = useMemo(() => missingRequired(data), [data]);

  const save = useCallback(
    async (next: BriefData) => {
      setSaveState("saving");
      const { error } = await createClient().from("briefs").update({ data: next }).eq("id", brief.id);
      if (error) {
        setSaveState("error");
        return false;
      }
      dirty.current = false;
      setSaveState("saved");
      setSavedAt(new Date());
      return true;
    },
    [brief.id],
  );

  // Sauvegarde automatique, 1 s après la dernière modification.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => save(data), 1000);
    return () => clearTimeout(t);
  }, [data, save]);

  // Prévenir si le client ferme l'onglet avant la fin de l'enregistrement.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function update(key: string, value: FieldValue) {
    dirty.current = true;
    setData((d) => ({ ...d, [key]: value }));
  }

  function goTo(i: number) {
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitError(null);
    if (missing.length) {
      setSubmitError("Il reste quelques questions obligatoires à compléter.");
      return;
    }
    setSubmitting(true);
    const ok = await save(data);
    if (ok) {
      const res = await submitBrief(brief.id);
      if (!res.ok) setSubmitError(res.error);
      else setStatus("envoye");
    } else {
      setSubmitError("L'enregistrement a échoué. Vérifiez votre connexion.");
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
      {/* Navigation des étapes */}
      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <p className="text-sm text-muted">Bonjour {firstName} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Votre brief</h1>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <div className="aspyre-gradient h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">{progress}% complété</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {[...BRIEF_SECTIONS.map((s) => s.title), "Récapitulatif & envoi"].map((title, i) => {
            const s = BRIEF_SECTIONS[i];
            const required = s?.fields.filter((f) => f.required) ?? [];
            // Section sans question obligatoire : terminée dès qu'une réponse est donnée.
            const done = s
              ? required.length
                ? required.every((f) => isFilled(data[f.id]))
                : s.fields.some((f) => isFilled(data[f.id]))
              : false;
            return (
              <button
                key={title}
                type="button"
                onClick={() => goTo(i)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  i === step ? "bg-surface font-semibold shadow-sm ring-1 ring-line" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    done ? "bg-success text-white" : i === step ? "bg-brand text-brand-ink" : "bg-line text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {title}
              </button>
            );
          })}
        </nav>

        <p className="mt-2 text-xs text-muted lg:mt-4">
          {saveState === "saving" && "Enregistrement…"}
          {saveState === "saved" && savedAt && `Enregistré à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
          {saveState === "error" && <span className="text-danger">Échec de l&apos;enregistrement — vérifiez votre connexion.</span>}
          {saveState === "idle" && "Vos réponses sont enregistrées automatiquement."}
        </p>
      </aside>

      <section className="min-w-0">
        <StatusBanner status={status} />

        {!isRecap && section && (
          <div className="card !p-6 sm:!p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              Étape {step + 1} sur {BRIEF_SECTIONS.length}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-muted">{section.intro}</p>

            <div className="mt-8 space-y-7">
              {section.fields.map((field) => (
                <div key={field.id}>
                  <label htmlFor={`f-${field.id}`} className="label">
                    {field.label}
                    {field.required && <span className="ml-1 text-accent">*</span>}
                  </label>
                  {field.help && <p className="-mt-0.5 mb-2 text-xs text-muted">{field.help}</p>}
                  <FieldInput
                    field={field}
                    value={data[field.id]}
                    otherValue={typeof data[otherKey(field.id)] === "string" ? (data[otherKey(field.id)] as string) : ""}
                    onChange={(v) => update(field.id, v)}
                    onOtherChange={(v) => update(otherKey(field.id), v)}
                    disabled={locked}
                    storagePrefix={`${userId}/${brief.id}`}
                    data={data}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isRecap && (
          <div className="card !p-6 sm:!p-8">
            <h2 className="font-display text-3xl font-semibold">Récapitulatif</h2>
            {missing.length > 0 ? (
              <>
                <p className="mt-2 text-muted">Presque terminé ! Il reste quelques questions obligatoires :</p>
                <ul className="mt-6 space-y-4">
                  {missing.map(({ section: s, fields }) => (
                    <li key={s.id} className="rounded-xl border border-line p-4">
                      <button
                        type="button"
                        className="font-semibold text-brand hover:underline"
                        onClick={() => goTo(BRIEF_SECTIONS.indexOf(s))}
                      >
                        {s.title} →
                      </button>
                      <ul className="mt-2 list-inside list-disc text-sm text-muted">
                        {fields.map((f) => (
                          <li key={f.id}>{f.label}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted">
                Toutes les questions obligatoires sont remplies ({progress}% du questionnaire complété).
                {status === "brouillon" && " Vous pouvez m'envoyer votre brief !"}
              </p>
            )}

            {status === "brouillon" && (
              <div className="mt-8">
                {submitError && <p className="mb-3 text-sm text-danger">{submitError}</p>}
                <button type="button" className="btn-primary !px-7 !py-3 text-base" onClick={submit} disabled={submitting || missing.length > 0}>
                  {submitting ? "Envoi…" : "Envoyer mon brief à Aspyre Studio"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
            ← Précédent
          </button>
          {!isRecap && (
            <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>
              Suivant →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  const banners: Record<string, { tone: string; text: string }> = {
    envoye: {
      tone: "bg-success/10 text-success",
      text: "Merci ! Votre brief a bien été envoyé. Vous pouvez encore le compléter : vos modifications me parviennent automatiquement.",
    },
    en_cours: {
      tone: "bg-brand-soft text-brand",
      text: "La création de votre site est en cours 🎨 Le brief est maintenant verrouillé. Pour toute modification, contactez-moi directement.",
    },
    termine: {
      tone: "bg-brand-soft text-brand",
      text: "Votre projet est terminé. Merci pour votre confiance ✨",
    },
  };
  const b = banners[status];
  if (!b) return null;
  return <p className={`mb-6 rounded-2xl px-5 py-4 text-sm font-medium ${b.tone}`}>{b.text}</p>;
}
