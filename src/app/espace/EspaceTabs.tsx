"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/espace", label: "Mon brief", icon: "📝" },
  { href: "/espace/domaine", label: "Domaine & licences", icon: "🌐" },
  { href: "/espace/suivi", label: "Suivi du projet", icon: "🚀" },
];

export function EspaceTabs() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-line bg-surface/60">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
                active ? "border-brand font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
