/**
 * Gold and silver in rupees, as the Metals daily workflow publishes them once a day at 10:30 Nepal
 * time (GoldAPI → static.vedicpatro.com/metals/history.json). The apps read that file only:
 * neither they nor our server call GoldAPI.
 */
import { STATIC_DATA_BASE } from "./static-data";

/** One tola in grams, as the owner quotes it. */
export const TOLA_GRAMS = 11.66410453;

/** One published day, rupees per gram. */
export interface MetalDay {
  date: string;
  gold24k: number;
  gold22k: number;
  silver: number;
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
  if (!Array.isArray(body.days) || body.days.length === 0) throw new Error("metals/history.json has no days");
  return body;
}

export const metalKeys = {
  history: () => ["metals", "history"] as const,
};
