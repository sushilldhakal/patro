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
import { getRashiList } from "@/lib/rashi-i18n";
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
import { cn } from "@/lib/utils";

const BRIEFING_TIMES = ["05:00", "06:00", "07:00", "08:00"] as const;
const WEEKDAYS_NE = ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    { label: lang === "ne" ? "गर्नुहोस्" : "Do", lines: lang === "ne" ? day.do_ne : day.do_en, tone: "#2e8b57" },
    { label: lang === "ne" ? "नगर्नुहोस्" : "Don't", lines: lang === "ne" ? day.dont_ne : day.dont_en, tone: "#c0392b" },
    { label: lang === "ne" ? "सावधानी" : "Careful", lines: lang === "ne" ? day.careful_ne : day.careful_en, tone: "#d68910" },
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
  const { pick, lang } = useLocale();
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
      <SectionTitle>{pick("दैनिक राशिफल सूचना", "Daily rashifal notification")}</SectionTitle>
      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
              {pick("हरेक दिन बिहान ७ बजे आजको राशिफल", "Today's rashifal every day at 7 am")}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
              {signedIn
                ? pick("तपाईंको प्रोफाइलको व्यक्तिगत राशिफल।", "Personal rashifal from your default profile.")
                : pick("तलबाट आफ्नो राशि छान्नुहोस्।", "Pick your rashi below.")}
            </Text>
          </View>
          <Switch value={settings.enabled} disabled={busy} onValueChange={(on) => save({ ...settings, enabled: on })} />
        </View>

        {settings.enabled ? (
          <>
            {!signedIn ? (
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={pick("आजको चन्द्र राशि", "Today's moon sign")}
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
          <Button label={pick("सेटिङ खोल्नुहोस्", "Open Settings")} onPress={() => void Linking.openSettings()} />
        ) : null}
      </Card>
    </View>
  );
}

