import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vérifie la disponibilité d'un nom de domaine via RDAP (registre public).
// 404 = aucun enregistrement = a priori disponible.

const EXTENSIONS = ["fr", "com", "net", "eu"];

type Availability = "disponible" | "pris" | "inconnu";

async function check(domain: string): Promise<Availability> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (res.status === 404) return "disponible";
    if (res.ok) return "pris";
    return "inconnu";
  } catch {
    return "inconnu";
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const raw = (request.nextUrl.searchParams.get("nom") ?? "").trim().toLowerCase();
  // « Ma Boulangerie.fr » -> base « ma-boulangerie », extension demandée « fr »
  const [, base = "", ext] = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").match(/^([^.]*)(?:\.(.+))?$/) ?? [];
  const label = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!label || label.length > 63) {
    return NextResponse.json({ error: "Nom de domaine invalide" }, { status: 400 });
  }

  const extensions = ext && /^[a-z.]{2,20}$/.test(ext) ? [ext, ...EXTENSIONS.filter((e) => e !== ext)] : EXTENSIONS;
  const results = await Promise.all(
    extensions.map(async (e) => ({ domain: `${label}.${e}`, status: await check(`${label}.${e}`) })),
  );
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
