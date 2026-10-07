"use client";

import { useEffect, useState } from "react";
import type { UploadedFile } from "@/lib/brief-schema";
import { createClient } from "@/lib/supabase/client";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

export function FilesInput(props: {
  /** Dossier de destination dans le stockage. */
  folder: string;
  accept?: string;
  value: UploadedFile[];
  onChange: (v: UploadedFile[]) => void;
  disabled: boolean;
  /** Version compacte (zone de dépôt plus petite) et aperçu des images. */
  compact?: boolean;
}) {
  const { folder, accept, value, onChange, disabled, compact } = props;
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    const added: UploadedFile[] = [];
    setUploading(files.length);
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`« ${file.name} » dépasse 50 Mo. Envoyez-le plutôt via WeTransfer et collez le lien dans un champ texte.`);
        setUploading((n) => n - 1);
        continue;
      }
      const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
      const { error: err } = await supabase.storage.from("brief-files").upload(path, file, { contentType: file.type });
      if (err) setError(`Échec de l'envoi de « ${file.name} » : ${err.message}`);
      else added.push({ path, name: file.name, size: file.size, type: file.type });
      setUploading((n) => n - 1);
    }
    if (added.length) onChange([...value, ...added]);
  }

  async function remove(file: UploadedFile) {
    const supabase = createClient();
    await supabase.storage.from("brief-files").remove([file.path]);
    onChange(value.filter((f) => f.path !== file.path));
  }

  return (
    <div className="space-y-3">
      {!disabled && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-background px-4 text-center transition hover:border-brand ${
            compact ? "py-4" : "py-8"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {!compact && <span className="text-2xl">📎</span>}
          <span className="text-sm font-semibold">
            {compact ? "🖼️ Ajouter des images (glisser-déposer ou cliquer)" : "Glissez vos fichiers ici ou cliquez pour parcourir"}
          </span>
          <span className="text-xs text-muted">50 Mo max. par fichier</span>
          <input type="file" multiple accept={accept} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      )}
      {uploading > 0 && <p className="text-sm text-brand">Envoi en cours ({uploading} fichier{uploading > 1 ? "s" : ""})…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {value.length > 0 && compact && <ImageGrid files={value} onRemove={disabled ? undefined : remove} />}
      {value.length > 0 && !compact && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {value.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="truncate">{f.name}</span>
              <span className="flex shrink-0 items-center gap-3 text-muted">
                {formatSize(f.size)}
                {!disabled && (
                  <button type="button" className="hover:text-danger" onClick={() => remove(f)}>
                    Supprimer
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Vignettes des images déposées (liens temporaires, les fichiers restent privés). */
function ImageGrid({ files, onRemove }: { files: UploadedFile[]; onRemove?: (f: UploadedFile) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = files.map((f) => f.path).join("|");

  useEffect(() => {
    const paths = key.split("|").filter(Boolean);
    if (!paths.length) return;
    let cancelled = false;
    createClient()
      .storage.from("brief-files")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const next: Record<string, string> = {};
        for (const d of data) if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
        setUrls(next);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {files.map((f) => (
        <li key={f.path} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-background">
          {urls[f.path] && f.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[f.path]} alt={f.name} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center p-2 text-center text-xs text-muted">{f.name}</span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(f)}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-90 hover:bg-danger"
              aria-label={`Retirer ${f.name}`}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
