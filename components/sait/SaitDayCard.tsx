import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { SuitabilityBadge } from "@/components/sait/SaitSuitability";
import { Text } from "@/components/ui/Text";
import type { SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiDisplay } from "@/lib/rashi-i18n";
import {
  SHUDDHI_PLANET_LABEL,
  SHUDDHI_SUMMARY,
  SHUDDHI_TONE_STYLE,
  SUITABILITY_STYLE,
} from "@/lib/sait-suitability";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/**
 * One qualifying muhūrta day: the representative clean window plus the
 * panchāṅga that made the day survive the rules. When a profile is selected the
 * card also carries the native verdict and the reason behind it.
 */
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
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();

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
    { label: pick("तिथि", "Tithi"), value: `${paksha} ${pick(d.tithi_ne, d.tithi_en)}`.trim() },
    { label: pick("नक्षत्र", "Nakshatra"), value: pick(d.nakshatra_ne, d.nakshatra_en) },
    { label: pick("योग", "Yoga"), value: pick(d.yoga_ne ?? "—", d.yoga_en ?? "—") },
    { label: pick("करण", "Karana"), value: pick(d.karana_ne ?? "—", d.karana_en ?? "—") },
    {
      label: pick("लग्न", "Lagna"),
      value:
        formatRashiDisplay(d.lagna_ne, d.lagna_en, lang) ??
        pick(d.lagna_ne ?? "—", d.lagna_en ?? "—"),
    },
    {
      label: pick("चान्द्र मास", "Lunar month"),
      value: pick(d.lunar_month_ne ?? "—", d.lunar_month_en ?? "—"),
    },
  ];

  const ring = suitability ? SUITABILITY_STYLE[suitability].ring : colors.border;

  return (
    <View
      style={{ width: width as never, borderColor: ring, borderWidth: suitability ? 2 : 1 }}
      className="rounded-xl bg-card p-4"
    >
      {suitability ? (
        <View className="flex-row justify-end pb-1.5">
          <SuitabilityBadge suitability={suitability} />
        </View>
      ) : null}

      <View className="flex-row items-stretch gap-3 pb-3">
        <View
          style={{ backgroundColor: colors.surfaceInset, minWidth: 68 }}
          className="items-center justify-center rounded-lg px-2 py-2.5"
        >
          <Text
            style={{ color: colors.secondary, ...nepaliTextStyle(10) }}
            className="text-[12px] font-semibold uppercase tracking-wider"
          >
            {monthLabel}
          </Text>
          <Text className="font-num text-3xl font-bold text-foreground">{digits(d.bs_day)}</Text>
        </View>

        <View className="min-w-0 flex-1 justify-center gap-1.5">
          <View className="flex-row flex-wrap items-baseline gap-x-2">
            <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
              {pick(d.weekday_ne, d.weekday_en)}
            </Text>
            <Text className="font-num text-xs text-muted-foreground">{d.gregorian}</Text>
          </View>

          <View
            style={{ backgroundColor: colorWithAlpha("#0b565a", 0.12) }}
            className="flex-row items-center gap-1.5 self-start rounded-md px-2 py-1"
          >
            <Ionicons name="time-outline" size={13} color={colors.secondary} />
            <Text style={{ color: colors.secondary }} className="font-num text-xs font-semibold">
              {digits(d.window_start)} – {digits(d.window_end)}
              {overnight ? pick(" (भोलि)", " (next day)") : ""}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap border-t border-border pt-3">
        {rows.map((r) => (
          <View key={r.label} style={{ width: "50%" }} className="gap-0.5 pb-2 pr-3">
            <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
              {r.label}
            </Text>
            <Text
              numberOfLines={1}
              className="text-sm font-semibold text-foreground"
              style={nepaliTextStyle(13)}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      {shuddhi && shuddhi.planets.length > 0 ? (
        <View className="mt-3 border-t border-border pt-2.5">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text
              className="text-xs font-semibold text-muted-foreground"
              style={nepaliTextStyle(11)}
            >
              {pick("ग्रह शुद्धि", "Graha Śuddhi")}
            </Text>
            {shuddhi.planets.map((p) => {
              const tone = SHUDDHI_TONE_STYLE[p.tone];
              const name = SHUDDHI_PLANET_LABEL[p.planet];
              return (
                <View
                  key={p.planet}
                  style={{ backgroundColor: tone.bg }}
                  className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
                >
                  <Text
                    style={{ color: tone.fg, ...nepaliTextStyle(11) }}
                    className="text-xs font-semibold"
                  >
                    {pick(name?.ne ?? p.planet, name?.en ?? p.planet)}
                  </Text>
                  <Text style={{ color: tone.fg }} className="font-num text-xs font-semibold">
                    {digits(p.house)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text
            style={{ color: SHUDDHI_TONE_STYLE[shuddhi.tone].fg, ...nepaliTextStyle(11) }}
            className="mt-1.5 text-xs font-semibold"
          >
            {pick(SHUDDHI_SUMMARY[shuddhi.tone].ne, SHUDDHI_SUMMARY[shuddhi.tone].en)}
            <Text className="font-normal text-muted-foreground">
              {" "}
              {pick("(जन्म राशिबाट भाव)", "(house from janma rāśi)")}
            </Text>
          </Text>
        </View>
      ) : null}

      {kumbha ? (
        <View className="mt-3 border-t border-border pt-2.5">
          <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="compass-outline" size={13} color={colors.mutedForeground} />
              <Text
                className="text-xs font-semibold text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {pick("कुम्भ चक्र", "Kumbha Chakra")}
              </Text>
            </View>
            <View
              style={{ backgroundColor: SHUDDHI_TONE_STYLE[kumbha.tone].bg }}
              className="rounded-md px-1.5 py-0.5"
            >
              <Text
                style={{ color: SHUDDHI_TONE_STYLE[kumbha.tone].fg, ...nepaliTextStyle(11) }}
                className="text-xs font-semibold"
              >
                {pick(kumbha.zone_ne, kumbha.zone_en)}
              </Text>
            </View>
          </View>
          <Text
            style={{ color: SHUDDHI_TONE_STYLE[kumbha.tone].fg, ...nepaliTextStyle(11) }}
            className="mt-1.5 text-xs font-semibold"
          >
            {pick(kumbha.effect_ne, kumbha.effect_en)}
            <Text className="font-normal text-muted-foreground">
              {" "}
              {pick("(सूर्यबाट गनिएको)", "(counted from the Sun)")}
            </Text>
          </Text>
        </View>
      ) : null}

      {annaMonth ? (
        <View className="mt-3 border-t border-border pt-2.5">
          <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="happy-outline" size={13} color={colors.mutedForeground} />
              <Text
                className="text-xs font-semibold text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {pick("अन्नप्राशन उमेर महिना", "Annaprāśana age month")}
              </Text>
            </View>
            <View
              style={{ backgroundColor: SHUDDHI_TONE_STYLE[annaMonth.tone].bg }}
              className="rounded-md px-1.5 py-0.5"
            >
              <Text
                style={{ color: SHUDDHI_TONE_STYLE[annaMonth.tone].fg }}
                className="font-num text-xs font-semibold"
              >
                {pick(
                  `${digits(annaMonth.ordinal_month)} औँ महिना`,
                  `month ${annaMonth.ordinal_month}`,
                )}
              </Text>
            </View>
          </View>
          <Text
            style={{ color: SHUDDHI_TONE_STYLE[annaMonth.tone].fg, ...nepaliTextStyle(11) }}
            className="mt-1.5 text-xs font-semibold"
          >
            {annaMonth.matches
              ? pick("बच्चाको सही उमेर महिना", "The child's right age month")
              : pick("यो बच्चाको उमेर महिना होइन", "Not this child's age month")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default SaitDayCard;
