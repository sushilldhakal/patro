import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking } from "react-native";
import { withAlpha } from "@vedic-patro/design-tokens";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { ACCOUNT_TINTS, type AccountIconName, type AccountTint } from "@vedic-patro/ui/kit/account";
import { Button } from "@/components/ui/Button";
import { BRIEFING_TIMES } from "@/components/reminders/NotificationCards";
import { ensureNotificationPermission, getNotificationPermission, type NotifPermission } from "@/lib/notifications/permissions";
import { DEFAULT_WEATHER_UNITS, WEATHER_UNIT_CHOICES, WEATHER_UNITS_KEY, parseUnits, type WeatherUnits } from "@vedic-patro/features/weather";
import { placesStorage } from "@/lib/places-sync";
import { chooseClockStyle, useClockStyle } from "@/lib/clock-pref";
import { Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { Chip } from "@/components/reminders/AddReminderForm";
import { SettingsCard } from "@/components/account/AccountList";
import { Icon } from "@vedic-patro/ui";
import { ACCOUNT_ICONS } from "@vedic-patro/ui/kit/account";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { DEFAULT_BRIEFING, DEFAULT_RASHIFAL_SETTINGS, type BriefingSettings, type RashifalSettings } from "@/lib/notifications/types";
import { HOME_SECTIONS, setHomeSectionShown, useHomeSections } from "@/lib/home-sections";
import { useTheme, useThemeColors, type ThemePreference } from "@/lib/theme-context";
import { useAyanamshaMode } from "@vedic-patro/features/kundali";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/*
 * The settings, one section per inner page of the profile page: notifications and reminders, language
 * and calendar, appearance, offline use. Each control writes the same store its own page does
 * (reminders, the view menu, offline data), so the two never disagree.
 */

/**
 * Notifications, as one list of what the reader gets — each kind a row with its tinted icon, what and
 * when, and its switch: the daily rashifal (signed out: which rashi), the morning briefing (its time and
 * profiles), the shubh / ashubh reminders (opens their page). Writes the same stores the reminders page does.
 */
export function NotificationSettings() {
  const { t, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const router = useRouter();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const [briefing, setBriefing] = useState<BriefingSettings>(DEFAULT_BRIEFING);
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [rashifal, setRashifal] = useState<RashifalSettings>(DEFAULT_RASHIFAL_SETTINGS);
  const [reminders, setReminders] = useState(0);
  const [permission, setPermission] = useState<NotifPermission>("undetermined");
  const rashis = useMemo(() => getRashiList(l), [l]);

  useEffect(() => {
    void Promise.all([
      notifStore.getBriefing(),
      notifStore.getProfiles(),
      notifStore.getRashifalSettings(),
      notifStore.getReminders(),
      getNotificationPermission(),
    ]).then(([b, p, r, rules, perm]) => {
      setBriefing(b);
      setProfiles(p);
      setRashifal(r);
      setReminders(rules.filter((x) => x.enabled).length);
      setPermission(perm);
    });
  }, [isAuthenticated]);

  const resync = async (turnedOn: boolean) => {
    try {
      if (turnedOn) setPermission((await ensureNotificationPermission()) ? "granted" : await getNotificationPermission());
      await syncNotifications({ lang: l, force: true });
    } catch {
      /* the schedule is rebuilt on the next foreground sync */
    }
  };
  const saveRashifal = (next: RashifalSettings) => {
    setRashifal(next);
    void notifStore.setRashifalSettings(next).then(() => resync(next.enabled));
  };
  const saveBriefing = (next: BriefingSettings) => {
    setBriefing(next);
    void notifStore.setBriefing(next).then(() => resync(true));
  };
  const briefingOn = profiles.some((p) => briefing.enabled[p.id] !== false);
  const setAllBriefing = (on: boolean) =>
    saveBriefing({ ...briefing, enabled: Object.fromEntries(profiles.map((p) => [p.id, on])) });

  return (
    <View className="gap-4">
      {permission === "denied" ? (
        <SettingsCard icon="notifications" tint="red" title={t("ui.notify.off_title")} caption={t("ui.notify.off_body")}>
          <Button label={t("ui.reminders.open_settings")} onPress={() => void Linking.openSettings()} />
        </SettingsCard>
      ) : null}

      <SettingsCard icon="notifications" tint="amber" title={t("ui.notify.choose")} caption={t("ui.notify.choose_caption")}>
        <NotifRow
          icon="sparkles"
          tint="violet"
          title={t("ui.notify.rashifal")}
          subtitle={t(isAuthenticated ? "ui.notify.rashifal_personal" : "ui.notify.rashifal_guest")}
          trailing={<Switch value={rashifal.enabled} onValueChange={(on) => saveRashifal({ ...rashifal, enabled: on })} trackColor={{ true: colors.secondary }} />}
        />
        {rashifal.enabled && !isAuthenticated ? (
          <View className="flex-row flex-wrap gap-2 pl-14">
            <Chip label={t("muhurta_aside.moon_ref_chandrabal")} active={rashifal.guestSignId == null} onPress={() => saveRashifal({ ...rashifal, guestSignId: null })} />
            {rashis.map((name, i) => (
              <Chip key={name} label={name} active={rashifal.guestSignId === i + 1} onPress={() => saveRashifal({ ...rashifal, guestSignId: i + 1 })} />
            ))}
          </View>
        ) : null}

        <NotifRow
          icon="sun"
          tint="orange"
          title={t("ui.reminders.daily_briefing")}
          subtitle={isAuthenticated ? t("ui.notify.briefing_at", { time: briefing.time }) : t("ui.settings.daily_briefing_sign_in")}
          trailing={
            isAuthenticated && profiles.length > 0 ? (
              <Switch value={briefingOn} onValueChange={setAllBriefing} trackColor={{ true: colors.secondary }} />
            ) : null
          }
        />
        {isAuthenticated && briefingOn ? (
          <View className="gap-3 pl-14">
            <View className="flex-row flex-wrap gap-2">
              {BRIEFING_TIMES.map((time) => (
                <Chip key={time} label={time} active={briefing.time === time} onPress={() => saveBriefing({ ...briefing, time })} />
              ))}
            </View>
            {profiles.length > 1
              ? profiles.map((p) => (
                  <View key={p.id} className="flex-row items-center justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-base text-foreground" numberOfLines={1} style={nepaliTextStyle(15)}>
                      {p.full_name}
                    </Text>
                    <Switch
                      value={briefing.enabled[p.id] !== false}
                      onValueChange={(on) => saveBriefing({ ...briefing, enabled: { ...briefing.enabled, [p.id]: on } })}
                      trackColor={{ true: colors.secondary }}
                    />
                  </View>
                ))
              : null}
          </View>
        ) : null}

        <NotifRow
          icon="reminders"
          tint="green"
          title={t("ui.settings.reminders")}
          subtitle={reminders > 0 ? t("ui.notify.reminders_on", { count: reminders }) : t("ui.settings.reminders_body")}
          onPress={() => router.push("/reminders" as never)}
        />
      </SettingsCard>
    </View>
  );
}

/** One kind of notification: tinted icon, what and when, then its switch (or a chevron to its page). */
function NotifRow({
  icon,
  tint,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: AccountIconName;
  tint: AccountTint;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const color = ACCOUNT_TINTS[tint];
  const body = (
    <>
      <View className={accountClasses.rowIcon} style={{ backgroundColor: withAlpha(color, 0.16) }}>
        <Icon node={ACCOUNT_ICONS[icon]} size={20} color={color} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
          {subtitle}
        </Text>
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /> : null)}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" className={cn(accountClasses.notifRow, "active:opacity-70")}>
      {body}
    </Pressable>
  ) : (
    <View className={accountClasses.notifRow}>{body}</View>
  );
}

/** Preferences → General: the app's language and which calendar dates are shown in. */
export function GeneralPreferences() {
  const { t, lang, setLang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const { calendar, setCalendar } = useCalendarSystem();
  return (
    <SettingsCard icon="language" tint="indigo" title={t("ui.settings.language_display")} caption={t("ui.settings.language_display_caption")}>
      <Text className={accountClasses.settingsRowTitle} style={nepaliTextStyle(14)}>
        {t("ui.settings.language")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label={t("switch_to_nepali")} active={l === "ne"} onPress={() => void setLang("ne")} />
        <Chip label={t("switch_to_english")} active={l === "en"} onPress={() => void setLang("en")} />
      </View>
      <Text className={cn("mt-2", accountClasses.settingsRowTitle)} style={nepaliTextStyle(14)}>
        {t("calendar_system.label")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label={t("calendar_system.bs")} active={calendar === "bs"} onPress={() => setCalendar("bs")} />
        <Chip label={t("calendar_system.ad")} active={calendar === "ad"} onPress={() => setCalendar("ad")} />
      </View>
    </SettingsCard>
  );
}

/** Preferences → General: temperature, time, distance, wind, rain and pressure units (the weather page's own). */
export function UnitsSettings() {
  const { t } = useLocale();
  const clock = useClockStyle();
  const [units, setUnits] = useState<WeatherUnits>(DEFAULT_WEATHER_UNITS);
  useEffect(() => {
    void Promise.resolve(placesStorage.read(WEATHER_UNITS_KEY)).then((raw) => raw && setUnits(parseUnits(raw)));
  }, []);
  const set = (next: Partial<WeatherUnits>) => {
    const merged = { ...units, ...next };
    setUnits(merged);
    placesStorage.write(WEATHER_UNITS_KEY, JSON.stringify(merged));
  };
  const rows: { key: keyof WeatherUnits; title: string }[] = [
    { key: "temp", title: t("weather.units_temp") },
    { key: "dist", title: t("weather.units_dist") },
    { key: "wind", title: t("weather.units_wind") },
    { key: "rain", title: t("weather.units_rain") },
    { key: "pressure", title: t("weather.units_pressure") },
  ];
  const short: Record<string, string> = { c: "°C", f: "°F", kmh: "km/h", ms: "m/s", mph: "mph", kn: "kn", mm: "mm", in: "in", km: "km", mi: "mi", hpa: "hPa", inhg: "inHg", mmhg: "mmHg" };
  return (
    <SettingsCard icon="sliders" tint="teal" title={t("ui.settings.units")} caption={t("ui.settings.units_caption")}>
      <UnitRow title={t("ui.settings.clock")}>
        <Chip label={t("ui.settings.clock_12")} active={(clock ?? "24") === "12"} onPress={() => chooseClockStyle("12")} />
        <Chip label={t("ui.settings.clock_24")} active={(clock ?? "24") === "24"} onPress={() => chooseClockStyle("24")} />
      </UnitRow>
      {rows.map((r) => (
        <UnitRow key={r.key} title={r.title}>
          {(WEATHER_UNIT_CHOICES[r.key] as readonly string[]).map((id) => (
            <Chip key={id} label={short[id] ?? id} active={units[r.key] === id} onPress={() => set({ [r.key]: id } as Partial<WeatherUnits>)} />
          ))}
        </UnitRow>
      ))}
    </SettingsCard>
  );
}

function UnitRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2 border-t border-border pt-3">
      <Text className={accountClasses.settingsRowTitle} style={nepaliTextStyle(14)}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

/** Preferences → Astrology: the calculation system and (with Drik) the ayanamsha. */
export function AstrologyPreferences() {
  const { t } = useLocale();
  const { system, setSystem } = useCalculationSystem();
  const [ayanamsha, setAyanamsha] = useAyanamshaMode();
  return (
    <View className="gap-4">
      <SettingsCard icon="sparkles" tint="violet" title={t("calculation_system.label")} caption={t("ui.settings.calculation_caption")}>
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t("calculation_system.drik")} active={system === "drik"} onPress={() => setSystem("drik")} />
          <Chip
            label={t("calculation_system.surya_siddhanta")}
            active={system === "surya_siddhanta"}
            onPress={() => setSystem("surya_siddhanta")}
          />
        </View>
        <Text className={accountClasses.settingsRowText} style={nepaliTextStyle(13)}>
          {t(system === "drik" ? "calculation_system.drik_hint" : "calculation_system.surya_siddhanta_hint")}
          {" — "}
          {t("calculation_system.note")}
        </Text>
      </SettingsCard>
      {system === "drik" ? <AyanamshaSelector mode={ayanamsha} onModeChange={setAyanamsha} /> : null}
    </View>
  );
}

/** Preferences → Appearance: the theme, as three picture cards. */
export function AppearanceSettings() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { preference, setPreference } = useTheme();
  const themes: { value: ThemePreference; label: string; hint: string; icon: "sun" | "moon" | "phone" }[] = [
    { value: "light", label: t("theme_light"), hint: t("ui.settings.theme_light_hint"), icon: "sun" },
    { value: "dark", label: t("theme_dark"), hint: t("ui.settings.theme_dark_hint"), icon: "moon" },
    { value: "system", label: t("ui.settings.theme_system"), hint: t("ui.settings.theme_system_hint"), icon: "phone" },
  ];
  return (
    <SettingsCard icon="palette" tint="pink" title={t("ui.settings.theme")} caption={t("ui.settings.theme_caption")}>
      <View className="flex-row gap-2">
        {themes.map((theme) => {
          const on = preference === theme.value;
          return (
            <Pressable
              key={theme.value}
              onPress={() => setPreference(theme.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              className={cn(
                accountClasses.themeCard,
                on ? "border-secondary bg-secondary/10" : "border-border",
              )}
            >
              <Icon node={ACCOUNT_ICONS[theme.icon]} size={26} color={on ? colors.secondary : colors.mutedForeground} />
              <Text className={cn("text-base font-semibold", on ? "text-secondary" : "text-foreground")} style={nepaliTextStyle(15)}>
                {theme.label}
              </Text>
              <Text className="text-center text-xs text-muted-foreground" numberOfLines={2} style={nepaliTextStyle(11)}>
                {theme.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SettingsCard>
  );
}

/** One switch per optional home-page section; the calendar and panchanga always stay. */
export function HomeScreenSettings() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const { shown } = useHomeSections();
  return (
    <SettingsCard icon="home" tint="blue" title={t("ui.settings.home_screen")} caption={t("ui.settings.home_screen_body")}>
      <View className="gap-4">
        {HOME_SECTIONS.map((id) => {
          const title = t(`ui.settings.home_${id}`);
          return (
            <View key={id} className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className={accountClasses.settingsRowTitle} style={nepaliTextStyle(15)}>
                  {title}
                </Text>
                {id === "watchlist" && !isAuthenticated ? (
                  <Text className={accountClasses.settingsRowText} style={nepaliTextStyle(13)}>
                    {t("ui.settings.home_watchlist_sign_in")}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={shown(id)}
                onValueChange={(on) => setHomeSectionShown(id, on)}
                trackColor={{ true: colors.secondary }}
                accessibilityLabel={title}
              />
            </View>
          );
        })}
      </View>
    </SettingsCard>
  );
}
