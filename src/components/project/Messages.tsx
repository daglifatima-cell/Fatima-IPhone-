export type ProjectMessage = {
  id: string;
  kind: "message" | "validation" | "modifications";
  body: string;
  created_at: string;
  author: { role: string; full_name: string | null } | null;
};

const KIND_BADGE: Record<ProjectMessage["kind"], string | null> = {
  message: null,
  validation: "✅ Maquette validée",
  modifications: "✏️ Modifications demandées",
};

/** Fil de discussion du projet ; `viewer` décide de quel côté s'affichent les bulles. */
export function MessageList({ messages, viewer }: { messages: ProjectMessage[]; viewer: "client" | "admin" }) {
  if (!messages.length) return <p className="text-sm text-muted">Aucun message pour l&apos;instant.</p>;
  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const fromAdmin = m.author?.role === "admin";
        const mine = (viewer === "admin") === fromAdmin;
        const badge = KIND_BADGE[m.kind];
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-brand text-brand-ink" : "border border-line bg-background"}`}>
              <p className={`mb-1 text-xs ${mine ? "opacity-80" : "text-muted"}`}>
                {fromAdmin ? "Aspyre Studio" : m.author?.full_name || "Client"} ·{" "}
                {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              {badge && <p className="font-semibold">{badge}</p>}
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
