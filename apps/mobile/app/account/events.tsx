import { Alert, Linking, Platform, Pressable, Share, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEvent, listEvents } from "@vedic-patro/api-client";
import { useCalendarFeed } from "@vedic-patro/features/events";
import { CalendarFeedCard } from "@vedic-patro/ui/kit/events";
import { InnerPage, ListGroup, ListRow } from "@/components/account/AccountList";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { requestAddReminder } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { Ionicons } from "@/components/icons/Ionicons";

/** Profile → Events and calendar sync: create one, the coming ones (with delete), and the Google / Apple link. */
export default function AccountEventsScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const feed = useCalendarFeed({ enabled: isAuthenticated });
  const events = useQuery({
    queryKey: ["events", "upcoming"],
    enabled: isAuthenticated,
    queryFn: async () => (await listEvents(new Date().toISOString())).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  });
  const remove = useMutation({ mutationFn: deleteEvent, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }) });
  const items = (events.data ?? []).slice(0, 8);

  return (
    <InnerPage title={t("ui.account.events_and_sync")}>
      <ListGroup>
        <ListRow icon="calendar-add" title={t("events.create")} onPress={requestAddReminder} />
      </ListGroup>

      <ListGroup title={t("events.upcoming")}>
        {items.length === 0 ? (
          <View className="px-4 py-4">
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{t("events.upcoming_none")}</Text>
          </View>
        ) : (
          items.map((e) => (
            <View key={e.id} className="min-h-14 flex-row items-center gap-3 px-4 py-2">
              <View className="min-w-0 flex-1">
                <Text className="text-body text-foreground" numberOfLines={1} style={nepaliTextStyle(16)}>{e.title}</Text>
                <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
                  {new Date(e.starts_at).toLocaleString(lang === "en" ? "en-US" : "ne-NP", e.all_day ? { dateStyle: "medium", timeZone: e.timezone } : { dateStyle: "medium", timeStyle: "short", timeZone: e.timezone })}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert(e.title, undefined, [
                    { text: t("events.cancel"), style: "cancel" },
                    { text: t("events.delete"), style: "destructive", onPress: () => remove.mutate(e.id) },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={t("events.delete")}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))
        )}
      </ListGroup>

      <CalendarFeedCard
        feed={feed}
        showApple={Platform.OS === "ios"}
        copyMode="share"
        onOpen={(url) => void Linking.openURL(url).catch(() => {})}
        onCopy={(url) => void Share.share({ message: url, url }).catch(() => {})}
      />
    </InnerPage>
  );
}
