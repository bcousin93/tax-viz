"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidZip, zipToState } from "@/lib/zip";
import { isSupportedState } from "@/lib/calculate";

export default function Home() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [income, setIncome] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidZip(zip)) {
      setError("Enter a 5-digit ZIP code.");
      return;
    }
    const n = Number(income.replace(/[,$\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a positive income amount.");
      return;
    }
    setError(null);
    router.push(`/result?zip=${encodeURIComponent(zip)}&income=${n}`);
  }

  const state = isValidZip(zip) ? zipToState(zip) : null;
  const supported = state ? isSupportedState(state) : false;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Where do your taxes go?</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Type a ZIP and an income. See your federal, state, and local taxes broken down by where they end up.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-sm">
          <div>
            <label htmlFor="zip" className="block text-sm font-medium mb-1">ZIP code</label>
            <input
              id="zip"
              inputMode="numeric"
              pattern="\d{5}"
              placeholder="84003"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              maxLength={5}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 text-lg outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
            />
            {state && (
              <p className="mt-1 text-xs text-neutral-500">
                Detected: <span className="font-mono">{state}</span>
                {!supported && " — that ZIP isn't in our state map yet."}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="income" className="block text-sm font-medium mb-1">Annual income (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
              <input
                id="income"
                inputMode="numeric"
                placeholder="120,000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent pl-8 pr-4 py-3 text-lg outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Filing single. Approximate, 2025 brackets.</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold py-3 text-lg hover:opacity-90 transition"
          >
            Show me the breakdown →
          </button>
        </form>

        <footer className="mt-8 text-center text-xs text-neutral-500">
          Estimates only. Not tax advice. 2025 brackets, all 50 states + DC. Local layer is a property-tax proxy (not yet personalized).
        </footer>
      </div>
    </main>
  );
}
