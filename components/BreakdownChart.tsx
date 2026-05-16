"use client";

import { useState } from "react";
import type { LevelBreakdown, LineItem } from "@/lib/types";

const PALETTE = [
  "#2563eb", "#0ea5e9", "#06b6d4", "#10b981", "#84cc16",
  "#eab308", "#f59e0b", "#ef4444", "#ec4899", "#a855f7",
  "#6366f1", "#737373",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function BreakdownChart({ level }: { level: LevelBreakdown }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (level.total <= 0 || level.items.length === 0) {
    return (
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
        <Header level={level} />
        {level.note && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{level.note}</p>}
      </section>
    );
  }

  const items = [...level.items].sort((a, b) => b.amount - a.amount);

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
      <Header level={level} />

      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
        {items.map((it, i) => (
          <div
            key={it.category}
            title={`${it.category}: ${fmt(it.amount)}`}
            style={{ width: `${it.pct * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
          />
        ))}
      </div>

      <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-900">
        {items.map((it, i) => (
          <li key={it.category}>
            <button
              onClick={() => setExpanded(expanded === it.category ? null : it.category)}
              className="w-full text-left py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 px-2 -mx-2 rounded-lg transition"
              aria-expanded={expanded === it.category}
            >
              <span
                className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              {it.icon && <span className="text-xl">{it.icon}</span>}
              <span className="flex-1 font-medium">{it.category}</span>
              <span className="text-sm text-neutral-500 tabular-nums">{pct(it.pct)}</span>
              <span className="font-mono font-semibold tabular-nums w-24 text-right">{fmt(it.amount)}</span>
            </button>
            {expanded === it.category && it.examples && it.examples.length > 0 && (
              <div className="px-2 pb-3 pl-10 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="text-xs uppercase tracking-wide text-neutral-400">Includes:</span>{" "}
                {it.examples.join(" · ")}
              </div>
            )}
          </li>
        ))}
      </ul>

      {level.note && <p className="mt-4 text-xs text-neutral-500">{level.note}</p>}
      {level.source && (
        <p className="mt-2 text-xs text-neutral-400 truncate">Source: {level.source}</p>
      )}
    </section>
  );
}

function Header({ level }: { level: LevelBreakdown }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500">{level.level}</p>
        <h2 className="text-xl font-semibold mt-0.5">{level.jurisdiction}</h2>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold tabular-nums">{fmt(level.total)}</p>
        <p className="text-xs text-neutral-500">{pct(level.effectiveRate)} of income</p>
      </div>
    </div>
  );
}

export { fmt, pct };
