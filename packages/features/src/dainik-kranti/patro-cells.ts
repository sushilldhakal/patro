/**
 * Small pieces shared by the dainik kranti month tables and the day expand
 * panel: the patro planet's label, a lagna start time that runs past the
 * night (the next day's ghadi 25–27), and the rashi columns.
 */
import { PATRO_PLANET_NE, type PATRO_PLANET_KEYS } from "@vedic-patro/domain/jyotish/dainikKranti/month-patro-tables";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

export type PatroPlanetKey = (typeof PATRO_PLANET_KEYS)[number];

export function patroPlanetLabel(lang: string, key: PatroPlanetKey): string {
  const ne = PATRO_PLANET_NE[key];
  return bilingualText(lang, ne, GRAHA_NAME[key as GrahaKey]?.en ?? ne);
}

/** Lagna start clocks written as Nepali 25, 26 or 27 o'clock (past midnight). */
const LATE_MARKS = ["\u0968\u096B", "\u0968\u096C", "\u0968\u096D"]; // copy-ok

export function isLateLagnaTime(value?: string): boolean {
  return value != null && LATE_MARKS.some((m) => value.includes(m));
}

/** The twelve rashi columns: Nepali name (glyph id), number 1–12 and display label. */
export function rashiColumns(lang: string) {
  const en = getRashiList("en");
  return getRashiList("ne").map((ne, i) => ({ ne, number: i + 1, label: bilingualText(lang, ne, en[i]) }));
}

export type PatroTableState = { loading?: boolean; empty?: boolean };

export function usePatroTableStatus(rows: unknown[], { loading, empty }: PatroTableState) {
  const { t } = useLocale();
  const status: "loading" | "empty" | "ready" = loading ? "loading" : empty || rows.length === 0 ? "empty" : "ready";
  return {
    status,
    stateText: status === "loading" ? t("dainik.loading") : status === "empty" ? t("dainik.no_days_found_in_this_paksha") : null,
  };
}

export function patroWeekday(lang: string, ne?: string, en?: string) {
  return bilingualText(lang, ne ?? "—", en ?? ne ?? "—");
}
