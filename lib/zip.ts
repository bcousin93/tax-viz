import zipMap from "@/data/zip-to-state.json";

const ranges = zipMap.ranges as { from: number; to: number; state: string }[];

export function zipToState(zip: string): string | null {
  const clean = zip.replace(/\D/g, "").slice(0, 5);
  if (clean.length < 3) return null;
  const prefix = parseInt(clean.slice(0, 3), 10);
  if (Number.isNaN(prefix)) return null;
  for (const r of ranges) {
    if (prefix >= r.from && prefix <= r.to) return r.state;
  }
  return null;
}

export function isValidZip(zip: string): boolean {
  const clean = zip.replace(/\D/g, "");
  return clean.length === 5;
}
