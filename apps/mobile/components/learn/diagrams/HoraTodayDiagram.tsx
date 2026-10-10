import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTodayHora } from "@/lib/learn/hora-live";
import { cn } from "@vedic-patro/domain/utils";

const PLANET_COLOR: Record<string, string> = {
  Sun: "#f7a41d",
  Moon: "#cbd5e1",
  Mars: "#ef4444",
  Mercury: "#22c55e",
  Jupiter: "#eab308",
  Venus: "#38bdf8",
  Saturn: "#a855f7",
};

/**
 * Today's live planetary-hour (hora) reading — native equivalent of web's
 * `HoraRing`, wired to mobile's own panchang data via `useTodayHora`. A
 * simplified list-based reading rather than a pixel port of web's SVG wheel:
 * same live data, a native-idiomatic layout.
 */
export function HoraTodayDiagram() {
  const { pick, lang } = useLocale();
  const { slots, currentIndex, loading } = useTodayHora();

  if (loading || !slots || slots.length === 0) {
    return (
      <View className="min-h-[140px] items-center justify-center rounded-2xl border border-border bg-card">
        <Text className="text-body text-muted-foreground">{pick("लोड हुँदैछ…", "Loading…")}</Text>
      </View>
    );
  }

  const current = currentIndex >= 0 ? slots[currentIndex] : undefined;

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      {current ? (
        <View className="flex-row items-center gap-3">
          <View
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: PLANET_COLOR[current.planet] ?? "#94a3b8" }}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {pick("अहिलेको होरा", "Current hora")}
            </Text>
            <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
              {pick(current.planet_ne, current.planet_en)}
            </Text>
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
              {current.start_local_time_short} – {current.end_local_time_short} ·{" "}
              {current.tone === "good" ? pick("शुभ", "Auspicious") : pick("अशुभ", "Inauspicious")}
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-1.5">
          {slots.map((slot, i) => {
            const active = i === currentIndex;
            return (
              <View
                key={i}
                className={cn(
                  "min-w-[64px] items-center gap-0.5 rounded-lg border px-2 py-1.5",
                  active ? "border-primary bg-primary/15" : "border-border bg-background/40",
                )}
              >
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PLANET_COLOR[slot.planet] ?? "#94a3b8" }}
                />
                <Text
                  className={cn("text-caption font-semibold", active ? "text-primary" : "text-foreground")}
                  numberOfLines={1}
                >
                  {lang === "en" ? slot.planet_en : slot.planet_ne}
                </Text>
                <Text className="text-caption font-num text-muted-foreground">
                  {slot.start_local_time_short}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
