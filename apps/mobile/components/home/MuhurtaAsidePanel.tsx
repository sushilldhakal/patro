import { useState } from "react";
import { elementHref } from "@/lib/element-routes";
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
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { formatNavataraQuality, formatNavataraTara } from "@vedic-patro/domain/navatara-bala";
import {
  formatClockNepali,
  formatTimeRangeShort,
  getChandrabalamTable,
  getHoraDaySlots,
  getTarabalaTable,
  getUdayaLagna,
} from "@vedic-patro/domain/panchanga-format";
import { Ionicons } from "@/components/icons/Ionicons";
import { patroNavataraRow, type patroNavataraToneBg } from "@/lib/patro-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type MuhurtaSubTab = "tarabal" | "chandrabal" | "choghadiya" | "hora" | "pushkara";

const SUB_TABS: { id: MuhurtaSubTab; labelKey: string }[] = [
  { id: "tarabal", labelKey: "muhurta_aside.tarabal" },
  { id: "chandrabal", labelKey: "muhurta_aside.chandrabal" },
  { id: "choghadiya", labelKey: "muhurta_aside.choghadiya" },
  { id: "hora", labelKey: "muhurta_aside.hora" },
  { id: "pushkara", labelKey: "muhurta_aside.pushkara" },
];

/** Sub-tab → its full page under /panchanga/element/. */
const ELEMENT_ID: Record<MuhurtaSubTab, string> = {
  tarabal: "tarabala",
  chandrabal: "chandrabala",
  choghadiya: "choghadiya",
  hora: "hora",
  pushkara: "pushkara",
};

const SUB_TAB_HINT_KEY: Record<MuhurtaSubTab, string> = {
  tarabal: "muhurta_aside.hint_tarabal",
  chandrabal: "muhurta_aside.hint_chandrabal",
  choghadiya: "muhurta_aside.hint_choghadiya",
  hora: "muhurta_aside.hint_hora",
  pushkara: "muhurta_aside.hint_pushkara",
};

/* The tile itself is the shared `patroNavataraRow`; the app wraps three to a line. */
const SLOT = "min-w-[31%] flex-1";
const SLOT_TITLE = homeClasses.muhurtaSlotTitle;
const SLOT_VALUE = homeClasses.muhurtaSlotValue;
const EMPTY = homeClasses.muhurtaEmpty;

type Tone = Parameters<typeof patroNavataraToneBg>[0];

