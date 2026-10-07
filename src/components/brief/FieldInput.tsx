"use client";

import type { BriefData, Field, FieldValue, PageContent, UploadedFile } from "@/lib/brief-schema";
import { FilesInput } from "./FilesInput";
import { PagesContentInput } from "./PagesContentInput";

export const OTHER = "Autre";
export const otherKey = (id: string) => `${id}__autre`;

type Props = {
  field: Field;
  value: FieldValue | undefined;
  otherValue: string;
  onChange: (value: FieldValue) => void;
  onOtherChange: (value: string) => void;
  disabled: boolean;
  /** Dossier de stockage du client : "<userId>/<briefId>" */
  storagePrefix: string;
  /** Toutes les réponses du brief (utile aux champs qui dépendent d'autres). */
  data: BriefData;
};

const asString = (v: FieldValue | undefined) => (typeof v === "string" ? v : "");
const asStrings = (v: FieldValue | undefined) =>
  Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
const asFiles = (v: FieldValue | undefined) =>
  Array.isArray(v) ? (v as unknown[]).filter((x): x is UploadedFile => typeof x === "object" && x !== null) : [];

export function FieldInput({ field, value, otherValue, onChange, onOtherChange, disabled, storagePrefix, data }: Props) {
  const inputId = `f-${field.id}`;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={inputId}
          className="input min-h-28 resize-y"
          value={asString(value)}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "select":
      return (
        <select id={inputId} className="input" value={asString(value)} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Choisir —</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );

    case "radio": {
      const options = [...(field.options ?? []), ...(field.allowOther ? [OTHER] : [])];
      const current = asString(value);
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <Choice key={o} type="radio" name={inputId} label={o} checked={current === o} disabled={disabled} onChange={() => onChange(o)} />
          ))}
          {field.allowOther && current === OTHER && (
            <OtherInput value={otherValue} onChange={onOtherChange} disabled={disabled} />
          )}
        </div>
      );
    }

    case "checkboxes": {
      const options = [...(field.options ?? []), ...(field.allowOther ? [OTHER] : [])];
      const current = asStrings(value);
      const toggle = (o: string) => onChange(current.includes(o) ? current.filter((x) => x !== o) : [...current, o]);
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <Choice key={o} type="checkbox" name={inputId} label={o} checked={current.includes(o)} disabled={disabled} onChange={() => toggle(o)} />
          ))}
          {field.allowOther && current.includes(OTHER) && (
            <OtherInput value={otherValue} onChange={onOtherChange} disabled={disabled} />
          )}
        </div>
      );
    }

    case "colors":
      return <ColorsInput value={asStrings(value)} onChange={onChange} disabled={disabled} />;

    case "files":
      return (
        <FilesInput
          folder={`${storagePrefix}/${field.id}`}
          accept={field.accept}
          value={asFiles(value)}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "pages":
      return (
        <PagesContentInput
          value={Array.isArray(value) ? (value as PageContent[]) : []}
          data={data}
          onChange={onChange}
          disabled={disabled}
          storagePrefix={storagePrefix}
        />
      );

    default:
      return (
        <input
          id={inputId}
          type={field.type}
          className="input"
          value={asString(value)}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function Choice(props: { type: "radio" | "checkbox"; name: string; label: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
        props.checked ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface hover:border-brand/50"
      } ${props.disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <input
        type={props.type}
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onChange}
        className="h-4 w-4 accent-[var(--brand)]"
      />
      {props.label}
    </label>
  );
}

function OtherInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <input
      className="input sm:col-span-2"
      placeholder="Précisez…"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ColorsInput({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value.map((color, i) => (
        <div key={i} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
          <input
            type="color"
            value={color}
            disabled={disabled}
            onChange={(e) => onChange(value.map((c, j) => (j === i ? e.target.value : c)))}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            aria-label={`Couleur ${i + 1}`}
          />
          <span className="font-mono text-xs uppercase">{color}</span>
          {!disabled && (
            <button type="button" className="text-muted hover:text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Retirer">
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && value.length < 8 && (
        <button type="button" className="btn-ghost !py-2" onClick={() => onChange([...value, "#5b3df5"])}>
          + Ajouter une couleur
        </button>
      )}
    </div>
  );
}
