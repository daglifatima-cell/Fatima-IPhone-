import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

const ERRORS: Record<string, string> = {
  lien: "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau ci-dessous.",
  profil: "Votre compte est incomplet. Contactez Aspyre Studio.",
};

export default async function LoginPage(props: PageProps<"/connexion">) {
  const { erreur } = await props.searchParams;
  const message = typeof erreur === "string" ? ERRORS[erreur] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card !p-8">
          <h1 className="mb-1 font-display text-2xl font-semibold">Connexion</h1>
          <p className="mb-6 text-sm text-muted">Recevez un lien sécurisé par e-mail, sans mot de passe.</p>
          {message && <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
