import { PROJECT_STEPS } from "@/lib/project";

export function Timeline({ current }: { current: number }) {
  return (
    <ol className="space-y-0">
      {PROJECT_STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < PROJECT_STEPS.length - 1 && (
              <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < current ? "bg-success" : "bg-line"}`} />
            )}
            <span
              className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                state === "done" ? "bg-success text-white" : state === "current" ? "aspyre-gradient text-white shadow-md" : "bg-line text-muted"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <div className="pt-1">
              <p className={`font-semibold ${state === "todo" ? "text-muted" : ""}`}>
                {s.title}
                {state === "current" && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">En cours</span>}
              </p>
              <p className="text-sm text-muted">{s.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
