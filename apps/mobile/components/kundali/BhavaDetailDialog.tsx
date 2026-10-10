import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@/lib/utils";
import type { BhavaHouse } from "@/lib/bhava";
import { houseBadge, formatHouseBadge, drishtiTargetHouses } from "@/lib/bhava";
import { GRAHA_NAME, GRAHA_ICON, type GrahaKey } from "@/lib/graha-details";
import type { BhavaReferencePayload } from "@/lib/api";
import {
  HOUSE_ORDINAL_NE,
  HOUSE_ORDINAL_EN,
  HOUSE_LORD_TITLE_NE,
  computeAspectedBy,
  splitList,
} from "@/lib/kundali/bhava-detail";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";

function grahaName(key: string, pick: (ne: string, en: string) => string): string {
  const entry = GRAHA_NAME[key as GrahaKey];
  return entry ? pick(entry.ne, entry.en) : key;
}

function joinNames(keys: string[], pick: (ne: string, en: string) => string): string {
  if (keys.length === 0) return pick("कोही छैन", "None");
  return keys.map((k) => grahaName(k, pick)).join(", ");
}

function yutiKey(keys: string[]): string {
  return [...keys].sort().join("+");
}

/** Every 3-element subset of `keys` — houses rarely hold more than 3-4
 * grahas, so this stays small in practice. */
function subsetsOf3(keys: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      for (let k = j + 1; k < keys.length; k++) {
        out.push([keys[i], keys[j], keys[k]]);
      }
    }
  }
  return out;
}

type TabId = "summary" | "lord" | "drishti" | "rules";

/** A compact, always-visible card within a tab. The `right` slot carries the
 * headline fact (a count, a badge) right in the card header. */
function Block({
  icon,
  title,
  right,
  children,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-muted/20 p-3">
      <View className="mb-1.5 flex-row items-baseline gap-2">
        <Text className="text-body">{icon}</Text>
        <Text className="text-body font-bold text-foreground">{title}</Text>
        {right != null && <View className="ml-auto shrink-0">{right}</View>}
      </View>
      {children}
    </View>
  );
}

const ratingBadgeCls: Record<string, string> = {
  uttam: "border-emerald-500/30 bg-emerald-500/15",
  shubh: "border-emerald-500/30 bg-emerald-500/15",
  mishrit: "border-amber-500/30 bg-amber-500/15",
  kamjor: "border-destructive/20 bg-destructive/10",
};

const ratingTextCls: Record<string, string> = {
  uttam: "text-emerald-700 dark:text-emerald-300",
  shubh: "text-emerald-700 dark:text-emerald-300",
  mishrit: "text-amber-700 dark:text-amber-300",
  kamjor: "text-destructive",
};

/** A classical Sanskrit citation — book/label + shloka — as a distinct
 * quote card instead of small italic prose, so it reads at a glance rather
 * than blending into the surrounding text. `label` is the citation's own
 * kind (e.g. "कारकत्व श्लोक"); when omitted, `source` (the scripture name)
 * doubles as the badge text on its own, matching the saravali-citation use
 * where there's no separate kind to name. */
function ShlokaCard({
  label,
  source,
  shloka,
  small,
}: {
  label?: string;
  source: string;
  shloka: string;
  small: ReturnType<typeof nepaliTextStyle> | undefined;
}) {
  return (
    <View className="rounded-lg border border-secondary/25 bg-secondary/[0.06] p-2.5">
      <View className="mb-1.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        {label && <Text className="text-body font-semibold text-foreground">📜 {label}</Text>}
        <View className="rounded-full bg-secondary/15 px-2 py-0.5">
          <Text className="text-body font-medium text-secondary">
            {label ? source : `📜 ${source}`}
          </Text>
        </View>
      </View>
      <Text className="text-body font-bold leading-relaxed text-foreground" style={small}>
        {shloka}
      </Text>
    </View>
  );
}

