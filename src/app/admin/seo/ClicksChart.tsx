"use client";

import { useState } from "react";

type Day = { date: string; clicks: number; impressions: number };

const W = 720;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

const dayFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

// Courbe des clics quotidiens, avec un repère et une infobulle au survol.
export function ClicksChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (days.length < 2) return <p className="py-10 text-center text-sm text-muted">Pas encore assez de données.</p>;

  const max = Math.max(4, ...days.map((d) => d.clicks));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => PAD.left + (i / (days.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);
  const path = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.clicks).toFixed(1)}`).join("");
  const ticks = [0, 1, 2, 3, 4].map((t) => t * step);
  const labels = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (days.length - 1));
    setHover(Math.min(days.length - 1, Math.max(0, i)));
  }

  const h = hover === null ? null : days[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label="Clics par jour depuis Google"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t}</text>
          </g>
        ))}
        {labels.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
            {dayFr(days[i].date)}
          </text>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.clicks)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && h && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > days.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
        >
          <p className="font-semibold">{dayFr(h.date)}</p>
          <p>{h.clicks} clic{h.clicks > 1 ? "s" : ""}</p>
          <p className="text-muted">{h.impressions} impressions</p>
        </div>
      )}
    </div>
  );
}
