import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useTranslation } from "@vedic-patro/i18n/react";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
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

const th = cn(dainikKrantiClasses.monthTh, "whitespace-nowrap");
const td = cn(dainikKrantiClasses.monthTd, dainikKrantiClasses.monthTdMono, "whitespace-nowrap");

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
            <TableHead className={cn(th, patroStickyHeadCell, dainikKrantiClasses.amberText)}>{t("dainik.rise")}</TableHead>
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
              <TableCell colSpan={15} className={dainikKrantiClasses.monthLoading}>
                {t("dainik.loading")}
              </TableCell>
            </TableRow>
          ) : empty || rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15} className={dainikKrantiClasses.monthLoading}>
                {t("dainik.no_days_found_in_this_paksha")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const isToday = row.dateAd === todayKey;
              return (
                <TableRow
                  key={row.dateAd}
                  className={cn(isToday && cn(dainikKrantiClasses.rowToday, "hover:bg-secondary/20"))}
                >
                  <TableCell
                    className={cn(
                      td,
                      "sticky left-0 z-10 text-left",
                      dainikKrantiClasses.stickyDateCell,
                      isToday && dainikKrantiClasses.rowToday,
                    )}
                  >
                    {digits(row.day)}
                  </TableCell>
                  <TableCell className={cn(td, "text-left")}>
                    {bilingualText(lang, row.weekdayNe ?? "—", row.weekdayEn ?? row.weekdayNe ?? "—")}
                  </TableCell>
                  <TableCell className={cn(td, dainikKrantiClasses.amberText)}>
                    {row.sunrise ? digits(row.sunrise) : "—"}
                  </TableCell>
                  {getRashiList("ne").map((_, i) => {
                    const num = i + 1;
                    const val = row.times[num];
                    const late = val?.includes(/* copy-ok */ "२५") || val?.includes(/* copy-ok */ "२६") || val?.includes(/* copy-ok */ "२७");
                    return (
                      <TableCell
                        key={num}
                        className={cn(td, late && dainikKrantiClasses.lateText)}
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
    <PatroTableShell titleKey="dainik.shell.lagna_matrix.title" subtitleKey="dainik.shell.lagna_matrix.subtitle">
      {table}
    </PatroTableShell>
  );
}
