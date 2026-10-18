import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { createReminder, listReminders } from "@/lib/notifications/api";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { LEAD_MINUTE_OPTIONS, WINDOW_OPTIONS, type WindowKind } from "@/lib/notifications/types";
import { cn } from "@vedic-patro/design-tokens/cn";
import { WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/bs-calendar";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

export const WEEKDAYS_NE = WEEKDAYS_SHORT_NE;
export const WEEKDAYS_EN = WEEKDAYS_SHORT;

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(msc.reminderChip, active ? "border-secondary bg-secondary" : "border-border bg-card")}
    >
      <Text
        className={cn(msc.reminderChipLabel, active ? "text-secondary-foreground" : "text-foreground")}
        style={nepaliTextStyle(13)}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type Props = {
  /** Resets the form to `initialKey` each time this turns true. */
  active: boolean;
  profiles: CachedProfile[];
  online: boolean;
  initialKey?: string;
  /** A line under the title, e.g. the window's time today. */
  subtitle?: string;
  onCreated: () => Promise<void>;
};

/** New शुभ / अशुभ window reminder: which window, how early, which days, which profile. */
export function AddReminderForm({ active, profiles, online, initialKey, subtitle, onCreated }: Props) {
  const { t, pick, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const [kind, setKind] = useState<WindowKind>("ashubh");
  const [windowKey, setWindowKey] = useState("rahu_kalam");
  const [lead, setLead] = useState<number>(10);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const opt = WINDOW_OPTIONS.find((o) => o.key === initialKey);
    if (active && opt) {
      setKind(opt.kind);
      setWindowKey(opt.key);
    }
  }, [active, initialKey]);

  const selectOptions = WINDOW_OPTIONS.map((o) => ({
    value: o.key,
    label: `${o.kind === "shubh" ? t("ui.reminders.shubh") : t("ui.reminders.ashubh")} · ${pick(o.ne, o.en)}`,
  }));

  const pickWindow = (key: string) => {
    const opt = WINDOW_OPTIONS.find((o) => o.key === key);
    if (!opt) return;
    setWindowKey(opt.key);
    setKind(opt.kind);
  };

  const save = async () => {
    if (!online) {
      Alert.alert(t("ui.reminders.connection_needed"), t("ui.reminders.creating_a_reminder_needs_a_connection"));
      return;
    }
    setSaving(true);
    try {
      await createReminder({
        profile_id: profileId,
        window_kind: kind,
        window_key: windowKey,
        lead_minutes: lead,
        weekdays,
        label: null,
        enabled: true,
      });
      const refreshed = await listReminders();
      await notifStore.setReminders(refreshed);
      await onCreated();
    } catch {
      Alert.alert(t("ui.reminders.could_not_create"), t("ui.reminders.please_try_again"));
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (d: number) =>
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  return (
    <View className="gap-4 p-4">
      <View className="gap-0.5">
        <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
          {t("ui.reminders.new_reminder")}
        </Text>
        {subtitle ? (
          <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View>
        <Text className="text-caption mb-1.5 text-muted-foreground">{t("ui.reminders.shubh_ashubh_window")}</Text>
        <NativeStringSelect
          value={windowKey}
          options={selectOptions}
          onChange={pickWindow}
          ariaLabel={t("ui.reminders.choose_a_window")}
          minWidth={240}
        />
      </View>

      <View>
        <Text className="text-caption mb-1.5 text-muted-foreground">{t("ui.reminders.remind_me")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {LEAD_MINUTE_OPTIONS.map((m) => (
            <Chip
              key={m}
              label={m === 0 ? t("ui.reminders.at_start_2") : t("ui.reminders.m_min", { m })}
              active={lead === m}
              onPress={() => setLead(m)}
            />
          ))}
        </View>
      </View>

      <View>
        <Text className="text-caption mb-1.5 text-muted-foreground">{t("ui.reminders.days_none_every_day")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {(l === "ne" ? WEEKDAYS_NE : WEEKDAYS_EN).map((label, d) => (
            <Chip key={label} label={label} active={weekdays.includes(d)} onPress={() => toggleDay(d)} />
          ))}
        </View>
      </View>

      {profiles.length > 0 ? (
        <View>
          <Text className="text-caption mb-1.5 text-muted-foreground">{t("ui.reminders.profile_optional")}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip label={t("ui.reminders.none")} active={profileId === null} onPress={() => setProfileId(null)} />
            {profiles.map((p) => (
              <Chip key={p.id} label={p.full_name} active={profileId === p.id} onPress={() => setProfileId(p.id)} />
            ))}
          </View>
        </View>
      ) : null}

      <Button
        label={saving ? t("ui.common.saving") : t("ui.reminders.create_reminder")}
        disabled={saving}
        onPress={save}
      />
    </View>
  );
}
