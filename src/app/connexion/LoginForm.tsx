"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <p className="text-4xl">✉️</p>
        <h2 className="mt-3 font-display text-2xl font-semibold">Vérifiez votre boîte mail</h2>
        <p className="mt-2 text-muted">
          Si <strong className="text-foreground">{state.message}</strong> correspond à un espace client,
          vous allez recevoir un lien de connexion. Pensez à regarder dans les spams.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Votre adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="vous@exemple.fr" />
      </div>
      {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      <button className="btn-primary w-full !py-3" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
      <p className="text-center text-xs text-muted">
        Pas encore d&apos;accès ? L&apos;espace client est ouvert sur invitation.
      </p>
    </form>
  );
}