/** Simple header + collapsible body, replacing the web shadcn Accordion. */
function Collapsible({
  title,
  right,
  defaultOpen,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const colors = useThemeColors();
  return (
    <View className="border-b border-border/60 py-1.5 last:border-b-0">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between gap-2 py-1.5 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text className="text-body flex-1 font-semibold text-foreground">{title}</Text>
        {right != null && <Text className="text-body text-muted-foreground">{right}</Text>}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>
      {open ? <View className="pb-2 pt-1">{children}</View> : null}
    </View>
  );
}

function GrahaKarakatvaCard({
  grahaKey,
  house,
  reference,
  pick,
  digits,
  small,
}: {
  grahaKey: string;
  house: number;
  reference: BhavaReferencePayload;
  pick: (ne: string, en: string) => string;
  digits: (v: string | number) => string;
  small: ReturnType<typeof nepaliTextStyle> | undefined;
}) {
  const k = reference.grahaKarakatva[grahaKey];
  if (!k) return null;
  const saravali = reference.grahaHouseSaravali[grahaKey]?.[house];

  return (
    <View className="gap-2">
      <Text className="text-body font-bold text-foreground">
        {GRAHA_ICON[grahaKey as GrahaKey] ?? "🪐"} {grahaName(grahaKey, pick)}
      </Text>

      <ShlokaCard
        label={pick("कारकत्व श्लोक", "Karakatva shloka")}
        source={pick(k.shlokaSourceNe, k.shlokaSourceEn)}
        shloka={k.shloka}
        small={small}
      />

      <View>
        <Text className="text-body font-semibold text-foreground">📋 {pick("कारकत्व विषयहरू", "Karakatva subjects")}</Text>
        <Text className="text-body mt-1 leading-relaxed" style={small}>
          {pick(k.subjectsNe, k.subjectsEn)}।
        </Text>
      </View>

      <View>
        <Text className="text-body font-semibold text-foreground">💡 {pick("ग्रहको महत्व", "Significance")}</Text>
        <Text className="text-body mt-1 leading-relaxed" style={small}>
          {pick(k.significanceNe, k.significanceEn)}
        </Text>
      </View>

      <View className="border-l-2 border-secondary/40 pl-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body flex-1 font-semibold text-foreground" style={small}>
            ⬡ {pick(
              `भाव ${digits(house)}${house === 1 ? " (लग्न)" : ""} मा ${grahaName(grahaKey, pick)}को फल`,
              `${grahaName(grahaKey, pick)} in house ${digits(house)}${house === 1 ? " (Lagna)" : ""}`,
            )}
          </Text>
          {saravali && (
            <View className={cn("shrink-0 rounded-full border px-2 py-0.5", ratingBadgeCls[saravali.rating])}>
              <Text className={cn("text-body font-semibold", ratingTextCls[saravali.rating])}>
                {pick(reference.ratingLabel[saravali.rating].ne, reference.ratingLabel[saravali.rating].en)}
              </Text>
            </View>
          )}
        </View>

        {saravali ? (
          /* एक भावमा जति ग्रन्थ (सारावली, फलदीपिका, होरासार, जातक पारिजात, ...)
              उद्धृत छन् ती सबैका श्लोकहरू पहिले लगातार देखाइन्छ (प्रत्येकको आफ्नै
              ग्रन्थ-सन्दर्भसहित, तर छुट्टै अर्थ/व्याख्या बिना), अनि अन्त्यमा एकपटक
              मात्र समग्र अर्थ र व्याख्या (`summaryNe`/`summaryEn`) — हरेक ग्रहको
              लागि सधैं यही एउटै ढाँचा। */
          <View className="mt-2 gap-2.5">
            {saravali.entries.map((citation, i) => (
              <ShlokaCard
                key={i}
                source={pick(citation.shlokaSourceNe, citation.shlokaSourceEn)}
                shloka={citation.shloka}
                small={small}
              />
            ))}
            <Text className="text-body border-t border-border/50 pt-2 leading-relaxed" style={small}>
              💡 {pick(saravali.summaryNe, saravali.summaryEn)}
            </Text>
          </View>
        ) : (
          <Text className="text-body mt-1.5 text-muted-foreground" style={small}>
            {pick(
              "यो भाव-ग्रह संयोजनको लागि शास्त्रीय श्लोक अहिले उपलब्ध छैन।",
              "No classical shloka is available for this house-graha combination yet.",
            )}
          </Text>
        )}
      </View>
    </View>
  );
}

type Props = {
  houses: BhavaHouse[];
  houseNumber: number | null;
  reference: BhavaReferencePayload | undefined;
  onClose: () => void;
};

export function BhavaDetailDialog({ houses, houseNumber, reference, onClose }: Props) {
  const { pick } = useLocale();
  const house = houseNumber != null ? houses.find((h) => h.house === houseNumber) : undefined;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <BottomSheetModal
      visible={Boolean(house)}
      onClose={onClose}
      variant="bottom"
      maxHeight="90%"
      sheetStyle={{
        /* A definite height: the body below is a flex-1 ScrollView, which has
           nothing to fill (collapses to zero) inside a sheet that only has a
           max-height. */
        height: "88%",
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {house ? (
        reference ? (
          <BhavaDetailBody key={house.house} house={house} houses={houses} reference={reference} onClose={onClose} />
        ) : (
          <View className="px-4 py-6">
            <Text className="text-body text-muted-foreground">{pick("लोड हुँदैछ…", "Loading…")}</Text>
          </View>
        )
      ) : null}
    </BottomSheetModal>
  );
}

function BhavaDetailBody({
  house,
  houses,
  reference,
  onClose,
}: {
  house: BhavaHouse;
  houses: BhavaHouse[];
  reference: BhavaReferencePayload;
  onClose: () => void;
}) {
  const { pick, digits, lang } = useLocale();
  const colors = useThemeColors();
  const body = lang === "en" ? undefined : nepaliTextStyle(13);
  const small = lang === "en" ? undefined : nepaliTextStyle(12);

  const info = reference.houseInfo[house.house];
  const lordKey = reference.rashiLord[house.rashi];
  const lordHouse = houses.find((h) => h.planets.some((p) => p.key === lordKey))?.house;
  const bhaveshEntry = lordHouse != null ? reference.bhaveshPhala[house.house]?.[lordHouse] : undefined;
  const lordTitle = pick(HOUSE_LORD_TITLE_NE[house.house - 1], `Lord of house ${digits(house.house)}`);

  const occupants = house.planets;
  const aspectedBy = computeAspectedBy(houses, house.house);

  const beneficPresent = [...occupants.map((p) => p.key), ...aspectedBy].some(
    (k) => reference.grahaDrishti[k]?.isMalefic === false,
  );
  const maleficPresent = [...occupants.map((p) => p.key), ...aspectedBy].some(
    (k) => reference.grahaDrishti[k]?.isMalefic === true,
  );
  const verdictLabel = maleficPresent
    ? pick("⚠️ ध्यान दिनुपर्ने", "⚠️ Needs attention")
    : pick("✅ सामान्यतया ठीक", "✅ Generally fine");
  const verdictCls = maleficPresent
    ? "border-destructive/30 bg-destructive/10"
    : "border-emerald-500/30 bg-emerald-500/15";
  const verdictTextCls = maleficPresent ? "text-destructive" : "text-emerald-700 dark:text-emerald-300";

  const badge = houseBadge(house.house);
  const ordinal = pick(HOUSE_ORDINAL_NE[house.house - 1], HOUSE_ORDINAL_EN[house.house - 1]);
  const rashiName = formatRashiByNumber(house.rashi, lang);
  const lalKitabFixedLord = reference.lalKitabFixedLord[house.house] ?? [];

  const occupantKeys = occupants.map((p) => p.key);
  const yuti2Entry = occupantKeys.length === 2 ? reference.grahaYuti2[yutiKey(occupantKeys)] : undefined;
  const yuti3Entries =
    occupantKeys.length >= 3
      ? subsetsOf3(occupantKeys)
          .map((triple) => reference.grahaYuti3[yutiKey(triple)])
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
      : [];
  const showYutiSection = occupantKeys.length >= 2;

  const applicableSutras = reference.naadiSutras
    .filter((s) => s.grahas.every((g) => occupantKeys.includes(g)))
    .sort((a, b) => a.number - b.number);
  const lalKitabEntries = occupants
    .map((p) => ({ key: p.key, entry: reference.lalKitabHouse[p.key]?.[house.house] }))
    .filter((e): e is { key: string; entry: NonNullable<typeof e.entry> } => Boolean(e.entry));
  const lalKitabYutiMatch =
    occupantKeys.length >= 2 && occupantKeys.length <= 3
      ? reference.lalKitabYuti.find((y) => yutiKey(y.grahas) === yutiKey(occupantKeys))
      : undefined;

  const themes = splitList(pick(info.themeNe, info.themeEn));
  const classicalName = reference.houseClassicalName[house.house];
  const bodyPart = reference.houseBodyPart[house.house];
  const houseDetail = reference.houseDetail[house.house];

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: "summary", icon: "📋", label: pick("सारांश", "Summary") },
    { id: "lord", icon: "👑", label: pick("स्वामी र फल", "Lord & results") },
    { id: "drishti", icon: "👁️", label: pick("दृष्टि", "Aspects") },
    { id: "rules", icon: "📚", label: pick("नियम", "Rules") },
  ];
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <>
      <View className="gap-1 border-b border-border px-4 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row flex-wrap items-center gap-2">
            <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <Text className="text-body font-bold text-secondary">{digits(house.house)}</Text>
            </View>
            <Text className="text-body font-bold text-foreground" style={lang === "en" ? undefined : nepaliTextStyle(16)}>
              {ordinal} {pick("भाव", "house")}
              {classicalName && (
                <Text className="text-body font-normal text-muted-foreground">
                  {" "}· {pick(classicalName.ne, classicalName.en)}
                </Text>
              )}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={pick("बन्द गर्नुहोस्", "Close")}
            className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-muted/60"
          >
            <Text className="text-body text-muted-foreground">✕</Text>
          </Pressable>
        </View>
        <Text className="text-body text-muted-foreground" style={small}>
          {themes.join(" · ")}
        </Text>
      </View>

      {/* Tabs replace the old single long stacked-section list — only one
          group is on screen at a time. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        /* A ScrollView grows by default; in the now fixed-height sheet that
           stretched the tab row to fill it. Pin it to its content height. */
        style={{ flexGrow: 0, flexShrink: 0 }}
        className="border-b border-border bg-card"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 4, alignItems: "center" }}
      >
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className={cn(
              "shrink-0 flex-row items-center rounded-full border px-2.5 py-1",
              tab === t.id ? "border-secondary/40 bg-secondary/12" : "border-border bg-transparent",
            )}
          >
            <Text className={cn("text-body font-semibold", tab === t.id ? "text-secondary" : "text-muted-foreground")}>
              {t.icon} {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 14, gap: 12 }}>
        {tab === "summary" && (
          <>
            {/* यस भावमा — occupying grahas, condensed */}
            <Block
              icon="🪐"
              title={pick("यस भावमा", "Occupants")}
              right={
                occupants.length === 0 ? (
                  <Text className="text-body text-muted-foreground">{pick("रिक्त", "Empty")}</Text>
                ) : undefined
              }
            >
              <View className="mb-2 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                <Text className="text-body" style={small}>
                  <Text className="text-body font-semibold text-foreground">
                    {digits(house.rashi)} {rashiName}
                  </Text>{" "}
                  {pick("राशि", "sign")}
                </Text>
                <Text className="text-border">·</Text>
                <Text className="text-body" style={small}>
                  {pick("स्वामी", "Lord")} <Text className="text-body font-semibold text-secondary">{grahaName(lordKey, pick)}</Text>
                </Text>
                {badge && (
                  <>
                    <Text className="text-border">·</Text>
                    <Text className="text-body text-muted-foreground">{formatHouseBadge(badge, lang)}</Text>
                  </>
                )}
              </View>
              {occupants.length > 0 ? (
                <View className="gap-1.5">
                  {occupants.map((p) => {
                    const k = reference.grahaKarakatva[p.key];
                    const subjects = k ? splitList(pick(k.subjectsNe, k.subjectsEn)).slice(0, 3).join(" · ") : "";
                    return (
                      <View key={p.key}>
                        <Text className="text-body font-semibold text-foreground" style={small}>{grahaName(p.key, pick)}</Text>
                        {subjects ? (
                          <Text className="text-body text-muted-foreground" style={small}>{subjects}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-body leading-relaxed text-muted-foreground" style={small}>
                  {pick(
                    `कुनै ग्रह छैन — राशि स्वामी ${grahaName(lordKey, pick)}को स्थिति हेर्नुहोस्।`,
                    `No graha here — see the placement of ${grahaName(lordKey, pick)}, this house's ruling graha.`,
                  )}
                </Text>
              )}
            </Block>

            {/* स्वास्थ्य संकेत — the headline verdict */}
            <Block
              icon="🩺"
              title={pick("स्वास्थ्य संकेत", "Health signals")}
              right={
                <View className={cn("flex-row items-center gap-1 rounded-full border px-2 py-0.5", verdictCls)}>
                  <Text className={cn("text-body font-semibold", verdictTextCls)}>{verdictLabel}</Text>
                </View>
              }
            >
              <Text className="text-body leading-relaxed" style={small}>
                <Text className="text-body font-semibold text-foreground">{pick("अंग:", "Parts:")}</Text>{" "}
                {pick(info.medicalNe, info.medicalEn)}
              </Text>
              {bodyPart && (
                <Text className="text-body mt-1 text-muted-foreground" style={small}>
                  {pick(bodyPart.ne, bodyPart.en)}
                </Text>
              )}
              {!maleficPresent && !beneficPresent && (
                <Text className="text-body mt-1 text-muted-foreground" style={small}>
                  {pick("यस भावमा कुनै ग्रहको दृष्टि वा उपस्थिति छैन।", "No graha occupies or aspects this house.")}
                </Text>
              )}
            </Block>

            {/* भावको स्थायी जानकारी — the full house-by-house reference notes */}
            {houseDetail && (
              <Block icon="📖" title={pick("भावको स्थायी जानकारी", "General house reference")}>
                <Text className="text-body text-muted-foreground" style={small}>
                  {pick(houseDetail.titlesNe, houseDetail.titlesEn)}
                </Text>
                <Text className="text-body mt-1.5" style={small}>
                  {pick("स्वाभाविक कारक", "Natural significator")}:{" "}
                  <Text className="text-body font-semibold text-foreground">
                    {pick(houseDetail.naturalNe, houseDetail.naturalEn)}
                  </Text>
                </Text>
                <Text className="text-body mt-2 leading-relaxed" style={body}>
                  {pick(houseDetail.descriptionNe, houseDetail.descriptionEn)}
                </Text>
                {/* कालपुरुष कुण्डली अनुसार — यो सधैं मेष लग्न मानेर गणना गरिएको आदर्श/सैद्धान्तिक
                    राशि-स्वामी हो, यस जातकको वास्तविक राशि/स्वामी होइन (त्यो माथि हेडरमा
                    देखिन्छ)। दुवैलाई एउटै लेबलमा नराखिएकाले यहाँ छुट्टै र स्पष्ट चिनो दिइएको छ। */}
                <Text className="text-body mt-2 text-muted-foreground" style={small}>
                  {pick(
                    `कालपुरुष कुण्डली अनुसार यो भाव ${houseDetail.signNe} राशिसँग मेल खान्छ (राशि स्वामी ${houseDetail.lordNe}) — यो यस जातकको वास्तविक राशि होइन, माथिको भावको वास्तविक राशि/स्वामी हेर्नुहोस्।`,
                    `In the Kalapurusha (natural zodiac) chart this house corresponds to ${houseDetail.signEn} (ruled by ${houseDetail.lordEn}) — that's not this native's actual sign; see the real sign/lord for this house above.`,
                  )}
                </Text>
                <View className="mt-2">
                  <ShlokaCard
                    label={pick("शास्त्रीय प्रमाण", "Classical citation")}
                    source={pick(houseDetail.shlokaSourceNe, houseDetail.shlokaSourceEn)}
                    shloka={houseDetail.shloka}
                    small={small}
                  />
                </View>
                <Text className="text-body mt-2 text-muted-foreground" style={small}>
                  {pick(
                    "ग्रहको वास्तविक प्रभाव यसको भावेशत्व, बल, दृष्टि, संयोजन, अस्त/वक्री जस्ता अवस्थामा भर पर्छ — तल दिइएको सामान्य शुभ/पाप वर्गीकरण एउटा आधारभूत सिद्धान्त मात्र हो, अनिवार्य नियम होइन।",
                    "A graha's actual effect depends on its lordship, strength, aspects, conjunctions, combustion/retrogression and more — the general benefic/malefic classification below is only a baseline classical principle, not an unconditional rule.",
                  )}
                </Text>
                <Text className="text-body mt-1.5 leading-relaxed" style={small}>
                  <Text className="text-body font-semibold text-emerald-600 dark:text-emerald-400">
                    {pick("शुभ ग्रह", "Benefic grahas")} ({pick(houseDetail.beneficGrahasNe, houseDetail.beneficGrahasEn)}):
                  </Text>{" "}
                  {pick(houseDetail.beneficEffectNe, houseDetail.beneficEffectEn)}
                </Text>
                <Text className="text-body mt-1 leading-relaxed" style={small}>
                  <Text className="text-body font-semibold text-destructive">
                    {pick("पापग्रह", "Malefic grahas")} ({pick(houseDetail.maleficGrahasNe, houseDetail.maleficGrahasEn)}):
                  </Text>{" "}
                  {pick(houseDetail.maleficEffectNe, houseDetail.maleficEffectEn)}
                </Text>
              </Block>
            )}
          </>
        )}

        {tab === "lord" && (
          <>
            {/* ग्रह फलादेश */}
            <Block
              icon="🪐"
              title={pick("ग्रह फलादेश", "Graha in this house")}
              right={occupants.length > 0 ? <Text className="text-body text-muted-foreground">{digits(occupants.length)}</Text> : undefined}
            >
              {occupants.length > 0 ? (
                <View className="gap-4">
                  {occupants.map((p) => (
                    <GrahaKarakatvaCard
                      key={p.key}
                      grahaKey={p.key}
                      house={house.house}
                      reference={reference}
                      pick={pick}
                      digits={digits}
                      small={small}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-body text-muted-foreground" style={small}>
                  {pick(
                    "यस भावमा कुनै ग्रह नभएकाले ग्रह फलादेश छैन।",
                    "No graha occupies this house, so there's no graha-in-house reading.",
                  )}
                </Text>
              )}
            </Block>

            {/* भावेश सम्बन्ध — this house's real lord and where it sits */}
            <Block
              icon="👑"
              title={pick("भावेश सम्बन्ध", "Lord placement")}
              right={
                lordHouse != null ? (
                  <Text className="text-body text-muted-foreground">{pick(`${digits(lordHouse)}औँ भाव`, `house ${digits(lordHouse)}`)}</Text>
                ) : undefined
              }
            >
              {lordHouse != null ? (
                <Text className="text-body" style={small}>
                  <Text className="text-body font-semibold text-foreground">{lordTitle}</Text>{" "}
                  <Text className="text-body font-semibold text-secondary">{grahaName(lordKey, pick)}</Text> →{" "}
                  {pick(`${digits(lordHouse)}औँ भाव`, `house ${digits(lordHouse)}`)}
                </Text>
              ) : (
                <Text className="text-body text-muted-foreground" style={small}>
                  {pick(
                    `राशि स्वामी ${grahaName(lordKey, pick)} यो D1 चार्टमा फेला परेन।`,
                    `Sign lord ${grahaName(lordKey, pick)} wasn't found placed in this D1 chart.`,
                  )}
                </Text>
              )}
              {lordHouse != null &&
                (bhaveshEntry ? (
                  <View className="mt-2 gap-1.5">
                    {bhaveshEntry.shloka && (
                      <ShlokaCard
                        source={pick("बृ.पा.हो.शा. (भावेशफलाध्याय)", "BPHS (ch. 13)")}
                        shloka={bhaveshEntry.shloka}
                        small={small}
                      />
                    )}
                    <Text className="text-body leading-relaxed" style={small}>{pick(bhaveshEntry.ne, bhaveshEntry.en)}</Text>
                    <Text className="text-body text-muted-foreground" style={small}>
                      {pick(`स्रोत: ${reference.bhaveshPhalaSource}`, `Source: ${reference.bhaveshPhalaSource}`)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-body mt-2 text-muted-foreground" style={small}>
                    🚧 {pick("चाँडै आउँदैछ", "Coming soon")}
                  </Text>
                ))}
            </Block>

            {/* ग्रह युति फल — shown only when 2+ grahas share this house */}
            {showYutiSection && (
              <Block icon="👥" title={pick("ग्रह युति फल", "Graha conjunction (yuti) result")}>
                <View className="gap-3">
                  {yuti2Entry && (
                    <View className="border-l-2 border-secondary/40 pl-3">
                      <Text className="text-body font-semibold text-foreground" style={small}>
                        {joinNames(occupantKeys, pick)}
                        {yuti2Entry.yogaNameNe && (
                          <Text className="text-body font-normal text-muted-foreground">
                            {" "}
                            ({pick(yuti2Entry.yogaNameNe, yuti2Entry.yogaNameEn ?? yuti2Entry.yogaNameNe)})
                          </Text>
                        )}
                      </Text>
                      <Text className="text-body mt-1 leading-relaxed" style={small}>{pick(yuti2Entry.textNe, yuti2Entry.textEn)}</Text>
                    </View>
                  )}
                  {yuti3Entries.map((entry) => (
                    <View key={yutiKey(entry.grahas)} className="border-l-2 border-secondary/40 pl-3">
                      <Text className="text-body font-semibold text-foreground" style={small}>{joinNames(entry.grahas, pick)}</Text>
                      <Text className="text-body mt-1 leading-relaxed" style={small}>{pick(entry.textNe, entry.textEn)}</Text>
                    </View>
                  ))}
                  {occupantKeys.length >= 3 && (
                    <Text className="text-body leading-relaxed text-muted-foreground" style={small}>
                      {pick(reference.grahaYutiGeneralRule.ne, reference.grahaYutiGeneralRule.en)}
                    </Text>
                  )}
                  {!yuti2Entry && yuti3Entries.length === 0 && occupantKeys.length < 3 && (
                    <Text className="text-body text-muted-foreground" style={small}>
                      {pick(
                        "यो विशेष ग्रह-युतिको लागि सन्दर्भ अहिले उपलब्ध छैन।",
                        "No reference is available for this specific graha combination yet.",
                      )}
                    </Text>
                  )}
                </View>
              </Block>
            )}
          </>
        )}

        {tab === "drishti" && (
          <Block icon="👁️" title={pick("दृष्टि", "Aspects")}>
            {occupants.length > 0 ? (
              <View className="gap-1.5">
                {occupants.map((p) => {
                  const targets = drishtiTargetHouses(p.key, house.house);
                  return (
                    <Text key={p.key} className="text-body" style={small}>
                      <Text className="text-body font-semibold text-foreground">{grahaName(p.key, pick)}</Text>
                      {" → "}
                      {targets.map((t) => pick(`${digits(t)}औँ`, digits(t))).join(" · ")} {pick("भाव", "house")}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text className="text-body text-muted-foreground" style={small}>
                {pick(
                  "यस भावमा कुनै ग्रह नभएकाले यहाँबाट बाहिर दृष्टि पर्दैन।",
                  "No graha occupies this house, so it casts no aspect outward.",
                )}
              </Text>
            )}
            <View className="mt-3 border-t border-border/60 pt-3">
              <Text className="text-body mb-1.5 font-semibold text-foreground" style={small}>
                {pick("सबै दृष्टि", "All aspects")}
              </Text>
              {aspectedBy.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-body font-semibold text-foreground" style={small}>
                    {pick("यस भावमा दृष्टि गर्ने ग्रहहरू:", "Grahas aspecting this house:")}
                  </Text>
                  {aspectedBy.map((k) => {
                    const d = reference.grahaDrishti[k];
                    return (
                      <View key={k}>
                        <Text className="text-body font-semibold text-foreground" style={small}>{grahaName(k, pick)}</Text>
                        {d && (
                          <Text className="text-body mt-0.5 leading-relaxed text-muted-foreground" style={small}>
                            {pick(d.summaryNe, d.summaryEn)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-body text-muted-foreground" style={small}>
                  {pick("यस भावमा कुनै ग्रहको दृष्टि पर्दैन।", "No graha aspects this house.")}
                </Text>
              )}
            </View>
          </Block>
        )}

        {tab === "rules" && (
          <Block icon="📚" title={pick("सम्बन्धित नियम", "Related rules")}>
            <Collapsible title={pick("भृगु नाडी सूत्र", "Brighu Naadi sutras")} right={digits(applicableSutras.length)}>
              {applicableSutras.length > 0 ? (
                <View className="gap-3">
                  {applicableSutras.map((s) => (
                    <View key={s.number} className="border-l-2 border-secondary/40 pl-3">
                      <Text className="text-body font-semibold text-foreground" style={small}>
                        {pick(`सूत्र ${digits(s.number)} — ${s.titleNe}`, `Sutra ${digits(s.number)} — ${s.titleEn}`)}
                      </Text>
                      <Text className="text-body text-muted-foreground" style={small}>{pick(s.categoryNe, s.categoryEn)}</Text>
                      <Text className="text-body mt-1 leading-relaxed" style={small}>{pick(s.bodyNe, s.bodyEn)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-body text-muted-foreground" style={small}>
                  {pick(
                    "यस भावमा कुनै ग्रह नभएकाले लागू हुने भृगु नाडी सूत्र देखिएका छैनन्।",
                    "No Brighu Naadi sutras apply, since no graha occupies this house.",
                  )}
                </Text>
              )}
              <Text className="text-body mt-2 text-muted-foreground" style={small}>
                {pick(`स्रोत: ${reference.naadiSutraSource}`, `Source: ${reference.naadiSutraSource}`)}
              </Text>
            </Collapsible>

            <Collapsible title={pick("लाल किताब", "Lal Kitab")} right={digits(lalKitabEntries.length)}>
              {lalKitabEntries.length > 0 ? (
                <View className="gap-3">
                  {lalKitabEntries.map(({ key, entry }) => {
                    const tip = reference.lalKitabSafetyTips[key];
                    return (
                      <View key={key}>
                        <Text className="text-body font-semibold text-foreground" style={small}>
                          {GRAHA_ICON[key as GrahaKey] ?? "🪐"} {grahaName(key, pick)} — {pick(`भाव ${digits(house.house)}`, `house ${digits(house.house)}`)}
                        </Text>
                        <Text className="text-body mt-0.5 leading-relaxed" style={small}>{pick(entry.ne, entry.en)}</Text>
                        {tip && (
                          <Text className="text-body mt-1 leading-relaxed text-muted-foreground" style={small}>
                            {pick("सुरक्षित व्यवहार:", "Safe practice:")} {pick(tip.ne, tip.en)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-body leading-relaxed text-muted-foreground" style={small}>
                  {pick(
                    `यस भावमा कुनै ग्रह नभएकाले प्रत्यक्ष लाल किताब सङ्केत छैन। यस भावको पक्का घर स्वामी ${joinNames(lalKitabFixedLord, pick)}को स्थिति हेर्नुहोस्।`,
                    `This house has no occupying graha, so there's no direct Lal Kitab signal. See the placement of ${joinNames(lalKitabFixedLord, pick)}, this house's fixed (pakka ghar) lord.`,
                  )}
                </Text>
              )}
              {lalKitabYutiMatch && (
                <View className="mt-3 border-l-2 border-secondary/40 pl-3">
                  <Text className="text-body font-semibold text-foreground" style={small}>
                    {pick("👥 ग्रह युति —", "👥 Graha yuti —")} {joinNames(lalKitabYutiMatch.grahas, pick)}
                  </Text>
                  <Text className="text-body mt-1 leading-relaxed" style={small}>
                    {pick(lalKitabYutiMatch.textNe, lalKitabYutiMatch.textEn)}
                  </Text>
                </View>
              )}
              <Text className="text-body mt-2 text-muted-foreground" style={small}>
                {pick("स्रोत: लाल किताब — भाग २–११", "Source: Lal Kitab, parts 2–11")}
              </Text>
              <View className="mt-2">
                <Collapsible title={pick("लाल किताबको सुस्थ/दुःस्थ नियम के हो?", "What is Lal Kitab's sustha/dustha rule?")}>
                  <View className="gap-1.5">
                    {reference.lalKitabSusthaDustha.map((rule, i) => (
                      <Text key={i} className="text-body leading-relaxed" style={small}>
                        {pick(rule.ne, rule.en)}
                      </Text>
                    ))}
                  </View>
                  <Text className="text-body mt-2 text-muted-foreground" style={small}>
                    {pick(`स्रोत: ${reference.lalKitabRevisionSource}`, `Source: ${reference.lalKitabRevisionSource}`)}
                  </Text>
                </Collapsible>
              </View>
            </Collapsible>
          </Block>
        )}
      </ScrollView>

      <View className="border-t border-border px-4 py-3">
        <Button label={pick("बन्द गर्नुहोस्", "Close")} variant="outline" onPress={onClose} />
      </View>
    </>
  );
}
