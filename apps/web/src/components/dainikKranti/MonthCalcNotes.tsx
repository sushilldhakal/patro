import { Trans } from "@vedic-patro/i18n/react";
import type { CalcNote } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthCalcNotes } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { PatroTableShell } from "./PatroTableShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  patroStickyHeadCell,
  patroStickyHeadRow,
} from "@/lib/patro-classes";

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind, label }: { kind: CalcNote["kind"]; label: string }) {
  return (
    <span
      className={cn(
        dainikKrantiClasses.kindBadge,
        dainikKrantiClasses.kindBadgeText,
        kind === "late_night" && cn(dainikKrantiClasses.kindLate, dainikKrantiClasses.kindLateText),
        kind === "ingress" && cn(dainikKrantiClasses.kindIngress, dainikKrantiClasses.kindIngressText),
        kind === "paksha_boundary" && dainikKrantiClasses.kindPaksha,
        kind === "udayast" && cn(dainikKrantiClasses.kindUdayast, dainikKrantiClasses.kindUdayastText),
        kind === "motion" && cn(dainikKrantiClasses.kindMotion, dainikKrantiClasses.kindMotionText),
      )}
    >
      {label}
    </span>
  );
}

const th = cn(dainikKrantiClasses.calcTh, "h-9 whitespace-nowrap");
const td = cn(dainikKrantiClasses.calcTd, "align-top");

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { status, groups, legend, legendNoteKey, copy } = useMonthCalcNotes(notes, loading);

  const notesTable = status === "loading" ? (
    <p className={dainikKrantiClasses.calcEmpty}>{copy.loading}</p>
  ) : status === "empty" ? (
    <p className={dainikKrantiClasses.calcEmpty}>{copy.empty}</p>
  ) : (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[28rem] text-sm">
        <TableHeader>
          <TableRow className={patroStickyHeadRow}>
            <TableHead className={cn(th, patroStickyHeadCell, "w-14")}>{copy.date}</TableHead>
            <TableHead className={cn(th, patroStickyHeadCell)}>{copy.notes}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.key}>
              <TableCell className={cn(td, "w-14", dainikKrantiClasses.calcDay)}>{group.day}</TableCell>
              <TableCell className={td}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {group.notes.map((note, i) => (
                    <span key={note.key} className="inline-flex max-w-full flex-wrap items-baseline gap-1">
                      {i > 0 ? <span aria-hidden>·</span> : null}
                      <KindBadge kind={note.kind} label={note.kindLabel} />
                      <span className="text-foreground">{note.text}</span>
                    </span>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const legendBlock = (
    <section className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <h4 className={dainikKrantiClasses.legendHeading}>{copy.legendTitle}</h4>
      <dl className="space-y-1.5">
        {legend.map((it) => (
          <div key={it.code} className={dainikKrantiClasses.legendRow}>
            <dt className={cn("w-24", dainikKrantiClasses.legendCodeCol)}>
              <span className={cn(dainikKrantiClasses.legendCodeChip, dainikKrantiClasses.legendCodeText, "sm:text-sm")}>
                {it.code}
              </span>
            </dt>
            <dd>
              <span className={dainikKrantiClasses.legendMeaning}>{it.full}</span> — {it.meaning}
            </dd>
          </div>
        ))}
      </dl>
      <p className={dainikKrantiClasses.calcLegendNote}>
        <Trans i18nKey={legendNoteKey} components={{ b: <span className={dainikKrantiClasses.legendStrong} /> }} />
      </p>
    </section>
  );

  if (embedded) {
    return (
      <div>
        {notesTable}
        {legendBlock}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PatroTableShell titleKey="dainik.shell.calc_notes.title" subtitleKey="dainik.shell.calc_notes.subtitle">
        {notesTable}
      </PatroTableShell>
      {legendBlock}
    </div>
  );
}
