import type { GrahaSpashtaRow } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthGrahaSpashta } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import {
  patroStickyHeadCell,
  patroStickyHeadCorner,
  patroStickyHeadRow,
  patroStickySubHeadCell,
  patroStickySubHeadCorner,
} from "@vedic-patro/design-tokens/classes/patro-classes";
import { GrahaStatusBadges } from "./GrahaStatusBadges";
import { HtmlBody, HtmlHead, HtmlRow, HtmlTable, HtmlTd, HtmlTh } from "./html-table";
import { PatroTableShell } from "./PatroTableShell";

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
    <HtmlTable>
      <HtmlHead>
        <HtmlRow className={patroStickyHeadRow}>
          <HtmlTh className={cn(th, patroStickyHeadCorner, "pl-3 text-left")}>{m.head.date}</HtmlTh>
          <HtmlTh className={cn(th, patroStickyHeadCell, "text-left")}>{m.head.day}</HtmlTh>
          {m.planets.map((p) => (
            <HtmlTh key={p.key} className={cn(th, patroStickyHeadCell, "min-w-[5.5rem] text-center")}>
              {p.label}
            </HtmlTh>
          ))}
          <HtmlTh className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>{m.head.deshaantar}</HtmlTh>
          <HtmlTh className={cn(th, patroStickyHeadCell, "min-w-[4rem] text-center")}>{m.head.akshamsha}</HtmlTh>
          <HtmlTh className={cn(th, patroStickyHeadCell, "min-w-[4.5rem] text-center")}>{m.head.belaantar}</HtmlTh>
        </HtmlRow>
        <HtmlRow className="bg-muted/60 hover:bg-muted/60">
          <HtmlTh colSpan={2} className={patroStickySubHeadCorner} />
          {m.planets.map((p) => (
            <HtmlTh key={`sub-${p.key}`} className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>
              {m.subHead.planet}
            </HtmlTh>
          ))}
          <HtmlTh className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.deshaantar}</HtmlTh>
          <HtmlTh className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.akshamsha}</HtmlTh>
          <HtmlTh className={cn(th, patroStickySubHeadCell, "text-center font-normal")}>{m.subHead.belaantar}</HtmlTh>
        </HtmlRow>
      </HtmlHead>
      <HtmlBody>
        {m.stateText ? (
          <HtmlRow>
            <HtmlTd colSpan={13} className={dainikKrantiClasses.monthLoading}>
              {m.stateText}
            </HtmlTd>
          </HtmlRow>
        ) : (
          m.rows.map((row) => (
            <HtmlRow key={row.key} className={cn(row.isToday && cn(dainikKrantiClasses.rowToday, "hover:bg-secondary/20"))}>
              <HtmlTd className={cn(td, "sticky left-0 z-10", dainikKrantiClasses.stickyDateCell, row.isToday && dainikKrantiClasses.rowToday)}>
                {row.day}
              </HtmlTd>
              <HtmlTd className={td}>{row.weekday}</HtmlTd>
              {row.cells.map((cell) => (
                <HtmlTd key={cell.key} className={cn(td, dainikKrantiClasses.monthTdMono)}>
                  <Text as="span" className="inline-flex items-center justify-center gap-1">
                    {cell.value}
                    <GrahaStatusBadges planetKey={cell.key} isRetrograde={cell.isRetrograde} isCombust={cell.isCombust} size={12} />
                  </Text>
                </HtmlTd>
              ))}
              <HtmlTd className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.deshaantar}</HtmlTd>
              <HtmlTd className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.akshamsha}</HtmlTd>
              <HtmlTd className={cn(td, dainikKrantiClasses.monthTdMono)}>{row.belaantar}</HtmlTd>
            </HtmlRow>
          ))
        )}
      </HtmlBody>
    </HtmlTable>
  );

  const footnote = (
    <Text as="p" className={dainikKrantiClasses.monthFootnote}>
      {m.footnote.map((run, i) =>
        run.mono ? (
          <Text key={i} as="span" className={cn("font-mono", run.strong && "text-foreground")}>
            {run.text}
          </Text>
        ) : (
          <Text key={i} as="span">
            {run.text}
          </Text>
        ),
      )}
    </Text>
  );

  if (embedded) {
    return (
      <Box className="overflow-x-auto rounded-lg border border-border">
        {table}
        {footnote}
      </Box>
    );
  }

  return (
    <PatroTableShell titleKey="dainik.shell.graha_spashta.title" subtitleKey="dainik.shell.graha_spashta.subtitle">
      {table}
      {footnote}
    </PatroTableShell>
  );
}
