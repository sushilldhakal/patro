/**
 * The ashtakavarga card, shared by the website's and the app's
 * `components/kundali/AshtakavargaCard.tsx`: the column targets (lagna and
 * the seven grahas), the raw and reduced bindu matrices with their totals
 * row, and the shodhya pinda table. Each app draws the tables.
 */
import type { AshtakavargaData, AshtakavargaSignRow, ShodhyaPindaRow } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

/** Matrix column order (display only — scores come from the API). */
export const ASHTAKAVARGA_TARGETS = ["lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;
export type AshtakavargaTarget = (typeof ASHTAKAVARGA_TARGETS)[number];

const SHODHYA_METRICS = [
  { key: "rashiPinda", label: "kundali.rashi" },
  { key: "grahaPinda", label: "kundali.graha" },
  { key: "shodhyaPinda", label: "kundali.x.pinda_shodhya" },
] as const satisfies readonly { key: keyof ShodhyaPindaRow; label: string }[];

export type AshtakavargaMatrixRow = {
  rashi: number;
  rashiNe: string;
  name: string;
  /** One value per target, in `targets` order. */
  values: string[];
  sarvashtaka: string;
};

export function useAshtakavargaCard(data: AshtakavargaData) {
  const { t, lang, digits } = useLocale();

  const matrix = (key: string, title: string, rows: AshtakavargaSignRow[] = []) => ({
    key,
    title,
    rows: rows.map(
      (row): AshtakavargaMatrixRow => ({
        rashi: row.rashi,
        rashiNe: row.rashiNe,
        name: bilingualText(lang, row.rashiNe, row.rashiEn),
        values: ASHTAKAVARGA_TARGETS.map((tg) => digits(row.bindus[tg] ?? 0)),
        sarvashtaka: digits(row.sarvashtaka),
      }),
    ),
    totals: ASHTAKAVARGA_TARGETS.map((tg) => digits(rows.reduce((s, r) => s + (r.bindus[tg] ?? 0), 0))),
    sarvTotal: digits(rows.reduce((s, r) => s + r.sarvashtaka, 0)),
  });

  const shodhya = data.shodhyaPinda ?? [];
  return {
    title: t("kundali.ashtakavarga"),
    intro: t("kundali.parashari_bindu_tables_per_rashi_sarv_sums_the_seven_gr"),
    targets: ASHTAKAVARGA_TARGETS.map((key) => ({ key, label: t(`grahas.${key}`), graha: key !== "lagna" })),
    rashiHeader: t("kundali.rashi"),
    sarvHeader: t("kundali.sarv"),
    totalLabel: t("kundali.sarvashtaka"),
    matrices: [
      matrix("raw", t("kundali.ashtakavarga"), data.raw),
      matrix("reduced", t("kundali.reduced_ashtakavarga"), data.reduced),
    ],
    shodhya: {
      title: t("kundali.shodhya_pinda"),
      hasRows: shodhya.length > 0,
      rows: SHODHYA_METRICS.map((metric) => ({
        key: metric.key,
        label: t(metric.label),
        emphasize: metric.key === "shodhyaPinda",
        values: ASHTAKAVARGA_TARGETS.map((tg) => {
          const val = shodhya.find((r) => r.target === tg)?.[metric.key];
          return val != null ? digits(val) : "—";
        }),
      })),
    },
  };
}
