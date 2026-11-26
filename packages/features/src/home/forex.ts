/**
 * Today's Nepal Rastra Bank exchange rates for the home page, read on the device from NRB's
 * open API. The apps only draw the cards.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchForexHistory, forexKeys, type ForexRate } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";

/** The currencies most readers send or receive come first; NRB's own order follows. */
const FIRST = ["USD", "AUD", "INR", "GBP", "EUR", "CAD", "JPY", "AED", "SAR", "QAR", "KRW", "MYR"];
const NAMED = new Set([...FIRST, "CHF", "SGD", "CNY", "THB", "SEK", "DKK", "HKD", "KWD", "BHD", "OMR"]);

export type ForexCardView = {
  code: string;
  name: string;
  perUnit: string;
  buy: string;
  sell: string;
  /** Selling rate over NRB's last 30 days, oldest first (the card's sparkline). */
  spark: number[];
  /** Selling rate up (or level) since the previous published day. */
  rising: boolean;
  /** NRB's numbers, rupees per `unit` of the currency, for the converter. */
  rate: { unit: number; buy: number; sell: number };
};

export type ForexCopy = { title: string; subtitle: string; buy: string; sell: string; source: string; date: string; history: string; currency: string };

export type ForexRates = {
  copy: ForexCopy;
  status: PageStatus;
  cards: ForexCardView[];
};

/** Orders NRB's list: {@link FIRST}, then the rest as NRB gives them. */
export function orderForex(rates: readonly ForexRate[]): ForexRate[] {
  const rank = (r: ForexRate) => {
    const i = FIRST.indexOf(r.iso3);
    return i < 0 ? FIRST.length : i;
  };
  return rates.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map(({ r }) => r);
}

function useForexCopy(date: string | null): ForexCopy {
  const { t, digits } = useLocale();
  return {
    title: t("forex.title"),
    subtitle: t("forex.subtitle"),
    buy: t("forex.buy"),
    sell: t("forex.sell"),
    source: date ? t("forex.source", { date: digits(date) }) : "",
    date: t("forex.date"),
    history: t("forex.history"),
    currency: t("forex.currency_label"),
  };
}

function useCardView() {
  const { t, digits } = useLocale();
  const money = (v: number) => digits(v.toFixed(2));
  return (r: ForexRate, spark: number[] = []): ForexCardView => ({
    code: r.iso3,
    name: NAMED.has(r.iso3) ? t(`forex.currency.${r.iso3}`) : r.name,
    perUnit: t("forex.per_unit", { unit: digits(r.unit), code: r.iso3 }),
    buy: money(r.buy),
    sell: money(r.sell),
    spark,
    rising: spark.length < 2 || spark.at(-1)! >= spark.at(-2)!,
    rate: { unit: r.unit, buy: r.buy, sell: r.sell },
  });
}

/** Today's rates, every currency, each with its 30-day line: the home slider and the list page. */
export function useForexRates(): ForexRates {
  // One NRB request (30 days) serves today's rates, the sparklines and each currency's page.
  const q = useQuery({ queryKey: forexKeys.history(), queryFn: () => fetchForexHistory(), staleTime: 60 * 60_000 });
  const days = q.data ?? [];
  const day = days[0] ?? null;
  const view = useCardView();
  const copy = useForexCopy(day?.date ?? null);
  const sparkOf = (code: string) =>
    [...days].reverse().flatMap((d) => d.rates.filter((r) => r.iso3 === code).map((r) => r.sell));
  let status: PageStatus = "ready";
  if (q.isLoading) status = "loading";
  else if (!day) status = "error";
  return { copy, status, cards: orderForex(day?.rates ?? []).map((r) => view(r, sparkOf(r.iso3))) };
}

export type ForexHistoryRow = { date: string; buy: string; sell: string };

/** One currency's page: today's card and NRB's last 30 days, newest first. */
export type RateChartData = { labels: string[]; series: { key: string; label: string; values: number[] }[]; format: (v: number) => string };

export function useForexDetail(code: string): {
  copy: ForexCopy;
  status: PageStatus;
  card: ForexCardView | null;
  rows: ForexHistoryRow[];
  /** Oldest first, for the chart. */
  chart: RateChartData;
} {
  const { digits } = useLocale();
  const q = useQuery({ queryKey: forexKeys.history(), queryFn: () => fetchForexHistory(), staleTime: 60 * 60_000 });
  const days = q.data ?? [];
  const view = useCardView();
  const copy = useForexCopy(days[0]?.date ?? null);
  const rateOn = (i: number) => days[i]?.rates.find((r) => r.iso3 === code) ?? null;
  const today = rateOn(0);
  let status: PageStatus = "ready";
  if (q.isLoading) status = "loading";
  else if (!today) status = "error";
  const points = [...days].reverse().flatMap((d) => {
    const r = d.rates.find((x) => x.iso3 === code);
    return r ? [{ date: d.date, buy: r.buy, sell: r.sell }] : [];
  });
  return {
    copy,
    status,
    card: today ? view(today, points.map((p) => p.sell)) : null,
    chart: {
      labels: points.map((p) => digits(p.date)),
      series: [
        { key: "buy", label: copy.buy, values: points.map((p) => p.buy) },
        { key: "sell", label: copy.sell, values: points.map((p) => p.sell) },
      ],
      format: (v) => digits(v.toFixed(2)),
    },
    rows: days.flatMap((d) => {
      const r = d.rates.find((x) => x.iso3 === code);
      return r ? [{ date: digits(d.date), buy: digits(r.buy.toFixed(2)), sell: digits(r.sell.toFixed(2)) }] : [];
    }),
  };
}

export type ForexSide = "buy" | "sell" | "mid";

/**
 * `amount` of `from` in `to`, through rupees, at NRB's buying, selling or middle rate. "NPR" is the
 * rupee itself; a currency NRB did not quote gives null.
 */
export function convertForex(
  amount: number,
  from: string,
  to: string,
  side: ForexSide,
  rates: readonly { code: string; rate: { unit: number; buy: number; sell: number } }[],
): number | null {
  const perUnit = (code: string) => {
    if (code === "NPR") return 1;
    const r = rates.find((x) => x.code === code)?.rate;
    if (!r) return null;
    const price = side === "buy" ? r.buy : side === "sell" ? r.sell : (r.buy + r.sell) / 2;
    return price / r.unit;
  };
  const a = perUnit(from);
  const b = perUnit(to);
  return a === null || b === null || !Number.isFinite(amount) ? null : (amount * a) / b;
}
