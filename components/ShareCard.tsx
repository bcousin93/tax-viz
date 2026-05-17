"use client";

import { useState } from "react";

export function ShareCard({ zip, income }: { zip: string; income: number }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Where my taxes go", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        Share this breakdown for ZIP <span className="font-mono">{zip}</span>, income {income.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.
      </div>
      <button
        onClick={onShare}
        className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium px-4 py-2 text-sm hover:opacity-90 transition flex-shrink-0"
      >
        {copied ? "Copied!" : "Share link"}
      </button>
    </div>
  );
}
