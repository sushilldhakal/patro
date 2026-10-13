import { useMemo } from "react";
import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { CalcNote } from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { PatroTableShell } from "./PatroTableShell";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { TableHeader, TableRow } from "@/components/ui/DataTable";

const UDAYAST_LEGEND: { code: string; full: string; fullEn: string; meaning: string; meaningEn: string }[] = [
  { code: "व.उ.", full: "वक्र उदय", fullEn: "Retrograde rising", meaning: "ग्रह वक्र (उल्टो) अवस्थामा उदय भएको।", meaningEn: "The planet rises while retrograde (moving backward)." },
  { code: "बु.मा.उ.", full: "बुध मार्गी उदय", fullEn: "Mercury direct rising", meaning: "बुध मार्गी (सुल्टो) भएर उदय भएको।", meaningEn: "Mercury rises while direct." },
  { code: "वृ.व.उ.", full: "बृहस्पति वक्र उदय", fullEn: "Jupiter retrograde rising", meaning: "बृहस्पति (गुरु) वक्र अवस्थामा उदय भएको।", meaningEn: "Jupiter rises while retrograde." },
  { code: "शु.मा.उ.", full: "शुक्र मार्गी उदय", fullEn: "Venus direct rising", meaning: "शुक्र मार्गी भएर उदय भएको।", meaningEn: "Venus rises while direct." },
  { code: "श.मा.उ. ७अ.", full: "शनि मार्गी उदय, ७ अस्त", fullEn: "Saturn direct rising, sets on the 7th", meaning: "शनि मार्गी भएर उदय भएको र ७ गते अस्त हुने।", meaningEn: "Saturn rises while direct and sets on the 7th." },
];

const KIND_LABEL: Record<CalcNote["kind"], string> = {
  ingress: "ग्रहचार",
  udayast: "उदयास्त",
  motion: "वक्री/मार्गी",
  late_night: "रात्रिकालीन",
  paksha_boundary: "पक्ष सीमा",
};

const KIND_LABEL_EN: Record<CalcNote["kind"], string> = {
  ingress: "Transit",
  udayast: "Rise/Set",
  motion: "Retro/Direct",
  late_night: "Late night",
  paksha_boundary: "Paksha boundary",
};

const KIND_ORDER: Record<CalcNote["kind"], number> = {
  paksha_boundary: 0,
  late_night: 1,
  ingress: 2,
  udayast: 3,
  motion: 4,
};

type DayGroup = {
  day: number;
  dateAd: string;
  notes: CalcNote[];
};

type Props = {
  notes: CalcNote[];
  loading?: boolean;
  embedded?: boolean;
};

function KindBadge({ kind }: { kind: CalcNote["kind"] }) {
  const { pick } = useLocale();
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
        {pick(KIND_LABEL[kind], KIND_LABEL_EN[kind])}
      </Text>
    </View>
  );
}

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { t, pick, digits } = useLocale();

  const groups = useMemo(() => {
    const byDate = new Map<string, DayGroup>();
    for (const note of notes) {
      const existing = byDate.get(note.dateAd);
      if (existing) {
        existing.notes.push(note);
      } else {
        byDate.set(note.dateAd, { day: note.day, dateAd: note.dateAd, notes: [note] });
      }
    }
    return [...byDate.values()]
      .sort((a, b) => a.day - b.day || a.dateAd.localeCompare(b.dateAd))
      .map((group) => ({
        ...group,
        notes: [...group.notes].sort(
          (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.text.localeCompare(b.text),
        ),
      }));
  }, [notes]);

  const notesTable = loading ? (
    <Text className={dainikKrantiClasses.calcEmpty} style={nepaliTextStyle()}>
      {t("rashifal.profile.loading")}
    </Text>
  ) : groups.length === 0 ? (
    <Text className={dainikKrantiClasses.calcEmpty} style={nepaliTextStyle()}>
      {t("dainik.no_special_calculation_notes_this_month")}
    </Text>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View className="min-w-full">
        <TableHeader>
          <View className={cn("w-14 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-xs font-semibold" style={nepaliTextStyle()}>{t("dainik.date")}</Text>
          </View>
          <View className={cn("flex-1 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-xs font-semibold" style={nepaliTextStyle()}>{t("dainik.notes")}</Text>
          </View>
        </TableHeader>
        {groups.map((group, groupIndex) => (
          <TableRow
            key={group.dateAd}
            rowIndex={groupIndex}
            borderTop={false}
            className="border-b border-border/60"
          >
            <View className="w-14 px-2.5 py-2">
              <Text className={cn("font-num", dainikKrantiClasses.cellText, dainikKrantiClasses.calcDay)} style={nepaliTextStyle()}>{digits(group.day)}</Text>
            </View>
            <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2">
              {group.notes.map((note, i) => (
                <View key={`${note.kind}-${note.text}`} className="flex-row flex-wrap items-center gap-1">
                  {i > 0 ? <Text className="text-sm">·</Text> : null}
                  <KindBadge kind={note.kind} />
                  <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>
                    {pick(note.text, note.textEn ?? note.text)}
                  </Text>
                </View>
              ))}
            </View>
          </TableRow>
        ))}
      </View>
    </ScrollView>
  );

  const legend = (
    <View className={cn(!embedded && dainikKrantiClasses.calcLegend, embedded && dainikKrantiClasses.calcLegendEmbedded)}>
      <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
        {t("dainik.planet_rise_set_symbols")}
      </Text>
      <View className="gap-1.5">
        {UDAYAST_LEGEND.map((it) => (
          <View key={it.code} className={dainikKrantiClasses.legendRow}>
            <View className={cn("w-24 items-start", dainikKrantiClasses.legendCodeCol)}>
              <View className={dainikKrantiClasses.legendCodeChip}>
                <Text className={cn(dainikKrantiClasses.legendCodeText, "sm:text-sm")} style={nepaliTextStyle()}>{it.code}</Text>
              </View>
            </View>
            <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
              <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)}>{pick(it.full, it.fullEn)}</Text>
              {" — "}
              {pick(it.meaning, it.meaningEn)}
            </Text>
          </View>
        ))}
      </View>
      <Text className={dainikKrantiClasses.calcLegendNote} style={nepaliTextStyle()}>
        {t("ui.dainik_kranti.dasha_bracket_the_years_months_days")}
      </Text>
    </View>
  );

  if (embedded) {
    return (
      <View>
        {notesTable}
        {legend}
      </View>
    );
  }

  return (
    <View className="gap-6">
      <PatroTableShell
        titleNe="गणना सूचना र विशेष दिनहरू"
        titleEn="Special Calculation Notes"
        subtitle="ग्रह सङ्क्रान्ति, २४:०० पछिको लग्न/ग्रहचार, र अधिक/शुद्ध पक्ष सीमाहरू — जन्मकुण्डली र विधि समयका लागि ध्यान दिनुपर्ने दिनहरू।"
        subtitleEn="Planetary sankrantis, post-24:00 lagna/transits, and adhik/shuddha paksha boundaries — days to note for birth-chart and ritual timing."
      >
        {notesTable}
      </PatroTableShell>
      {legend}
    </View>
  );
}
