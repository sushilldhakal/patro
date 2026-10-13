import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { AppShell } from "@/components/AppShell";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Ionicons } from "@/components/icons/Ionicons";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { createReminder, deleteReminder, listReminders, updateReminder } from "@/lib/notifications/api";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import {
  ensureNotificationPermission,
  getNotificationPermission,
  type NotifPermission,
} from "@/lib/notifications/permissions";
import { pendingNotificationCount } from "@/lib/notifications/scheduler";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import {
  DEFAULT_BRIEFING,
  DEFAULT_RASHIFAL_SETTINGS,
  type RashifalSettings,
  LEAD_MINUTE_OPTIONS,
  WINDOW_OPTIONS,
  type BriefingSettings,
  type GuidanceDay,
  type GuidanceRange,
  type ReminderRule,
  type WindowKind,
} from "@/lib/notifications/types";
import { todayIn } from "@/lib/notifications/zoned";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

import { illustration } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
import { WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/bs-calendar";
const BRIEFING_TIMES = ["05:00", "06:00", "07:00", "08:00"] as const;
const WEEKDAYS_NE = WEEKDAYS_SHORT_NE;
const WEEKDAYS_EN = WEEKDAYS_SHORT;

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "rounded-full border px-3 py-1.5 active:opacity-80",
        active ? "border-secondary bg-secondary" : "border-border bg-card",
      )}
    >
      <Text
        className={cn("text-body font-semibold", active ? "text-secondary-foreground" : "text-foreground")}
        style={nepaliTextStyle(13)}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-body mb-2 font-bold text-foreground" style={nepaliTextStyle(16)}>
      {children}
    </Text>
  );
}

function GuidanceLines({ day, lang }: { day: GuidanceDay; lang: "ne" | "en" }) {
  const rows: { label: string; lines: string[]; tone: string }[] = [
    { label: tFor(lang, "ui.reminders.do"), lines: lang === "ne" ? day.do_ne : day.do_en, tone: illustration.green36 },
    { label: tFor(lang, "ui.reminders.don_t"), lines: lang === "ne" ? day.dont_ne : day.dont_en, tone: illustration.red46 },
    { label: tFor(lang, "ui.reminders.careful"), lines: lang === "ne" ? day.careful_ne : day.careful_en, tone: illustration.orange45b },
  ];
  return (
    <View className="gap-2">
      {rows
        .filter((r) => r.lines.length > 0)
        .map((r) => (
          <View key={r.label}>
            <Text className="text-caption font-bold" style={{ color: r.tone }}>
              {r.label}
            </Text>
            {r.lines.map((line) => (
              <Text key={line} className="text-body text-foreground" style={nepaliTextStyle(14)}>
                • {line}
              </Text>
            ))}
          </View>
        ))}
    </View>
  );
}

