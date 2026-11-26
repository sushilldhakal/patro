/**
 * Hallmark gold and silver in rupees as FENEGOSIDA (Nepal's gold dealers' federation) sets them,
 * copied once a day by the Metals daily workflow to static.vedicpatro.com/metals/history.json.
 * The apps read that file only: neither they nor our server ask FENEGOSIDA.
 */
import { STATIC_DATA_BASE } from "./static-data";

/** One published day, in rupees: per tola (11.66410453 g) and per 10 grams. */
export interface MetalDay {
  date: string;
  gold_tola: number;
  gold_10g: number;
  silver_tola: number;
  silver_10g: number;
}

export interface MetalHistory {
  updated_at: string;
  /** Oldest first. */
  days: MetalDay[];
}

/** A row with every rupee figure: older or partial rows are dropped, never drawn as NaN. */
export function isMetalDay(d: unknown): d is MetalDay {
  const r = d as Partial<MetalDay> | null;
  return (
    !!r &&
    typeof r.date === "string" &&
    [r.gold_tola, r.gold_10g, r.silver_tola, r.silver_10g].every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

export async function fetchMetalHistory(): Promise<MetalHistory> {
  const res = await fetch(`${STATIC_DATA_BASE}/metals/history.json`);
  if (!res.ok) throw new Error(`metals/history.json answered ${res.status}`);
  const body = (await res.json()) as MetalHistory;
  // Rows from before the FENEGOSIDA switch carried other fields; only rupee rows count.
  const days = (Array.isArray(body.days) ? body.days : []).filter(isMetalDay);
  if (days.length === 0) throw new Error("metals/history.json has no days");
  return { ...body, days };
}

export const metalKeys = {
  // "fenegosida": phones still hold the first (GoldAPI, per-gram) file under the old key, which
  // drew NaN; a new key never reads it.
  history: () => ["metals", "history", "fenegosida"] as const,
};
