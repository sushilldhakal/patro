import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { Chip } from "@/components/reminders/AddReminderForm";
import { DailyBriefingCard, RashifalNotificationCard, SectionTitle } from "@/components/reminders/NotificationCards";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { notifStore, type CachedProfile } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";
import { DEFAULT_BRIEFING, type BriefingSettings } from "@/lib/notifications/types";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { useTheme, useThemeColors, type ThemePreference } from "@/lib/theme-context";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/**
 * Settings, from the account menu: the daily pushes, the default language,
 * the theme and offline use. Each control writes the same store its own page
 * does (reminders, the header toggles, offline data), so the two never disagree.
 */
export default function SettingsScreen() {
  const { t, lang, setLang, digits } = useLocale();
  const l = lang === "en" ? "en" : "ne";
  const router = useRouter();
  const colors = useThemeColors();
  const { preference, setPreference } = useTheme();
  const { isAuthenticated } = useAuth();
  const offline = useOfflineData();

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

  const themes: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("ui.settings.theme_system") },
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") },
  ];
  const years = offline.summary.years.length;

  return (
    <AppShell title={t("ui.settings.title")}>
      <View className={cn("w-full gap-6", accountClasses.column)}>
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

        <View>
          <SectionTitle>{t("ui.settings.language")}</SectionTitle>
          <Card className="flex-row flex-wrap gap-2">
            <Chip label={t("switch_to_nepali")} active={l === "ne"} onPress={() => void setLang("ne")} />
            <Chip label={t("switch_to_english")} active={l === "en"} onPress={() => void setLang("en")} />
          </Card>
        </View>

        <View>
          <SectionTitle>{t("ui.settings.theme")}</SectionTitle>
          <Card className="flex-row flex-wrap gap-2">
            {themes.map((theme) => (
              <Chip key={theme.value} label={theme.label} active={preference === theme.value} onPress={() => setPreference(theme.value)} />
            ))}
          </Card>
        </View>

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
      </View>
    </AppShell>
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
