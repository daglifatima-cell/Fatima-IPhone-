import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import {
  ASSISTANT_MODEL,
  SUGGEST_TOOL,
  contextMessage,
  fieldLabel,
  historyContent,
  parseSuggestion,
  systemPrompt,
  toDisplay,
} from "@/lib/assistant";
import { requireUser } from "@/lib/auth";
import { getOrCreateBrief } from "@/lib/brief";
import type { BriefData } from "@/lib/brief-schema";
import type { SetupData } from "@/lib/project";
import { STUDIO } from "@/lib/studio-config";
import { createAdminClient } from "@/lib/supabase/admin";

// Assistante IA de l'espace client : historique (GET) et nouveau message (POST, réponse en flux).

export const maxDuration = 120;

type Msg = Anthropic.Beta.BetaMessageParam;
type Conversation = { messages: Msg[]; user_messages: number; context_hash: string | null };

const LIMIT = STUDIO.assistantMessageLimit;
const MAX_TOOL_ROUNDS = 4;

async function load() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "client") return { error: NextResponse.json({ error: "Réservé aux clients." }, { status: 403 }) };
  const brief = await getOrCreateBrief(ctx);
  const { data, error } = await createAdminClient()
    .from("assistant_conversations")
    .select("messages, user_messages, context_hash")
    .eq("brief_id", brief.id)
    .maybeSingle<Conversation>();
  // Table absente (fichier supabase/assistant.sql pas encore exécuté) : assistante désactivée.
  if (error) console.error("Assistante IA : table assistant_conversations inaccessible :", error.message);
  return { ctx, brief, convo: data, ready: !error };
}

export async function GET() {
  const res = await load();
  if ("error" in res) return res.error;
  const { convo, ready } = res;
  return NextResponse.json({
    enabled: Boolean(process.env.ANTHROPIC_API_KEY) && ready,
    items: toDisplay(convo?.messages ?? []),
    remaining: Math.max(0, LIMIT - (convo?.user_messages ?? 0)),
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: `${STUDIO.assistantName} n'est pas encore activée.` }, { status: 503 });
  }
  const res = await load();
  if ("error" in res) return res.error;
  const { ctx, brief, convo, ready } = res;
  if (!ready) return NextResponse.json({ error: `${STUDIO.assistantName} n'est pas encore activée.` }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { message?: unknown; page?: unknown };
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";
  if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const used = convo?.user_messages ?? 0;
  if (used >= LIMIT) {
    return NextResponse.json(
      { error: `Vous avez utilisé vos ${LIMIT} messages avec ${STUDIO.assistantName}. Pour toute autre question, écrivez au studio depuis l'onglet « Suivi du projet ».` },
      { status: 429 },
    );
  }

  const { data: setupRow } = await ctx.supabase.from("project_setup").select("data").eq("brief_id", brief.id).maybeSingle();
  const context = contextMessage(brief.data as BriefData, (setupRow?.data ?? {}) as SetupData, page);

  // Historique en ajout seul : on ne modifie jamais les tours précédents.
  const messages: Msg[] = [...(convo?.messages ?? []), { role: "user", content: message }];
  if (context.hash !== convo?.context_hash) messages.push({ role: "system", content: context.text });

  const anthropic = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = anthropic.beta.messages.stream({
            model: ASSISTANT_MODEL,
            max_tokens: 8000,
            output_config: { effort: "medium" },
            // Relais automatique vers un autre modèle si la demande est refusée par un filtre de sécurité.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            cache_control: { type: "ephemeral" },
            system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
            tools: [SUGGEST_TOOL],
            messages,
          });

          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ type: "text", text: event.delta.text });
            }
          }
          const final = await response.finalMessage();

          if (final.stop_reason === "refusal") {
            // Rien n'est enregistré : la demande refusée ne compte pas.
            send({
              type: "error",
              message: "Je ne peux pas vous aider sur ce point. Reformulez votre question, ou écrivez directement au studio depuis l'onglet « Suivi du projet ».",
            });
            controller.close();
            return;
          }

          messages.push({ role: "assistant", content: historyContent(final.content) });
          if (final.stop_reason !== "tool_use") break;

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const suggestion = block.name === SUGGEST_TOOL.name ? parseSuggestion(block.input) : null;
            if (suggestion) {
              send({ type: "suggestion", fieldId: suggestion.fieldId, label: fieldLabel(suggestion.fieldId), value: suggestion.value });
              results.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: "Proposition affichée au client avec un bouton « Insérer ». Il décide s'il l'utilise.",
              });
            } else {
              results.push({ type: "tool_result", tool_use_id: block.id, content: "Proposition invalide : vérifie field_id et valeur.", is_error: true });
            }
          }
          messages.push({ role: "user", content: results });
        }

        const { error: saveError } = await createAdminClient()
          .from("assistant_conversations")
          .upsert({
            brief_id: brief.id,
            messages,
            user_messages: used + 1,
            context_hash: context.hash,
            updated_at: new Date().toISOString(),
          });
        if (saveError) console.error("Assistante IA : conversation non enregistrée :", saveError.message);
        send({ type: "done", remaining: Math.max(0, LIMIT - used - 1) });
      } catch (err) {
        console.error("Assistante IA :", err);
        const busy = err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500);
        send({
          type: "error",
          message: busy
            ? `${STUDIO.assistantName} est très sollicitée en ce moment. Réessayez dans une minute.`
            : `${STUDIO.assistantName} n'a pas pu répondre. Réessayez dans un instant.`,
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
