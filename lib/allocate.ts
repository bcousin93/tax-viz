import type { Allocation, LineItem } from "./types";

export function allocate(total: number, allocations: Allocation[]): LineItem[] {
  return allocations.map((a) => ({
    category: a.category,
    pct: a.pct,
    amount: total * a.pct,
    icon: a.icon,
    examples: a.examples,
  }));
}
