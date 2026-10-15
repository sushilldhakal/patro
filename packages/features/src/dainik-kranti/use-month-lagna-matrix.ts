/**
 * The dainik kranti month's lagna start table, shared by the website's and the
 * app's `components/dainikKranti/MonthLagnaMatrix.tsx`: the header cells, one
 * row per day (today marked, starts past midnight flagged), the loading /
 * empty state, and copy.
 */
import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useLocale } from "@vedic-patro/i18n/react";
import { isLateLagnaTime, patroWeekday, rashiColumns, usePatroTableStatus, type PatroTableState } from "./patro-cells";

export function useMonthLagnaMatrix(rows: LagnaMatrixRow[], { todayKey, ...state }: PatroTableState & { todayKey?: string }) {
  const { t, lang, digits } = useLocale();
  const columns = rashiColumns(lang);
  return {
    ...usePatroTableStatus(rows, state),
    head: { date: t("dainik.date"), day: t("dainik.day"), rise: t("dainik.rise") },
    rashis: columns,
    rows: rows.map((row) => ({
      key: row.dateAd,
      isToday: row.dateAd === todayKey,
      day: digits(row.day),
      weekday: patroWeekday(lang, row.weekdayNe, row.weekdayEn),
      sunrise: row.sunrise ? digits(row.sunrise) : "—",
      times: columns.map((c) => {
        const value = row.times[c.number];
        return { key: c.number, value: value ?? "—", late: isLateLagnaTime(value) };
      }),
    })),
  };
}
