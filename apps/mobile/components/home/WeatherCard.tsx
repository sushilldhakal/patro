import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { LocationParams } from "@vedic-patro/api-client";
import { useWeatherCard, type WeatherFact } from "@vedic-patro/features/weather";
import { weatherSkyAt } from "@vedic-patro/design-tokens";
import { FactIcon, WeatherGlyph } from "@vedic-patro/ui/kit/weather";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

/** The bottom row's facts, each under a one-word label so nothing is cut short. */
const FACTS = [
  { key: "humidity", label: "weather_card.humidity" },
  { key: "rain", label: "weather_card.rain_today" },
  { key: "uv", label: "weather_card.uv" },
  { key: "moon", label: "weather_card.moon" },
] as const;

/**
 * The day's weather on the home page, under the news, on the weather page's sky (its colour
 * follows the sun). Short text only: place and feels-like with today's high and low; the icon,
 * temperature, condition and two tags (rain chance, air quality); the next six hours; then
 * humidity, rain, UV and the moon. Tapping it opens the weather page.
 */
export function WeatherCard({ location, label }: { location?: LocationParams; label?: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const card = useWeatherCard(location, label);
  if (!card) return null;
  const { now, today, hours, place } = card;
  const [top, bottom] = weatherSkyAt(now.daylight);
  const pool = [...now.current, ...now.sun];
  const facts = FACTS.map((f) => ({ fact: pool.find((x) => x.key === f.key), label: t(f.label) })).filter(
    (f): f is { fact: WeatherFact; label: string } => !!f.fact,
  );
  // Short tags beside the temperature: "०% वर्षा", "AQI १४०".
  const rainPct = today?.rainChance || hours[0]?.rainChance || "";
  const aqi = /[0-9०-९]+/.exec(now.airLine)?.[0] ?? "";
  const tags = [rainPct ? t("weather_card.rain", { pct: rainPct }) : "", aqi ? t("weather_card.aqi", { n: aqi }) : ""].filter(Boolean);
  const ne = nepaliTextStyle();

  return (
    <Pressable
      onPress={() => router.push("/weather")}
      accessibilityRole="button"
      accessibilityLabel={`${place}, ${now.temperature}, ${now.glyph.label}`}
      className="overflow-hidden rounded-3xl active:opacity-90"
    >
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View className="gap-3 px-4 py-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="shrink text-base text-white" style={ne} numberOfLines={1}>
            <Text className="text-base font-bold text-white" style={ne}>
              {place}
            </Text>
            {"  ·  "}
            {now.feelsLike}
          </Text>
          {today ? (
            <Text className="text-base font-semibold text-white">
              ↑{today.high} ↓{today.low}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-3">
          <WeatherGlyph glyph={now.glyph} size={52} onSky animated />
          <Text className="text-5xl font-light text-white" style={ne}>
            {now.temperature}
          </Text>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-base font-semibold text-white" style={ne} numberOfLines={1}>
              {now.glyph.label}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {tags.map((tag) => (
                <View key={tag} className="rounded-full bg-white/20 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-white" style={ne} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="flex-row rounded-2xl bg-white/15 py-1.5">
          {hours.map((h) => (
            <View key={h.key} className="flex-1 items-center">
              <Text className="text-xs font-medium text-white" numberOfLines={1}>
                {h.time}
              </Text>
              <WeatherGlyph glyph={h.glyph} size={26} onSky />
              <Text className="text-sm font-bold text-white">{h.temperature}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row">
          {facts.map(({ fact, label: name }) => (
            <View key={fact.key} className="flex-1 items-center gap-0.5">
              {fact.icon ? <FactIcon icon={fact.icon} size={22} /> : null}
              <Text className="text-sm font-bold text-white" style={ne} numberOfLines={1}>
                {fact.value}
              </Text>
              <Text className="text-xs text-white opacity-90" style={ne} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
