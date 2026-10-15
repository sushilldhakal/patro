import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Trans } from "@vedic-patro/i18n/react";
import type { CalcNote } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useMonthCalcNotes } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { PatroTableShell } from "./PatroTableShell";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { TableHeader, TableRow } from "@/components/ui/DataTable";

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind, label }: { kind: CalcNote["kind"]; label: string }) {
  return (
    <View
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
    </View>
  );
}

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { status, groups, legend, legendNoteKey, copy } = useMonthCalcNotes(notes, loading);

  const notesTable = status === "loading" ? (
    <Text className={dainikKrantiClasses.calcEmpty} style={nepaliTextStyle()}>
      {copy.loading}
    </Text>
  ) : status === "empty" ? (
    <Text className={dainikKrantiClasses.calcEmpty} style={nepaliTextStyle()}>
      {copy.empty}
    </Text>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View className="min-w-full">
        <TableHeader>
          <View className={cn("w-14 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-xs font-semibold" style={nepaliTextStyle()}>{copy.date}</Text>
          </View>
          <View className={cn("flex-1 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-xs font-semibold" style={nepaliTextStyle()}>{copy.notes}</Text>
          </View>
        </TableHeader>
        {groups.map((group, groupIndex) => (
          <TableRow
            key={group.key}
            rowIndex={groupIndex}
            borderTop={false}
            className="border-b border-border/60"
          >
            <View className="w-14 px-2.5 py-2">
              <Text className={cn("font-num", dainikKrantiClasses.cellText, dainikKrantiClasses.calcDay)} style={nepaliTextStyle()}>{group.day}</Text>
            </View>
            <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2">
              {group.notes.map((note, i) => (
                <View key={note.key} className="flex-row flex-wrap items-center gap-1">
                  {i > 0 ? <Text className="text-sm">·</Text> : null}
                  <KindBadge kind={note.kind} label={note.kindLabel} />
                  <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>
                    {note.text}
                  </Text>
                </View>
              ))}
            </View>
          </TableRow>
        ))}
      </View>
    </ScrollView>
  );

  const legendBlock = (
    <View className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
        {copy.legendTitle}
      </Text>
      <View className="gap-1.5">
        {legend.map((it) => (
          <View key={it.code} className={dainikKrantiClasses.legendRow}>
            <View className={cn("w-24 items-start", dainikKrantiClasses.legendCodeCol)}>
              <View className={dainikKrantiClasses.legendCodeChip}>
                <Text className={cn(dainikKrantiClasses.legendCodeText, "sm:text-sm")} style={nepaliTextStyle()}>{it.code}</Text>
              </View>
            </View>
            <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
              <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)}>{it.full}</Text>
              {" — "}
              {it.meaning}
            </Text>
          </View>
        ))}
      </View>
      <Text className={dainikKrantiClasses.calcLegendNote} style={nepaliTextStyle()}>
        <Trans
          i18nKey={legendNoteKey}
          components={{ b: <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendStrong)} /> }}
        />
      </Text>
    </View>
  );

  if (embedded) {
    return (
      <View>
        {notesTable}
        {legendBlock}
      </View>
    );
  }

  return (
    <View className="gap-6">
      <PatroTableShell titleKey="dainik.shell.calc_notes.title" subtitleKey="dainik.shell.calc_notes.subtitle">
        {notesTable}
      </PatroTableShell>
      {legendBlock}
    </View>
  );
}
