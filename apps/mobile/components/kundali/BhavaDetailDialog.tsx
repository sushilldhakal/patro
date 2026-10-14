import { useState } from "react";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { houseBadge, formatHouseBadge, drishtiTargetHouses } from "@vedic-patro/domain/bhava";
import { GRAHA_NAME, GRAHA_ICON, type GrahaKey } from "@vedic-patro/domain/graha-details";
import type { BhavaReferencePayload } from "@/lib/api";
import {
  HOUSE_ORDINAL_NE,
  HOUSE_ORDINAL_EN,
  HOUSE_LORD_TITLE_NE,
  computeAspectedBy,
  splitList,
} from "@vedic-patro/domain/kundali/bhava-detail";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { subsetsOf3 } from "@vedic-patro/domain/kundali/bhava-detail";
import { space, spaceUnit } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";

function grahaName(key: string, pick: (ne: string, en: string) => string): string {
  const entry = GRAHA_NAME[key as GrahaKey];
  return entry ? pick(entry.ne, entry.en) : key;
}

function joinNames(keys: string[], pick: (ne: string, en: string) => string): string {
  if (keys.length === 0) return pick(tFor("ne", "ui.kundali.none"), tFor("en", "ui.kundali.none"));
  return keys.map((k) => grahaName(k, pick)).join(", ");
}

