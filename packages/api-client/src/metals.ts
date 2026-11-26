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

export async function fetchMetalHistory(): Promise<MetalHistory> {
  const res = await fetch(`${STATIC_DATA_BASE}/metals/history.json`);
  if (!res.ok) throw new Error(`metals/history.json answered ${res.status}`);
  const body = (await res.json()) as MetalHistory;
  // Rows from before the FENEGOSIDA switch carried other fields; only rupee rows count.
  const days = (Array.isArray(body.days) ? body.days : []).filter((d) => typeof d.gold_tola === "number");
  if (days.length === 0) throw new Error("metals/history.json has no days");
  return { ...body, days };
}

export const metalKeys = {
  history: () => ["metals", "history"] as const,
};
