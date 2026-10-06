import { Logo } from "@/components/Logo";

export function Header({ email, home = "/" }: { email?: string; home?: string }) {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo href={home} />
        {email && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{email}</span>
            <form action="/auth/deconnexion" method="post">
              <button className="btn-ghost !px-4 !py-2">Se déconnecter</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
