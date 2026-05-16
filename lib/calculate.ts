import federal from "@/data/federal.json";
import states from "@/data/states.json";
import cities from "@/data/cities.json";
import type { Bracket, CalculationResult, FederalData, LevelBreakdown, StateData, CityData, LineItem } from "./types";
import { zipToState } from "./zip";
import { allocate } from "./allocate";

const FED = federal as unknown as FederalData;
const STATES = states as unknown as Record<string, StateData>;
const CITIES = cities as unknown as Record<string, CityData>;

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

function computeFederal(income: number): LevelBreakdown & { marginal: number } {
  const taxable = Math.max(0, income - FED.standardDeduction);
  const { tax, marginal } = applyBrackets(taxable, FED.brackets);
  const items: LineItem[] = allocate(tax, FED.allocations);
  return {
    level: "Federal",
    total: tax,
    effectiveRate: income > 0 ? tax / income : 0,
    jurisdiction: "United States",
    source: FED.source,
    items,
    marginal,
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
      note: `${stateCode} not yet in V1 dataset. Coming in V2.`,
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
  return {
    level: "State",
    total: tax,
    effectiveRate: income > 0 ? tax / income : 0,
    jurisdiction: s.name,
    source: s.allocationsSource,
    note: s.note,
    items: allocate(tax, s.allocations),
  };
}

function computeLocal(income: number, zip: string): LevelBreakdown & { cityKey: string } {
  const { key, data } = pickCity(zip);
  const propTax = income * data.propertyTaxRate;
  return {
    level: "Local",
    total: propTax,
    effectiveRate: income > 0 ? propTax / income : 0,
    jurisdiction: data.name,
    source: data.source,
    note: "Approximate. Modeled as a property-tax proxy: avg local effective rate × income. Actual liability depends on home value.",
    items: allocate(propTax, data.allocations),
    cityKey: key,
  };
}

export function calculate(zip: string, income: number): CalculationResult | { error: string } {
  if (!Number.isFinite(income) || income < 0) return { error: "Income must be a non-negative number." };
  const stateCode = zipToState(zip);
  if (!stateCode) return { error: "We couldn't map that ZIP code to a state." };

  const fed = computeFederal(income);
  const st = computeState(income, stateCode);
  const loc = computeLocal(income, zip);

  const totalTax = fed.total + st.total + loc.total;
  const { cityKey, ...localOut } = loc;
  const { marginal, ...fedOut } = fed;

  return {
    zip,
    income,
    state: stateCode,
    cityKey,
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
