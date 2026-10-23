/**
 * Adhik (mala) maas page logic, shared by the website (`apps/web/src/pages/AdhikMaas.tsx`)
 * and the app (`apps/mobile/app/(tabs)/adhik-maas.tsx`): which lunar month is adhik in
 * the browsed year, its BS and AD span, the years around it, and why it happens.
 *
 * The API answers per BS year. An AD year straddles two BS years, so both are asked
 * and only the adhik months that begin inside the AD year are kept.
 */
import { useQueries } from "@tanstack/react-query";
import { fetchSpecialMonths, specialMonthsKeys, type SpecialMonthsResponse } from "@vedic-patro/api-client";
import {
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  formatBsCivilIsoRange,
} from "@vedic-patro/domain/calendar/bs-calendar";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { formatBrowsePatroYear } from "@vedic-patro/domain/calendar/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";
import { kshayaViewOf } from "./kshaya-view";

/** AD year N begins in BS N+56 (Poush) and ends in BS N+57. */
const AD_TO_BS = 56;
/** The years listed around the browsed BS year. */
const NEARBY_BEFORE = 1;
const NEARBY_AFTER = 3;

export type AdhikMaasView = {
  key: string;
  /** "अधिक जेठ" / "Adhik Jestha". */
  name: string;
  bsRange: string;
  adRange: string;
  days: string;
  /** The month that follows it under the same name. */
  nijNote: string;
};

export type AdhikNearbyYear = {
  year: number;
  label: string;
  /** The adhik month's name, or null when the year has none (undefined while loading). */
  month: string | null | undefined;
  active: boolean;
};

/** The engine spells Baisakh "Baishakh"; every other month matches `BS_MONTH_NAMES`. */
function monthIndexOf(name: string): number {
  const key = name.trim().toLowerCase().replace("baishakh", "baisakh");
  return BS_MONTH_NAMES.findIndex((m) => m.toLowerCase() === key);
}

function monthLabel(name: string, isEn: boolean): string {
  const i = monthIndexOf(name);
  if (i < 0) return name;
  return isEn ? BS_MONTH_NAMES[i]! : BS_MONTHS_NE[i]!;
}

function formatAdRange(startIso: string, endIso: string, isEn: boolean, digits: (v: string | number) => string): string {
  const names = isEn ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE;
  const [ay, am, ad] = startIso.split("-").map(Number);
  const [by, bm, bd] = endIso.split("-").map(Number);
  const a = `${digits(ad!)} ${names[am! - 1]}`;
  const b = `${digits(bd!)} ${names[bm! - 1]}`;
  return ay === by ? `${a} – ${b} ${digits(by!)}` : `${a} ${digits(ay!)} – ${b} ${digits(by!)}`;
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 86_400_000) + 1;
}

/** The BS years whose answers the browsed year needs. */
function bsYearsFor(era: Era, year: number): number[] {
  if (era === "bs") return [year];
  if (era === "ad") return [year + AD_TO_BS, year + AD_TO_BS + 1];
  return [];
}

export function useAdhikMaasPage({ year, era }: { year: number; era: Era }) {
  const { t, lang, digits } = useLocale();
  const isEn = lang === "en";
  const yearLabel = formatBrowsePatroYear(era, year, lang, digits);
  const bsYears = bsYearsFor(era, year);
  const nearbyYears =
    era === "bs" ? Array.from({ length: NEARBY_BEFORE + NEARBY_AFTER + 1 }, (_, i) => year - NEARBY_BEFORE + i) : [];

  const asked = [...new Set([...bsYears, ...nearbyYears])];
  const queries = useQueries({
    queries: asked.map((y) => ({
      queryKey: specialMonthsKeys.year(y),
      queryFn: () => fetchSpecialMonths(y),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });
  const answer = (y: number): SpecialMonthsResponse | undefined => queries[asked.indexOf(y)]?.data;

  const main = bsYears.map((y) => queries[asked.indexOf(y)]!);
  const status: PageStatus = !bsYears.length
    ? "ready"
    : main.every((q) => q.data !== undefined)
      ? "ready"
      : main.some((q) => q.isError)
        ? "error"
        : "loading";

  const months: AdhikMaasView[] = [];
  let kshaya: string | null = null;
  for (const y of bsYears) {
    const data = answer(y);
    for (const adhik of data?.adhik_months ?? (data?.adhik_maas ? [data.adhik_maas] : [])) {
      if (!adhik.has_adhik_maas || !adhik.month_name || !adhik.start_date || !adhik.end_date) continue;
      if (era === "ad" && Number(adhik.start_date.slice(0, 4)) !== year) continue;
      const month = monthLabel(adhik.month_name, isEn);
      months.push({
        key: adhik.start_date,
        name: t("adhik_page.adhik_name", { month }),
        bsRange: formatBsCivilIsoRange(adhik.start_date, adhik.end_date, lang, digits),
        adRange: formatAdRange(adhik.start_date, adhik.end_date, isEn, digits),
        days: t("adhik_page.days", { count: digits(daysBetween(adhik.start_date, adhik.end_date)) }),
        nijNote: t("adhik_page.nij_note", { month }),
      });
    }
    const k = kshayaViewOf(data?.kshaya_maas, { lang, digits, t });
    if (k) {
      kshaya = t("adhik_page.kshaya_found", { month: k.name, range: k.range, adhik: k.adhik || "—" });
    }
  }

  const nearby: AdhikNearbyYear[] = nearbyYears.map((y) => {
    const data = answer(y);
    const names = (data?.adhik_months ?? (data?.adhik_maas ? [data.adhik_maas] : []))
      .filter((a) => a.has_adhik_maas && a.month_name)
      .map((a) => monthLabel(a.month_name!, isEn));
    return {
      year: y,
      label: digits(y),
      month: data === undefined ? undefined : names.length ? names.join(", ") : null,
      active: y === year,
    };
  });

  return {
    copy: {
      title: t("adhik_page.title"),
      subtitle: t("adhik_page.subtitle"),
      intro: t("adhik_page.intro"),
      resultTitle: t("adhik_page.result_title", { year: yearLabel }),
      none: t("adhik_page.none", { year: yearLabel }),
      unsupported: t("adhik_page.unsupported"),
      bsLabel: t("adhik_page.bs_label"),
      adLabel: t("adhik_page.ad_label"),
      lengthLabel: t("adhik_page.length_label"),
      nearbyTitle: t("adhik_page.nearby_title"),
      nearbyNone: t("adhik_page.nearby_none"),
      learnTitle: t("adhik_page.learn_title"),
      observeTitle: t("adhik_page.observe_title"),
      readMore: t("adhik_page.read_more"),
      loading: t("common.loading"),
      error: t("common.load_error"),
      backHome: t("panchak.back_home"),
    },
    status,
    supported: bsYears.length > 0,
    months,
    kshaya,
    nearby,
    learn: (["what", "why", "how", "name"] as const).map((k) => ({
      key: k,
      title: t(`adhik_page.learn.${k}_title`),
      body: t(`adhik_page.learn.${k}_body`),
    })),
    observe: (["do", "avoid"] as const).map((k) => ({
      key: k,
      title: t(`adhik_page.observe.${k}_title`),
      body: t(`adhik_page.observe.${k}_body`),
    })),
    /** The learn article that explains adhik and kshaya maas in full. */
    learnSlug: "adhik-kshaya-maas",
  };
}

export type AdhikMaasPage = ReturnType<typeof useAdhikMaasPage>;
