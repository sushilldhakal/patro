/**
 * Hallmark gold and silver for the home slider and the metals pages: FENEGOSIDA's daily rate,
 * from the once-a-day file on Cloudflare. Per tola and per 10 grams, with the change per tola
 * since the previous published day.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchMetalHistory, metalKeys, type MetalDay } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";

export type MetalId = "gold" | "silver";
export const METAL_IDS: readonly MetalId[] = ["gold", "silver"];

const tolaOf = (day: MetalDay, metal: MetalId) => (metal === "gold" ? day.gold_tola : day.silver_tola);
const tenGramOf = (day: MetalDay, metal: MetalId) => (metal === "gold" ? day.gold_10g : day.silver_10g);

export type MetalCardView = {
  id: MetalId;
  name: string;
  date: string;
  tola: string;
  tenGram: string;
  /** Change per tola since the previous day, unsigned, or null on the first day. */
  change: string | null;
  rising: boolean;
};

export type MetalRowView = { date: string; tola: string; tenGram: string };

export type MetalCopy = { title: string; subtitle: string; tola: string; tenGram: string; note: string; date: string; history: string };

/** The day's file changes once, at 10:30 Nepal time; within the day it is never asked again. */
const METALS_STALE_MS = 3 * 60 * 60_000;

/** 529689 → "5,29,689": Nepal's lakh grouping, without Intl (Hermes may lack en-IN). */
export function lakhGrouped(n: number): string {
  const s = String(Math.abs(Math.trunc(n)));
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${head ? `${head},` : ""}${s.slice(-3)}`;
}

/** Rupees with lakh grouping and at most one decimal: 2636.54 → "2,636.5", 208160 → "2,08,160". */
export function rupees(v: number): string {
  const tenths = Math.round(v * 10);
  const whole = lakhGrouped(Math.trunc(tenths / 10));
  const frac = Math.abs(tenths % 10);
  return frac ? `${whole}.${frac}` : whole;
}

function useMetals() {
  const { t, digits } = useLocale();
  const q = useQuery({ queryKey: metalKeys.history(), queryFn: fetchMetalHistory, staleTime: METALS_STALE_MS });
  const days = q.data?.days ?? [];
  let status: PageStatus = "ready";
  if (q.isLoading) status = "loading";
  else if (days.length === 0) status = "error";
  const rs = (v: number) => t("metals.amount", { amount: digits(rupees(v)) });
  const copy: MetalCopy = {
    title: t("metals.title"),
    subtitle: t("metals.subtitle"),
    tola: t("metals.per_tola"),
    tenGram: t("metals.per_10g"),
    note: t("metals.note"),
    date: t("metals.date"),
    history: t("metals.history"),
  };
  const card = (id: MetalId): MetalCardView | null => {
    const today = days.at(-1);
    if (!today) return null;
    const before = days.at(-2);
    const tola = tolaOf(today, id);
    const diff = before ? Math.round((tola - tolaOf(before, id)) * 10) / 10 : null;
    return {
      id,
      name: t(id === "gold" ? "metals.gold" : "metals.silver"),
      date: digits(today.date),
      tola: rs(tola),
      tenGram: rs(tenGramOf(today, id)),
      change: diff === null || diff === 0 ? null : digits(rupees(Math.abs(diff))),
      rising: (diff ?? 0) >= 0,
    };
  };
  const rows = (id: MetalId): MetalRowView[] =>
    [...days]
      .reverse()
      .map((d) => ({ date: digits(d.date), tola: rs(tolaOf(d, id)), tenGram: rs(tenGramOf(d, id)) }));
  return { copy, status, card, rows };
}

/** Home slider and list page: one card per metal. */
export function useMetalPrices(): { copy: MetalCopy; status: PageStatus; cards: MetalCardView[] } {
  const m = useMetals();
  return { copy: m.copy, status: m.status, cards: METAL_IDS.map(m.card).filter((c): c is MetalCardView => c !== null) };
}

/** One metal's page: today's card and every published day, newest first. */
export function useMetalDetail(id: MetalId): { copy: MetalCopy; status: PageStatus; card: MetalCardView | null; rows: MetalRowView[] } {
  const m = useMetals();
  return { copy: m.copy, status: m.status, card: m.card(id), rows: m.rows(id) };
}
