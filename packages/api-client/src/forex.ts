/**
 * Nepal Rastra Bank's published exchange rates, read straight from NRB's open API
 * (https://www.nrb.org.np/api-docs-v1/): no key, CORS open, so neither app routes it through our server.
 */

export const NRB_FOREX_URL = "https://www.nrb.org.np/api/forex/v1/rates";

export interface ForexRate {
  iso3: string;
  /** NRB's English name. */
  name: string;
  /** The rates are per this many units (100 INR, 10 JPY, 1 USD). */
  unit: number;
  buy: number;
  sell: number;
}

export interface ForexDay {
  /** The day NRB published these rates for (YYYY-MM-DD). */
  date: string;
  rates: ForexRate[];
}

interface NrbResponse {
  data?: {
    payload?: {
      date: string;
      rates: { currency: { iso3: string; name: string; unit: number }; buy: string; sell: string }[];
    }[];
  };
}

/** Kathmandu's calendar date `daysAgo` days back (+05:45, no DST), without Intl. */
function kathmanduDate(daysAgo: number, now = Date.now()): string {
  return new Date(now + (5 * 60 + 45) * 60_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

/** Every day NRB published between `daysBack` days ago and today (Kathmandu), oldest first. */
async function fetchForexDays(daysBack: number, now: number): Promise<ForexDay[]> {
  const url = `${NRB_FOREX_URL}?page=1&per_page=100&from=${kathmanduDate(daysBack, now)}&to=${kathmanduDate(0, now)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NRB forex answered ${res.status}`);
  const days = ((await res.json()) as NrbResponse).data?.payload ?? [];
  return days
    .map((d) => ({
      date: d.date,
      rates: d.rates
        .map((r) => ({ iso3: r.currency.iso3, name: r.currency.name, unit: r.currency.unit, buy: Number(r.buy), sell: Number(r.sell) }))
        .filter((r) => Number.isFinite(r.buy) && Number.isFinite(r.sell)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The latest NRB rates up to today (Kathmandu), looking back a week for weekends and holidays. */
export async function fetchForexRates(now = Date.now()): Promise<ForexDay | null> {
  return (await fetchForexDays(7, now)).at(-1) ?? null;
}

/** NRB's last 30 days (one page: 31 days at most), newest first. */
export async function fetchForexHistory(now = Date.now()): Promise<ForexDay[]> {
  return (await fetchForexDays(30, now)).reverse();
}

export const forexKeys = {
  latest: () => ["forex", "nrb", "latest"] as const,
  history: () => ["forex", "nrb", "history"] as const,
};
