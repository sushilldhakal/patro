/**
 * Today's Nepal Rastra Bank exchange rates for the home page, read on the device from NRB's
 * open API. The apps only draw the cards.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchForexHistory, fetchForexRates, forexKeys, type ForexRate } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";

/** The currencies most readers send or receive come first; NRB's own order follows. */
const FIRST = ["USD", "AUD", "INR", "GBP", "EUR", "CAD", "JPY", "AED", "SAR", "QAR", "KRW", "MYR"];
const NAMED = new Set([...FIRST, "CHF", "SGD", "CNY", "THB", "SEK", "DKK", "HKD", "KWD", "BHD", "OMR"]);

export type ForexCardView = { code: string; name: string; perUnit: string; buy: string; sell: string };

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
  return (r: ForexRate): ForexCardView => ({
    code: r.iso3,
    name: NAMED.has(r.iso3) ? t(`forex.currency.${r.iso3}`) : r.name,
    perUnit: t("forex.per_unit", { unit: digits(r.unit), code: r.iso3 }),
    buy: money(r.buy),
    sell: money(r.sell),
  });
}

/** Today's rates, every currency: the home slider and the list page. */
export function useForexRates(): ForexRates {
  const q = useQuery({ queryKey: forexKeys.latest(), queryFn: () => fetchForexRates(), staleTime: 60 * 60_000 });
  const day = q.data ?? null;
  const view = useCardView();
  const copy = useForexCopy(day?.date ?? null);
  let status: PageStatus = "ready";
  if (q.isLoading) status = "loading";
  else if (q.isError && !day) status = "error";
  return { copy, status, cards: orderForex(day?.rates ?? []).map(view) };
}

export type ForexHistoryRow = { date: string; buy: string; sell: string };

/** One currency's page: today's card and NRB's last 30 days, newest first. */
export function useForexDetail(code: string): { copy: ForexCopy; status: PageStatus; card: ForexCardView | null; rows: ForexHistoryRow[] } {
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
  return {
    copy,
    status,
    card: today ? view(today) : null,
    rows: days.flatMap((d) => {
      const r = d.rates.find((x) => x.iso3 === code);
      return r ? [{ date: digits(d.date), buy: digits(r.buy.toFixed(2)), sell: digits(r.sell.toFixed(2)) }] : [];
    }),
  };
}
