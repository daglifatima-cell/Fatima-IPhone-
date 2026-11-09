// Optimisation des annonces Vinted SANS clé API :
// 1. un générateur intégré (règles de rédaction, instantané, gratuit) ;
// 2. une demande toute prête à ouvrir dans l'app Claude (abonnement habituel), dont on recolle la réponse.

import { TITLE_TARGET, type ListingInput, type Optimisation } from "@/lib/vinted";

type Input = Partial<ListingInput>;

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];

/** Mots que les acheteurs tapent aussi dans la recherche, par type d'article. */
const SYNONYMS: [RegExp, string[]][] = [
  [/jean|denim/i, ["jean", "denim", "pantalon"]],
  [/pantalon|chino|cargo/i, ["pantalon", "bas", "casual"]],
  [/legging/i, ["legging", "sport", "yoga"]],
  [/robe/i, ["robe", "tenue", "soirée", "été"]],
  [/jupe/i, ["jupe", "midi", "tenue"]],
  [/short/i, ["short", "été", "casual"]],
  [/t-?shirt|tee/i, ["t-shirt", "tee shirt", "haut", "basique"]],
  [/top|débardeur|debardeur|crop/i, ["top", "haut", "été"]],
  [/chemise|blouse|chemisier/i, ["chemise", "blouse", "haut"]],
  [/pull|tricot|gilet|cardigan/i, ["pull", "maille", "tricot", "hiver", "cosy"]],
  [/sweat|hoodie/i, ["sweat", "hoodie", "streetwear", "cosy"]],
  [/doudoune/i, ["doudoune", "manteau", "hiver", "chaud"]],
  [/manteau|trench|parka/i, ["manteau", "veste", "hiver", "mi-saison"]],
  [/veste|blazer|blouson/i, ["veste", "blazer", "mi-saison"]],
  [/basket|sneaker|tennis/i, ["baskets", "sneakers", "chaussures", "streetwear"]],
  [/botte|bottine|boots/i, ["bottines", "boots", "chaussures", "hiver"]],
  [/sandale|claquette|mule/i, ["sandales", "chaussures", "été"]],
  [/escarpin|talon/i, ["escarpins", "talons", "chaussures", "soirée"]],
  [/sac|pochette|cabas/i, ["sac", "sac à main", "accessoire"]],
  [/bijou|collier|bracelet|boucle/i, ["bijou", "accessoire", "cadeau"]],
  [/maillot|bikini/i, ["maillot de bain", "bikini", "plage", "été"]],
  [/pyjama/i, ["pyjama", "homewear", "cocooning"]],
];

function keywords(i: Input, seed: number) {
  const hay = `${i.category} ${i.title}`;
  const found = SYNONYMS.find(([re]) => re.test(hay))?.[1] ?? [];
  const extra = [clean(i.color).toLowerCase(), "vintage", "tendance", "seconde main"];
  const titleWords = new Set(clean(i.title).toLowerCase().split(" "));
  const all = [...new Set([...found, ...extra])].filter((w) => w && !titleWords.has(w));
  // Ordre légèrement différent selon la version pour varier à chaque republication.
  return (seed % 2 ? all.reverse() : all).slice(0, 6);
}

function conditionShort(c: string) {
  if (/avec étiquette/i.test(c)) return "neuf avec étiquette";
  if (/neuf/i.test(c)) return "neuf";
  if (/très bon/i.test(c)) return "très bon état";
  return "";
}

/** Titre : Marque + article + couleur + taille + état, en retirant le moins utile si c'est trop long. */
function buildTitle(i: Input, seed: number) {
  const brand = clean(i.brand);
  const category = clean(i.category).toLowerCase() || clean(i.title);
  const color = clean(i.color).toLowerCase();
  const size = clean(i.size);
  const sizeText = size ? (/^\d/.test(size) ? `taille ${size}` : size.toUpperCase()) : "";
  const state = conditionShort(clean(i.condition));

  const orders = [
    [brand, category, color, sizeText, state],
    [category, brand, color, sizeText, state],
    [brand, category, sizeText, color, state],
  ];
  // Parties retirées en premier si le titre dépasse la limite.
  let parts = pick(orders, seed).filter(Boolean);
  for (const drop of [state, color, sizeText]) {
    if (parts.join(" ").length <= TITLE_TARGET) break;
    if (drop) parts = parts.filter((p) => p !== drop);
  }
  let title = parts.join(" ");
  if (title.length > TITLE_TARGET) title = title.slice(0, TITLE_TARGET).replace(/\s+\S*$/, "");
  return cap(title.replace(/\s+/g, " ").trim());
}

const HOOKS = [
  (a: string) => `Jolie pièce ${a} à adopter, facile à porter au quotidien.`,
  (a: string) => `${cap(a)} qui s'associe avec tout : parfait pour compléter ta garde-robe.`,
  (a: string) => `Un indispensable ${a}, idéal pour des tenues simples et stylées.`,
  (a: string) => `${cap(a)} coup de cœur, prêt à vivre une nouvelle vie chez toi.`,
];

