import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Switch, View } from "react-native";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import {
  getChosenCalendars,
  importPhoneCalendars,
  listPhoneCalendars,
  phoneCalendarPermission,
  phoneCalendarsAvailable,
  setChosenCalendars,
  type PhoneCalendar,
} from "@/lib/events/device-calendars";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Phone calendars (Google, iCloud, Exchange — whatever this phone syncs): allow access, choose
 * which to bring in, import now. The chosen ones are kept in step on every background sync.
 */
export function PhoneCalendarsCard({ onImported }: { onImported?: () => void }) {
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [denied, setDenied] = useState(false);
  const [calendars, setCalendars] = useState<PhoneCalendar[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const load = useCallback(async () => {
    setCalendars(await listPhoneCalendars());
    setChosen(await getChosenCalendars());
  }, []);

  useEffect(() => {
    if (!phoneCalendarsAvailable()) return;
    void phoneCalendarPermission(false).then((ok) => {
      setAllowed(ok);
      if (ok) void load();
    });
  }, [load]);

  // Web, or a build made before the calendar module was added.
  if (!phoneCalendarsAvailable()) return null;

  const allow = async () => {
    haptics.tick();
    const ok = await phoneCalendarPermission(true);
    setAllowed(ok);
    setDenied(!ok);
    if (ok) await load();
  };

  const toggle = async (id: string, on: boolean) => {
    const next = on ? [...chosen, id] : chosen.filter((c) => c !== id);
    setChosen(next);
    await setChosenCalendars(next);
  };

  const importNow = async () => {
    haptics.tick();
    setBusy(true);
    try {
      setResult(await importPhoneCalendars(chosen));
      onImported?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3 rounded-3xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        <Ionicons name="calendar-outline" size={20} color={colors.secondary} />
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(16)}>{t("events.phone_calendars")}</Text>
      </View>
      <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{t("events.phone_calendars_body")}</Text>

      {allowed === null ? (
        <ActivityIndicator color={colors.secondary} />
      ) : !allowed ? (
        <>
          <Pressable onPress={() => void allow()} accessibilityRole="button" className="self-start rounded-full bg-secondary px-4 py-2 active:opacity-70">
            <Text className="text-body font-semibold text-white" style={nepaliTextStyle(15)}>{t("events.phone_allow")}</Text>
          </Pressable>
          {denied ? (
            <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="link">
              <Text className="text-caption text-destructive underline" style={nepaliTextStyle(13)}>{t("events.phone_denied")}</Text>
            </Pressable>
          ) : null}
        </>
      ) : calendars.length === 0 ? (
        <Text className="text-caption text-muted-foreground">{t("events.phone_none")}</Text>
      ) : (
        <>
          {calendars.map((c) => (
            <View key={c.id} className="min-h-11 flex-row items-center gap-3">
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color ?? colors.mutedForeground }} />
              <View className="min-w-0 flex-1">
                <Text className="text-body text-foreground" numberOfLines={1}>{c.title}</Text>
                {c.account ? <Text className="text-caption text-muted-foreground" numberOfLines={1}>{c.account}</Text> : null}
              </View>
              <Switch value={chosen.includes(c.id)} onValueChange={(on) => void toggle(c.id, on)} trackColor={{ true: colors.secondary }} />
            </View>
          ))}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => void importNow()}
              disabled={busy || chosen.length === 0}
              accessibilityRole="button"
              className="rounded-full bg-secondary px-4 py-2 active:opacity-70 disabled:opacity-40"
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-body font-semibold text-white" style={nepaliTextStyle(15)}>{t("events.phone_import")}</Text>
              )}
            </Pressable>
            {result != null ? (
              <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
                {t("events.phone_imported", { count: digits(result) })}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}
