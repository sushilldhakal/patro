import { Trans } from "@vedic-patro/i18n/react";
import type { CalcNote } from "@vedic-patro/domain/jyotish/dainikKranti/month-patro-tables";
import { useMonthCalcNotes } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell, patroStickyHeadRow } from "@vedic-patro/design-tokens/classes/patro-classes";
import { HtmlBody, HtmlHead, HtmlRow, HtmlTable, HtmlTd, HtmlTh } from "./html-table";
import { PatroTableShell } from "./PatroTableShell";

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind, label }: { kind: CalcNote["kind"]; label: string }) {
  return (
    <Text
      as="span"
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
    </Text>
  );
}

const th = cn(dainikKrantiClasses.calcTh, "h-9 whitespace-nowrap");
const td = cn(dainikKrantiClasses.calcTd, "align-top");

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { status, groups, legend, legendNoteKey, copy } = useMonthCalcNotes(notes, loading);

  const notesTable =
    status === "loading" ? (
      <Text as="p" className={dainikKrantiClasses.calcEmpty}>
        {copy.loading}
      </Text>
    ) : status === "empty" ? (
      <Text as="p" className={dainikKrantiClasses.calcEmpty}>
        {copy.empty}
      </Text>
    ) : (
      <HtmlTable className="min-w-[28rem]">
        <HtmlHead>
          <HtmlRow className={patroStickyHeadRow}>
            <HtmlTh className={cn(th, patroStickyHeadCell, "w-14")}>{copy.date}</HtmlTh>
            <HtmlTh className={cn(th, patroStickyHeadCell)}>{copy.notes}</HtmlTh>
          </HtmlRow>
        </HtmlHead>
        <HtmlBody>
          {groups.map((group) => (
            <HtmlRow key={group.key}>
              <HtmlTd className={cn(td, "w-14", dainikKrantiClasses.calcDay)}>{group.day}</HtmlTd>
              <HtmlTd className={td}>
                <Box className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {group.notes.map((note, i) => (
                    <Text key={note.key} as="span" className="inline-flex max-w-full flex-wrap items-baseline gap-1">
                      {i > 0 ? <Text as="span">·</Text> : null}
                      <KindBadge kind={note.kind} label={note.kindLabel} />
                      <Text as="span" className="text-foreground">
                        {note.text}
                      </Text>
                    </Text>
                  ))}
                </Box>
              </HtmlTd>
            </HtmlRow>
          ))}
        </HtmlBody>
      </HtmlTable>
    );

  const legendBlock = (
    <Box as="section" className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <Text as="h4" className={dainikKrantiClasses.legendHeading}>
        {copy.legendTitle}
      </Text>
      <Box className="space-y-1.5">
        {legend.map((it) => (
          <Box key={it.code} className={dainikKrantiClasses.legendRow}>
            <Text as="span" className={cn("w-24", dainikKrantiClasses.legendCodeCol)}>
              <Text as="span" className={cn(dainikKrantiClasses.legendCodeChip, dainikKrantiClasses.legendCodeText, "sm:text-sm")}>
                {it.code}
              </Text>
            </Text>
            <Text as="span">
              <Text as="span" className={dainikKrantiClasses.legendMeaning}>
                {it.full}
              </Text>{" "}
              — {it.meaning}
            </Text>
          </Box>
        ))}
      </Box>
      <Text as="p" className={dainikKrantiClasses.calcLegendNote}>
        <Trans i18nKey={legendNoteKey as never} components={{ b: <Text as="span" className={dainikKrantiClasses.legendStrong} /> }} />
      </Text>
    </Box>
  );

  if (embedded) {
    return (
      <Box>
        {notesTable}
        {legendBlock}
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      <PatroTableShell titleKey="dainik.shell.calc_notes.title" subtitleKey="dainik.shell.calc_notes.subtitle">
        {notesTable}
      </PatroTableShell>
      {legendBlock}
    </Box>
  );
}