function buildDescription(i: Input, seed: number) {
  const article = [clean(i.category).toLowerCase() || "article", clean(i.brand)].filter(Boolean).join(" ");
  const lines: string[] = [pick(HOOKS, seed)(article), ""];
  if (clean(i.brand)) lines.push(`🏷️ Marque : ${clean(i.brand)}`);
  if (clean(i.size)) lines.push(`📏 Taille : ${clean(i.size)}`);
  if (clean(i.color)) lines.push(`🎨 Couleur : ${clean(i.color)}`);
  if (clean(i.condition)) lines.push(`✨ État : ${clean(i.condition)}`);

  // Les notes de la vendeuse (matière, défauts, mesures) sont reprises telles quelles : rien n'est inventé.
  const notes = (i.notes ?? "").trim();
  const oldDescription = (i.description ?? "").trim();
  const details = notes || (oldDescription && !oldDescription.includes("📦") ? oldDescription : "");
  if (details) lines.push(`📝 ${details.split(/\n+/).map((l) => l.trim()).filter(Boolean).join("\n📝 ")}`);

  lines.push("", "📦 Envoi rapide et soigné", pick(["💬 Remise sur les lots, n'hésite pas à regarder mon dressing !", "💬 Lots possibles avec mes autres articles 😊"], seed));
  const kw = keywords(i, seed);
  if (kw.length) lines.push("", kw.join(" · "));
  return lines.join("\n");
}

function missing(i: Input) {
  const out: string[] = [];
  if (!clean(i.brand)) out.push("La marque (c'est le 1er mot recherché)");
  if (!clean(i.size)) out.push("La taille");
  if (!clean(i.color)) out.push("La couleur");
  if (!clean(i.condition)) out.push("L'état");
  if (!/cm|matière|coton|laine|cuir|polyester|lin|soie|viscose/i.test(`${i.notes} ${i.description}`)) out.push("La matière et quelques mesures (longueur, largeur)");
  if (i.price === null || i.price === undefined) out.push("Le prix");
  return out;
}

export function optimiseLocal(i: Input, variante = false): Optimisation {
  const seed = variante ? Math.floor(Math.random() * 1000) + 1 : 0;
  const price = typeof i.price === "number" ? i.price : null;
  const conseil_prix =
    price === null
      ? "Choisis un prix rond et garde 10 à 15 % de marge : la plupart des acheteurs font une offre."
      : price >= 10 && price % 1 !== 0
        ? `Arrondis à ${Math.round(price)} € : les prix ronds rassurent et laissent de la place à une offre.`
        : `À ${price.toLocaleString("fr-FR")} €, garde une petite marge pour accepter une offre ; baisse de 5 % à chaque republication si ça ne part pas.`;

  return {
    titre: buildTitle(i, seed),
    description: buildDescription(i, seed),
    conseil_prix,
    infos_manquantes: missing(i),
    conseils: [
      "1re photo à la lumière du jour, sur fond clair, article bien à plat ou porté.",
      "Publie ou republie le soir (19 h – 22 h) ou le dimanche : c'est là qu'il y a le plus d'acheteurs.",
      "Réponds vite aux messages et accepte les offres raisonnables : Vinted met en avant les vendeuses actives.",
    ],
  };
}

// ---------------------------------------------------------------------
// Demande pour l'app Claude (sans clé API)
// ---------------------------------------------------------------------

const FIELDS: [keyof ListingInput, string][] = [
  ["title", "Titre actuel"],
  ["description", "Description actuelle"],
  ["brand", "Marque"],
  ["category", "Type d'article"],
  ["size", "Taille"],
  ["color", "Couleur"],
  ["condition", "État"],
  ["price", "Prix (€)"],
  ["notes", "Infos en plus (matière, défauts, mesures…)"],
];

export function claudePrompt(i: Input, variante = false) {
  const lines = FIELDS.map(([k, label]) => {
    const v = i[k];
    const text = typeof v === "number" ? String(v) : clean(typeof v === "string" ? v : "");
    return text ? `${label} : ${k === "description" || k === "notes" ? (v as string).trim() : text}` : null;
  }).filter(Boolean);

  return `Tu es une vendeuse Vinted expérimentée en France. ${variante ? "Je republie cette annonce : propose une NOUVELLE formulation (titre et accroche différents de l'actuel, mêmes infos)." : "Optimise cette annonce pour qu'elle se vende plus vite."}

${lines.join("\n")}

Règles :
- Titre : ${TITLE_TARGET} caractères max. Marque + type d'article précis + détail clé (couleur, matière, coupe) + taille. Mots que les acheteurs tapent dans la recherche. Pas de majuscules partout, pas d'emojis.
- Description : courte et aérée pour téléphone. 1 phrase d'accroche, puis une info par ligne (marque, taille, couleur, matière, état honnête avec les défauts), une ligne « envoi rapide et soigné, remise sur les lots », et une dernière ligne de 5 à 8 mots-clés utiles.
- N'invente JAMAIS une info absente (matière, mesures, défaut, authenticité).

Réponds EXACTEMENT dans ce format, sans rien d'autre :
TITRE :
(le titre)
DESCRIPTION :
(la description)
CONSEILS :
(2 à 4 conseils courts pour vendre cet article plus vite, un par ligne)`;
}

/** Lien qui ouvre Claude avec la demande déjà écrite. */
export function claudeUrl(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** Lit la réponse de Claude recollée dans l'app. */
export function parseClaudeReply(text: string): Optimisation | null {
  const get = (label: string, next: string[]) => {
    const re = new RegExp(`\\*{0,2}${label}\\s*\\*{0,2}\\s*:?\\s*\\*{0,2}\\s*\\n?([\\s\\S]*?)(?=\\n\\s*\\*{0,2}(?:${next.join("|")})\\s*\\*{0,2}\\s*:|$)`, "i");
    return text.match(re)?.[1].trim() ?? "";
  };
  const titre = get("TITRE", ["DESCRIPTION", "CONSEILS"]).split("\n")[0].replace(/^["«\s]+|["»\s]+$/g, "");
  const description = get("DESCRIPTION", ["CONSEILS"]);
  if (!titre || !description) return null;
  const conseils = get("CONSEILS", ["FIN"])
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
  return { titre, description, conseil_prix: "", infos_manquantes: [], conseils };
}
