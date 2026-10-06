"use client";

import { useState, useTransition } from "react";
import { STATUS_LABELS } from "@/lib/brief-schema";
import { saveBriefNotes, updateBriefStatus } from "../../actions";

export function StatusSelect({ briefId, status }: { briefId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select
      className="input !w-auto"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => start(() => updateBriefStatus(briefId, e.target.value))}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}

export function NotesEditor({ briefId, initial }: { briefId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  return (
    <div className="space-y-2">
      <textarea
        className="input min-h-32"
        value={notes}
        placeholder="Notes privées (jamais visibles par le client)…"
        onChange={(e) => {
          setNotes(e.target.value);
          setState("idle");
        }}
      />
      <button
        type="button"
        className="btn-ghost"
        disabled={state === "saving"}
        onClick={async () => {
          setState("saving");
          await saveBriefNotes(briefId, notes);
          setState("saved");
        }}
      >
        {state === "saving" ? "Enregistrement…" : state === "saved" ? "Enregistré ✓" : "Enregistrer les notes"}
      </button>
    </div>
  );
}

export function CopyMarkdown({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copié ✓" : "Copier pour Claude"}
    </button>
  );
}
