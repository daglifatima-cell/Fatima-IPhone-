"use client";

import { useState } from "react";
import {
  DEFAULT_PAGE_SUGGESTION,
  PAGE_SUGGESTIONS,
  blockHasContent,
  selectedPages,
  type BriefData,
  type ContentBlock,
  type PageContent,
} from "@/lib/brief-schema";
import { createClient } from "@/lib/supabase/client";
import { FilesInput } from "./FilesInput";

type Props = {
  value: PageContent[];
  data: BriefData;
  onChange: (value: PageContent[]) => void;
  disabled: boolean;
  storagePrefix: string;
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "page";

const suggestionsFor = (page: string) => PAGE_SUGGESTIONS[page] ?? DEFAULT_PAGE_SUGGESTION;

/** Page telle qu'enregistrée, ou structure suggérée si le client n'a encore rien écrit. */
function pageOrSuggested(value: PageContent[], page: string): PageContent {
  return (
    value.find((p) => p.page === page) ?? {
      page,
      blocks: suggestionsFor(page).map((s, i) => ({ id: `${slug(page)}-${i}`, title: s.title, text: "", images: [] })),
    }
  );
}

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function PagesContentInput({ value, data, onChange, disabled, storagePrefix }: Props) {
  // Pages choisies à l'étape précédente + pages déjà rédigées ou ajoutées ici.
  const chosen = selectedPages(data);
  const pages = [...chosen, ...value.map((p) => p.page).filter((p) => !chosen.includes(p))];

  const [active, setActive] = useState<string | null>(pages[0] ?? null);
  const [newPage, setNewPage] = useState("");
  const current = active && pages.includes(active) ? active : pages[0] ?? null;

  function savePage(page: PageContent) {
    const exists = value.some((p) => p.page === page.page);
    onChange(exists ? value.map((p) => (p.page === page.page ? page : p)) : [...value, page]);
  }

  function addPage() {
    const name = newPage.trim();
    if (!name) return;
    if (!pages.includes(name)) savePage(pageOrSuggested(value, name));
    setActive(name);
    setNewPage("");
  }

  return (
    <div className="space-y-5">
      {/* Choix de la page à rédiger */}
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => {
          const done = value.find((v) => v.page === p)?.blocks.some(blockHasContent);
          return (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                p === current ? "border-brand bg-brand text-brand-ink font-semibold" : "border-line bg-surface hover:border-brand"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${done ? "bg-success" : p === current ? "bg-brand-ink/60" : "bg-line"}`} />
              {p}
            </button>
          );
        })}
        {!disabled && (
          <form
            className="flex items-center gap-1 rounded-full border border-dashed border-line bg-surface py-1 pl-4 pr-1"
            onSubmit={(e) => {
              e.preventDefault();
              addPage();
            }}
          >
            <input
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              placeholder="Autre page…"
              className="w-28 bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Nom de la nouvelle page"
            />
            <button type="submit" className="rounded-full px-3 py-1 text-sm font-semibold text-brand hover:bg-brand-soft">
              + Ajouter
            </button>
          </form>
        )}
      </div>

      {pages.length === 0 && (
        <p className="rounded-2xl bg-brand-soft px-5 py-4 text-sm text-brand">
          Commencez par cocher les pages souhaitées à l&apos;étape « Structure & contenus », ou ajoutez une page ci-dessus.
        </p>
      )}

      {current && (
        <PageEditor
          key={current}
          page={pageOrSuggested(value, current)}
          onChange={savePage}
          onRemove={
            !chosen.includes(current) && !disabled
              ? () => {
                  onChange(value.filter((p) => p.page !== current));
                  setActive(null);
                }
              : undefined
          }
          disabled={disabled}
          folder={`${storagePrefix}/pages/${slug(current)}`}
        />
      )}

      <details className="rounded-2xl border border-line bg-background px-5 py-4 text-sm">
        <summary className="cursor-pointer font-semibold">💡 Conseils pour écrire vos textes</summary>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-muted">
          <li>Parlez à votre client : utilisez « vous » et répondez à ses questions.</li>
          <li>Privilégiez les phrases courtes et les mots simples.</li>
          <li>Mettez en avant les bénéfices (« gagnez du temps ») plutôt que les caractéristiques.</li>
          <li>Pour les images, choisissez des photos nettes, bien éclairées et au format horizontal si possible.</li>
          <li>Pas d&apos;inspiration ? Notez juste les idées en vrac : je m&apos;occupe de la mise en forme.</li>
        </ul>
      </details>
    </div>
  );
}

function PageEditor(props: {
  page: PageContent;
  onChange: (page: PageContent) => void;
  onRemove?: () => void;
  disabled: boolean;
  folder: string;
}) {
  const { page, onChange, onRemove, disabled, folder } = props;
  const hints = suggestionsFor(page.page);

  const setBlocks = (blocks: ContentBlock[]) => onChange({ ...page, blocks });
  const updateBlock = (id: string, patch: Partial<ContentBlock>) =>
    setBlocks(page.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  function move(i: number, dir: -1 | 1) {
    const blocks = [...page.blocks];
    [blocks[i], blocks[i + dir]] = [blocks[i + dir], blocks[i]];
    setBlocks(blocks);
  }

  async function removeBlock(block: ContentBlock) {
    if (blockHasContent(block) && !window.confirm(`Supprimer la section « ${block.title || "sans titre"} » et son contenu ?`)) return;
    if (block.images.length) {
      await createClient().storage.from("brief-files").remove(block.images.map((f) => f.path));
    }
    setBlocks(page.blocks.filter((b) => b.id !== block.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold">{page.page}</h3>
        {onRemove && (
          <button type="button" className="text-sm text-muted hover:text-danger" onClick={onRemove}>
            Retirer cette page
          </button>
        )}
      </div>

      {page.blocks.map((block, i) => {
        const hint = hints.find((h) => h.title === block.title)?.hint;
        return (
          <div key={block.id} className="rounded-2xl border border-line bg-background p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                {i + 1}
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted"
                value={block.title}
                placeholder="Titre de la section"
                disabled={disabled}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                aria-label={`Titre de la section ${i + 1}`}
              />
              {!disabled && (
                <div className="flex shrink-0 items-center gap-1 text-muted">
                  <IconButton label="Monter" onClick={() => move(i, -1)} disabled={i === 0}>↑</IconButton>
                  <IconButton label="Descendre" onClick={() => move(i, 1)} disabled={i === page.blocks.length - 1}>↓</IconButton>
                  <IconButton label="Supprimer la section" onClick={() => removeBlock(block)} danger>🗑</IconButton>
                </div>
              )}
            </div>
            {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
            <textarea
              className="input min-h-32 resize-y"
              value={block.text}
              placeholder="Votre texte…"
              disabled={disabled}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              aria-label={`Texte de la section ${block.title || i + 1}`}
            />
            <p className="mb-3 mt-1 text-right text-xs text-muted">{countWords(block.text)} mots</p>
            <FilesInput
              folder={folder}
              accept="image/*"
              value={block.images}
              onChange={(images) => updateBlock(block.id, { images: images as ContentBlock["images"] })}
              disabled={disabled}
              compact
            />
          </div>
        );
      })}

      {!disabled && (
        <button
          type="button"
          className="btn-ghost w-full border-dashed"
          onClick={() => setBlocks([...page.blocks, { id: `b-${Date.now()}`, title: "", text: "", images: [] }])}
        >
          + Ajouter une section
        </button>
      )}
    </div>
  );
}

function IconButton(props: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg transition hover:bg-surface disabled:opacity-30 ${
        props.danger ? "hover:text-danger" : "hover:text-brand"
      }`}
    >
      {props.children}
    </button>
  );
}
