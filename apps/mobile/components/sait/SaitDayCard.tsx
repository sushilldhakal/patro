import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { SuitabilityBadge } from "@/components/sait/SaitSuitability";
import { Text } from "@/components/ui/Text";
import type { SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { BS_MONTH_NAMES } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/**
 * One qualifying muhūrta day: the representative clean window plus the
 * panchāṅga that made the day survive the rules. When a profile is selected the
 * card also carries the native verdict and the reason behind it.
 */
const SHUDDHI_PLANET_TO_GRAHA: Record<string, string> = { guru: "jupiter", shukra: "venus" };

export function SaitDayCard({
  d,
  width,
  suitability,
  personalize,
}: {
  d: SaitDetailDay;
  width: string;
  suitability?: SaitSuitability;
  personalize?: SaitPersonalizeDay;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width: screenWidth } = useBreakpoint();

  const shuddhi = personalize?.shuddhi ?? null;
  const kumbha = personalize?.kumbha ?? null;
  const annaMonth = personalize?.anna_month ?? null;

  const overnight = d.window_end < d.window_start;
  const monthLabel = pick(d.bs_month_name_ne, BS_MONTH_NAMES[d.bs_month - 1] ?? d.bs_month_name_ne);
  const paksha = pick(
    d.paksha_ne ?? "",
    d.paksha === "shukla" ? "Shukla" : d.paksha === "krishna" ? "Krishna" : (d.paksha_ne ?? ""),
  );

  const rows: { label: string; value: string }[] = [
    { label: t("tithi"), value: `${paksha} ${pick(d.tithi_ne, d.tithi_en)}`.trim() },
    { label: t("nakshatra"), value: pick(d.nakshatra_ne, d.nakshatra_en) },
    { label: t("kundali.yoga"), value: pick(d.yoga_ne ?? "—", d.yoga_en ?? "—") },
    { label: t("kundali.karana"), value: pick(d.karana_ne ?? "—", d.karana_en ?? "—") },
    {
      label: t("kundali.report.meta_lagna"),
      value:
        formatRashiDisplay(d.lagna_ne, d.lagna_en, lang) ??
        pick(d.lagna_ne ?? "—", d.lagna_en ?? "—"),
    },
    {
      label: t("learn.diagrams.hierarchy_step_lunar_month"),
      value: pick(d.lunar_month_ne ?? "—", d.lunar_month_en ?? "—"),
    },
  ];

  return (
    <View
      style={{ width: width as never }}
      className={cn(saitClasses.card, suitability ? saitClasses.suitability[suitability].frame : null)}
    >
      {suitability ? (
        <View className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </View>
      ) : null}

      <View className={saitClasses.cardHead}>
        <View className={saitClasses.dateBox}>
          <Text className={saitClasses.dateMonth} style={nepaliTextStyle()}>
            {monthLabel}
          </Text>
          <Text className={saitClasses.dateDay} style={nepaliTextStyle()}>
            {digits(d.bs_day)}
          </Text>
        </View>

        <View className={saitClasses.headBody}>
          <View className={saitClasses.titleRow}>
            <Text className={saitClasses.weekday} style={nepaliTextStyle()}>
              {pick(d.weekday_ne, d.weekday_en)}
            </Text>
            <Text className={saitClasses.gregorian}>{d.gregorian}</Text>
          </View>

          <View className={cn(saitClasses.windowChip, "self-start")}>
            <Ionicons name="time-outline" size={14} color={colors.secondary} style={{ opacity: 0.8 }} />
            <Text className={cn(saitClasses.windowText, saitClasses.windowTime)} style={nepaliTextStyle()}>
              {digits(d.window_start)} – {digits(d.window_end)}
              {overnight ? ` (${t("sait.1")})` : ""}
            </Text>
            {screenWidth >= 640 ? (
              <Text className={saitClasses.windowNote} style={nepaliTextStyle()}>
                {t("sait.lagna_window")}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View className={cn("flex-row flex-wrap", saitClasses.facts)}>
        {rows.map((r) => (
          <View key={r.label} style={{ width: screenWidth >= 640 ? "33.333%" : "50%" }} className={cn(saitClasses.factItem, "pb-2 pr-4")}>
            <Text className={saitClasses.factLabel} style={nepaliTextStyle()}>
              {r.label}
            </Text>
            <Text
              numberOfLines={1}
              className={saitClasses.factValue}
              style={nepaliTextStyle()}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      {shuddhi && shuddhi.planets.length > 0 ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRow}>
            <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
              {t("sait.graha_uddhi")}
            </Text>
            {shuddhi.planets.map((p) => {
              const name = GRAHA_NAME[(SHUDDHI_PLANET_TO_GRAHA[p.planet] ?? p.planet) as GrahaKey];
              return (
                <View
                  key={p.planet}
                  className={cn(saitClasses.chip, saitClasses.chipGap, saitClasses.toneChip[p.tone])}
                >
                  <Text
                    style={nepaliTextStyle()}
                    className={cn(saitClasses.chipText, saitClasses.toneChipText[p.tone])}
                  >
                    {pick(name?.ne ?? p.planet, name?.en ?? p.planet)}
                  </Text>
                  <Text className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[p.tone])}>
                    {digits(p.house)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text
            style={nepaliTextStyle()}
            className={cn(saitClasses.summary, saitClasses.toneText[shuddhi.tone])}
          >
            {t(`sait.x.shuddhi_${shuddhi.tone}`)}
            <Text className={saitClasses.summaryNote}>
              {" "}
              {t("ui.sait.house_from_janma_r_i")}
            </Text>
          </Text>
        </View>
      ) : null}

      {kumbha ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRowLoose}>
            <View className={saitClasses.blockIconLabel}>
              <Ionicons name="compass-outline" size={13} color={colors.mutedForeground} />
              <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
                {t("sections.kumbha_chakra")}
              </Text>
            </View>
            <View className={cn(saitClasses.chip, saitClasses.toneChip[kumbha.tone])}>
              <Text
                style={nepaliTextStyle()}
                className={cn(saitClasses.chipText, saitClasses.toneChipText[kumbha.tone])}
              >
                {pick(kumbha.zone_ne, kumbha.zone_en)}
              </Text>
            </View>
          </View>
          <Text
            style={nepaliTextStyle()}
            className={cn(saitClasses.summary, saitClasses.toneText[kumbha.tone])}
          >
            {pick(kumbha.effect_ne, kumbha.effect_en)}
            <Text className={saitClasses.summaryNote}>
              {" "}
              {t("ui.sait.counted_from_the_sun")}
            </Text>
          </Text>
        </View>
      ) : null}

      {annaMonth ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRowLoose}>
            <View className={saitClasses.blockIconLabel}>
              <Ionicons name="happy-outline" size={13} color={colors.mutedForeground} />
              <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
                {t("ui.sait.annapr_ana_age_month")}
              </Text>
            </View>
            <View className={cn(saitClasses.chip, saitClasses.toneChip[annaMonth.tone])}>
              <Text
                className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[annaMonth.tone])}
              >
                {pick(
                  `${digits(annaMonth.ordinal_month)} औँ महिना`,
                  `month ${annaMonth.ordinal_month}`,
                )}
              </Text>
            </View>
          </View>
          <Text
            style={nepaliTextStyle()}
            className={cn(saitClasses.summary, saitClasses.toneText[annaMonth.tone])}
          >
            {annaMonth.matches
              ? t("ui.sait.the_child_s_right_age_month")
              : t("ui.sait.not_this_child_s_age_month")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default SaitDayCard;
