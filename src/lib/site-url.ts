import "server-only";
import { headers } from "next/headers";

/**
 * Adresse publique de la plateforme : NEXT_PUBLIC_SITE_URL si elle est
 * définie, sinon déduite automatiquement de la requête en cours.
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
