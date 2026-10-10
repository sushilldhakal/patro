import { useState } from "react";
import { elementHref } from "@/lib/panchanga-elements";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { ApiHoraSlot, NavataraRow, PanchangaDay, UdayaLagnaRow } from "@/lib/api";
import {
  CHOGHADIYA_EN,
  choghadiyaQuality,
  choghadiyaTone,
  getChoghadiyaSegments,
  ghatiToCivilClockLabel,
  getSunriseMinutes,
} from "@/lib/day-timeline-aside";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import {
  formatNavataraQuality,
  formatNavataraTara,
  navataraSlotTone,
} from "@/lib/navatara-bala";
import {
  formatClockNepali,
  formatTimeRangeShort,
  getChandrabalamTable,
  getHoraDaySlots,
  getTarabalaTable,
  getUdayaLagna,
} from "@/lib/panchanga-format";
import { useThemeColors } from "@/lib/theme-context";
import type { ThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

type MuhurtaSubTab = "tarabal" | "chandrabal" | "choghadiya" | "hora" | "pushkara";

const SUB_TABS: { id: MuhurtaSubTab; ne: string; en: string }[] = [
  { id: "tarabal", ne: "ताराबल", en: "Tarabal" },
  { id: "chandrabal", ne: "चन्द्रबल", en: "Chandrabala" },
  { id: "choghadiya", ne: "चौघडी", en: "Choghadiya" },
  { id: "hora", ne: "होरा", en: "Hora" },
  { id: "pushkara", ne: "पुष्कर", en: "Pushkara" },
];

/** Sub-tab → its full page under /panchanga/element/. */
const ELEMENT_ID: Record<MuhurtaSubTab, string> = {
  tarabal: "tarabala",
  chandrabal: "chandrabala",
  choghadiya: "choghadiya",
  hora: "hora",
  pushkara: "pushkara",
};

const HINTS: Record<MuhurtaSubTab, { ne: string; en: string }> = {
  tarabal: { ne: "कामको प्रतिफल र सफलता हेर्न।", en: "See outcome and success of work." },
  chandrabal: { ne: "यात्रा र कार्यको सफलता हेर्न।", en: "See success of travel and tasks." },
  choghadiya: { ne: "दिन र रातका चौघडिया खण्ड।", en: "Day and night choghadiya segments." },
  hora: { ne: "सूर्योदयदेखि सूर्यास्तसम्मका ग्रह होरा।", en: "Planetary hora from sunrise to sunset." },
  pushkara: {
    ne: "प्रत्येक लग्नभित्रका शुभ नवांश — संकल्प वा कार्य सुरु गर्न उपयुक्त समय।",
    en: "Auspicious navamsha within each lagna — suitable times to begin work.",
  },
};

function toneBg(colors: ThemeColors, tone: "good" | "bad" | "neutral", best?: boolean) {
  if (best) return colors.toneBest;
  if (tone === "good") return colors.toneGood;
  if (tone === "bad") return colors.toneBad;
  return colors.toneNeutral;
}

function NavataraAsideList({
  moonLabel,
  moonLabelEn,
  moonIdx,
  moonRefNe,
  moonRefEn,
  rows,
}: {
  moonLabel: string | null;
  moonLabelEn?: string | null;
  moonIdx: number | null;
  moonRefNe: string;
  moonRefEn: string;
  rows: NavataraRow[];
}) {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();

  if (!rows.length) {
    return (
      <Text className="text-body py-6 text-center text-muted-foreground">
        {pick("विवरण उपलब्ध छैन।", "Details unavailable.")}
      </Text>
    );
  }

  return (
    <View>
      {moonLabel || moonLabelEn ? (
        <Text className="text-body mb-2 font-semibold text-foreground">
          {pick(moonRefNe, moonRefEn)}:{" "}
          <Text style={{ color: colors.accent }} className="font-bold">
            {pick(moonLabel ?? moonLabelEn ?? "", moonLabelEn ?? moonLabel ?? "")}
          </Text>
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-1">
        {rows.map((row) => {
          const isMoon = moonIdx != null && row.index === moonIdx;
          const slotTone = navataraSlotTone(row.tone);
          return (
            <View
              key={row.name}
              className={cn(
                "min-w-[31%] flex-1 items-center gap-0.5 rounded-md p-1.5",
                isMoon && "border border-accent",
              )}
              style={{
                backgroundColor: toneBg(colors, slotTone, row.tone === "best"),
                borderColor: isMoon ? colors.accent : undefined,
              }}
            >
              <Text className="text-caption w-full text-center font-bold text-foreground">
                {pick(row.name, row.name_en ?? row.name)}
              </Text>
              <Text className="text-caption w-full text-center font-num font-semibold text-foreground">
                {formatNavataraTara(row.tara, lang)}
                <Text className="opacity-55"> / </Text>
                {formatNavataraQuality(row.quality, lang)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ChoghadiyaList({ p }: { p: PanchangaDay }) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const segments = getChoghadiyaSegments(p);
  const sunriseMin = getSunriseMinutes(p);

  if (!segments.length || sunriseMin == null) {
    return (
      <Text className="text-body py-6 text-center text-muted-foreground">
        {pick("चौघडिया उपलब्ध छैन।", "Choghadiya unavailable.")}
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-1">
      {segments.map((seg, i) => {
        const tone = choghadiyaTone(seg.name, seg.bad);
        const qualityNe = choghadiyaQuality(seg.name, seg.bad);
        const qualityEn = tone === "good" ? "Good" : tone === "bad" ? "Inauspicious" : "Neutral";
        const range = `${ghatiToCivilClockLabel(seg.startG, sunriseMin)} – ${ghatiToCivilClockLabel(seg.endG, sunriseMin)}`;
        return (
          <View
            key={`${seg.name}-${i}`}
            className="min-w-[31%] flex-1 items-center gap-0.5 rounded-md p-1.5"
            style={{ backgroundColor: toneBg(colors, tone === "good" ? "good" : tone === "bad" ? "bad" : "neutral") }}
          >
            <Text className="text-caption w-full text-center font-bold text-foreground">
              {pick(seg.name, CHOGHADIYA_EN[seg.name] ?? seg.name)}
            </Text>
            <Text className="text-caption w-full text-center font-num font-semibold text-foreground">
              {range}
              <Text className="opacity-55"> / </Text>
              {pick(qualityNe, qualityEn)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function HoraList({ p }: { p: PanchangaDay }) {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const slots = getHoraDaySlots(p);

  if (!slots.length) {
    return (
      <Text className="text-body py-6 text-center text-muted-foreground">
        {pick("होरा उपलब्ध छैन।", "Hora unavailable.")}
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-1">
      {slots.map((slot, i) => (
        <HoraSlot key={`${slot.phase}-${slot.index}-${i}`} slot={slot} colors={colors} />
      ))}
    </View>
  );
}

function HoraSlot({ slot, colors }: { slot: ApiHoraSlot; colors: ThemeColors }) {
  const { pick, lang } = useLocale();
  const start = formatClockNepali(slot.start_local_time_short, lang) ?? slot.start_local_time_short;
  const end = formatClockNepali(slot.end_local_time_short, lang) ?? slot.end_local_time_short;
  const tone = slot.tone === "bad" ? "bad" : "good";

  return (
    <View
      className="min-w-[31%] flex-1 items-center gap-0.5 rounded-md p-1.5"
      style={{ backgroundColor: toneBg(colors, tone) }}
    >
      <Text className="text-caption w-full text-center font-bold text-foreground">
        {pick(
          slot.planet_ne,
          GRAHA_NAME[slot.planet as GrahaKey]?.en ?? slot.planet_en ?? slot.planet ?? slot.planet_ne,
        )}
      </Text>
      <Text className="text-caption w-full text-center font-num font-semibold text-foreground">
        {start} – {end}
        <Text className="opacity-55"> / </Text>
        {pick(slot.quality_ne, slot.tone === "bad" ? "Inauspicious" : "Auspicious")}
      </Text>
    </View>
  );
}

function PushkaraList({ p }: { p: PanchangaDay }) {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const rows = getUdayaLagna(p);

  if (!rows?.length) {
    return (
      <Text className="text-body py-6 text-center text-muted-foreground">
        {pick("पुष्कर नवांश उपलब्ध छैन।", "Pushkara navamsha unavailable.")}
      </Text>
    );
  }

  const pushkaraLabel = pick("पुष्कर", "Pushkara");

  return (
    <View className="flex-row flex-wrap gap-1">
      {rows.map((row, i) => (
        <PushkaraSlot key={`${row.name}-${i}`} row={row} pushkaraLabel={pushkaraLabel} colors={colors} lang={lang} />
      ))}
    </View>
  );
}

function PushkaraSlot({
  row,
  pushkaraLabel,
  colors,
  lang,
}: {
  row: UdayaLagnaRow;
  pushkaraLabel: string;
  colors: ThemeColors;
  lang: string;
}) {
  const { pick } = useLocale();
  const hits = row.pushkara_navamsha ?? [];
  const times = hits
    .map((hit) => formatClockNepali(hit.local_time_short ?? hit.local_time, lang) ?? hit.local_time_short)
    .filter(Boolean)
    .join(", ");
  const range =
    formatTimeRangeShort(
      row.start_local_time_short ?? row.start_local_time,
      row.end_local_time_short ?? row.end_local_time,
      lang,
    ) ?? "—";
  const hasPushkara = hits.length > 0;

  return (
    <View
      className="min-w-[31%] flex-1 items-center gap-0.5 rounded-md p-1.5"
      style={{ backgroundColor: toneBg(colors, hasPushkara ? "good" : "neutral") }}
    >
      <Text className="text-caption w-full text-center font-bold text-foreground">
        {pick(row.name_ne ?? row.name ?? "—", row.name ?? row.name_ne ?? "—")}
      </Text>
      <Text className="text-caption w-full text-center font-num font-semibold text-foreground">
        {hasPushkara ? times : range}
        <Text className="opacity-55"> / </Text>
        {hasPushkara ? pushkaraLabel : "—"}
      </Text>
    </View>
  );
}

type Props = {
  p: PanchangaDay;
};

export function MuhurtaAsidePanel({ p }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const [subTab, setSubTab] = useState<MuhurtaSubTab>("tarabal");
  const tara = getTarabalaTable(p);
  const chandra = getChandrabalamTable(p);
  const hint = HINTS[subTab];

  return (
    <View className="gap-2">
      <View className="flex-row gap-1">
        {SUB_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setSubTab(tab.id)}
            className={cn(
              "min-h-8 flex-1 items-center justify-center rounded-md px-0.5 py-1.5",
              subTab === tab.id ? "border border-primary" : "border border-transparent",
            )}
            style={{
              backgroundColor: subTab === tab.id ? colors.tabActive : colors.surfaceInset,
            }}
          >
            <Text
              className={cn(
                "text-caption text-center font-semibold",
                subTab === tab.id ? "font-bold text-foreground" : "text-muted-foreground",
              )}
            >
              {pick(tab.ne, tab.en)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-body text-muted-foreground">{pick(hint.ne, hint.en)}</Text>

      {subTab === "tarabal" ? (
        <NavataraAsideList
          moonLabel={tara?.moon_label ?? null}
          moonLabelEn={tara?.moon_label_en ?? null}
          moonIdx={tara?.moon_index ?? null}
          moonRefNe="आजको चन्द्र नक्षत्र"
          moonRefEn="Today's moon nakshatra"
          rows={tara?.rows ?? []}
        />
      ) : null}
      {subTab === "chandrabal" ? (
        <NavataraAsideList
          moonLabel={chandra?.moon_label ?? null}
          moonLabelEn={chandra?.moon_label_en ?? null}
          moonIdx={chandra?.moon_index ?? null}
          moonRefNe="आजको चन्द्र राशि"
          moonRefEn="Today's moon rashi"
          rows={chandra?.rows ?? []}
        />
      ) : null}
      {subTab === "choghadiya" ? <ChoghadiyaList p={p} /> : null}
      {subTab === "hora" ? <HoraList p={p} /> : null}
      {subTab === "pushkara" ? <PushkaraList p={p} /> : null}

      <Pressable
        onPress={() => router.push(elementHref(ELEMENT_ID[subTab]) as never)}
        accessibilityRole="link"
        className="items-center rounded-lg border border-border py-2.5 active:opacity-80"
      >
        <Text className="text-body font-semibold text-foreground">
          {pick("पूरा तालिका हेर्नुहोस् →", "View full table →")}
        </Text>
      </Pressable>
    </View>
  );
}
