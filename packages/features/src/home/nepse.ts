/**
 * NEPSE share prices. The server reads the market every 30 seconds while trading is open and
 * saves every change, so the apps get the live list, a day's ticks and years of daily history.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchNepseDaily,
  fetchNepseIntraday,
  fetchNepseLive,
  nepseKeys,
  type NepseLive,
  type NepseQuote,
} from "@vedic-patro/api-client";
import { lakhGrouped } from "./metals";

/** Refresh while the market is open; the server's own read is every 30 s. */
const LIVE_REFRESH_MS = 30_000;
/** Nepal is UTC+05:45 all year. */
const NPT_MS = (5 * 60 + 45) * 60_000;
/** A chart never draws more points than this; longer series are thinned evenly. */
const MAX_POINTS = 300;

export type NepseRange = "1D" | "1M" | "6M" | "1Y" | "5Y" | "ALL";
export const NEPSE_RANGES: NepseRange[] = ["1D", "1M", "6M", "1Y", "5Y", "ALL"];
const RANGE_DAYS: Record<NepseRange, number> = { "1D": 0, "1M": 31, "6M": 183, "1Y": 366, "5Y": 1827, ALL: Infinity };

/** The whole market, refreshed every 30 s while trading is open. */
export function useNepseLive() {
  return useQuery<NepseLive>({
    queryKey: nepseKeys.live(),
    queryFn: fetchNepseLive,
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.market_open ? LIVE_REFRESH_MS : false),
  });
}

/** One scrip: its live quote and the chart for `range` (labels and prices, oldest first). */
export function useNepseStock(symbol: string, range: NepseRange) {
  const live = useNepseLive();
  const quote: NepseQuote | null = live.data?.stocks.find((s) => s.symbol === symbol) ?? null;
  const day = live.data?.date ?? undefined;
  const open = live.data?.market_open ?? false;
  const intraday = useQuery({
    queryKey: [...nepseKeys.intraday(symbol), day ?? ""],
    queryFn: () => fetchNepseIntraday(symbol, day),
    enabled: range === "1D" && !!live.data,
    staleTime: 15_000,
    refetchInterval: open ? LIVE_REFRESH_MS : false,
  });
  const daily = useQuery({
    queryKey: nepseKeys.daily(symbol),
    queryFn: () => fetchNepseDaily(symbol),
    enabled: range !== "1D",
    staleTime: 5 * 60_000,
  });

  let labels: string[] = [];
  let values: number[] = [];
  if (range === "1D") {
    const points = thin(intraday.data?.points ?? []);
    labels = points.map(([t]) => new Date(t * 1000 + NPT_MS).toISOString().slice(11, 16));
    values = points.map(([, price]) => price);
  } else {
    const days = daily.data?.days ?? [];
    const last = days.at(-1)?.[0];
    const from = last && RANGE_DAYS[range] !== Infinity ? shiftDays(last, -RANGE_DAYS[range]) : "";
    const picked = thin(days.filter(([d]) => d >= from));
    labels = picked.map(([d]) => d);
    values = picked.map(([, , , , close]) => close);
  }
  const chartQuery = range === "1D" ? intraday : daily;
  return {
    quote,
    marketOpen: open,
    asOf: live.data?.as_of ?? null,
    chart: { labels, values },
    loading: live.isLoading || chartQuery.isLoading,
    error: live.isError || chartQuery.isError,
  };
}

/** 1234567.8 → "12,34,567.80"; `decimals` 0 drops them. */
export function nepseNumber(v: number, decimals = 2): string {
  const [whole, frac] = Math.abs(v).toFixed(decimals).split(".");
  return `${v < 0 ? "-" : ""}${lakhGrouped(Number(whole))}${frac ? `.${frac}` : ""}`;
}

/** Rupees in crore (10⁷) for turnover totals: 5489584101 → "548.96". */
export function nepseCrore(v: number): string {
  return nepseNumber(v / 1e7);
}

function thin<T>(rows: T[]): T[] {
  if (rows.length <= MAX_POINTS) return rows;
  const step = (rows.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => rows[Math.round(i * step)]!);
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
