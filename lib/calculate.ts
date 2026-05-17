import federal from "@/data/federal.json";
import states from "@/data/states.json";
import cities from "@/data/cities.json";
import property from "@/data/property-tax.json";
import type { Bracket, CalculationResult, FederalData, FilingStatus, HousingMode, LevelBreakdown, StateData, CityData, LineItem } from "./types";
import { zipToState } from "./zip";
import { allocate } from "./allocate";

const FED = federal as unknown as FederalData;
const STATES = states as unknown as Record<string, StateData>;
const CITIES = cities as unknown as Record<string, CityData>;
const PROP = property as unknown as {
  national: number;
  rentCapRate: number;
  source: string;
  states: Record<string, number>;
};

export function applyBrackets(taxable: number, brackets: Bracket[]): { tax: number; marginal: number } {
  if (taxable <= 0) return { tax: 0, marginal: 0 };
  let tax = 0;
  let marginal = 0;
  for (const b of brackets) {
    const cap = b.max ?? Infinity;
    if (taxable > b.min) {
      const slice = Math.min(taxable, cap) - b.min;
      tax += slice * b.rate;
      marginal = b.rate;
    }
    if (taxable <= cap) break;
  }
  return { tax, marginal };
}

function pickCity(zip: string): { key: string; data: CityData } {
  const prefix = zip.replace(/\D/g, "").slice(0, 3);
  for (const [key, data] of Object.entries(CITIES)) {
    if (key === "default") continue;
    if (data.zips?.includes(prefix)) return { key, data };
  }
  return { key: "default", data: CITIES.default };
}

function effectiveRateFor(stateCode: string, city: CityData, cityKey: string): number {
  if (cityKey !== "default") return city.propertyTaxRate;
  return PROP.states[stateCode] ?? PROP.national;
}

function childTaxCredit(income: number, status: FilingStatus, numKids: number): number {
  if (numKids <= 0) return 0;
  const ctc = FED.childTaxCredit;
  const gross = numKids * ctc.perChild;
  const threshold = ctc.phaseOutStart[status];
  if (income <= threshold) return gross;
  // $50 reduction per $1,000 (or fraction) over threshold
  const over = Math.ceil((income - threshold) / 1000) * 1000;
  const reduction = (over / 1000) * ctc.phaseOutPerThousand;
  return Math.max(0, gross - reduction);
}

function computeFederal(income: number, status: FilingStatus, numKids: number): LevelBreakdown & { marginal: number; preCredit: number; credits: number } {
  const cfg = FED.filingStatus[status];
  const taxable = Math.max(0, income - cfg.standardDeduction);
  const { tax: preCredit, marginal } = applyBrackets(taxable, cfg.brackets);
  const credits = Math.min(preCredit, childTaxCredit(income, status, numKids));
  const tax = Math.max(0, preCredit - credits);
  const items: LineItem[] = allocate(tax, FED.allocations);
  const noteParts: string[] = [];
  noteParts.push(`Filing ${status === "mfj" ? "MFJ" : status === "hoh" ? "HoH" : "single"}, standard deduction ${cfg.standardDeduction.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.`);
  if (credits > 0) {
    noteParts.push(`Child Tax Credit: −${credits.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} (${numKids} child${numKids === 1 ? "" : "ren"}).`);
  }
  return {
    level: "Federal",
    total: tax,
    effectiveRate: income > 0 ? tax / income : 0,
    jurisdiction: "United States",
    source: FED.source,
    note: noteParts.join(" "),
    items,
    marginal,
    preCredit,
    credits,
  };
}

