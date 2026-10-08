"use client";

import { useState } from "react";
import { sendClientMessage } from "../actions";

export function MessageComposer({ briefId }: { briefId: string }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    const res = await sendClientMessage(briefId, "message", text);
    setPending(false);
    if (res.ok) setText("");
    else setError(res.error);
  }

  return (
    <div className="space-y-3">
      <textarea className="input min-h-24" placeholder="Une question, une précision ? Écrivez-moi ici." value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={send} disabled={pending || !text.trim()}>
          {pending ? "Envoi…" : "Envoyer"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

export function MaquetteReview({ briefId }: { briefId: string }) {
  const [mode, setMode] = useState<"choice" | "changes">("choice");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: "validation" | "modifications") {
    if (kind === "validation" && !window.confirm("Confirmez-vous valider la maquette ?")) return;
    setPending(true);
    setError(null);
    const res = await sendClientMessage(briefId, kind, text);
    setPending(false);
    if (res.ok) {
      setText("");
      setMode("choice");
    } else setError(res.error);
  }

  if (mode === "changes") {
    return (
      <div className="space-y-3">
        <label className="label" htmlFor="modifs">Quelles modifications souhaitez-vous ?</label>
        <textarea
          id="modifs"
          className="input min-h-32"
          placeholder={"Page Accueil : agrandir le logo\nPage Services : remplacer la 2e photo…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={pending || !text.trim()} onClick={() => send("modifications")}>
            {pending ? "Envoi…" : "Envoyer mes demandes"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setMode("choice")}>Annuler</button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn btn-primary !bg-success" disabled={pending} onClick={() => send("validation")}>
        ✅ Je valide la maquette
      </button>
      <button type="button" className="btn-ghost" onClick={() => setMode("changes")}>✏️ Demander des modifications</button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
