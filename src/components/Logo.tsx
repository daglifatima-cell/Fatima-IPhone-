import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="aspyre-gradient grid h-9 w-9 place-items-center rounded-xl text-white shadow-md">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 20 12 4l8 16" />
          <path d="M8.5 13.5h7" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">
        Aspyre <span className="font-normal text-muted">Studio</span>
      </span>
    </Link>
  );
}
