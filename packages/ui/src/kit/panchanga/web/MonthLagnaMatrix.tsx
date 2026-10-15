import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthLagnaMatrix } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell, patroStickyHeadCorner, patroStickyHeadRow } from "@vedic-patro/design-tokens/classes/patro-classes";
import { RashiGlyphIcon } from "./ElementGlyphIcon";
import { HtmlBody, HtmlHead, HtmlRow, HtmlTable, HtmlTd, HtmlTh } from "./html-table";
import { PatroTableShell } from "./PatroTableShell";

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
  const m = useMonthLagnaMatrix(rows, { todayKey, loading, empty });
  const table = (
    <HtmlTable>
      <HtmlHead>
        <HtmlRow className={patroStickyHeadRow}>
          <HtmlTh className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{m.head.date}</HtmlTh>
          <HtmlTh className={cn(th, patroStickyHeadCell, "text-left")}>{m.head.day}</HtmlTh>
          <HtmlTh className={cn(th, patroStickyHeadCell, dainikKrantiClasses.amberText)}>{m.head.rise}</HtmlTh>
          {m.rashis.map((r) => (
            <HtmlTh key={r.ne} className={cn(th, patroStickyHeadCell, "min-w-[3.75rem] text-center")}>
              <Text as="span" className="flex justify-center">
                <RashiGlyphIcon name={r.ne} number={r.number} size={20} />
              </Text>
              <Text as="span">{r.label}</Text>
            </HtmlTh>
          ))}
        </HtmlRow>
      </HtmlHead>
      <HtmlBody>
        {m.stateText ? (
          <HtmlRow>
            <HtmlTd colSpan={15} className={dainikKrantiClasses.monthLoading}>
              {m.stateText}
            </HtmlTd>
          </HtmlRow>
        ) : (
          m.rows.map((row) => (
            <HtmlRow key={row.key} className={cn(row.isToday && cn(dainikKrantiClasses.rowToday, "hover:bg-secondary/20"))}>
              <HtmlTd className={cn(td, "sticky left-0 z-10 text-left", dainikKrantiClasses.stickyDateCell, row.isToday && dainikKrantiClasses.rowToday)}>
                {row.day}
              </HtmlTd>
              <HtmlTd className={cn(td, "text-left")}>{row.weekday}</HtmlTd>
              <HtmlTd className={cn(td, dainikKrantiClasses.amberText)}>{row.sunrise}</HtmlTd>
              {row.times.map((c) => (
                <HtmlTd key={c.key} className={cn(td, c.late && dainikKrantiClasses.lateText)}>
                  {c.value}
                </HtmlTd>
              ))}
            </HtmlRow>
          ))
        )}
      </HtmlBody>
    </HtmlTable>
  );

  if (embedded) return table;

  return (
    <PatroTableShell titleKey="dainik.shell.lagna_matrix.title" subtitleKey="dainik.shell.lagna_matrix.subtitle">
      {table}
    </PatroTableShell>
  );
}
