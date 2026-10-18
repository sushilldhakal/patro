/**
 * The dainik kranti month's graha spashta table, shared by the website's and
 * the app's `components/dainikKranti/MonthGrahaSpashta.tsx`: the two header
 * rows, one row per day (planet cells with their retro / combust flags and
 * the solar corrections), the loading / empty state, the footnote, and copy.
 */
import { PATRO_PLANET_KEYS, type GrahaSpashtaRow } from "@vedic-patro/domain/jyotish/dainikKranti/month-patro-tables";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";
import { patroPlanetLabel, patroWeekday, usePatroTableStatus, type PatroTableState } from "./patro-cells";

export type PatroFootnoteRun = { text: string; mono?: boolean; strong?: boolean };

export function useMonthGrahaSpashta(rows: GrahaSpashtaRow[], { todayKey, ...state }: PatroTableState & { todayKey?: string }) {
  const { t, lang, digits } = useLocale();
  const isEn = lang === "en";
  return {
    ...usePatroTableStatus(rows, state),
    head: {
      date: t("dainik.date"),
      day: t("dainik.day"),
      deshaantar: t("aside.deshaantar"),
      akshamsha: t("aside.akshamsha"),
      belaantar: t("dainik.belaantar"),
    },
    /** The second header row under each planet / correction column. */
    subHead: {
      planet: t("dainik.ra_deg_ka_vi"),
      deshaantar: t("aside.deshaantar"),
      akshamsha: t("aside.akshamsha"),
      belaantar: t("dainik.time_corr"),
    },
    planets: PATRO_PLANET_KEYS.map((key) => ({ key, label: patroPlanetLabel(lang, key) })),
    rows: rows.map((row) => ({
      key: row.dateAd,
      isToday: row.dateAd === todayKey,
      day: digits(row.day),
      weekday: patroWeekday(lang, row.weekdayNe, row.weekdayEn),
      cells: PATRO_PLANET_KEYS.map((key) => {
        const cell = row.planets[key];
        return {
          key,
          value: cell ? `${isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe} ${cell.coords}` : "—",
          isRetrograde: cell?.isRetrograde,
          isCombust: cell?.isCombust,
        };
      }),
      deshaantar: row.deshaantar ?? "—",
      akshamsha: row.akshamsha ?? "—",
      belaantar: row.belaantar ?? "—",
    })),
    /** The footnote as runs; `mono` runs are the bracket format and its example. */
    footnote: (isEn
      ? [
          { text: `Signs: ${getRashiList("en").join(", ")}. Each planet's bracket shows ` },
          { text: "sign deg|kala|vikala", mono: true },
          { text: " — e.g. " },
          { text: "Vrishabha 13|6|29", mono: true, strong: true },
          { text: " = Vrishabha sign, 13 deg 6 kala 29 vikala." },
        ]
      : [
          { text: `${t("ui.dainik_kranti.x_9f5629ff")}${getRashiList("ne").join(", ")}${t("ui.dainik_kranti.x_3fa0c883")} ` },
          { text: t("ui.dainik_kranti.x_536ecbd5"), mono: true },
          { text: `${t("ui.dainik_kranti.x_e59e68b7")} ` },
          { text: t("ui.dainik_kranti.x_9846f458"), mono: true, strong: true },
          { text: t("ui.dainik_kranti.x_6d4da8be") },
        ]) as PatroFootnoteRun[],
  };
}
