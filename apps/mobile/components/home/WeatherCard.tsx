import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { ReduceMotion, SlideInLeft, SlideInRight } from "react-native-reanimated";
import type { LocationParams } from "@vedic-patro/api-client";
import { PLACES_STORAGE_KEY, placeId, useWeatherCard, type WeatherFact, type WeatherPlace } from "@vedic-patro/features/weather";
import { haptics } from "@vedic-patro/ui/motion";
import { placesStorage } from "@/lib/places-sync";
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
 *
 * It opens on the header's place. With saved places, a swipe left or right shows the next or the
 * previous one (sliding in from that side); the header's place never changes, and a new header
 * place brings the card back to it.
 */
export function WeatherCard({ location, label }: { location?: LocationParams; label?: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const saved = useSavedPlaces();
  const headerId = location ? placeId(location) : "header";
  const places: WeatherPlace[] = [
    { id: headerId, label: label ?? "", params: location ?? {} },
    ...saved.filter((p) => p.id !== headerId),
  ];
  const [at, setAt] = useState(0);
  const direction = useRef<1 | -1 | 0>(0);
  useEffect(() => {
    // A new header place: back to it, without a slide.
    direction.current = 0;
    setAt(0);
  }, [headerId]);
  const index = at < places.length ? at : 0;
  const place = places[index]!;
  const fresh = useWeatherCard(index === 0 ? location : place.params, index === 0 ? label : place.label);
  // Until the next place's weather arrives the card keeps the last one; then it slides in.
  const last = useRef<{ id: string; card: NonNullable<typeof fresh> } | null>(null);
  if (fresh) last.current = { id: place.id, card: fresh };
  const step = (by: 1 | -1) => {
    if (places.length < 2) return;
    direction.current = by;
    haptics.tick();
    setAt((index + by + places.length) % places.length);
  };
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .enabled(places.length > 1)
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -50 || e.velocityX < -500) step(1);
      else if (e.translationX > 50 || e.velocityX > 500) step(-1);
    });

  const shown = last.current;
  if (!shown) return null;
  const card = shown.card;
  const entering =
    direction.current === 0
      ? undefined
      : (direction.current > 0 ? SlideInRight : SlideInLeft).duration(260).reduceMotion(ReduceMotion.System);
  const { now, today, hours, place: placeName } = card;
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
    <GestureDetector gesture={swipe}>
    <Pressable
      onPress={() => router.push("/weather")}
      accessibilityRole="button"
      accessibilityLabel={`${placeName}, ${now.temperature}, ${now.glyph.label}`}
      accessibilityHint={places.length > 1 ? t("weather_card.swipe_hint") : undefined}
      className="overflow-hidden rounded-3xl active:opacity-90"
    >
      <Animated.View key={shown.id} entering={entering}>
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View className="gap-3 px-4 py-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="shrink text-base text-white" style={ne} numberOfLines={1}>
            <Text className="text-base font-bold text-white" style={ne}>
              {placeName}
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

        {/* One dot a place; the filled one is on screen. */}
        {places.length > 1 ? (
          <View className="flex-row justify-center gap-1.5">
            {places.map((p, i) => (
              <View key={p.id} className={i === index ? "h-1.5 w-4 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/50"} />
            ))}
          </View>
        ) : null}
      </View>
      </Animated.View>
    </Pressable>
    </GestureDetector>
  );
}

/** The saved places (weather page and place picker), read again each time home comes back into view. */
function useSavedPlaces(): WeatherPlace[] {
  const [list, setList] = useState<WeatherPlace[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void Promise.resolve(placesStorage.read(PLACES_STORAGE_KEY)).then((raw) => {
        if (!live) return;
        try {
          const v = raw ? (JSON.parse(raw) as { places?: unknown }) : null;
          const places = Array.isArray(v?.places) ? (v.places as WeatherPlace[]) : [];
          setList(places.filter((p) => p && typeof p.id === "string" && p.params));
        } catch {
          setList([]);
        }
      });
      return () => {
        live = false;
      };
    }, []),
  );
  return list;
}
