import type { Metadata } from "next";
import Link from "next/link";
import federal from "@/data/federal.json";
import statesRaw from "@/data/states.json";
import cities from "@/data/cities.json";
import propertyTax from "@/data/property-tax.json";
import zipToState from "@/data/zip-to-state.json";
import type { CityData, StateData } from "@/lib/types";

export const metadata: Metadata = {
  title: "Where the data came from — Tax Visualizer",
  description:
    "Citations and source links for every dataset that powers the tax breakdown: federal brackets, state income tax, property tax rates, and city budgets.",
};

type AnyState = StateData & { allocationsSource?: string };

const states = statesRaw as Record<string, AnyState>;
const cityMap = cities as Record<string, CityData>;

function isUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function SourceLink({ source }: { source: string }) {
  if (isUrl(source)) {
    return (
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="underline break-all hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        {source}
      </a>
    );
  }
  return <span>{source}</span>;
}

export default function SourcesPage() {
  const sortedStates = Object.entries(states).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );

  const cityEntries = Object.entries(cityMap);

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            ← Back to calculator
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Where the data came from
          </h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Every number in the breakdown is pulled from a public dataset.
            Brackets and deductions come from official tax authorities; spending
            allocations come from federal/state budget reports and city budget
            offices. Here&apos;s the full list.
          </p>
        </div>

        <Section title="Federal income tax & spending" badge={`Tax year ${federal.year}`}>
          <Field label="Brackets, standard deduction, and Child Tax Credit">
            <SourceLink source="https://www.irs.gov/filing/federal-income-tax-rates-and-brackets" />
          </Field>
          <Field label="Spending allocations (where federal dollars go)">
            <SourceLink source="https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement" />
            <p className="mt-1 text-xs text-neutral-500">
              Cross-checked against{" "}
              <a
                href="https://www.nationalpriorities.org"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                nationalpriorities.org
              </a>
              .
            </p>
          </Field>
        </Section>

        <Section title="State income tax" badge={`${sortedStates.length} jurisdictions`}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Brackets and standard deductions come from each state&apos;s
            department of revenue (or Tax Foundation summary for states with no
            income tax). Spending allocations come from the National
            Association of State Budget Officers (NASBO) State Expenditure
            Report.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Tax type</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {sortedStates.map(([code, s]) => (
                  <tr
                    key={code}
                    className="border-t border-neutral-200 dark:border-neutral-800 align-top"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-mono text-xs text-neutral-500 mr-2">
                        {code}
                      </span>
                      {s.name}
                    </td>
                    <td className="px-3 py-2 capitalize whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {s.taxType}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <SourceLink source={s.source} />
                      {s.taxType !== "none" && s.allocationsSource && (
                        <div className="mt-1 text-neutral-500">
                          Allocations:{" "}
                          <SourceLink source={s.allocationsSource} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Property tax rates">
          <Field label={`Effective rate by state (national average ${(propertyTax.national * 100).toFixed(2)}%)`}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {propertyTax.source}
            </p>
          </Field>
          <Field label={`Renter pass-through model (${(propertyTax.rentCapRate * 100).toFixed(0)}% cap rate)`}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {propertyTax.rentCapRateNote}
            </p>
          </Field>
        </Section>

        <Section title="Local / city budgets" badge={`${cityEntries.length} cities`}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            For supported metros we pull spending categories directly from the
            city&apos;s published budget. Other ZIPs fall back to a U.S.-average
            municipality.
          </p>
          <div className="mt-4 space-y-3">
            {cityEntries.map(([key, c]) => (
              <div
                key={key}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{c.name}</h3>
                  <span className="text-xs text-neutral-500">
                    {(c.propertyTaxRate * 100).toFixed(2)}% effective rate
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  <SourceLink source={c.source} />
                </div>
                {c.zips && c.zips.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Matched ZIP3s:{" "}
                    <span className="font-mono">{c.zips.join(", ")}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="ZIP → state mapping">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {zipToState.source}
          </p>
        </Section>

        <Section title="Caveats">
          <ul className="list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
            <li>
              Estimates use AGI and the standard deduction. Itemizing, credits
              beyond CTC, payroll tax (FICA), capital gains, AMT, and state
              credits are not modeled.
            </li>
            <li>
              Sales tax, excise taxes, and fees are not included — only income
              tax (federal + state) and property tax (local).
            </li>
            <li>
              Local budget shares are taken from a recent fiscal year and held
              steady; actual percentages shift annually.
            </li>
            <li>
              This is informational, not tax advice. For filing, use the IRS or
              a qualified preparer.
            </li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {badge && (
          <span className="text-xs text-neutral-500 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1 text-sm break-words">{children}</div>
    </div>
  );
}
