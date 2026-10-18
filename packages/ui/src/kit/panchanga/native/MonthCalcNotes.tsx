import { ScrollView, View } from "react-native";
import { Trans } from "@vedic-patro/i18n/react";
import type { CalcNote } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthCalcNotes } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { patroStickyHeadCell } from "@vedic-patro/design-tokens/classes/patro-classes";
import { PatroTableShell } from "./PatroTableShell";

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind, label }: { kind: CalcNote["kind"]; label: string }) {
  return (
    <Box
      className={cn(
        dainikKrantiClasses.kindBadge,
        kind === "late_night" && dainikKrantiClasses.kindLate,
        kind === "ingress" && dainikKrantiClasses.kindIngress,
        kind === "paksha_boundary" && dainikKrantiClasses.kindPaksha,
        kind === "udayast" && dainikKrantiClasses.kindUdayast,
        kind === "motion" && dainikKrantiClasses.kindMotion,
      )}
    >
      <Text
        className={cn(
          dainikKrantiClasses.kindBadgeText,
          kind === "late_night" && dainikKrantiClasses.kindLateText,
          kind === "ingress" && dainikKrantiClasses.kindIngressText,
          kind === "udayast" && dainikKrantiClasses.kindUdayastText,
          kind === "motion" && dainikKrantiClasses.kindMotionText,
        )}
      >
        {label}
      </Text>
    </Box>
  );
}

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { status, groups, legend, legendNoteKey, copy } = useMonthCalcNotes(notes, loading);

  const notesTable =
    status === "loading" ? (
      <Text className={dainikKrantiClasses.calcEmpty}>{copy.loading}</Text>
    ) : status === "empty" ? (
      <Text className={dainikKrantiClasses.calcEmpty}>{copy.empty}</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="min-w-full">
          <Box className="w-full flex-row border-b border-border bg-muted">
            <Box className={cn("w-14 px-2.5 py-2", patroStickyHeadCell)}>
              <Text className="text-xs font-semibold">{copy.date}</Text>
            </Box>
            <Box className={cn("flex-1 px-2.5 py-2", patroStickyHeadCell)}>
              <Text className="text-xs font-semibold">{copy.notes}</Text>
            </Box>
          </Box>
          {groups.map((group) => (
            <Box key={group.key} className="w-full flex-row border-b border-border/60">
              <Box className="w-14 px-2.5 py-2">
                <Text className={cn("font-num", dainikKrantiClasses.cellText, dainikKrantiClasses.calcDay)}>{group.day}</Text>
              </Box>
              <Box className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2">
                {group.notes.map((note, i) => (
                  <Box key={note.key} className="flex-row flex-wrap items-center gap-1">
                    {i > 0 ? <Text className="text-sm">·</Text> : null}
                    <KindBadge kind={note.kind} label={note.kindLabel} />
                    <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.legendMeaning)}>{note.text}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </View>
      </ScrollView>
    );

  const legendBlock = (
    <Box className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <Text className={dainikKrantiClasses.legendHeading}>{copy.legendTitle}</Text>
      <Box className="gap-1.5">
        {legend.map((it) => (
          <Box key={it.code} className={dainikKrantiClasses.legendRow}>
            <Box className={cn("w-24 items-start", dainikKrantiClasses.legendCodeCol)}>
              <Box className={dainikKrantiClasses.legendCodeChip}>
                <Text className={cn(dainikKrantiClasses.legendCodeText, "sm:text-sm")}>{it.code}</Text>
              </Box>
            </Box>
            <Text className="flex-1 text-sm">
              <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)}>{it.full}</Text>
              {" — "}
              {it.meaning}
            </Text>
          </Box>
        ))}
      </Box>
      <Text className={dainikKrantiClasses.calcLegendNote}>
        <Trans
          i18nKey={legendNoteKey as never}
          components={{ b: <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendStrong)} /> }}
        />
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
    <Box className="gap-6">
      <PatroTableShell titleKey="dainik.shell.calc_notes.title" subtitleKey="dainik.shell.calc_notes.subtitle">
        {notesTable}
      </PatroTableShell>
      {legendBlock}
    </Box>
  );
}
