import type { LagnaMatrixRow } from "@/lib/dainikKranti/month-patro-tables";
import { useTranslation } from "react-i18next";
import { getRashiList } from "@/lib/rashi-i18n";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatroTableShell } from "./PatroTableShell";
import {
  patroStickyHeadCell,
  patroStickyHeadCorner,
  patroStickyHeadRow,
} from "@/lib/patro-classes";

const th = "whitespace-nowrap px-2 py-2.5 text-sm font-semibold";
const td = "whitespace-nowrap px-2 py-2 text-center font-mono text-sm tabular-nums";

type Props = {
  rows: LagnaMatrixRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  /** When true, render only the inner table (for accordion embed). */
  embedded?: boolean;
};

export function MonthLagnaMatrix({ rows, todayKey, loading, empty, embedded }: Props) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const table = (
      <Table>
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{t("dainik.date")}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "text-left")}>{t("dainik.day")}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "text-amber-600 dark:text-amber-400")}>{t("dainik.rise")}</TableHead>
            {getRashiList("ne").map((rne, i) => (
              <TableHead key={rne} className={cn(th, patroStickyHeadCell, "min-w-[3.75rem] text-center")}>
                <span className="flex justify-center">
                  <RashiGlyphIcon name={rne} number={i + 1} size={20} />
                </span>
                <span>{bilingualText(lang, rne, getRashiList("en")[i])}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={15} className="py-8 text-center text-sm">
                {t("dainik.loading")}
              </TableCell>
            </TableRow>
          ) : empty || rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15} className="py-8 text-center text-sm">
                {t("dainik.no_days_found_in_this_paksha")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const isToday = row.dateAd === todayKey;
              return (
                <TableRow
                  key={row.dateAd}
                  className={cn(isToday && "bg-secondary/15 hover:bg-secondary/20")}
                >
                  <TableCell
                    className={cn(
                      td,
                      "sticky left-0 z-10 bg-card pl-3 text-left font-semibold",
                      isToday && "bg-secondary/15",
                    )}
                  >
                    {digits(row.day)}
                  </TableCell>
                  <TableCell className={cn(td, "text-left")}>
                    {bilingualText(lang, row.weekdayNe ?? "—", row.weekdayEn ?? row.weekdayNe ?? "—")}
                  </TableCell>
                  <TableCell className={cn(td, "text-amber-600 dark:text-amber-400")}>
                    {row.sunrise ? digits(row.sunrise) : "—"}
                  </TableCell>
                  {getRashiList("ne").map((_, i) => {
                    const num = i + 1;
                    const val = row.times[num];
                    const late = val?.includes("२५") || val?.includes("२६") || val?.includes("२७");
                    return (
                      <TableCell
                        key={num}
                        className={cn(td, late && "text-amber-700 dark:text-amber-300")}
                      >
                        {val ?? "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
  );

  if (embedded) return table;

  return (
    <PatroTableShell
      titleNe="दैनिक लग्न आरम्भ समयतालिका"
      titleEn="Daily Lagna (Ascendant) Start Time Table"
      subtitle="प्रत्येक गते सूर्योदयदेखि अर्को सूर्योदयसम्म कुन राशि कहिले लग्नमा आउँछ — समय सूर्योदयभन्दा अगाडि भए २४ घण्टा थपिएको देखाइन्छ।"
      subtitleEn="For each day, which rashi rises as the lagna and when, from sunrise to the next sunrise — times before sunrise are shown with 24 hours added."
    >
      {table}
    </PatroTableShell>
  );
}
