"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Arrivée des invitations envoyées par les e-mails par défaut de Supabase
// (utilisé seulement si Resend n'est pas configuré) : la session est dans l'URL.
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      window.location.replace(`/auth/confirm?code=${encodeURIComponent(code)}&next=/espace`);
      return;
    }
    if (!access_token || !refresh_token) {
      router.replace("/connexion?erreur=lien");
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => router.replace(error ? "/connexion?erreur=lien" : "/espace"));
  }, [router]);

  return <p className="m-auto p-10 text-muted">Connexion en cours…</p>;
}
