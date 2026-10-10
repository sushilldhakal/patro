import { useMemo } from "react";
import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { CalcNote } from "@/lib/dainikKranti/month-patro-tables";
import { cn } from "@/lib/utils";
import { PatroTableShell } from "./PatroTableShell";
import { useLocale } from "@/lib/i18n";
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
        "rounded px-1.5 py-0.5",
        kind === "late_night" && "bg-amber-500/15",
        kind === "ingress" && "bg-indigo-500/15",
        kind === "paksha_boundary" && "bg-muted",
        kind === "udayast" && "bg-emerald-500/15",
        kind === "motion" && "bg-rose-500/15",
      )}
    >
      <Text
        className={cn(
          "text-caption font-semibold",
          kind === "late_night" && "text-amber-700 dark:text-amber-300",
          kind === "ingress" && "text-indigo-700 dark:text-indigo-300",
          kind === "udayast" && "text-emerald-700 dark:text-emerald-300",
          kind === "motion" && "text-rose-700 dark:text-rose-300",
          kind === "paksha_boundary" && "text-muted-foreground",
        )}
      >
        {pick(KIND_LABEL[kind], KIND_LABEL_EN[kind])}
      </Text>
    </View>
  );
}

export function MonthCalcNotes({ notes, loading, embedded }: Props) {
  const { pick, digits } = useLocale();

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
    <Text className="text-body px-4 py-8 text-center text-muted-foreground">
      {pick("लोड हुँदैछ…", "Loading…")}
    </Text>
  ) : groups.length === 0 ? (
    <Text className="text-body px-4 py-8 text-center text-muted-foreground">
      {pick("यस महिनामा विशेष गणना सूचना छैन।", "No special calculation notes this month.")}
    </Text>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View className="min-w-full">
        <TableHeader>
          <View className={cn("w-14 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-caption font-semibold">{pick("गते", "Date")}</Text>
          </View>
          <View className={cn("flex-1 px-2.5 py-2", patroStickyHeadCell)}>
            <Text className="text-caption font-semibold">{pick("सूचना", "Notes")}</Text>
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
              <Text className="font-num font-bold tabular-nums text-secondary">{digits(group.day)}</Text>
            </View>
            <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2">
              {group.notes.map((note, i) => (
                <View key={`${note.kind}-${note.text}`} className="flex-row flex-wrap items-center gap-1">
                  {i > 0 ? <Text className="text-muted-foreground">·</Text> : null}
                  <KindBadge kind={note.kind} />
                  <Text className="text-body text-foreground">
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
    <View className={cn(!embedded && "rounded-xl border border-border p-4", embedded && "mt-4 border-t border-border pt-4")}>
      <Text className="text-body mb-2 font-semibold uppercase tracking-wide text-foreground">
        {pick("ग्रह उदयास्त सङ्केत", "Planet rise-set symbols")}
      </Text>
      <View className="gap-1.5">
        {UDAYAST_LEGEND.map((it) => (
          <View key={it.code} className="flex-row gap-2">
            <View className="w-24 shrink-0">
              <View className="rounded bg-muted px-1.5 py-0.5">
                <Text className="text-caption font-semibold text-secondary">{it.code}</Text>
              </View>
            </View>
            <Text className="text-body flex-1 text-foreground">
              <Text className="font-medium">{pick(it.full, it.fullEn)}</Text>
              {" — "}
              {pick(it.meaning, it.meaningEn)}
            </Text>
          </View>
        ))}
      </View>
      <Text className="text-body mt-4 leading-relaxed text-muted-foreground">
        {pick(
          "दशा कोष्ठक: जन्म-समयमा बाँकी विंशोत्तरी दशाको वर्ष/महिना/दिन। समय सुधार: मुद्रणमा “उ” वा “०” जस्ता सङ्केतले शून्य अंश/कला जनाउँछ। सूचीबद्ध सूर्योदयमा बेलान्तर र देशान्तर पहिल्यै समायोजित छन्।",
          "Dasha bracket: the years/months/days of Vimshottari dasha remaining at birth. Time correction: in print, symbols like “u” or “0” indicate zero degrees/kala. The listed sunrise already has belaantar and deshaantar corrections applied.",
        )}
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
