"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidZip, zipToState } from "@/lib/zip";
import { isSupportedState } from "@/lib/calculate";
import type { FilingStatus, HousingMode } from "@/lib/types";

const FILING_LABEL: Record<FilingStatus, string> = {
  single: "Single",
  mfj: "Married — joint",
  hoh: "Head of household",
};

export default function Home() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [income, setIncome] = useState("");
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [kids, setKids] = useState("0");
  const [mode, setMode] = useState<HousingMode>("owner");
  const [homeValue, setHomeValue] = useState("");
  const [rent, setRent] = useState("");
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
    const k = Math.max(0, Math.floor(Number(kids) || 0));

    const params = new URLSearchParams({
      zip,
      income: String(n),
      filing,
      kids: String(k),
      mode,
    });
    if (mode === "owner") {
      const v = Number(homeValue.replace(/[,$\s]/g, ""));
      if (!homeValue) {
        setError("Enter a home value, or switch to Rent / Skip.");
        return;
      }
      if (!Number.isFinite(v) || v <= 0) {
        setError("Enter a positive home value.");
        return;
      }
      params.set("home", String(v));
    } else if (mode === "renter") {
      const r = Number(rent.replace(/[,$\s]/g, ""));
      if (!rent) {
        setError("Enter your monthly rent, or switch to Own / Skip.");
        return;
      }
      if (!Number.isFinite(r) || r <= 0) {
        setError("Enter a positive monthly rent.");
        return;
      }
      params.set("rent", String(r));
    }

    setError(null);
    router.push(`/result?${params.toString()}`);
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

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-sm">
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
            <p className="mt-1 text-xs text-neutral-500">Use your AGI for the closest match to your tax return.</p>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Filing status</span>
            <div className="grid grid-cols-3 gap-2">
              {(["single", "mfj", "hoh"] as FilingStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFiling(s)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    filing === s
                      ? "border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {FILING_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="kids" className="block text-sm font-medium mb-1">Children under 17 (for Child Tax Credit)</label>
            <input
              id="kids"
              inputMode="numeric"
              pattern="\d*"
              placeholder="0"
              value={kids}
              onChange={(e) => setKids(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 text-lg outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
            />
            <p className="mt-1 text-xs text-neutral-500">$2,000 per child, phases out above $200k single / $400k joint.</p>
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Housing (for property tax)</span>
            <div className="grid grid-cols-3 gap-2">
              {(["owner", "renter", "skip"] as HousingMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                    mode === m
                      ? "border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {m === "owner" ? "Own" : m === "renter" ? "Rent" : "Skip"}
                </button>
              ))}
            </div>

            {mode === "owner" && (
              <div className="mt-3">
                <label htmlFor="home" className="block text-sm font-medium mb-1">Home value (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    id="home"
                    inputMode="numeric"
                    placeholder="450,000"
                    value={homeValue}
                    onChange={(e) => setHomeValue(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent pl-8 pr-4 py-3 text-lg outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">Estimated as home value × local effective rate.</p>
              </div>
            )}

            {mode === "renter" && (
              <div className="mt-3">
                <label htmlFor="rent" className="block text-sm font-medium mb-1">Monthly rent (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    id="rent"
                    inputMode="numeric"
                    placeholder="2,200"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent pl-8 pr-4 py-3 text-lg outline-none focus:border-neutral-900 dark:focus:border-neutral-200"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Renters don't pay property tax directly, but landlords pass it through in rent. Shown as info, not added to your total.
                </p>
              </div>
            )}

            {mode === "skip" && (
              <p className="mt-3 text-xs text-neutral-500">Local layer will show $0 with no breakdown.</p>
            )}
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
          Estimates only. Not tax advice. 2025 brackets, all 50 states + DC.
        </footer>
      </div>
    </main>
  );
}
