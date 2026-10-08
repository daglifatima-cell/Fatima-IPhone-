"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "suggestion"; fieldId: string; label: string; value: string; inserted?: boolean };

export type InsertDetail = { fieldId: string; value: string; handled: boolean; ok: boolean };

const STARTERS = [
  "C'est quoi un nom de domaine ?",
  "Aidez-moi à décrire mon activité",
  "Quelles pages choisir pour mon site ?",
  "Aidez-moi à écrire le texte de ma page d'accueil",
];

const PAGE_NAMES: Record<string, string> = {
  "/espace": "l'onglet « Mon brief »",
  "/espace/domaine": "l'onglet « Domaine & licences »",
  "/espace/suivi": "l'onglet « Suivi du projet »",
};

/** Affiche le **gras** et garde les retours à la ligne, sans HTML brut. */
function RichText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </p>
  );
}

export function AssistantChat({ name, briefId, locked }: { name: string; briefId: string; locked: boolean }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // L'assistante n'apparaît que si elle est configurée côté serveur.
  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setEnabled(Boolean(d.enabled));
        setItems(d.items ?? []);
        setRemaining(d.remaining ?? null);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  // Étape du brief en cours, pour que l'assistante sache où en est le client.
  useEffect(() => {
    const onStep = (e: Event) => setStep((e as CustomEvent<string>).detail);
    window.addEventListener("aspyre:step", onStep);
    return () => window.removeEventListener("aspyre:step", onStep);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, open, busy]);

  if (!enabled || !loaded) return null;

  const page = `${PAGE_NAMES[pathname] ?? "son espace client"}${pathname === "/espace" && step ? `, étape « ${step} »` : ""}`;

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    setItems((prev) => [...prev, { role: "user", text: message }, { role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, page }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `${name} n'a pas pu répondre.`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "text") {
            setItems((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + event.text }];
              return [...prev, { role: "assistant", text: event.text.trimStart() }];
            });
          } else if (event.type === "suggestion") {
            setItems((prev) => [...prev, { role: "suggestion", fieldId: event.fieldId, label: event.label, value: event.value }]);
          } else if (event.type === "done") {
            setRemaining(event.remaining);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${name} n'a pas pu répondre.`);
    } finally {
      // Retire une bulle restée vide (erreur avant tout texte).
      setItems((prev) => prev.filter((it) => !(it.role === "assistant" && !it.text.trim())));
      setBusy(false);
    }
  }

  async function insert(index: number) {
    const item = items[index];
    if (item.role !== "suggestion" || locked) return;
    // Si le questionnaire est ouvert, il insère lui-même la réponse (et l'enregistre).
    const detail: InsertDetail = { fieldId: item.fieldId, value: item.value, handled: false, ok: false };
    window.dispatchEvent(new CustomEvent("aspyre:insert", { detail }));
    let ok = detail.handled && detail.ok;
    if (!detail.handled) {
      // Sinon (autre onglet), on enregistre directement dans le brief.
      const supabase = createClient();
      const { data } = await supabase.from("briefs").select("data").eq("id", briefId).single();
      const { error: err } = await supabase
        .from("briefs")
        .update({ data: { ...(data?.data ?? {}), [item.fieldId]: item.value } })
        .eq("id", briefId);
      ok = !err;
    }
    if (ok) setItems((prev) => prev.map((it, i) => (i === index ? { ...it, inserted: true } : it)));
    else setError("L'insertion n'a pas fonctionné. Vous pouvez copier le texte à la place.");
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="aspyre-gradient fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 font-semibold text-white shadow-lg transition hover:scale-105"
        >
          <span aria-hidden>✨</span>
          <span>Besoin d&apos;aide ?</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-2.5rem)] sm:w-[400px] sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="aspyre-gradient grid h-10 w-10 place-items-center rounded-full font-display text-lg font-semibold text-white">
              {name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted">Assistante IA d&apos;Aspyre Studio</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-xl text-muted hover:bg-background" aria-label="Fermer">
              ×
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-background px-4 py-3">
              Bonjour ! Je suis {name}, l&apos;assistante IA d&apos;Aspyre Studio 👋 Je peux vous expliquer une question, vous aider à
              rédiger vos textes ou vous guider pour votre nom de domaine. Que puis-je faire pour vous ?
            </div>

            {items.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-brand/40 px-3 py-1.5 text-left text-xs font-semibold text-brand hover:bg-brand-soft">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {items.map((item, i) =>
              item.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-4 py-3 text-brand-ink">
                  <RichText text={item.text} />
                </div>
              ) : item.role === "assistant" ? (
                <div key={i} className="group max-w-[90%]">
                  <div className="rounded-2xl rounded-tl-sm bg-background px-4 py-3">
                    <RichText text={item.text} />
                  </div>
                  {!busy && item.text.length > 80 && <CopyButton text={item.text} />}
                </div>
              ) : (
                <div key={i} className="max-w-[90%] rounded-2xl border border-brand/30 bg-brand-soft/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">Proposition · {item.label}</p>
                  <div className="mt-2 rounded-xl bg-surface px-3 py-2">
                    <RichText text={item.value} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.inserted ? (
                      <span className="text-xs font-semibold text-success">✓ Insérée dans votre brief</span>
                    ) : locked ? (
                      <span className="text-xs text-muted">Brief verrouillé : copiez le texte si besoin.</span>
                    ) : (
                      <button type="button" onClick={() => insert(i)} className="btn-primary !px-4 !py-1.5 text-xs">
                        Insérer dans mon brief
                      </button>
                    )}
                    <CopyButton text={item.value} inline />
                  </div>
                </div>
              ),
            )}

            {busy && items[items.length - 1]?.role !== "assistant" && <Typing />}
            {busy && items[items.length - 1]?.role === "assistant" && !(items[items.length - 1] as { text: string }).text && <Typing />}
            {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-danger">{error}</p>}
          </div>

          <form
            className="border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                placeholder={remaining === 0 ? "Plus de messages disponibles" : "Posez votre question…"}
                disabled={busy || remaining === 0}
                className="input max-h-32 min-h-[44px] resize-none !rounded-2xl !py-2.5 text-sm"
                aria-label={`Message pour ${name}`}
              />
              <button type="submit" className="btn-primary h-11 w-11 shrink-0 !p-0" disabled={busy || !input.trim() || remaining === 0} aria-label="Envoyer">
                ↑
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">
              {remaining !== null && `${remaining} message${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""} · `}
              {name} est une IA : relisez ses propositions.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Typing() {
  return (
    <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-tl-sm bg-background px-4 py-3" aria-label="En train d'écrire">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}

function CopyButton({ text, inline }: { text: string; inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={inline ? "rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-brand" : "mt-1 px-2 text-xs text-muted hover:text-brand"}
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}
