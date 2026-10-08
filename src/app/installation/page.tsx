import Link from "next/link";
import { Logo } from "@/components/Logo";
import { emailEnabled } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; label: string; fix: string };

async function diagnose() {
  const env =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  let db = false;
  let adminExists = false;
  if (env) {
    const admin = createAdminClient();
    const { error } = await admin.from("project_messages").select("id", { head: true, count: "exact" });
    db = !error;
    if (db) {
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      adminExists = !!count;
    }
  }
  const checks: Check[] = [
    { ok: env, label: "Connexion à Supabase", fix: "Ajoute les 3 réglages Supabase dans Vercel (Settings → Environment Variables), puis Redeploy." },
    { ok: db, label: "Base de données prête", fix: "Dans Supabase → SQL Editor, colle tout le fichier supabase/schema.sql et clique sur Run, puis recharge cette page." },
    { ok: emailEnabled(), label: "Envoi des e-mails (Resend)", fix: "Ajoute RESEND_API_KEY et EMAIL_FROM dans Vercel, puis Redeploy. Sans cela, invitations et connexions ne pourront pas partir correctement." },
  ];
  return { checks, ready: env && db, adminExists };
}

export default async function InstallationPage() {
  const { checks, ready, adminExists } = await diagnose();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card space-y-6 !p-8">
          {adminExists ? (
            <div className="text-center">
              <p className="text-4xl">✅</p>
              <h1 className="mt-3 font-display text-2xl font-semibold">Installation terminée</h1>
              <p className="mt-2 text-muted">Ton compte administratrice existe déjà.</p>
              <Link href="/connexion" className="btn-primary mt-6">Se connecter</Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-semibold">Installation</h1>
                <p className="text-sm text-muted">Vérification de ta configuration, puis création de ton compte.</p>
              </div>
              <ul className="space-y-3">
                {checks.map((c) => (
                  <li key={c.label} className="flex gap-3 text-sm">
                    <span>{c.ok ? "✅" : "❌"}</span>
                    <span>
                      <span className="font-semibold">{c.label}</span>
                      {!c.ok && <span className="block text-muted">{c.fix}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {ready ? (
                <div className="border-t border-line pt-6">
                  <h2 className="mb-4 font-semibold">Créer ton compte administratrice</h2>
                  <SetupForm />
                </div>
              ) : (
                <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">Corrige les points ❌ ci-dessus, puis recharge cette page.</p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