export default function RemindersScreen() {
  const { pick, lang } = useLocale();
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
      Alert.alert(pick("परिवर्तन सेभ भएन", "Could not save change"), pick("इन्टरनेट जाँच गर्नुहोस्।", "Check your connection."));
    }
    await reload();
  };

  const removeRule = (rule: ReminderRule) => {
    Alert.alert(pick("रिमाइन्डर हटाउने?", "Delete reminder?"), undefined, [
      { text: pick("रद्द", "Cancel"), style: "cancel" },
      {
        text: pick("हटाउनुहोस्", "Delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(rule.id);
            await notifStore.setReminders(rules.filter((r) => r.id !== rule.id));
            await afterRemindersChanged(l, false);
          } catch {
            Alert.alert(pick("हटाउन सकिएन", "Could not delete"), pick("इन्टरनेट जाँच गर्नुहोस्।", "Check your connection."));
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
    const lead = rule.lead_minutes === 0 ? pick("सुरुमा", "at start") : pick(`${rule.lead_minutes} मि. अघि`, `${rule.lead_minutes} min before`);
    return `${name} · ${lead}`;
  };

  const ruleSub = (rule: ReminderRule) => {
    const days =
      rule.weekdays.length === 0
        ? pick("हरेक दिन", "Every day")
        : rule.weekdays.map((d) => (l === "ne" ? WEEKDAYS_NE[d] : WEEKDAYS_EN[d])).join(", ");
    const who = profiles.find((p) => p.id === rule.profile_id)?.full_name;
    return who ? `${days} · ${who}` : days;
  };

  return (
    <AppShell title={pick("रिमाइन्डर", "Reminders")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="notifications-outline" size={24} color={colors.secondary} />}
        title={pick("रिमाइन्डर र दैनिक सूचना", "Reminders & daily guidance")}
        subtitle={pick(
          "शुभ/अशुभ समयको सम्झना र प्रत्येक प्रोफाइलका लागि दैनिक गर्ने/नगर्ने कुरा",
          "Alerts for शुभ / अशुभ windows, and each profile's daily do / don't",
        )}
      />

      {authLoading ? null : !isAuthenticated ? (
        <>
          <KundaliLoginPrompt
            titleNe="रिमाइन्डरका लागि लगइन"
            titleEn="Log in for reminders"
            bodyNe="रिमाइन्डर र दैनिक सूचना सेट गर्न साइन इन गर्नुहोस्।"
            bodyEn="Sign in to set reminders and daily guidance notifications."
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
                  ? pick("सूचना बन्द छ। सेटिङमा गएर खोल्नुहोस्।", "Notifications are off. Turn them on in Settings.")
                  : pick("रिमाइन्डर र दैनिक सूचना पाउन सूचना अनुमति दिनुहोस्।", "Allow notifications to receive reminders and the daily briefing.")}
              </Text>
              <Button
                label={permission === "denied" ? pick("सेटिङ खोल्नुहोस्", "Open Settings") : pick("सूचना खोल्नुहोस्", "Enable notifications")}
                onPress={enableNotifications}
              />
            </Card>
          ) : null}

          <RashifalNotificationCard signedIn onChanged={() => void reload()} />

          <View>
            <SectionTitle>{pick("दैनिक सूचना", "Daily briefing")}</SectionTitle>
            <Card className="gap-4">
              <View className="flex-row flex-wrap gap-2">
                {BRIEFING_TIMES.map((time) => (
                  <Chip key={time} label={time} active={briefing.time === time} onPress={() => saveBriefing({ ...briefing, time })} />
                ))}
              </View>
              {profiles.length === 0 ? (
                <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                  {pick("प्रोफाइल थपेपछि यहाँ देखिन्छ।", "Profiles appear here once you add one.")}
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
                {pick("मेरा रिमाइन्डर", "My reminders")}
              </Text>
              <Button label={pick("+ थप्नुहोस्", "+ Add")} size="sm" onPress={() => setSheetOpen(true)} />
            </View>
            {rules.length === 0 ? (
              <Card>
                <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                  {pick("कुनै रिमाइन्डर छैन। राहु काल वा अभिजित् मुहूर्तजस्ता समयका लागि थप्नुहोस्।", "No reminders yet. Add one for a window like Rahu Kaal or Abhijit Muhurta.")}
                </Text>
              </Card>
            ) : (
              <View className="gap-2">
                {rules.map((rule) => (
                  <Card key={rule.id} className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: rule.window_kind === "shubh" ? "#2e8b57" : "#c0392b" }}
                      className="h-9 w-1.5 rounded-full"
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
                        {ruleTitle(rule)}
                      </Text>
                      <Text className="text-caption text-muted-foreground">{ruleSub(rule)}</Text>
                    </View>
                    <Switch value={rule.enabled} onValueChange={(on) => toggleRule(rule, on)} />
                    <Pressable onPress={() => removeRule(rule)} accessibilityLabel={pick("हटाउनुहोस्", "Delete")} hitSlop={8}>
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
                <SectionTitle>{`${p.full_name} · ${pick("आजको मार्गदर्शन", "Today's guidance")}`}</SectionTitle>
                <Card>
                  <GuidanceLines day={day} lang={l} />
                </Card>
              </View>
            );
          })}

          <Card className="gap-2">
            <Text className="text-caption text-muted-foreground">
              {pick(`${pending} सूचना तालिकामा छन्`, `${pending} notifications scheduled`)}
              {online ? "" : pick(" · अफलाइन — सुरक्षित डेटाबाट", " · offline — using saved data")}
            </Text>
            <Button
              label={busy ? pick("ताजा गर्दै…", "Refreshing…") : pick("अहिले ताजा गर्नुहोस्", "Refresh now")}
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
  const { pick, lang } = useLocale();
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
    label: `${o.kind === "shubh" ? pick("शुभ", "Shubh") : pick("अशुभ", "Ashubh")} · ${pick(o.ne, o.en)}`,
  }));

  const pickWindow = (key: string) => {
    const opt = WINDOW_OPTIONS.find((o) => o.key === key);
    if (!opt) return;
    setWindowKey(opt.key);
    setKind(opt.kind);
  };

  const save = async () => {
    if (!online) {
      Alert.alert(pick("इन्टरनेट चाहिन्छ", "Connection needed"), pick("रिमाइन्डर बनाउन इन्टरनेट चाहिन्छ। बनेपछि अफलाइन पनि चल्छ।", "Creating a reminder needs a connection. Once created it works offline."));
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
      Alert.alert(pick("बनाउन सकिएन", "Could not create"), pick("फेरि प्रयास गर्नुहोस्।", "Please try again."));
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
          {pick("नयाँ रिमाइन्डर", "New reminder")}
        </Text>

        <View>
          <Text className="text-caption mb-1.5 text-muted-foreground">{pick("शुभ / अशुभ समय", "Shubh / Ashubh window")}</Text>
          <NativeStringSelect
            value={windowKey}
            options={selectOptions}
            onChange={pickWindow}
            ariaLabel={pick("समय छान्नुहोस्", "Choose a window")}
            minWidth={240}
          />
        </View>

        <View>
          <Text className="text-caption mb-1.5 text-muted-foreground">{pick("कति अघि सम्झाउने", "Remind me")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {LEAD_MINUTE_OPTIONS.map((m) => (
              <Chip key={m} label={m === 0 ? pick("सुरुमा", "At start") : pick(`${m} मि.`, `${m} min`)} active={lead === m} onPress={() => setLead(m)} />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-caption mb-1.5 text-muted-foreground">
            {pick("कुन दिन (खाली = हरेक दिन)", "Days (none = every day)")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(l === "ne" ? WEEKDAYS_NE : WEEKDAYS_EN).map((label, d) => (
              <Chip key={label} label={label} active={weekdays.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
        </View>

        {profiles.length > 0 ? (
          <View>
            <Text className="text-caption mb-1.5 text-muted-foreground">{pick("प्रोफाइल (ऐच्छिक)", "Profile (optional)")}</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label={pick("कुनै होइन", "None")} active={profileId === null} onPress={() => setProfileId(null)} />
              {profiles.map((p) => (
                <Chip key={p.id} label={p.full_name} active={profileId === p.id} onPress={() => setProfileId(p.id)} />
              ))}
            </View>
          </View>
        ) : null}

        <Button label={saving ? pick("सेभ हुँदै…", "Saving…") : pick("रिमाइन्डर बनाउनुहोस्", "Create reminder")} disabled={saving} onPress={save} />
      </View>
    </BottomSheetModal>
  );
}
