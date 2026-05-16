export type Bracket = { rate: number; min: number; max: number | null };

export type Allocation = {
  category: string;
  pct: number;
  icon?: string;
  examples?: string[];
};

export type FederalData = {
  year: number;
  source: string;
  filingStatus: string;
  standardDeduction: number;
  brackets: Bracket[];
  allocations: Allocation[];
};

export type StateData =
  | {
      name: string;
      year: number;
      source: string;
      allocationsSource: string;
      taxType: "flat" | "progressive";
      standardDeduction: number;
      flatRate?: number;
      brackets?: Bracket[];
      noIncomeTax: false;
      allocations: Allocation[];
      note?: string;
    }
  | {
      name: string;
      year: number;
      source: string;
      taxType: "none";
      noIncomeTax: true;
      note: string;
    };

export type CityData = {
  name: string;
  source: string;
  zips?: string[];
  propertyTaxRate: number;
  allocations: Allocation[];
};

export type LineItem = { category: string; amount: number; pct: number; icon?: string; examples?: string[] };

export type HousingMode = "owner" | "renter" | "skip";

export type LevelBreakdown = {
  level: "Federal" | "State" | "Local";
  total: number;
  effectiveRate: number;
  jurisdiction: string;
  source: string;
  note?: string;
  items: LineItem[];
  passThrough?: { amount: number; label: string };
};

export type CalculationResult = {
  zip: string;
  income: number;
  state: string;
  cityKey: string;
  housing: { mode: HousingMode; homeValue?: number; monthlyRent?: number };
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  federal: LevelBreakdown;
  state_: LevelBreakdown;
  local: LevelBreakdown;
};
