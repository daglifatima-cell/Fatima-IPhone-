import Link from "next/link";
import { Logo } from "@/components/Logo";

const STEPS = [
  { n: "01", title: "Vous recevez une invitation", text: "Un lien personnel et sécurisé, sans mot de passe à retenir." },
  { n: "02", title: "Vous remplissez votre brief", text: "À votre rythme : tout est enregistré automatiquement." },
  { n: "03", title: "Vous déposez vos fichiers", text: "Logo, photos, textes… tout au même endroit." },
  { n: "04", title: "Je crée votre site", text: "Avec toutes les informations en main, on avance vite et bien." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <Link href="/connexion" className="btn-ghost">Se connecter</Link>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-20">
        <p className="mb-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
          Espace client
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Donnons vie à <span className="aspyre-gradient-text">votre site internet</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Bienvenue dans votre espace Aspyre Studio. Partagez votre projet, votre univers et vos contenus :
          je m&apos;occupe du reste.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/connexion" className="btn-primary !px-7 !py-3 text-base">Accéder à mon espace</Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card">
            <p className="font-display text-3xl font-semibold text-brand">{s.n}</p>
            <h2 className="mt-3 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-line py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} Aspyre Studio
      </footer>
    </main>
  );
}
