import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { Chip } from "@/components/reminders/AddReminderForm";
import { DailyBriefingCard, RashifalNotificationCard, SectionTitle } from "@/components/reminders/NotificationCards";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { ayanamshaStorage } from "@/lib/kundali/ayanamsha-storage";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { DEFAULT_BRIEFING, type BriefingSettings } from "@/lib/notifications/types";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { useTheme, useThemeColors, type ThemePreference } from "@/lib/theme-context";
import { useAyanamshaMode } from "@vedic-patro/features/kundali";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/*
 * The settings, one section per inner page of the profile page: notifications and reminders, language
 * and calendar, appearance, offline use. Each control writes the same store its own page does
 * (reminders, the view menu, offline data), so the two never disagree.
 */

/** Daily rashifal, the daily briefing and the shubh / ashubh reminders. */
export function NotificationSettings() {
  const { t, lang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const router = useRouter();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const [briefing, setBriefing] = useState<BriefingSettings>(DEFAULT_BRIEFING);
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);

  const reload = useCallback(async () => {
    const [settings, cached] = await Promise.all([notifStore.getBriefing(), notifStore.getProfiles()]);
    setBriefing(settings);
    setProfiles(cached);
  }, []);

  useEffect(() => {
    if (isAuthenticated) void reload();
  }, [isAuthenticated, reload]);

  const saveBriefing = async (next: BriefingSettings) => {
    setBriefing(next);
    await notifStore.setBriefing(next);
    try {
      await syncNotifications({ lang: l, force: true });
    } catch {
      /* the schedule is rebuilt on the next foreground sync */
    }
  };

  return (
    <View className="gap-4">
      <RashifalNotificationCard signedIn={isAuthenticated} onChanged={() => {}} />
      {isAuthenticated ? (
        <DailyBriefingCard briefing={briefing} profiles={profiles} onChange={(next) => void saveBriefing(next)} />
      ) : (
        <View>
          <SectionTitle>{t("ui.reminders.daily_briefing")}</SectionTitle>
          <Card>
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
              {t("ui.settings.daily_briefing_sign_in")}
            </Text>
          </Card>
        </View>
      )}
      <LinkRow
        icon="alarm-outline"
        title={t("ui.settings.reminders")}
        body={t("ui.settings.reminders_body")}
        onPress={() => router.push("/reminders" as never)}
        iconColor={colors.secondary}
        chevronColor={colors.mutedForeground}
      />
    </View>
  );
}

/** Default language, BS | AD, the calculation system and (with Drik) the ayanamsha. */
export function LanguageCalendarSettings() {
  const { t, lang, setLang } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const { calendar, setCalendar } = useCalendarSystem();
  const { system, setSystem } = useCalculationSystem();
  const [ayanamsha, setAyanamsha] = useAyanamshaMode(ayanamshaStorage);

  return (
    <View className="gap-6">
      <View>
        <SectionTitle>{t("ui.settings.language")}</SectionTitle>
        <Card className="flex-row flex-wrap gap-2">
          <Chip label={t("switch_to_nepali")} active={l === "ne"} onPress={() => void setLang("ne")} />
          <Chip label={t("switch_to_english")} active={l === "en"} onPress={() => void setLang("en")} />
        </Card>
      </View>

      <View>
        <SectionTitle>{t("calendar_system.label")}</SectionTitle>
        <Card className="flex-row flex-wrap gap-2">
          <Chip label={t("calendar_system.bs")} active={calendar === "bs"} onPress={() => setCalendar("bs")} />
          <Chip label={t("calendar_system.ad")} active={calendar === "ad"} onPress={() => setCalendar("ad")} />
        </Card>
      </View>

      <View>
        <SectionTitle>{t("calculation_system.label")}</SectionTitle>
        <Card className="gap-3">
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
        </Card>
      </View>

      {system === "drik" ? <AyanamshaSelector mode={ayanamsha} onModeChange={setAyanamsha} /> : null}
    </View>
  );
}

/** The theme. */
export function AppearanceSettings() {
  const { t } = useLocale();
  const { preference, setPreference } = useTheme();
  const themes: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("ui.settings.theme_system") },
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") },
  ];
  return (
    <View>
      <SectionTitle>{t("ui.settings.theme")}</SectionTitle>
      <Card className="flex-row flex-wrap gap-2">
        {themes.map((theme) => (
          <Chip key={theme.value} label={theme.label} active={preference === theme.value} onPress={() => setPreference(theme.value)} />
        ))}
      </Card>
    </View>
  );
}

/** Downloads over Wi-Fi only, and the link to the offline data page. */
function OfflineSettings() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const offline = useOfflineData();
  const years = offline.summary.years.length;
  return (
    <View className="gap-3">
      <SectionTitle>{t("ui.settings.offline")}</SectionTitle>
      <Card className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className={accountClasses.settingsRowTitle} style={nepaliTextStyle(15)}>
            {t("ui.account.download_over_wi_fi_only")}
          </Text>
          <Text className={accountClasses.settingsRowText} style={nepaliTextStyle(13)}>
            {years > 0 ? t("ui.settings.offline_years", { count: digits(years) }) : t("ui.account.nothing_downloaded_yet")}
          </Text>
        </View>
        <Switch
          value={offline.wifiOnly}
          onValueChange={offline.setWifiOnly}
          trackColor={{ true: colors.secondary }}
          accessibilityLabel={t("ui.account.download_over_wi_fi_only")}
        />
      </Card>
      <LinkRow
        icon="download-outline"
        title={t("ui.account.offline_data")}
        body={t("ui.account.manage_the_calendar_years_downloaded_for")}
        onPress={() => router.push("/account/offline-data" as never)}
        iconColor={colors.secondary}
        chevronColor={colors.mutedForeground}
      />
    </View>
  );
}

/** Every section on one page: the old /account/settings route. */
export function SettingsPanel() {
  return (
    <View className={cn("w-full gap-6", accountClasses.column)}>
      <NotificationSettings />
      <LanguageCalendarSettings />
      <AppearanceSettings />
      <OfflineSettings />
    </View>
  );
}

function LinkRow({
  icon,
  title,
  body,
  onPress,
  iconColor,
  chevronColor,
}: {
  icon: "alarm-outline" | "download-outline";
  title: string;
  body: string;
  onPress: () => void;
  iconColor: string;
  chevronColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className={accountClasses.settingsLink}
    >
      <View className={accountClasses.settingsLinkBody}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <View className="flex-1">
          <Text className={accountClasses.settingsLinkTitle} style={nepaliTextStyle(14)}>
            {title}
          </Text>
          <Text className={accountClasses.settingsLinkText} style={nepaliTextStyle(12)}>
            {body}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={chevronColor} />
    </Pressable>
  );
}
