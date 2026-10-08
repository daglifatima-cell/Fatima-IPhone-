import { STATUS_LABELS } from "@/lib/brief-schema";

const TONES: Record<string, string> = {
  brouillon: "bg-line text-muted",
  envoye: "bg-accent/15 text-accent",
  en_cours: "bg-brand-soft text-brand",
  termine: "bg-success/15 text-success",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="rounded-full bg-line px-2.5 py-1 text-xs font-semibold text-muted">Pas commencé</span>;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[status] ?? "bg-line"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