function NavataraAsideList({
  moonLabel,
  moonLabelEn,
  moonIdx,
  moonRefKey,
  rows,
}: {
  moonLabel: string | null;
  moonLabelEn?: string | null;
  moonIdx: number | null;
  moonRefKey: string;
  rows: NavataraRow[];
}) {
  const { pick, lang, t } = useLocale();

  if (!rows.length) {
    return (
      <Text className={EMPTY} style={nepaliTextStyle()}>
        {t("muhurta_aside.unavailable")}
      </Text>
    );
  }

  return (
    <View>
      {moonLabel || moonLabelEn ? (
        <Text className={homeClasses.muhurtaMoonRef} style={nepaliTextStyle()}>
          {t(moonRefKey)}:{" "}
          <Text className={homeClasses.muhurtaMoonRefStrong}>
            {pick(moonLabel ?? moonLabelEn ?? "", moonLabelEn ?? moonLabel ?? "")}
          </Text>
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-1">
        {rows.map((row) => {
          const isMoon = moonIdx != null && row.index === moonIdx;
          return (
            <View key={row.name} className={cn(patroNavataraRow(row.tone as Tone), SLOT)}>
              {isMoon ? (
                <View
                  pointerEvents="none"
                  className="absolute inset-0 rounded-md border-[1.5px] border-accent/45"
                />
              ) : null}
              <Text className={SLOT_TITLE} style={nepaliTextStyle()}>
                {pick(row.name, row.name_en ?? row.name)}
              </Text>
              <Text className={SLOT_VALUE} style={nepaliTextStyle()}>
                {formatNavataraTara(row.tara, lang)}
                <Text className={homeClasses.muhurtaSlotSep}> / </Text>
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
  const { pick, t } = useLocale();
  const segments = getChoghadiyaSegments(p);
  const sunriseMin = getSunriseMinutes(p);

  if (!segments.length || sunriseMin == null) {
    return (
      <Text className={EMPTY} style={nepaliTextStyle()}>
        {t("muhurta_aside.choghadiya_unavailable")}
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
            className={cn(patroNavataraRow(tone === "good" ? "good" : tone === "bad" ? "bad" : "neutral"), SLOT)}
          >
            <Text className={SLOT_TITLE} style={nepaliTextStyle()}>
              {pick(seg.name, CHOGHADIYA_EN[seg.name] ?? seg.name)}
            </Text>
            <Text className={SLOT_VALUE} style={nepaliTextStyle()}>
              {range}
              <Text className={homeClasses.muhurtaSlotSep}> / </Text>
              {pick(qualityNe, qualityEn)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function HoraList({ p }: { p: PanchangaDay }) {
  const { t } = useLocale();
  const slots = getHoraDaySlots(p);

  if (!slots.length) {
    return (
      <Text className={EMPTY} style={nepaliTextStyle()}>
        {t("muhurta_aside.hora_unavailable")}
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-1">
      {slots.map((slot, i) => (
        <HoraSlot key={`${slot.phase}-${slot.index}-${i}`} slot={slot} />
      ))}
    </View>
  );
}

function HoraSlot({ slot }: { slot: ApiHoraSlot }) {
  const { pick, lang } = useLocale();
  const start = formatClockNepali(slot.start_local_time_short, lang) ?? slot.start_local_time_short;
  const end = formatClockNepali(slot.end_local_time_short, lang) ?? slot.end_local_time_short;
  const tone = slot.tone === "bad" ? "bad" : "good";

  return (
    <View className={cn(patroNavataraRow(tone), SLOT)}>
      <Text className={SLOT_TITLE} style={nepaliTextStyle()}>
        {pick(
          slot.planet_ne,
          GRAHA_NAME[slot.planet as GrahaKey]?.en ?? slot.planet_en ?? slot.planet ?? slot.planet_ne,
        )}
      </Text>
      <Text className={SLOT_VALUE} style={nepaliTextStyle()}>
        {start} – {end}
        <Text className={homeClasses.muhurtaSlotSep}> / </Text>
        {pick(slot.quality_ne, slot.tone === "bad" ? "Inauspicious" : "Auspicious")}
      </Text>
    </View>
  );
}

function PushkaraList({ p }: { p: PanchangaDay }) {
  const { pick, lang, t } = useLocale();
  const rows = getUdayaLagna(p);

  if (!rows?.length) {
    return (
      <Text className={EMPTY} style={nepaliTextStyle()}>
        {t("muhurta_aside.pushkara_unavailable")}
      </Text>
    );
  }

  const pushkaraLabel = pick("पुष्कर", "Pushkara");

  return (
    <View className="flex-row flex-wrap gap-1">
      {rows.map((row, i) => (
        <PushkaraSlot key={`${row.name}-${i}`} row={row} pushkaraLabel={pushkaraLabel} lang={lang} />
      ))}
    </View>
  );
}

function PushkaraSlot({
  row,
  pushkaraLabel,
  lang,
}: {
  row: UdayaLagnaRow;
  pushkaraLabel: string;
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
    <View className={cn(patroNavataraRow(hasPushkara ? "good" : "neutral"), SLOT)}>
      <Text className={SLOT_TITLE} style={nepaliTextStyle()}>
        {pick(row.name_ne ?? row.name ?? "—", row.name ?? row.name_ne ?? "—")}
      </Text>
      <Text className={SLOT_VALUE} style={nepaliTextStyle()}>
        {hasPushkara ? times : range}
        <Text className={homeClasses.muhurtaSlotSep}> / </Text>
        {hasPushkara ? pushkaraLabel : "—"}
      </Text>
    </View>
  );
}

type Props = {
  p: PanchangaDay;
};

export function MuhurtaAsidePanel({ p }: Props) {
  const { pick, t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const [subTab, setSubTab] = useState<MuhurtaSubTab>("tarabal");
  const tara = getTarabalaTable(p);
  const chandra = getChandrabalamTable(p);

  return (
    <View className="gap-2">
      <View className="flex-row gap-1">
        {SUB_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setSubTab(tab.id)}
            className={cn(
              "flex-1 items-center justify-center",
              homeClasses.muhurtaSubTab,
              subTab === tab.id ? homeClasses.muhurtaSubTabActive : homeClasses.muhurtaSubTabIdle,
            )}
          >
            <Text
              className={cn(
                homeClasses.muhurtaSubTabLabel,
                subTab === tab.id && homeClasses.muhurtaSubTabLabelActive,
              )}
              style={nepaliTextStyle()}
            >
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className={homeClasses.muhurtaHint}>
        <View className="mt-px opacity-75">
          <Ionicons name="information-circle-outline" size={13} color={colors.foreground} />
        </View>
        <Text className={cn("flex-1", homeClasses.muhurtaHintText)} style={nepaliTextStyle()}>
          {t(SUB_TAB_HINT_KEY[subTab])}
        </Text>
      </View>

      {subTab === "tarabal" ? (
        <NavataraAsideList
          moonLabel={tara?.moon_label ?? null}
          moonLabelEn={tara?.moon_label_en ?? null}
          moonIdx={tara?.moon_index ?? null}
          moonRefKey="muhurta_aside.moon_ref_tarabal"
          rows={tara?.rows ?? []}
        />
      ) : null}
      {subTab === "chandrabal" ? (
        <NavataraAsideList
          moonLabel={chandra?.moon_label ?? null}
          moonLabelEn={chandra?.moon_label_en ?? null}
          moonIdx={chandra?.moon_index ?? null}
          moonRefKey="muhurta_aside.moon_ref_chandrabal"
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
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle()}>
          {pick("पूरा तालिका हेर्नुहोस् →", "View full table →")}
        </Text>
      </Pressable>
    </View>
  );
}
