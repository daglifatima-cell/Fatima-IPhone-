"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteClient, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteClient, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Inviter un client</h2>
        <p className="text-sm text-muted">Il recevra un e-mail avec un lien d&apos;accès à son espace.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="full_name" className="input" placeholder="Nom du client" />
        <input name="company" className="input" placeholder="Entreprise" />
        <input name="email" type="email" required className="input" placeholder="E-mail *" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer l'invitation"}</button>
        {state.message && (
          <p className={`text-sm ${state.status === "ok" ? "text-success" : "text-danger"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
