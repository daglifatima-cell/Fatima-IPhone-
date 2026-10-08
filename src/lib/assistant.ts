import "server-only";
import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { BRIEF_SECTIONS, isFilled, isPageContentList, type BriefData, type Field } from "@/lib/brief-schema";
import { formatAnswer } from "@/lib/brief-format";
import { PROJECT_STEPS, type SetupData } from "@/lib/project";
import { STUDIO } from "@/lib/studio-config";

type Msg = Anthropic.Beta.BetaMessageParam;

export const ASSISTANT_MODEL = "claude-opus-5-5";

/** Champs que l'assistante peut proposer de remplir (champs texte libres). */
const SUGGESTABLE_TYPES = new Set(["text", "textarea", "email", "tel", "url"]);
export const SUGGESTABLE_FIELDS: Field[] = BRIEF_SECTIONS.flatMap((s) => s.fields).filter((f) => SUGGESTABLE_TYPES.has(f.type));
const FIELD_BY_ID = new Map(SUGGESTABLE_FIELDS.map((f) => [f.id, f]));

export function fieldLabel(id: string) {
  return FIELD_BY_ID.get(id)?.label ?? id;
}

/** Outil : proposer une réponse que le client pourra insérer d'un clic. */
export const SUGGEST_TOOL: Anthropic.Beta.BetaTool = {
  name: "proposer_reponse",
  description:
    "Propose au client une réponse pour une question de son brief. Le client voit la proposition avec un bouton « Insérer » " +
    "et reste libre de l'utiliser ou non. À utiliser quand le client demande de l'aide pour formuler une réponse, " +
    "ou quand tu as rédigé une réponse prête à l'emploi. Une proposition par question ; rédige la valeur à la première " +
    "personne du client (« Nous… », « Je… »), prête à être enregistrée telle quelle.",
  input_schema: {
    type: "object",
    properties: {
      field_id: {
        type: "string",
        enum: SUGGESTABLE_FIELDS.map((f) => f.id),
        description: "Identifiant de la question du brief à remplir.",
      },
      valeur: { type: "string", description: "Le texte proposé, prêt à être inséré dans le champ." },
    },
    required: ["field_id", "valeur"],
    additionalProperties: false,
  },
  strict: true,
};

function describeSchema() {
  return BRIEF_SECTIONS.map((section, i) => {
    const fields = section.fields
      .map((f) => {
        const parts = [`- ${f.label}${f.required ? " (obligatoire)" : ""} [id: ${f.id}, type: ${f.type}]`];
        if (f.options?.length) parts.push(`  Choix : ${f.options.join(" / ")}${f.allowOther ? " / Autre" : ""}`);
        if (f.help) parts.push(`  Aide affichée : ${f.help}`);
        return parts.join("\n");
      })
      .join("\n");
    return `Étape ${i + 1} — ${section.title}\n${fields}`;
  }).join("\n\n");
}

