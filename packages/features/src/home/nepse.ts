/**
 * NEPSE share prices. The server reads the market every 30 seconds while trading is open and
 * saves every change, so the apps get the live list, a day's ticks and years of daily history.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchNepseDaily,
  fetchNepseIntraday,
  fetchNepseLive,
  fetchNepsePeriod,
  nepseKeys,
  type NepseLive,
  type NepseQuote,
} from "@vedic-patro/api-client";
import { lakhGrouped } from "./metals";
import { useMarketDate } from "./market-date";

/** Refresh while the market is open; the server's own read is every 30 s. */
const LIVE_REFRESH_MS = 30_000;
/** Nepal is UTC+05:45 all year. */
const NPT_MS = (5 * 60 + 45) * 60_000;
/** A chart never draws more points than this; longer series are thinned evenly. */
const MAX_POINTS = 300;

export type NepseRange = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y" | "ALL";
export const NEPSE_RANGES: NepseRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y", "ALL"];
const RANGE_DAYS: Record<NepseRange, number> = { "1D": 0, "1W": 7, "1M": 31, "6M": 183, "1Y": 366, "5Y": 1827, ALL: Infinity };

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
  const dateLabel = useMarketDate();
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
  // Always read: the 52-week high and low come from it too.
  const daily = useQuery({
    queryKey: nepseKeys.daily(symbol),
    queryFn: () => fetchNepseDaily(symbol),
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
    labels = picked.map(([d]) => dateLabel(d));
    values = picked.map(([, , , , close]) => close);
  }
  const chartQuery = range === "1D" ? intraday : daily;
  const allDays = daily.data?.days ?? [];
  const yearFrom = allDays.length ? shiftDays(allDays.at(-1)![0], -365) : "";
  const year = allDays.filter(([d]) => d >= yearFrom);
  const week52 = year.length
    ? { high: Math.max(...year.map(([, , h]) => h)), low: Math.min(...year.map(([, , , l]) => l)) }
    : null;
  return {
    quote,
    marketOpen: open,
    asOf: live.data?.as_of ?? null,
    chart: { labels, values },
    /** Over the stored last 365 days; null until the daily history is in. */
    week52,
    loading: live.isLoading || chartQuery.isLoading,
    error: live.isError || chartQuery.isError,
  };
}

/** Top movers and most traded: today (live) or the last week to five years. */
export type NepsePeriod = "1D" | "1W" | "1M" | "1Y" | "5Y";
export const NEPSE_PERIODS: NepsePeriod[] = ["1D", "1W", "1M", "1Y", "5Y"];
const PERIOD_DAYS: Record<Exclude<NepsePeriod, "1D">, number> = { "1W": 7, "1M": 31, "1Y": 366, "5Y": 1827 };
/** A mover needs this much turnover (rupees) in the period, so one odd lot can't top the list. */
const MOVER_MIN_TURNOVER: Record<NepsePeriod, number> = { "1D": 1e6, "1W": 5e6, "1M": 2e7, "1Y": 2e8, "5Y": 1e9 };

/** One ranked scrip: its live quote and its move and trade over the chosen period. */
export type NepseRanked = { quote: NepseQuote; change: number; percent: number; volume: number; turnover: number };

/** Every traded scrip with its move and trade over `period`; today straight from the live market. */
export function useNepsePeriod(period: NepsePeriod) {
  const live = useNepseLive();
  const days = period === "1D" ? 0 : PERIOD_DAYS[period];
  const periodQuery = useQuery({
    queryKey: nepseKeys.period(days),
    queryFn: () => fetchNepsePeriod(days),
    enabled: days > 0,
    staleTime: 5 * 60_000,
  });
  const stocks = live.data?.stocks ?? [];
  let ranked: NepseRanked[];
  if (days === 0) {
    ranked = stocks.map((q) => ({ quote: q, change: q.change, percent: q.percent, volume: q.volume, turnover: q.turnover }));
  } else {
    const bySymbol = new Map((periodQuery.data?.rows ?? []).map((r) => [r[0], r]));
    ranked = stocks.flatMap((q) => {
      const r = bySymbol.get(q.symbol);
      const start = r?.[1];
      if (!r || !start) return [];
      return [{ quote: q, change: q.ltp - start, percent: ((q.ltp - start) / start) * 100, volume: r[2], turnover: r[3] }];
    });
  }
  return { ranked, live, loading: live.isLoading || (days > 0 && periodQuery.isLoading), error: live.isError || periodQuery.isError };
}

/** Biggest gainers or losers over `period`, among scrips that traded enough to count. */
export function useNepseMovers(direction: "up" | "down", period: NepsePeriod) {
  const p = useNepsePeriod(period);
  const list = p.ranked
    .filter((r) => r.turnover >= MOVER_MIN_TURNOVER[period] && (direction === "up" ? r.percent > 0 : r.percent < 0))
    .sort((a, b) => (direction === "up" ? b.percent - a.percent : a.percent - b.percent));
  return { ...p, list };
}

/** Scrips by rupees or shares traded over `period`. */
export function useNepseMostTraded(by: "turnover" | "volume", period: NepsePeriod) {
  const p = useNepsePeriod(period);
  const list = [...p.ranked].sort((a, b) => b[by] - a[by]);
  return { ...p, list };
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