function computeState(income: number, stateCode: string): LevelBreakdown {
  const s = STATES[stateCode];
  if (!s) {
    return {
      level: "State",
      total: 0,
      effectiveRate: 0,
      jurisdiction: stateCode,
      source: "",
      note: `${stateCode} not in dataset.`,
      items: [],
    };
  }
  if (s.taxType === "none" || s.noIncomeTax) {
    return {
      level: "State",
      total: 0,
      effectiveRate: 0,
      jurisdiction: s.name,
      source: s.source,
      note: "note" in s ? s.note : undefined,
      items: [],
    };
  }
  const taxable = Math.max(0, income - s.standardDeduction);
  let tax = 0;
  if (s.taxType === "flat" && typeof s.flatRate === "number") {
    tax = taxable * s.flatRate;
  } else if (s.taxType === "progressive" && s.brackets) {
    tax = applyBrackets(taxable, s.brackets).tax;
  }
  const note = [
    s.note,
    "State tax computed with single-filer brackets — filing status only affects federal in V1.",
  ].filter(Boolean).join(" ");
  return {
    level: "State",
    total: tax,
    effectiveRate: income > 0 ? tax / income : 0,
    jurisdiction: s.name,
    source: s.allocationsSource,
    note,
    items: allocate(tax, s.allocations),
  };
}

type LocalInput = {
  mode: HousingMode;
  homeValue?: number;
  monthlyRent?: number;
};

function computeLocal(income: number, zip: string, stateCode: string, housing: LocalInput): LevelBreakdown & { cityKey: string } {
  const { key, data } = pickCity(zip);
  const rate = effectiveRateFor(stateCode, data, key);
  const ratePct = (rate * 100).toFixed(2) + "%";
  const sourceLine = `${data.source} · effective property-tax rate ${ratePct} (${PROP.source})`;

  if (housing.mode === "owner" && housing.homeValue && housing.homeValue > 0) {
    const tax = housing.homeValue * rate;
    return {
      level: "Local",
      total: tax,
      effectiveRate: income > 0 ? tax / income : 0,
      jurisdiction: data.name,
      source: sourceLine,
      note: `Estimated as home value × local effective property-tax rate (${ratePct}).`,
      items: allocate(tax, data.allocations),
      cityKey: key,
    };
  }

  if (housing.mode === "renter" && housing.monthlyRent && housing.monthlyRent > 0) {
    const annualRent = housing.monthlyRent * 12;
    const passThrough = (rate / PROP.rentCapRate) * annualRent;
    const passPctOfRent = ((passThrough / annualRent) * 100).toFixed(0);
    return {
      level: "Local",
      total: 0,
      effectiveRate: 0,
      jurisdiction: data.name,
      source: sourceLine,
      note: `Renters don't owe property tax directly. Your landlord does, and most of it gets baked into rent — roughly ${passPctOfRent}% in this area (effective rate ${ratePct} / 6% cap rate). Shown below for context; not counted in your total.`,
      items: [],
      passThrough: {
        amount: passThrough,
        label: "Property tax embedded in your rent (informational)",
      },
      cityKey: key,
    };
  }

  return {
    level: "Local",
    total: 0,
    effectiveRate: 0,
    jurisdiction: data.name,
    source: sourceLine,
    note: "Skipped property-tax estimate. Owners and renters can enter a home value or monthly rent on the start screen.",
    items: [],
    cityKey: key,
  };
}

export function calculate(
  zip: string,
  income: number,
  opts: {
    filingStatus?: FilingStatus;
    numKids?: number;
    housing?: LocalInput;
  } = {}
): CalculationResult | { error: string } {
  if (!Number.isFinite(income) || income < 0) return { error: "Income must be a non-negative number." };
  const stateCode = zipToState(zip);
  if (!stateCode) return { error: "We couldn't map that ZIP code to a state." };

  const filingStatus: FilingStatus = opts.filingStatus ?? "single";
  const numKids = Math.max(0, Math.floor(opts.numKids ?? 0));
  const housing: LocalInput = opts.housing ?? { mode: "skip" };

  const fed = computeFederal(income, filingStatus, numKids);
  const st = computeState(income, stateCode);
  const loc = computeLocal(income, zip, stateCode, housing);

  const totalTax = fed.total + st.total + loc.total;
  const { cityKey, ...localOut } = loc;
  const { marginal, preCredit, credits, ...fedOut } = fed;

  return {
    zip,
    income,
    state: stateCode,
    cityKey,
    filingStatus,
    numKids,
    housing,
    totalTax,
    effectiveRate: income > 0 ? totalTax / income : 0,
    marginalRate: marginal,
    federal: fedOut,
    state_: st,
    local: localOut,
  };
}

export function isSupportedState(code: string): boolean {
  const s = STATES[code];
  return !!s;
}