function yutiKey(keys: string[]): string {
  return [...keys].sort().join("+");
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
    <View className={kundaliDetailClasses.bhavaDialog.block}>
      <View className={kundaliDetailClasses.bhavaDialog.blockHead}>
        <Text className="text-body">{icon}</Text>
        <Text className={kundaliDetailClasses.prose.headingBold}>{title}</Text>
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
    <View className={kundaliDetailClasses.bhavaDialog.citationBox}>
      <View className={cn(kundaliDetailClasses.bhavaDialog.citationRow, "flex-row")}>
        {label && <Text className={kundaliDetailClasses.prose.heading}>📜 {label}</Text>}
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
        {right != null && <Text className={kundaliDetailClasses.prose.muted}>{right}</Text>}
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
      <Text className={kundaliDetailClasses.prose.headingBold}>
        {GRAHA_ICON[grahaKey as GrahaKey] ?? "🪐"} {grahaName(grahaKey, pick)}
      </Text>

      <ShlokaCard
        label={pick(tFor("ne", "ui.kundali.karakatva_shloka"), tFor("en", "ui.kundali.karakatva_shloka"))}
        source={pick(k.shlokaSourceNe, k.shlokaSourceEn)}
        shloka={k.shloka}
        small={small}
      />

      <View>
        <Text className={kundaliDetailClasses.prose.heading}>📋 {pick(tFor("ne", "ui.kundali.karakatva_subjects"), tFor("en", "ui.kundali.karakatva_subjects"))}</Text>
        <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>
          {pick(k.subjectsNe, k.subjectsEn)}{tFor("ne", "ui.kundali.x_d617dd33")}
        </Text>
      </View>

      <View>
        <Text className={kundaliDetailClasses.prose.heading}>💡 {pick(tFor("ne", "ui.kundali.significance"), tFor("en", "ui.kundali.significance"))}</Text>
        <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>
          {pick(k.significanceNe, k.significanceEn)}
        </Text>
      </View>

      <View className={kundaliDetailClasses.prose.quote}>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body flex-1 font-semibold text-foreground" style={small}>
            ⬡ {pick(
              tFor("ne", "ui.kundali.graha_in_house_phala", {
                house: digits(house),
                lagna: house === 1 ? tFor("ne", "ui.kundali.x_cf56ff65") : "",
                graha: grahaName(grahaKey, pick),
              }),
              `${grahaName(grahaKey, pick)} in house ${digits(house)}${house === 1 ? " (Lagna)" : ""}`,
            )}
          </Text>
          {saravali && (
            <View className={cn(kundaliDetailClasses.bhavaDialog.pill, ratingBadgeCls[saravali.rating])}>
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
            <Text className={kundaliDetailClasses.bhavaDialog.summary} style={small}>
              💡 {pick(saravali.summaryNe, saravali.summaryEn)}
            </Text>
          </View>
        ) : (
          <Text className={kundaliDetailClasses.prose.mutedMt15} style={small}>
            {pick(
              tFor("ne", "ui.kundali.no_classical_shloka_is_available_for"),
              tFor("en", "ui.kundali.no_classical_shloka_is_available_for"),
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
  const { t, pick } = useLocale();
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
            <Text className={kundaliDetailClasses.prose.muted}>{t("rashifal.profile.loading")}</Text>
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
  const { t, pick, digits, lang } = useLocale();
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
    ? t("ui.kundali.needs_attention")
    : t("ui.kundali.generally_fine");
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
    { id: "summary", icon: "📋", label: t("ui.kundali.summary") },
    { id: "lord", icon: "👑", label: t("ui.kundali.lord_results") },
    { id: "drishti", icon: "👁️", label: t("ui.kundali.aspects") },
    { id: "rules", icon: "📚", label: t("ui.kundali.rules") },
  ];
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <>
      <View className={kundaliDetailClasses.bhavaDialog.header}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row flex-wrap items-center gap-2">
            <View className={kundaliDetailClasses.bhavaDialog.headerBadge}>
              <Text className={kundaliDetailClasses.bhavaDialog.headerBadgeText}>{digits(house.house)}</Text>
            </View>
            <Text className={kundaliDetailClasses.prose.headingBold} style={lang === "en" ? undefined : nepaliTextStyle(16)}>
              {ordinal} {t("ui.kundali.house")}
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
            accessibilityLabel={t("ui.common.close")}
            className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-muted/60"
          >
            <Text className={kundaliDetailClasses.prose.muted}>✕</Text>
          </Pressable>
        </View>
        <Text className={kundaliDetailClasses.prose.muted} style={small}>
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
        className={kundaliDetailClasses.bhavaDialog.tabBar}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xs, alignItems: "center" }}
      >
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className={cn(
              kundaliDetailClasses.bhavaDialog.tab,
              tab === t.id ? kundaliDetailClasses.bhavaDialog.tabActive : kundaliDetailClasses.bhavaDialog.tabIdle,
            )}
          >
            <Text className={cn(kundaliDetailClasses.bhavaDialog.tabText, tab === t.id ? kundaliDetailClasses.bhavaDialog.tabActiveText : kundaliDetailClasses.bhavaDialog.tabIdleText)}>
              {t.icon} {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spaceUnit * 3.5, gap: space.md }}>
        {tab === "summary" && (
          <>
            {/* यस भावमा — occupying grahas, condensed */}
            <Block
              icon="🪐"
              title={t("ui.kundali.occupants")}
              right={
                occupants.length === 0 ? (
                  <Text className={kundaliDetailClasses.prose.muted}>{t("ui.kundali.empty")}</Text>
                ) : undefined
              }
            >
              <View className={cn(kundaliDetailClasses.bhavaDialog.rowWrap, "flex-row")}>
                <Text className="text-body" style={small}>
                  <Text className={kundaliDetailClasses.prose.heading}>
                    {digits(house.rashi)} {rashiName}
                  </Text>{" "}
                  {t("dainik.sign")}
                </Text>
                <Text className="text-border">·</Text>
                <Text className="text-body" style={small}>
                  {t("panchanga.wheel.lord")} <Text className="text-body font-semibold text-secondary">{grahaName(lordKey, pick)}</Text>
                </Text>
                {badge && (
                  <>
                    <Text className="text-border">·</Text>
                    <Text className={kundaliDetailClasses.prose.muted}>{formatHouseBadge(badge, lang)}</Text>
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
                        <Text className={kundaliDetailClasses.prose.heading} style={small}>{grahaName(p.key, pick)}</Text>
                        {subjects ? (
                          <Text className={kundaliDetailClasses.prose.muted} style={small}>{subjects}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>
                  {t("ui.kundali.no_graha_here_see_the_placement", { pick: grahaName(lordKey, pick) })}
                </Text>
              )}
            </Block>

            {/* स्वास्थ्य संकेत — the headline verdict */}
            <Block
              icon="🩺"
              title={t("ui.kundali.health_signals")}
              right={
                <View className={cn(kundaliDetailClasses.bhavaDialog.pillInline, "flex-row", verdictCls)}>
                  <Text className={cn("text-body font-semibold", verdictTextCls)}>{verdictLabel}</Text>
                </View>
              }
            >
              <Text className={kundaliDetailClasses.prose.body} style={small}>
                <Text className={kundaliDetailClasses.prose.heading}>{t("ui.kundali.parts")}</Text>{" "}
                {pick(info.medicalNe, info.medicalEn)}
              </Text>
              {bodyPart && (
                <Text className={kundaliDetailClasses.prose.mutedMt1} style={small}>
                  {pick(bodyPart.ne, bodyPart.en)}
                </Text>
              )}
              {!maleficPresent && !beneficPresent && (
                <Text className={kundaliDetailClasses.prose.mutedMt1} style={small}>
                  {t("ui.kundali.no_graha_occupies_or_aspects_this")}
                </Text>
              )}
            </Block>

            {/* भावको स्थायी जानकारी — the full house-by-house reference notes */}
            {houseDetail && (
              <Block icon="📖" title={t("ui.kundali.general_house_reference")}>
                <Text className={kundaliDetailClasses.prose.muted} style={small}>
                  {pick(houseDetail.titlesNe, houseDetail.titlesEn)}
                </Text>
                <Text className="text-body mt-1.5" style={small}>
                  {t("ui.kundali.natural_significator")}:{" "}
                  <Text className={kundaliDetailClasses.prose.heading}>
                    {pick(houseDetail.naturalNe, houseDetail.naturalEn)}
                  </Text>
                </Text>
                <Text className={kundaliDetailClasses.prose.bodyMt2} style={body}>
                  {pick(houseDetail.descriptionNe, houseDetail.descriptionEn)}
                </Text>
                {/* कालपुरुष कुण्डली अनुसार — यो सधैं मेष लग्न मानेर गणना गरिएको आदर्श/सैद्धान्तिक
                    राशि-स्वामी हो, यस जातकको वास्तविक राशि/स्वामी होइन (त्यो माथि हेडरमा
                    देखिन्छ)। दुवैलाई एउटै लेबलमा नराखिएकाले यहाँ छुट्टै र स्पष्ट चिनो दिइएको छ। */}
                <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                  {pick(
                    tFor("ne", "ui.kundali.x_759ec7db", { v0: houseDetail.signNe, v1: houseDetail.lordNe }),
                    `In the Kalapurusha (natural zodiac) chart this house corresponds to ${houseDetail.signEn} (ruled by ${houseDetail.lordEn}) — that's not this native's actual sign; see the real sign/lord for this house above.`,
                  )}
                </Text>
                <View className="mt-2">
                  <ShlokaCard
                    label={t("ui.kundali.classical_citation")}
                    source={pick(houseDetail.shlokaSourceNe, houseDetail.shlokaSourceEn)}
                    shloka={houseDetail.shloka}
                    small={small}
                  />
                </View>
                <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                  {t("ui.kundali.a_graha_s_actual_effect_depends")}
                </Text>
                <Text className={kundaliDetailClasses.prose.bodyMt15} style={small}>
                  <Text className="text-body font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("ui.kundali.benefic_grahas")} ({pick(houseDetail.beneficGrahasNe, houseDetail.beneficGrahasEn)}):
                  </Text>{" "}
                  {pick(houseDetail.beneficEffectNe, houseDetail.beneficEffectEn)}
                </Text>
                <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>
                  <Text className="text-body font-semibold text-destructive">
                    {t("ui.kundali.malefic_grahas")} ({pick(houseDetail.maleficGrahasNe, houseDetail.maleficGrahasEn)}):
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
              title={t("ui.kundali.graha_in_this_house")}
              right={occupants.length > 0 ? <Text className={kundaliDetailClasses.prose.muted}>{digits(occupants.length)}</Text> : undefined}
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
                <Text className={kundaliDetailClasses.prose.muted} style={small}>
                  {t("ui.kundali.no_graha_occupies_this_house_so")}
                </Text>
              )}
            </Block>

            {/* भावेश सम्बन्ध — this house's real lord and where it sits */}
            <Block
              icon="👑"
              title={t("ui.kundali.lord_placement")}
              right={
                lordHouse != null ? (
                  <Text className={kundaliDetailClasses.prose.muted}>{t("ui.kundali.house_lordhouse", { lordHouse: digits(lordHouse) })}</Text>
                ) : undefined
              }
            >
              {lordHouse != null ? (
                <Text className="text-body" style={small}>
                  <Text className={kundaliDetailClasses.prose.heading}>{lordTitle}</Text>{" "}
                  <Text className="text-body font-semibold text-secondary">{grahaName(lordKey, pick)}</Text> →{" "}
                  {t("ui.kundali.house_lordhouse", { lordHouse: digits(lordHouse) })}
                </Text>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>
                  {t("ui.kundali.sign_lord_pick_wasn_t_found", { pick: grahaName(lordKey, pick) })}
                </Text>
              )}
              {lordHouse != null &&
                (bhaveshEntry ? (
                  <View className="mt-2 gap-1.5">
                    {bhaveshEntry.shloka && (
                      <ShlokaCard
                        source={t("ui.kundali.bphs_ch_13")}
                        shloka={bhaveshEntry.shloka}
                        small={small}
                      />
                    )}
                    <Text className={kundaliDetailClasses.prose.body} style={small}>{pick(bhaveshEntry.ne, bhaveshEntry.en)}</Text>
                    <Text className={kundaliDetailClasses.prose.muted} style={small}>
                      {t("ui.kundali.source_bhaveshphalasource", { bhaveshPhalaSource: reference.bhaveshPhalaSource })}
                    </Text>
                  </View>
                ) : (
                  <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                    🚧 {t("ui.kundali.coming_soon")}
                  </Text>
                ))}
            </Block>

            {/* ग्रह युति फल — shown only when 2+ grahas share this house */}
            {showYutiSection && (
              <Block icon="👥" title={t("ui.kundali.graha_conjunction_yuti_result")}>
                <View className="gap-3">
                  {yuti2Entry && (
                    <View className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>
                        {joinNames(occupantKeys, pick)}
                        {yuti2Entry.yogaNameNe && (
                          <Text className="text-body font-normal text-muted-foreground">
                            {" "}
                            ({pick(yuti2Entry.yogaNameNe, yuti2Entry.yogaNameEn ?? yuti2Entry.yogaNameNe)})
                          </Text>
                        )}
                      </Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{pick(yuti2Entry.textNe, yuti2Entry.textEn)}</Text>
                    </View>
                  )}
                  {yuti3Entries.map((entry) => (
                    <View key={yutiKey(entry.grahas)} className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{joinNames(entry.grahas, pick)}</Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{pick(entry.textNe, entry.textEn)}</Text>
                    </View>
                  ))}
                  {occupantKeys.length >= 3 && (
                    <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>
                      {pick(reference.grahaYutiGeneralRule.ne, reference.grahaYutiGeneralRule.en)}
                    </Text>
                  )}
                  {!yuti2Entry && yuti3Entries.length === 0 && occupantKeys.length < 3 && (
                    <Text className={kundaliDetailClasses.prose.muted} style={small}>
                      {t("ui.kundali.no_reference_is_available_for_this")}
                    </Text>
                  )}
                </View>
              </Block>
            )}
          </>
        )}

        {tab === "drishti" && (
          <Block icon="👁️" title={t("ui.kundali.aspects")}>
            {occupants.length > 0 ? (
              <View className="gap-1.5">
                {occupants.map((p) => {
                  const targets = drishtiTargetHouses(p.key, house.house);
                  return (
                    <Text key={p.key} className="text-body" style={small}>
                      <Text className={kundaliDetailClasses.prose.heading}>{grahaName(p.key, pick)}</Text>
                      {" → "}
                      {targets.map((t) => pick(tFor("ne", "ui.kundali.x_b908d7d7", { v0: digits(t) }), digits(t))).join(" · ")} {t("ui.kundali.house")}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text className={kundaliDetailClasses.prose.muted} style={small}>
                {t("ui.kundali.no_graha_occupies_this_house_so_2")}
              </Text>
            )}
            <View className={kundaliDetailClasses.prose.divider}>
              <Text className={kundaliDetailClasses.prose.headingMb15} style={small}>
                {t("ui.kundali.all_aspects")}
              </Text>
              {aspectedBy.length > 0 ? (
                <View className="gap-2">
                  <Text className={kundaliDetailClasses.prose.heading} style={small}>
                    {t("ui.kundali.grahas_aspecting_this_house")}
                  </Text>
                  {aspectedBy.map((k) => {
                    const d = reference.grahaDrishti[k];
                    return (
                      <View key={k}>
                        <Text className={kundaliDetailClasses.prose.heading} style={small}>{grahaName(k, pick)}</Text>
                        {d && (
                          <Text className={kundaliDetailClasses.prose.bodyMutedMt05} style={small}>
                            {pick(d.summaryNe, d.summaryEn)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>
                  {t("ui.kundali.no_graha_aspects_this_house")}
                </Text>
              )}
            </View>
          </Block>
        )}

        {tab === "rules" && (
          <Block icon="📚" title={t("ui.kundali.related_rules")}>
            <Collapsible title={t("ui.kundali.brighu_naadi_sutras")} right={digits(applicableSutras.length)}>
              {applicableSutras.length > 0 ? (
                <View className="gap-3">
                  {applicableSutras.map((s) => (
                    <View key={s.number} className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>
                        {pick(tFor("ne", "ui.kundali.x_b54eae14", { v0: digits(s.number), v1: s.titleNe }), `Sutra ${digits(s.number)} — ${s.titleEn}`)}
                      </Text>
                      <Text className={kundaliDetailClasses.prose.muted} style={small}>{pick(s.categoryNe, s.categoryEn)}</Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{pick(s.bodyNe, s.bodyEn)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>
                  {t("ui.kundali.no_brighu_naadi_sutras_apply_since")}
                </Text>
              )}
              <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                {t("ui.kundali.source_naadisutrasource", { naadiSutraSource: reference.naadiSutraSource })}
              </Text>
            </Collapsible>

            <Collapsible title={t("ui.kundali.lal_kitab")} right={digits(lalKitabEntries.length)}>
              {lalKitabEntries.length > 0 ? (
                <View className="gap-3">
                  {lalKitabEntries.map(({ key, entry }) => {
                    const tip = reference.lalKitabSafetyTips[key];
                    return (
                      <View key={key}>
                        <Text className={kundaliDetailClasses.prose.heading} style={small}>
                          {GRAHA_ICON[key as GrahaKey] ?? "🪐"} {grahaName(key, pick)} — {t("ui.kundali.house_house", { house: digits(house.house) })}
                        </Text>
                        <Text className={kundaliDetailClasses.prose.bodyMt05} style={small}>{pick(entry.ne, entry.en)}</Text>
                        {tip && (
                          <Text className={kundaliDetailClasses.prose.bodyMutedMt1} style={small}>
                            {t("ui.kundali.safe_practice")} {pick(tip.ne, tip.en)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>
                  {t("ui.kundali.this_house_has_no_occupying_graha", { pick: joinNames(lalKitabFixedLord, pick) })}
                </Text>
              )}
              {lalKitabYutiMatch && (
                <View className={kundaliDetailClasses.prose.quoteTop}>
                  <Text className={kundaliDetailClasses.prose.heading} style={small}>
                    {t("ui.kundali.graha_yuti")} {joinNames(lalKitabYutiMatch.grahas, pick)}
                  </Text>
                  <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>
                    {pick(lalKitabYutiMatch.textNe, lalKitabYutiMatch.textEn)}
                  </Text>
                </View>
              )}
              <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                {t("ui.kundali.source_lal_kitab_parts_2_11")}
              </Text>
              <View className="mt-2">
                <Collapsible title={t("ui.kundali.what_is_lal_kitab_s_sustha")}>
                  <View className="gap-1.5">
                    {reference.lalKitabSusthaDustha.map((rule, i) => (
                      <Text key={i} className={kundaliDetailClasses.prose.body} style={small}>
                        {pick(rule.ne, rule.en)}
                      </Text>
                    ))}
                  </View>
                  <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>
                    {t("ui.kundali.source_lalkitabrevisionsource", { lalKitabRevisionSource: reference.lalKitabRevisionSource })}
                  </Text>
                </Collapsible>
              </View>
            </Collapsible>
          </Block>
        )}
      </ScrollView>

      <View className={kundaliDetailClasses.bhavaDialog.footer}>
        <Button label={t("ui.common.close")} variant="outline" onPress={onClose} />
      </View>
    </>
  );
}