/** Consignes de l'assistante : stables d'une requête à l'autre (mises en cache). */
export function systemPrompt() {
  const name = STUDIO.assistantName;
  return `Tu es ${name}, l'assistante IA d'${STUDIO.name}, un studio de création de sites internet (WordPress + Elementor Pro).
Tu aides les clients du studio à remplir leur espace client en ligne, pour que le studio dispose de tout ce qu'il faut pour créer leur site.

Qui tu es et comment tu parles :
- Tu es une IA : dis-le simplement si on te le demande, ne prétends jamais être une personne.
- Tu écris en français, tu vouvoies, ton ton est chaleureux, rassurant et professionnel.
- Tes clients ne sont pas des experts du web : explique sans jargon, avec des exemples concrets tirés de leur activité.
- Sois brève : 2 à 6 phrases en général. Ne fais plus long que si le client te demande de rédiger un texte.
- Pas de titres Markdown ni de tableaux. Pour une liste, utilise des tirets simples. Le gras (**mot**) est permis avec parcimonie.

Ce que tu fais :
- Tu expliques les questions du brief et aides à y répondre (cible, différenciation, ambiance, pages, etc.).
- Tu aides à rédiger : à partir des idées du client, même en vrac, tu proposes un texte clair et engageant.
- Pour une question du brief à réponse texte, utilise l'outil proposer_reponse : le client verra un bouton « Insérer ». Annonce-le en une phrase plutôt que de recopier le texte dans ton message.
- Pour les textes de l'étape « Textes & images » (contenu des pages), écris directement le texte proposé dans ton message, en indiquant la page et la section concernées : le client pourra le copier.
- Pour les questions à choix (cases à cocher, listes), conseille le client sur quoi cocher : il le fait lui-même.
- Tu t'appuies sur les réponses déjà données par le client (fournies dans un message de contexte) pour personnaliser tes conseils, sans les lui répéter inutilement.

Ce que tu ne fais pas :
- Ne demande jamais de mot de passe et n'en accepte pas dans la discussion. Si le client veut transmettre des accès, oriente-le vers le formulaire sécurisé de l'onglet « Domaine & licences » (étape 4).
- Ne t'engage jamais sur un prix, un délai, un devis, une fonctionnalité ou un contrat : c'est le studio qui décide. Oriente le client vers l'onglet « Suivi du projet », où il peut écrire directement au studio.
- N'invente pas d'informations sur le client : si une information manque, pose une question.
- Reste sur le sujet du projet de site du client ; décline poliment le reste.

L'espace client comporte trois onglets :
1. « Mon brief » : le questionnaire, en étapes, enregistré automatiquement, puis envoyé au studio depuis l'étape « Récapitulatif & envoi ».
2. « Domaine & licences » : (1) choisir et vérifier un nom de domaine, (2) acheter l'hébergement chez Ionos en suivant le tutoriel, (3) acheter la licence Elementor Pro via le lien fourni, (4) transmettre ses accès via un formulaire chiffré. Le client achète lui-même, à son nom, pour que le site lui appartienne ; le studio installe ensuite tout.
3. « Suivi du projet » : les étapes du projet (${PROJECT_STEPS.map((s) => s.title).join(" → ")}), la validation de la maquette et la messagerie avec le studio.

Les questions du brief :

${describeSchema()}`;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Résumé compact de ce que le client a déjà rempli, et de la page où il se trouve. */
export function contextMessage(data: BriefData, setup: SetupData, page: string) {
  const lines: string[] = [];
  for (const section of BRIEF_SECTIONS) {
    const answers: string[] = [];
    for (const field of section.fields) {
      const value = data[field.id];
      if (!isFilled(value)) continue;
      if (field.type === "files") {
        answers.push(`- ${field.label} : ${(value as unknown[]).length} fichier(s) déposé(s)`);
      } else if (field.type === "pages" && isPageContentList(value)) {
        for (const p of value) {
          const blocks = p.blocks.filter((b) => b.text.trim() || b.images.length);
          if (!blocks.length) continue;
          answers.push(`- Page « ${p.page} » :`);
          for (const b of blocks) {
            answers.push(`  • ${b.title || "Section"} : ${truncate(b.text.trim(), 400) || "(images seulement)"}`);
          }
        }
      } else {
        answers.push(`- ${field.label} : ${truncate(formatAnswer(field, data), 600)}`);
      }
    }
    if (answers.length) lines.push(`${section.title}\n${answers.join("\n")}`);
  }
  const setupLines = [
    setup.domaine_choisi ? `Nom de domaine choisi : ${setup.domaine_choisi}${setup.domaine_existant ? " (déjà possédé)" : ""}` : "Nom de domaine : pas encore choisi",
    `Hébergement Ionos acheté : ${setup.ionos_fait ? "oui" : "non"}`,
    `Licence Elementor Pro achetée : ${setup.elementor_fait ? "oui" : "non"}`,
  ];

  const text = `Contexte à jour (information pour toi, ne le mentionne pas tel quel) :
Le client se trouve actuellement sur : ${page || "son espace client"}.

Réponses déjà données dans le brief :
${lines.length ? lines.join("\n\n") : "(aucune réponse pour l'instant)"}

Domaine & licences :
${setupLines.join("\n")}`;

  return { text, hash: createHash("sha256").update(text).digest("hex") };
}

/**
 * Prépare la réponse de l'assistante pour l'historique : après un relais vers
 * un autre modèle (fallback), on retire les blocs internes antérieurs au relais.
 */
export function historyContent(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlockParam[] {
  const lastFallback = content.map((b) => b.type).lastIndexOf("fallback");
  return content
    .filter((block, i) => {
      if (block.type === "fallback") return false;
      if (i < lastFallback && ["thinking", "redacted_thinking", "tool_use"].includes(block.type)) return false;
      return true;
    })
    .map((block) => block as unknown as Anthropic.Beta.BetaContentBlockParam);
}

export type DisplayItem =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "suggestion"; fieldId: string; label: string; value: string };

/** Transforme l'historique stocké en bulles affichables (sans les messages internes). */
export function toDisplay(messages: Msg[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") {
      if (typeof m.content === "string") items.push({ role: "user", text: m.content });
      continue;
    }
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
    for (const b of blocks as { type: string; text?: string; name?: string; input?: unknown }[]) {
      if (b.type === "text" && b.text?.trim()) items.push({ role: "assistant", text: b.text });
      if (b.type === "tool_use" && b.name === SUGGEST_TOOL.name) {
        const input = b.input as { field_id?: string; valeur?: string };
        if (input?.field_id && typeof input.valeur === "string") {
          items.push({ role: "suggestion", fieldId: input.field_id, label: fieldLabel(input.field_id), value: input.valeur });
        }
      }
    }
  }
  return items;
}

/** Valide une proposition de l'outil avant de l'afficher. */
export function parseSuggestion(input: unknown): { fieldId: string; value: string } | null {
  if (!input || typeof input !== "object") return null;
  const { field_id, valeur } = input as Record<string, unknown>;
  if (typeof field_id !== "string" || !FIELD_BY_ID.has(field_id) || typeof valeur !== "string" || !valeur.trim()) return null;
  return { fieldId: field_id, value: valeur };
}
