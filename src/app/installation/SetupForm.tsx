"use client";

import { useActionState } from "react";
import { createFirstAdmin, type SetupState } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(createFirstAdmin, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Ton adresse e-mail</label>
        <input id="email" name="email" type="email" required className="input" placeholder="toi@aspyre-studio.fr" />
      </div>
      <div>
        <label className="label" htmlFor="secret">Ta clé secrète Supabase</label>
        <input id="secret" name="secret" type="password" required className="input" autoComplete="off" placeholder="La même que dans Vercel (SUPABASE_SERVICE_ROLE_KEY)" />
        <p className="mt-1 text-xs text-muted">Elle prouve que c&apos;est bien toi. Elle n&apos;est ni affichée ni enregistrée.</p>
      </div>
      {state.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte et me connecter"}
      </button>
    </form>
  );
}
