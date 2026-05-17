"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { calculate } from "@/lib/calculate";
import { BreakdownChart, fmt, pct } from "@/components/BreakdownChart";
import { ShareCard } from "@/components/ShareCard";
import type { FilingStatus, HousingMode } from "@/lib/types";

const FILING_LABEL: Record<FilingStatus, string> = {
  single: "single",
  mfj: "married — joint",
  hoh: "head of household",
};

function parseHousing(get: (k: string) => string | null): { mode: HousingMode; homeValue?: number; monthlyRent?: number } {
  const m = get("mode");
  if (m === "owner") {
    const v = Number(get("home") ?? "0");
    return { mode: "owner", homeValue: Number.isFinite(v) && v > 0 ? v : undefined };
  }
  if (m === "renter") {
    const r = Number(get("rent") ?? "0");
    return { mode: "renter", monthlyRent: Number.isFinite(r) && r > 0 ? r : undefined };
  }
  return { mode: "skip" };
}

function parseFiling(v: string | null): FilingStatus {
  return v === "mfj" || v === "hoh" ? v : "single";
}

function ResultBody() {
  const sp = useSearchParams();
  const zip = (sp.get("zip") ?? "").trim();
  const income = Number(sp.get("income") ?? "0");
  const filingStatus = parseFiling(sp.get("filing"));
  const numKids = Math.max(0, Math.floor(Number(sp.get("kids") ?? "0")));
  const housing = parseHousing((k) => sp.get(k));
  const result = calculate(zip, income, { filingStatus, numKids, housing });

  if ("error" in result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Hmm.</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">{result.error}</p>
          <Link href="/" className="mt-6 inline-block underline">Back to start</Link>
        </div>
      </main>
    );
  }

  const takeHome = income - result.totalTax;
  const passThrough = result.local.passThrough;

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← Recalculate</Link>

        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-8">
          <p className="text-sm text-neutral-500">
            ZIP <span className="font-mono">{result.zip}</span> · {result.state} · {FILING_LABEL[result.filingStatus]}
            {result.numKids > 0 ? ` · ${result.numKids} child${result.numKids === 1 ? "" : "ren"}` : null}
            {" · "}income {fmt(result.income)}
            {result.housing.mode === "owner" && result.housing.homeValue ? ` · home ${fmt(result.housing.homeValue)}` : null}
            {result.housing.mode === "renter" && result.housing.monthlyRent ? ` · rent ${fmt(result.housing.monthlyRent)}/mo` : null}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
            You paid about <span className="text-red-600 dark:text-red-400">{fmt(result.totalTax)}</span> in taxes.
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            That's an effective rate of <strong>{pct(result.effectiveRate)}</strong>{" "}
            <span className="text-neutral-500">(marginal {pct(result.marginalRate)})</span>.
            You took home <strong>{fmt(takeHome)}</strong>.
          </p>
          {passThrough && (
            <p className="mt-2 text-sm text-neutral-500">
              Plus an estimated <strong>{fmt(passThrough.amount)}</strong> in property tax embedded in your rent
              (informational; not counted above).
            </p>
          )}

          <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
            <div className="h-full bg-blue-600" style={{ width: `${(result.federal.total / income) * 100}%` }} title={`Federal ${fmt(result.federal.total)}`} />
            <div className="h-full bg-emerald-600" style={{ width: `${(result.state_.total / income) * 100}%` }} title={`State ${fmt(result.state_.total)}`} />
            <div className="h-full bg-amber-500" style={{ width: `${(result.local.total / income) * 100}%` }} title={`Local ${fmt(result.local.total)}`} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <Mini color="bg-blue-600"   label="Federal" amount={result.federal.total} share={result.federal.total / income} />
            <Mini color="bg-emerald-600" label="State"   amount={result.state_.total} share={result.state_.total / income} />
            <Mini color="bg-amber-500"   label="Local"   amount={result.local.total}   share={result.local.total / income} />
          </div>
        </section>

        <ShareCard zip={result.zip} income={result.income} />

        <BreakdownChart level={result.federal} />
        <BreakdownChart level={result.state_} />
        <BreakdownChart level={result.local} />

        <footer className="text-xs text-neutral-500 pb-10 space-y-1">
          <p>Estimates only. Not tax advice. Filing single. Standard deductions applied where applicable.</p>
          <p>Sanity check against <a className="underline" href="https://www.nationalpriorities.org" target="_blank" rel="noreferrer">nationalpriorities.org</a>.</p>
        </footer>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-sm text-neutral-500">Crunching...</main>}>
      <ResultBody />
    </Suspense>
  );
}

function Mini({ color, label, amount, share }: { color: string; label: string; amount: number; share: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <p className="mt-1 font-mono font-semibold tabular-nums">{fmt(amount)}</p>
      <p className="text-xs text-neutral-500">{pct(share)} of income</p>
    </div>
  );
}