/** Daily rashifal notification: personal when signed in, the chosen rashi's general rashifal for guests. */
function RashifalNotificationCard({ signedIn, onChanged }: { signedIn: boolean; onChanged: () => void }) {
  const { t, pick, lang } = useLocale();
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

        {settings.enabled ? (
          <>
            {!signedIn ? (
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={t("ui.reminders.today_s_moon_sign")}
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
          </>
        ) : null}

        {showOff ? (
          <Button label={t("ui.reminders.open_settings")} onPress={() => void Linking.openSettings()} />
        ) : null}
      </Card>
    </View>
  );
}

export default function RemindersScreen() {
  const { t, pick, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const colors = useThemeColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const [permission, setPermission] = useState<NotifPermission>("undetermined");
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [briefing, setBriefing] = useState<BriefingSettings>(DEFAULT_BRIEFING);
  const [guidance, setGuidance] = useState<Record<string, GuidanceRange | null>>({});
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const params = useLocalSearchParams<{ window?: string }>();
  const [initialKey, setInitialKey] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    const [perm, cachedProfiles, cachedRules, settings, count, net] = await Promise.all([
      getNotificationPermission(),
      notifStore.getProfiles(),
      notifStore.getReminders(),
      notifStore.getBriefing(),
      pendingNotificationCount(),
      isCurrentlyOnline(),
    ]);
    setPermission(perm);
    setProfiles(cachedProfiles);
    setRules(cachedRules);
    setBriefing(settings);
    setPending(count);
    setOnline(net);
    const entries = await Promise.all(
      cachedProfiles.map(async (p) => [p.id, (await notifStore.getGuidance(p.id)) ?? null] as const),
    );
    setGuidance(Object.fromEntries(entries));
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      setBusy(true);
      try {
        await syncNotifications({ lang: l, force });
      } finally {
        await reload();
        setBusy(false);
      }
    },
    [l, reload],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void reload().then(() => refresh());
  }, [isAuthenticated, reload, refresh]);

  // Arriving from a bell on the home page's शुभ/अशुभ list opens the sheet on that window.
  useEffect(() => {
    if (!isAuthenticated || !params.window) return;
    if (!WINDOW_OPTIONS.some((o) => o.key === params.window)) return;
    setInitialKey(params.window);
    setSheetOpen(true);
  }, [isAuthenticated, params.window]);

  const saveBriefing = async (next: BriefingSettings) => {
    setBriefing(next);
    await notifStore.setBriefing(next);
    await refresh();
  };

  const enableNotifications = async () => {
    if (permission === "denied") {
      void Linking.openSettings();
      return;
    }
    await afterRemindersChanged(l, true);
    await reload();
  };

  const toggleRule = async (rule: ReminderRule, enabled: boolean) => {
    const next = rules.map((r) => (r.id === rule.id ? { ...r, enabled } : r));
    setRules(next);
    try {
      const { id: _id, ...body } = rule;
      await updateReminder(rule.id, { ...body, enabled });
      await notifStore.setReminders(next);
      await afterRemindersChanged(l, false);
    } catch {
      Alert.alert(t("ui.reminders.could_not_save_change"), t("ui.reminders.check_your_connection"));
    }
    await reload();
  };

  const removeRule = (rule: ReminderRule) => {
    Alert.alert(t("ui.reminders.delete_reminder"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("ui.reminders.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(rule.id);
            await notifStore.setReminders(rules.filter((r) => r.id !== rule.id));
            await afterRemindersChanged(l, false);
          } catch {
            Alert.alert(t("ui.reminders.could_not_delete"), t("ui.reminders.check_your_connection"));
          }
          await reload();
        },
      },
    ]);
  };

  const today = useMemo(() => {
    const first = Object.values(guidance).find(Boolean);
    return first ? todayIn(first.location.timezone) : "";
  }, [guidance]);

  const ruleTitle = (rule: ReminderRule) => {
    const opt = WINDOW_OPTIONS.find((o) => o.key === rule.window_key);
    const name = opt ? pick(opt.ne, opt.en) : rule.window_key;
    const lead = rule.lead_minutes === 0 ? t("ui.reminders.at_start") : t("ui.reminders.lead_minutes_min_before", { lead_minutes: rule.lead_minutes });
    return `${name} · ${lead}`;
  };

  const ruleSub = (rule: ReminderRule) => {
    const days =
      rule.weekdays.length === 0
        ? t("ui.reminders.every_day")
        : rule.weekdays.map((d) => (l === "ne" ? WEEKDAYS_NE[d] : WEEKDAYS_EN[d])).join(", ");
    const who = profiles.find((p) => p.id === rule.profile_id)?.full_name;
    return who ? `${days} · ${who}` : days;
  };

  return (
    <AppShell title={t("ui.reminders.reminders")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="notifications-outline" size={24} color={colors.secondary} />}
        title={t("ui.reminders.reminders_daily_guidance")}
        subtitle={t("ui.reminders.alerts_for_windows_and_each_profile")}
      />

      {authLoading ? null : !isAuthenticated ? (
        <>
          <KundaliLoginPrompt
            title={t("reminders.login_prompt_title")}
            body={t("reminders.login_prompt_body")}
            onLogin={() => setAuthOpen(true)}
            onSignup={() => setAuthOpen(true)}
          />
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
          <View className="mt-6">
            <RashifalNotificationCard signedIn={false} onChanged={() => {}} />
          </View>
        </>
      ) : (
        <View className="gap-6">
          {permission !== "granted" ? (
            <Card className="gap-3">
              <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
                {permission === "denied"
                  ? t("ui.reminders.notifications_are_off_turn_them_on")
                  : t("ui.reminders.allow_notifications_to_receive_reminders_and")}
              </Text>
              <Button
                label={permission === "denied" ? t("ui.reminders.open_settings") : t("ui.reminders.enable_notifications")}
                onPress={enableNotifications}
              />
            </Card>
          ) : null}

          <RashifalNotificationCard signedIn onChanged={() => void reload()} />

          <View>
            <SectionTitle>{t("ui.reminders.daily_briefing")}</SectionTitle>
            <Card className="gap-4">
              <View className="flex-row flex-wrap gap-2">
                {BRIEFING_TIMES.map((time) => (
                  <Chip key={time} label={time} active={briefing.time === time} onPress={() => saveBriefing({ ...briefing, time })} />
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
                      onValueChange={(on) => saveBriefing({ ...briefing, enabled: { ...briefing.enabled, [p.id]: on } })}
                    />
                  </View>
                ))
              )}
            </Card>
          </View>

          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
                {t("ui.reminders.my_reminders")}
              </Text>
              <Button label={t("ui.reminders.add")} size="sm" onPress={() => setSheetOpen(true)} />
            </View>
            {rules.length === 0 ? (
              <Card>
                <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                  {t("ui.reminders.no_reminders_yet_add_one_for")}
                </Text>
              </Card>
            ) : (
              <View className="gap-2">
                {rules.map((rule) => (
                  <Card key={rule.id} className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: rule.window_kind === "shubh" ? illustration.green36 : illustration.red46 }}
                      className="h-9 w-1.5 rounded-full"
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
                        {ruleTitle(rule)}
                      </Text>
                      <Text className="text-caption text-muted-foreground">{ruleSub(rule)}</Text>
                    </View>
                    <Switch value={rule.enabled} onValueChange={(on) => toggleRule(rule, on)} />
                    <Pressable onPress={() => removeRule(rule)} accessibilityLabel={t("ui.reminders.delete")} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </Card>
                ))}
              </View>
            )}
          </View>

          {profiles.map((p) => {
            const day = guidance[p.id]?.days.find((d) => d.date === today) ?? guidance[p.id]?.days[0];
            if (!day) return null;
            return (
              <View key={p.id}>
                <SectionTitle>{`${p.full_name} · ${t("ui.reminders.today_s_guidance")}`}</SectionTitle>
                <Card>
                  <GuidanceLines day={day} lang={l} />
                </Card>
              </View>
            );
          })}

          <Card className="gap-2">
            <Text className="text-caption text-muted-foreground">
              {t("ui.reminders.pending_notifications_scheduled", { pending })}
              {online ? "" : t("ui.reminders.offline_using_saved_data")}
            </Text>
            <Button
              label={busy ? t("ui.reminders.refreshing") : t("ui.reminders.refresh_now")}
              variant="outline"
              size="sm"
              disabled={busy}
              onPress={() => refresh(true)}
            />
          </Card>
        </View>
      )}

      <AddReminderSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profiles={profiles}
        online={online}
        initialKey={initialKey}
        onCreated={async () => {
          setSheetOpen(false);
          await afterRemindersChanged(l, true);
          await reload();
        }}
      />
    </AppShell>
  );
}

function AddReminderSheet({
  visible,
  onClose,
  profiles,
  online,
  initialKey,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  profiles: CachedProfile[];
  online: boolean;
  initialKey?: string;
  onCreated: () => Promise<void>;
}) {
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
    if (visible && opt) {
      setKind(opt.kind);
      setWindowKey(opt.key);
    }
  }, [visible, initialKey]);

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
    <BottomSheetModal visible={visible} onClose={onClose} maxHeight="88%">
      <View className="gap-4 p-4">
        <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
          {t("ui.reminders.new_reminder")}
        </Text>

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
              <Chip key={m} label={m === 0 ? t("ui.reminders.at_start_2") : t("ui.reminders.m_min", { m })} active={lead === m} onPress={() => setLead(m)} />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-caption mb-1.5 text-muted-foreground">
            {t("ui.reminders.days_none_every_day")}
          </Text>
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

        <Button label={saving ? t("ui.common.saving") : t("ui.reminders.create_reminder")} disabled={saving} onPress={save} />
      </View>
    </BottomSheetModal>
  );
}
