import { View } from "react-native";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import type { DayEventsProps } from "../contract";

/** The signed-in user's events, tasks and appointments on one day, above the day's panchanga. */
export function DayEvents({ events }: DayEventsProps) {
  const { t, lang } = useLocale();
  if (events.length === 0) return null;
  return (
    <View className="mb-4 gap-1 rounded-3xl border border-border bg-card px-4 py-3">
      <Text className="text-body font-semibold text-foreground">{t("events.on_this_day")}</Text>
      {events.map((e) => {
        const kind = e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";
        const time = e.all_day
          ? t("events.all_day_short")
          : new Date(e.starts_at).toLocaleTimeString(lang === "en" ? "en-US" : "ne-NP", { hour: "numeric", minute: "2-digit", timeZone: e.timezone });
        return (
          <View key={e.id} className="min-h-11 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-body text-foreground" numberOfLines={1}>{e.title}</Text>
            <Text className="text-caption text-muted-foreground">{t(`events.kind_${kind}`)} · {time}</Text>
          </View>
        );
      })}
    </View>
  );
}
