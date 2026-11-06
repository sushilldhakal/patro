import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useAccountPage } from "@vedic-patro/features/account";
import { useSiteFooter } from "@vedic-patro/features/common";
import { brand, illustration } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { ListGroup, ListRow } from "@/components/account/AccountList";
import { AppShell } from "@/components/AppShell";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { Ionicons } from "@/components/icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBiometricLock } from "@/lib/auth/BiometricLock";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@/lib/i18n";
import { requestSignIn } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { useTheme, useThemeColors } from "@/lib/theme-context";

/**
 * The profile page, in categories like iOS Settings: who you are (or log in), your account (saved
 * profiles, Face ID, sign out), then the settings — notifications and reminders, language and calendar,
 * appearance, offline data — each on an inner page of its own. Deleting the account sits at the foot.
 */
export default function AccountScreen() {
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { isDark, preference } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const biometric = useBiometricLock();
  const { calendar } = useCalendarSystem();
  const { system } = useCalculationSystem();
  const offline = useOfflineData();
  const page = useAccountPage({
    auth,
    onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne"),
  });
  const { status, user, copy, verification } = page;
  const signedIn = status !== "signed-out" && Boolean(user);
  const go = (href: string) => () => router.push(href as never);
  // Privacy, terms, support and the website: here in Settings rather than at the foot of every page.
  const about = useSiteFooter();
  const ABOUT_ICON = { privacy: "lock", terms: "file-text", support: "mail", site: "globe" } as const;

  if (status === "loading") {
    return (
      <AppShell title={copy.title}>
        <View className="items-center py-12">
          <VedicPatroLoader />
        </View>
      </AppShell>
    );
  }

  const themeLabel =
    preference === "light" ? t("theme_light") : preference === "dark" ? t("theme_dark") : t("ui.settings.theme_system");
  const languageValue = `${lang === "en" ? t("ui.settings.language_en") : t("ui.settings.language_ne")} · ${calendar === "ad" ? t("calendar_system.ad") : t("calendar_system.bs")}`;
  const years = offline.summary.years.length;

  return (
    <AppShell title={copy.title} showHeader={false}>
      <View className={cn("w-full gap-6", accountClasses.column)}>
        {/* Who you are, or the way in. */}
        <View className={accountClasses.identityCard}>
          <Ionicons name={signedIn ? "person-circle" : "person-circle-outline"} size={56} color={colors.secondary} />
          <View className="min-w-0 flex-1">
            <Text className={accountClasses.title} numberOfLines={1} style={nepaliTextStyle()}>
              {signedIn ? copy.title : t("ui.nav.profile")}
            </Text>
            <Text className={accountClasses.subtitle} numberOfLines={1} style={nepaliTextStyle()}>
              {signedIn && user ? user.email : t("ui.account.log_in_to_view_your_account")}
            </Text>
          </View>
          {signedIn ? null : <Button label={t("ui.nav.log_in")} size="sm" onPress={requestSignIn} />}
        </View>

        {signedIn && verification.needed ? (
          <View className={cn("flex-row", accountClasses.banner)}>
            <View className={accountClasses.bannerIcon}>
              <Ionicons name="mail-unread-outline" size={16} color={isDark ? illustration.amber56 : brand.saffron} />
            </View>
            <View className="flex-1">
              <Text className={accountClasses.bannerText} style={nepaliTextStyle()}>
                {copy.verifyEmail}
              </Text>
              <Pressable
                disabled={verification.sent}
                onPress={verification.resend}
                className={cn("self-start", verification.sent && "opacity-60")}
              >
                <Text className={accountClasses.bannerAction} style={nepaliTextStyle()}>
                  {verification.label}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {signedIn ? (
          <ListGroup title={t("ui.account.group_calendar")}>
            <ListRow icon="calendar" title={t("ui.account.events_and_sync")} onPress={go("/account/events")} />
            <ListRow icon="reminders" title={t("ui.settings.reminders")} onPress={go("/reminders")} />
          </ListGroup>
        ) : null}

        {signedIn ? (
          <ListGroup title={t("ui.account.group_account")}>
            <ListRow
              icon="people"
              title={copy.profilesTitle}
              value={page.profiles.length > 0 ? digits(page.profiles.length) : undefined}
              onPress={go("/account/profiles")}
            />
            {biometric.available ? (
              <ListRow
                icon="fingerprint"
                title={t("ui.account.unlock_with_label", { label: biometric.label })}
                subtitle={t("ui.account.you_stay_signed_in_the_app")}
                trailing={
                  <Switch
                    value={biometric.enabled}
                    onValueChange={(on) => void biometric.setEnabled(on)}
                    trackColor={{ true: colors.secondary }}
                    accessibilityLabel={t("ui.account.biometric_lock")}
                  />
                }
              />
            ) : null}
            <ListRow icon="shield" title={t("ui.account.account_data")} onPress={go("/account/data")} />
          </ListGroup>
        ) : null}

        <ListGroup title={t("ui.settings.title")}>
          <ListRow icon="notifications" title={t("ui.settings.notifications_reminders")} onPress={go("/account/notifications")} />
          <ListRow
            icon="language"
            title={t("ui.settings.language_calendar")}
            subtitle={system === "drik" ? t("calculation_system.drik") : t("calculation_system.surya_siddhanta")}
            value={languageValue}
            onPress={go("/account/language")}
          />
          <ListRow icon="palette" title={t("ui.settings.appearance")} value={themeLabel} onPress={go("/account/appearance")} />
          <ListRow
            icon="download"
            title={t("ui.account.offline_data")}
            value={years > 0 ? digits(years) : undefined}
            onPress={go("/account/offline-data")}
          />
        </ListGroup>

        <ListGroup title={t("ui.settings.about")}>
          {about.map((link) => (
            <ListRow
              key={link.id}
              icon={ABOUT_ICON[link.id as keyof typeof ABOUT_ICON] ?? "globe"}
              title={link.label}
              onPress={link.kind === "page" ? go(link.path) : () => void Linking.openURL(link.url)}
            />
          ))}
        </ListGroup>

        {signedIn ? (
          <ListGroup>
            <ListRow icon="logout" title={t("account_page.sign_out")} tone="danger" onPress={() => void auth.logout()} />
          </ListGroup>
        ) : null}
      </View>
    </AppShell>
  );
}
