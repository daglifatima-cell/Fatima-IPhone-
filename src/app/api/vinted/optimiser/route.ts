import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TITLE_TARGET, type Optimisation } from "@/lib/vinted";

// Outil Vinted : réécrit le titre et la description d'une annonce pour qu'elle
// ressorte mieux dans la recherche et rassure les acheteurs.

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";

const SYSTEM = `Tu es une vendeuse Vinted expérimentée, en France, qui aide à rédiger des annonces qui se vendent vite.

Règles pour le TITRE :
- ${TITLE_TARGET} caractères maximum, en français.
- Ordre : Marque + type d'article précis + détail clé (couleur, matière, modèle, coupe) + taille si pertinent.
- Utilise les mots que les acheteurs tapent vraiment dans la recherche Vinted (ex. « jean mom », « doudoune sans manches », « sneakers »).
- Pas de majuscules partout, pas d'emojis, pas de « !!! », pas de mots vides comme « magnifique » ou « superbe ».
- Si la marque est inconnue ou absente, commence par le type d'article.

Règles pour la DESCRIPTION :
- Courte, aérée, facile à lire sur téléphone (lignes courtes, quelques emojis sobres en début de ligne autorisés).
- 1 phrase d'accroche qui donne envie (style, occasion de porter, à quoi l'associer).
- Puis les infos clés, une par ligne : marque, taille (et comment ça taille si connu), couleur, matière, état.
- L'état doit être honnête : mentionne les défauts indiqués par la vendeuse, ça évite les litiges et rassure.
- Une ligne pratique : envoi rapide et soigné, remise possible sur les lots.
- Termine par une ligne de mots-clés utiles (synonymes, style, saison), sans répéter le titre mot pour mot, 5 à 8 mots maximum.

Règles d'honnêteté (très important) :
- N'invente JAMAIS une information absente (matière, mesures, défaut, référence, prix d'achat, authenticité).
- Si une info utile manque, ne la mets pas : liste-la dans « infos_manquantes ».

« conseil_prix » : une phrase sur la stratégie de prix (prix rond, marge pour la négociation, baisse légère à la republication…).
Tu n'as pas accès aux prix du marché : ne donne pas de prix « moyen constaté ».
« conseils » : 2 à 4 conseils concrets et courts pour vendre plus vite CET article (photos, moment de publication, lot…).`;

const SCHEMA = {
  type: "object",
  properties: {
    titre: { type: "string" },
    description: { type: "string" },
    conseil_prix: { type: "string" },
    infos_manquantes: { type: "array", items: { type: "string" } },
    conseils: { type: "array", items: { type: "string" } },
  },
  required: ["titre", "description", "conseil_prix", "infos_manquantes", "conseils"],
  additionalProperties: false,
};

const FIELDS = [
  ["title", "Titre actuel"],
  ["description", "Description actuelle"],
  ["brand", "Marque"],
  ["category", "Type d'article"],
  ["size", "Taille"],
  ["color", "Couleur"],
  ["condition", "État"],
  ["price", "Prix (€)"],
  ["notes", "Notes de la vendeuse (matière, défauts, mesures…)"],
] as const;

export async function POST(request: NextRequest) {
  // Réservé à l'administratrice.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connectée." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Réservé à l'administratrice." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Ajoute ANTHROPIC_API_KEY dans Vercel pour activer l'optimisation." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lines = FIELDS.map(([key, label]) => {
    const v = body[key];
    const text = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().slice(0, 3000) : "";
    return text ? `${label} : ${text}` : null;
  }).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ error: "Remplis au moins le titre ou quelques infos sur l'article." }, { status: 400 });

  const variante = body.variante === true;
  const prompt =
    `Voici l'annonce :\n\n${lines.join("\n")}\n\n` +
    (variante
      ? "L'annonce va être republiée : propose une NOUVELLE formulation (titre et accroche différents de l'actuel, mêmes infos), pour qu'elle paraisse neuve."
      : "Optimise le titre et la description.");

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Cette annonce n'a pas pu être optimisée. Reformule les infos et réessaie." }, { status: 422 });
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const result = JSON.parse(text) as Optimisation;
    return NextResponse.json(result);
  } catch (e) {
    console.error("Vinted : optimisation impossible :", e);
    return NextResponse.json({ error: "L'optimisation a échoué, réessaie dans un instant." }, { status: 502 });
  }
}
