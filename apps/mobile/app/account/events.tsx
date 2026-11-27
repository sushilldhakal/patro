import { useState } from "react";
import { Linking, Platform, Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { validTimeZone } from "@vedic-patro/domain/calendar/zoned-time";
import { useCalendarFeed } from "@vedic-patro/features/events";
import { CalendarFeedCard } from "@vedic-patro/ui/kit/events";
import { InnerPage, ListGroup, ListRow } from "@/components/account/AccountList";
import { EventEditSheet } from "@/components/events/EventEditSheet";
import { EventForm } from "@/components/events/EventForm";
import { PhoneCalendarsCard } from "@/components/events/PhoneCalendarsCard";
import { RemindersPanel } from "@/components/reminders/RemindersPanel";
import { Ionicons } from "@/components/icons/Ionicons";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteEvent, listEvents, type CalendarEvent } from "@/lib/events/api";
import { useLocale } from "@/lib/i18n";
import { notifyRemindersChanged } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { useThemeColors } from "@/lib/theme-context";

type Tab = "event" | "task" | "appointment";
const TABS: Tab[] = ["event", "task", "appointment"];

/** Old records have no kind (events); reminders made before the tabs read as tasks. */
const kindOf = (e: CalendarEvent): Tab => (e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event");

/**
 * Events, notifications and reminders in one page: three tabs (events, tasks, appointments), each with
 * its coming items and a "+"; Tasks also holds the शुभ/अशुभ window, rashifal and daily-briefing alerts.
 * At the foot, both ways of calendar sync: the phone's Google / iCloud calendars in and out, and the
 * account's private feed for Google / Apple Calendar. Guests' items stay on the phone (lib/events/api).
 */
export default function EventsScreen() {
  const { t, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; window?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "event");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const feed = useCalendarFeed({ enabled: isAuthenticated });
  const events = useQuery({
    queryKey: ["events", "upcoming", isAuthenticated],
    queryFn: async () => (await listEvents(new Date().toISOString())).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  });
  const remove = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void afterRemindersChanged(l, true);
    },
  });
  const items = (events.data ?? []).filter((e) => kindOf(e) === tab);
  const when = (e: CalendarEvent) =>
    new Date(e.starts_at).toLocaleString(
      l === "en" ? "en-US" : "ne-NP",
      e.all_day ? { dateStyle: "medium", timeZone: validTimeZone(e.timezone) } : { dateStyle: "medium", timeStyle: "short", timeZone: validTimeZone(e.timezone) },
    );

  return (
    <InnerPage title={t("ui.account.events_and_sync")} subtitle={t("ui.account.events_body")}>
      {/* The three kinds, as the form's own tabs. */}
      <View className="flex-row gap-1 rounded-xl bg-muted p-1">
        {TABS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
            className={tab === k ? "flex-1 items-center rounded-lg bg-card py-2" : "flex-1 items-center rounded-lg py-2"}
          >
            <Text className={tab === k ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"} style={nepaliTextStyle(14)}>
              {t(`events.kind_${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ListGroup>
        <ListRow icon="calendar-add" title={t(`events.new_${tab}`)} subtitle={t(`events.kind_${tab}_hint`)} onPress={() => setAdding(true)} />
      </ListGroup>

      <ListGroup title={t("events.upcoming")}>
        {items.length === 0 ? (
          <View className="px-4 py-4">
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{t("events.upcoming_none")}</Text>
          </View>
        ) : (
          items.map((e) => (
            <SwipeableRow key={e.id} actionLabel={t("events.delete")} onAction={() => remove.mutate(e.id)}>
              <Pressable onPress={() => setEditing(e)} accessibilityRole="button" className="min-h-14 flex-row items-center gap-3 bg-card px-4 py-2 active:opacity-70">
                <View className="min-w-0 flex-1">
                  <Text className="text-body text-foreground" numberOfLines={1} style={nepaliTextStyle(16)}>{e.title}</Text>
                  <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{when(e)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </Pressable>
            </SwipeableRow>
          ))
        )}
      </ListGroup>

      {tab === "task" ? (
        <>
          <RemindersPanel window={params.window} />
          <ListGroup>
            <ListRow icon="reminders" title={t("ui.settings.notifications_reminders")} onPress={() => router.push("/account/notifications" as never)} />
          </ListGroup>
        </>
      ) : null}

      {/* Sync, both ways: the phone's Google / iCloud calendars in and the app's items out… */}
      <PhoneCalendarsCard onImported={() => void queryClient.invalidateQueries({ queryKey: ["events"] })} />
      {/* …and this account's items in Google / Apple Calendar by a private link. */}
      {isAuthenticated ? (
        <CalendarFeedCard
          feed={feed}
          showApple={Platform.OS === "ios"}
          copyMode="share"
          onOpen={(url) => void Linking.openURL(url).catch(() => {})}
          onCopy={(url) => void Share.share({ message: url, url }).catch(() => {})}
        />
      ) : null}

      <BottomSheetModal variant="page" visible={adding} onClose={() => setAdding(false)} maxHeight="92%">
        {adding ? (
          <EventForm
            initialKind={tab}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              void queryClient.invalidateQueries({ queryKey: ["events"] });
              void afterRemindersChanged(l, true);
              notifyRemindersChanged();
            }}
          />
        ) : null}
      </BottomSheetModal>
      <EventEditSheet editor={editing ? { event: editing } : null} onClose={() => setEditing(null)} />
    </InnerPage>
  );
}
