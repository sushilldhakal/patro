import { useEffect, useMemo, useState } from "react";
import { Linking, Switch, View } from "react-native";
import { Chip } from "@/components/reminders/AddReminderForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import {
  ensureNotificationPermission,
  getNotificationPermission,
  type NotifPermission,
} from "@/lib/notifications/permissions";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { DEFAULT_RASHIFAL_SETTINGS, type BriefingSettings, type RashifalSettings } from "@/lib/notifications/types";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

/** The daily push cards, shared by the reminders page and the settings page. */
export const BRIEFING_TIMES = ["05:00", "06:00", "07:00", "08:00"] as const;

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className={msc.reminderSection} style={nepaliTextStyle(16)}>
      {children}
    </Text>
  );
}

/** Daily rashifal notification: personal when signed in, the chosen rashi's general rashifal for guests. */
export function RashifalNotificationCard({ signedIn, onChanged }: { signedIn: boolean; onChanged: () => void }) {
  const { t, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const [settings, setSettings] = useState<RashifalSettings>(DEFAULT_RASHIFAL_SETTINGS);
  const [permission, setPermission] = useState<NotifPermission>("undetermined");
  const [busy, setBusy] = useState(false);
  const rashis = useMemo(() => getRashiList(l), [l]);

  useEffect(() => {
    void Promise.all([notifStore.getRashifalSettings(), getNotificationPermission()]).then(([s, perm]) => {
      setSettings(s);
      setPermission(perm);
    });
  }, []);

  const save = async (next: RashifalSettings) => {
    setSettings(next);
    setBusy(true);
    try {
      await notifStore.setRashifalSettings(next);
      if (next.enabled) {
        const granted = await ensureNotificationPermission();
        setPermission(granted ? "granted" : await getNotificationPermission());
      }
      await syncNotifications({ lang: l, force: true });
    } catch {
      /* the schedule is rebuilt on the next foreground sync */
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const showOff = permission === "denied" && settings.enabled;

  return (
    <View>
      <SectionTitle>{t("ui.reminders.daily_rashifal_notification")}</SectionTitle>
      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
              {t("ui.reminders.today_s_rashifal_every_day_at")}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
              {signedIn
                ? t("ui.reminders.personal_rashifal_from_your_default_profile")
                : t("ui.reminders.pick_your_rashi_below")}
            </Text>
          </View>
          <Switch value={settings.enabled} disabled={busy} onValueChange={(on) => save({ ...settings, enabled: on })} />
        </View>

        {settings.enabled && !signedIn ? (
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label={t("muhurta_aside.moon_ref_chandrabal")}
              active={settings.guestSignId == null}
              onPress={() => save({ ...settings, guestSignId: null })}
            />
            {rashis.map((name, i) => (
              <Chip
                key={name}
                label={name}
                active={settings.guestSignId === i + 1}
                onPress={() => save({ ...settings, guestSignId: i + 1 })}
              />
            ))}
          </View>
        ) : null}

        {showOff ? (
          <Button label={t("ui.reminders.open_settings")} onPress={() => void Linking.openSettings()} />
        ) : null}
      </Card>
    </View>
  );
}

/** The morning do / don't briefing: its time, and which profiles get one. */
export function DailyBriefingCard({
  briefing,
  profiles,
  onChange,
}: {
  briefing: BriefingSettings;
  profiles: CachedProfile[];
  onChange: (next: BriefingSettings) => void;
}) {
  const { t } = useLocale();
  return (
    <View>
      <SectionTitle>{t("ui.reminders.daily_briefing")}</SectionTitle>
      <Card className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          {BRIEFING_TIMES.map((time) => (
            <Chip key={time} label={time} active={briefing.time === time} onPress={() => onChange({ ...briefing, time })} />
          ))}
        </View>
        {profiles.length === 0 ? (
          <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.reminders.profiles_appear_here_once_you_add")}
          </Text>
        ) : (
          profiles.map((p) => (
            <View key={p.id} className="flex-row items-center justify-between gap-3">
              <Text className="text-body min-w-0 flex-1 text-foreground" style={nepaliTextStyle(15)}>
                {p.full_name}
              </Text>
              <Switch
                value={briefing.enabled[p.id] !== false}
                onValueChange={(on) => onChange({ ...briefing, enabled: { ...briefing.enabled, [p.id]: on } })}
              />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
