import type { LagnaMatrixRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthLagnaMatrix } from "@vedic-patro/features/dainik-kranti";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
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
  const m = useMonthLagnaMatrix(rows, { todayKey, loading, empty });
  const table = (
      <Table>
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{m.head.date}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "text-left")}>{m.head.day}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, dainikKrantiClasses.amberText)}>{m.head.rise}</TableHead>
            {m.rashis.map((r) => (
              <TableHead key={r.ne} className={cn(th, patroStickyHeadCell, "min-w-[3.75rem] text-center")}>
                <span className="flex justify-center">
                  <RashiGlyphIcon name={r.ne} number={r.number} size={20} />
                </span>
                <span>{r.label}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {m.stateText ? (
            <TableRow>
              <TableCell colSpan={15} className={dainikKrantiClasses.monthLoading}>
                {m.stateText}
              </TableCell>
            </TableRow>
          ) : (
            m.rows.map((row) => (
              <TableRow
                key={row.key}
                className={cn(row.isToday && cn(dainikKrantiClasses.rowToday, "hover:bg-secondary/20"))}
              >
                <TableCell
                  className={cn(
                    td,
                    "sticky left-0 z-10 text-left",
                    dainikKrantiClasses.stickyDateCell,
                    row.isToday && dainikKrantiClasses.rowToday,
                  )}
                >
                  {row.day}
                </TableCell>
                <TableCell className={cn(td, "text-left")}>{row.weekday}</TableCell>
                <TableCell className={cn(td, dainikKrantiClasses.amberText)}>{row.sunrise}</TableCell>
                {row.times.map((c) => (
                  <TableCell key={c.key} className={cn(td, c.late && dainikKrantiClasses.lateText)}>
                    {c.value}
                  </TableCell>
                ))}
              </TableRow>
            ))
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
