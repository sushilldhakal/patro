import type { GrahaSpashtaRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthGrahaSpashta } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
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
  patroStickySubHeadCell,
  patroStickySubHeadCorner,
} from "@/lib/patro-classes";

const th = cn(dainikKrantiClasses.monthTh, "whitespace-nowrap");
const td = cn(dainikKrantiClasses.monthTd, "whitespace-nowrap");

type Props = {
  rows: GrahaSpashtaRow[];
  todayKey?: string;
  loading?: boolean;
  empty?: boolean;
  embedded?: boolean;
};

export function MonthGrahaSpashta({ rows, todayKey, loading, empty, embedded }: Props) {
  const m = useMonthGrahaSpashta(rows, { todayKey, loading, empty });
  const table = (
      <Table>
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{m.head.date}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "text-left")}>{m.head.day}</TableHead>
            {m.planets.map((p) => (
              <TableHead key={p.key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] text-center")}>
                {p.label}
              </TableHead>
            ))}
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>{m.head.deshaantar}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>{m.head.akshamsha}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] text-center")}>{m.head.belaantar}</TableHead>
          </TableRow>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead colSpan={2} className={patroStickySubHeadCorner} />
            {m.planets.map((p) => (
              <TableHead key={`sub-${p.key}`} className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>
                {m.subHead.planet}
              </TableHead>
            ))}
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.deshaantar}</TableHead>
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.akshamsha}</TableHead>
            <TableHead className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.belaantar}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {m.stateText ? (
            <TableRow>
              <TableCell colSpan={13} className={dainikKrantiClasses.monthLoading}>
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
                    "sticky left-0 z-10",
                    dainikKrantiClasses.stickyDateCell,
                    row.isToday && dainikKrantiClasses.rowToday,
                  )}
                >
                  {row.day}
                </TableCell>
                <TableCell className={td}>{row.weekday}</TableCell>
                {row.cells.map((cell) => (
                  <TableCell key={cell.key} className={cn(td, dainikKrantiClasses.monthTdMono)}>
                    <span className="inline-flex items-center justify-center gap-1">
                      {cell.value}
                      <GrahaStatusBadges
                        planetKey={cell.key}
                        isRetrograde={cell.isRetrograde}
                        isCombust={cell.isCombust}
                        size={12}
                      />
                    </span>
                  </TableCell>
                ))}
                <TableCell className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.deshaantar}</TableCell>
                <TableCell className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.akshamsha}</TableCell>
                <TableCell className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.belaantar}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
  );

  const footnote = (
    <p className={dainikKrantiClasses.monthFootnote}>
      {m.footnote.map((run, i) =>
        run.mono ? (
          <span key={i} className={cn("font-mono", run.strong && "text-foreground")}>
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </p>
  );

  if (embedded) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        {table}
        {footnote}
      </div>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.graha_spashta.title" subtitleKey="dainik.shell.graha_spashta.subtitle">
      {table}
      {footnote}
    </PatroTableShell>
  );
}
