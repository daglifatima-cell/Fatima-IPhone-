"use client";

import { useState, useTransition } from "react";
import { PROJECT_STEPS } from "@/lib/project";
import { adminSendMessage, deleteCredential, revealCredential, updateProject } from "../../actions";

export function ProjectEditor(props: { briefId: string; step: number; maquetteUrl: string }) {
  const [step, setStep] = useState(props.step);
  const [url, setUrl] = useState(props.maquetteUrl);
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="space-y-3">
      <select className="input" value={step} onChange={(e) => setStep(Number(e.target.value))}>
        {PROJECT_STEPS.map((s, i) => (
          <option key={s.title} value={i}>{i + 1}. {s.title}</option>
        ))}
      </select>
      <input className="input" placeholder="Lien de la maquette (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await updateProject(props.briefId, { project_step: step, maquette_url: url });
              setState({ ok: true, text: "Enregistré — le client est prévenu par e-mail." });
            } catch (e) {
              setState({ ok: false, text: e instanceof Error ? e.message : "Erreur" });
            }
          })
        }
      >
        {pending ? "Enregistrement…" : "Mettre à jour le suivi"}
      </button>
      {state && <p className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.text}</p>}
    </div>
  );
}

export function CredentialRow(props: { briefId: string; id: string; service: string; createdAt: string }) {
  const [secret, setSecret] = useState<{ login: string; password: string; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className="space-y-2 rounded-xl border border-line p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>
          <span className="font-semibold">{props.service}</span>
          <span className="block text-xs text-muted">reçu le {new Date(props.createdAt).toLocaleDateString("fr-FR")}</span>
        </span>
        <span className="flex gap-3 text-xs font-semibold">
          <button
            type="button"
            className="text-brand"
            disabled={pending}
            onClick={() =>
              secret
                ? setSecret(null)
                : start(async () => {
                    try {
                      setSecret(await revealCredential(props.id));
                    } catch {
                      setError("Déchiffrement impossible (clé de chiffrement manquante ?)");
                    }
                  })
            }
          >
            {secret ? "Masquer" : "Afficher"}
          </button>
          <button
            type="button"
            className="text-muted hover:text-danger"
            onClick={() => window.confirm("Supprimer définitivement ces accès ?") && start(() => deleteCredential(props.briefId, props.id))}
          >
            Supprimer
          </button>
        </span>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {secret && (
        <dl className="space-y-1 rounded-lg bg-background p-3 font-mono text-xs">
          <CopyLine label="Identifiant" value={secret.login} />
          <CopyLine label="Mot de passe" value={secret.password} />
          {secret.note && <p className="font-sans text-muted">📝 {secret.note}</p>}
        </dl>
      )}
    </li>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate">
        <span className="font-sans text-muted">{label} : </span>
        {value}
      </span>
      <button
        type="button"
        className="shrink-0 font-sans text-brand"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}

export function AdminMessageComposer({ briefId }: { briefId: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <textarea className="input min-h-24" placeholder="Écrire au client (il est prévenu par e-mail)…" value={text} onChange={(e) => setText(e.target.value)} />
      <button
        type="button"
        className="btn-primary"
        disabled={pending || !text.trim()}
        onClick={() => start(async () => {
          await adminSendMessage(briefId, text);
          setText("");
        })}
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </div>
  );
}
