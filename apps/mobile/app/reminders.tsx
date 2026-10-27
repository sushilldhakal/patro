import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from "react-native-reanimated";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { AppShell } from "@/components/AppShell";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Ionicons } from "@/components/icons/Ionicons";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { AddReminderForm, WEEKDAYS_EN, WEEKDAYS_NE } from "@/components/reminders/AddReminderForm";
import { DailyBriefingCard, RashifalNotificationCard, SectionTitle } from "@/components/reminders/NotificationCards";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { deleteReminder, updateReminder } from "@/lib/notifications/api";
import { getNotificationPermission, type NotifPermission } from "@/lib/notifications/permissions";
import { pendingNotificationCount } from "@/lib/notifications/scheduler";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import {
  DEFAULT_BRIEFING,
  WINDOW_OPTIONS,
  type BriefingSettings,
  type GuidanceDay,
  type GuidanceRange,
  type ReminderRule,
} from "@/lib/notifications/types";
import { todayIn } from "@/lib/notifications/zoned";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { useThemeColors } from "@/lib/theme-context";

import { illustration } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

/** Rows glide into their new places when one is added or removed; Reduce Motion cuts straight there. */
const ROW_LAYOUT = LinearTransition.springify().damping(22).stiffness(240).reduceMotion(ReduceMotion.System);
const ROW_ENTER = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const ROW_EXIT = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

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

          <DailyBriefingCard briefing={briefing} profiles={profiles} onChange={(next) => void saveBriefing(next)} />

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
                  <Animated.View
                    key={rule.id}
                    layout={ROW_LAYOUT}
                    entering={ROW_ENTER}
                    exiting={ROW_EXIT}
                  >
                  <SwipeableRow actionLabel={t("ui.reminders.delete")} onAction={() => removeRule(rule)}>
                  <Card className="flex-row items-center gap-3">
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
                  </SwipeableRow>
                  </Animated.View>
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

      <BottomSheetModal visible={sheetOpen} onClose={() => setSheetOpen(false)} maxHeight="88%">
        <AddReminderForm
          active={sheetOpen}
          profiles={profiles}
          online={online}
          initialKey={initialKey}
          onCreated={async () => {
            setSheetOpen(false);
            await afterRemindersChanged(l, true);
            await reload();
          }}
        />
      </BottomSheetModal>
    </AppShell>
  );
}
