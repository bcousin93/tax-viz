import federal from "@/data/federal.json";
import states from "@/data/states.json";
import cities from "@/data/cities.json";
import property from "@/data/property-tax.json";
import type { Bracket, CalculationResult, FederalData, HousingMode, LevelBreakdown, StateData, CityData, LineItem } from "./types";
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
  housing: LocalInput = { mode: "skip" }
): CalculationResult | { error: string } {
  if (!Number.isFinite(income) || income < 0) return { error: "Income must be a non-negative number." };
  const stateCode = zipToState(zip);
  if (!stateCode) return { error: "We couldn't map that ZIP code to a state." };

  const fed = computeFederal(income);
  const st = computeState(income, stateCode);
  const loc = computeLocal(income, zip, stateCode, housing);

  const totalTax = fed.total + st.total + loc.total;
  const { cityKey, ...localOut } = loc;
  const { marginal, ...fedOut } = fed;

  return {
    zip,
    income,
    state: stateCode,
    cityKey,
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
