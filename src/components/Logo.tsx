import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <span className="brand-wordmark">Aspyre</span>
      <span className="brand-tag">Espace client</span>
    </Link>
  );
}
