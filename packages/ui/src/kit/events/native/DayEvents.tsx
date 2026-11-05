import { View } from "react-native";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import type { DayEventsProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";

const DOT = { event: "bg-primary", task: "bg-success", appointment: "bg-warning" } as const;

/** The signed-in user's events, tasks and appointments on one day, with their time, place and notes. */
export function DayEvents({ events }: DayEventsProps) {
  const { t, lang } = useLocale();
  if (events.length === 0) return null;
  return (
    <View className="mb-4 gap-2">
      <Text className="text-body font-semibold text-foreground">{t("events.on_this_day")}</Text>
      {events.map((e) => {
        const kind = eventKindOf(e);
        return (
          <View key={e.id} className="flex-row gap-3 rounded-2xl bg-muted p-3">
            <View className={`mt-1.5 h-2.5 w-2.5 rounded-full ${DOT[kind]}`} />
            <View className="min-w-0 flex-1">
              <Text className="text-body font-semibold text-foreground" numberOfLines={1}>{e.title}</Text>
              <Text className="text-caption text-muted-foreground">{t(`events.kind_${kind}`)} · {eventTimeText(e, lang, t("events.all_day_short"))}</Text>
              {e.location ? <Text className="text-caption text-muted-foreground" numberOfLines={1}>{e.location}</Text> : null}
              {e.notes ? <Text className="text-caption text-foreground" numberOfLines={2}>{e.notes}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
