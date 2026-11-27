import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useSiteFooter } from "@vedic-patro/features/common";
import { Sheet } from "@vedic-patro/ui";
import { runningBuildLine } from "@/lib/build-info";
import { useRouter } from "expo-router";
import { useAccountPage } from "@vedic-patro/features/account";
import { brand, illustration } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { BarTitle, ListGroup, ListRow } from "@/components/account/AccountList";
import { AppShell } from "@/components/AppShell";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { requestLocationPicker, requestSignIn } from "@/lib/menu-request";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import { useTheme, useThemeColors } from "@/lib/theme-context";

/**
 * The profile page: who you are (opens My profile, where the details, Face ID and deleting the account
 * live) or the way in, then short groups of rows, each with a tinted round icon and a line saying what it
 * holds — General (saved places, notifications, preferences), calendar and profiles, data — About as a sheet.
 */
export default function AccountScreen() {
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const offline = useOfflineData();
  const { location } = usePanchangaLocation();
  const page = useAccountPage({
    auth,
    onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne"),
  });
  const { status, user, copy, verification } = page;
  const signedIn = status !== "signed-out" && Boolean(user);
  const go = (href: string) => () => router.push(href as never);
  const [aboutOpen, setAboutOpen] = useState(false);

  if (status === "loading") {
    return (
      <AppShell title={copy.title}>
        <View className="items-center py-12">
          <VedicPatroLoader />
        </View>
      </AppShell>
    );
  }

  const years = offline.summary.years.length;
  const name = (page.profiles.find((p) => p.isDefault) ?? page.profiles[0])?.name || user?.email?.split("@")[0] || "";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <AppShell title={copy.title} showHeader={false}>
      <View className={cn("w-full gap-7", accountClasses.column)}>
        {/* The page title sits in the top bar, beside search. */}
        <BarTitle title={t("ui.nav.profile")} />

        {/* Who you are (opens My profile), with the two account links under it: calendar sync and
            sign-in methods. Signed out: the way in. */}
        <View className="overflow-hidden rounded-3xl border border-border bg-card">
          <Pressable
            onPress={signedIn ? go("/account/me") : requestSignIn}
            accessibilityRole="button"
            className="flex-row items-center gap-4 bg-secondary/10 p-5 active:opacity-80"
          >
            <View className="size-20 items-center justify-center rounded-full border-2 border-secondary/40 bg-card">
              {signedIn && initial ? (
                <Text className="text-4xl font-bold text-secondary">{initial}</Text>
              ) : (
                <Ionicons name="person" size={34} color={colors.secondary} />
              )}
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-2xl font-bold text-foreground" numberOfLines={1} style={nepaliTextStyle()}>
                {signedIn ? name : t("ui.nav.log_in")}
              </Text>
              <Text className="text-sm text-muted-foreground" numberOfLines={1} style={nepaliTextStyle(13)}>
                {signedIn && user ? user.email : t("ui.account.log_in_to_view_your_account")}
              </Text>
              {signedIn ? (
                <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(13)}>
                  {t("ui.me.view")} ›
                </Text>
              ) : null}
            </View>
          </Pressable>
          {signedIn ? (
            <View className="flex-row border-t border-border">
              <QuickLink icon="calendar-outline" label={t("ui.me.calendar_sync")} onPress={go("/account/events")} />
              <View className="w-px bg-border" />
              <QuickLink icon="key-outline" label={t("ui.me.signin_methods")} onPress={go("/account/me")} />
            </View>
          ) : null}
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

        <ListGroup title={t("ui.account.group_general")}>
          <ListRow icon="map-pin" tint="teal" title={t("ui.settings.saved_places")} subtitle={location.label} onPress={requestLocationPicker} />
          <ListRow
            icon="notifications"
            tint="amber"
            title={t("ui.settings.notifications_reminders")}
            subtitle={t("ui.settings.notifications_body")}
            onPress={go("/account/notifications")}
          />
          <ListRow
            icon="sliders"
            tint="violet"
            title={t("ui.settings.preferences")}
            subtitle={t("ui.settings.preferences_body")}
            onPress={go("/account/preferences")}
          />
        </ListGroup>

        {signedIn ? (
          <ListGroup title={t("ui.account.group_profiles")}>
            <ListRow
              icon="people"
              tint="indigo"
              title={copy.profilesTitle}
              subtitle={t("ui.account.profiles_body")}
              value={page.profiles.length > 0 ? digits(page.profiles.length) : undefined}
              onPress={go("/account/profiles")}
            />
            <ListRow icon="calendar" tint="green" title={t("ui.account.events_and_sync")} subtitle={t("ui.account.events_body")} onPress={go("/account/events")} />
          </ListGroup>
        ) : null}

        <ListGroup title={t("ui.account.group_data")}>
          <ListRow
            icon="download"
            tint="orange"
            title={t("ui.account.offline_data")}
            subtitle={t("ui.account.offline_body")}
            value={years > 0 ? digits(years) : undefined}
            onPress={go("/account/offline-data")}
          />
          <ListRow icon="info" tint="gray" title={t("ui.settings.about_legal")} subtitle={t("ui.settings.about_body")} onPress={() => setAboutOpen(true)} />
        </ListGroup>

        {signedIn ? (
          <ListGroup>
            <ListRow icon="logout" title={t("account_page.sign_out")} tone="danger" onPress={() => void auth.logout()} />
          </ListGroup>
        ) : null}
      </View>
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </AppShell>
  );
}

/** One of the two links under the profile card. */
function QuickLink({ icon, label, onPress }: { icon: "calendar-outline" | "key-outline"; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 flex-row items-center justify-center gap-2 py-3.5 active:bg-muted">
      <Ionicons name={icon} size={18} color={colors.secondary} />
      <Text className="text-sm font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle(13)}>
        {label}
      </Text>
    </Pressable>
  );
}

const ABOUT_ICON = { privacy: "lock", terms: "file-text", support: "mail", site: "globe" } as const;

/** About & legal, as a bottom sheet: the running version, then privacy, terms, support and the website. */
function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const router = useRouter();
  const about = useSiteFooter();
  return (
    <Sheet open={open} onClose={onClose} title={t("ui.settings.about_legal")} closeLabel={t("ui.account.back")}>
      <View className="gap-3 pb-4">
        <Text className="text-sm text-muted-foreground" selectable>
          {t("ui.settings.version")} · {runningBuildLine()}
        </Text>
        <ListGroup>
          {about.map((link) => (
            <ListRow
              key={link.id}
              icon={ABOUT_ICON[link.id as keyof typeof ABOUT_ICON] ?? "globe"}
              tint="gray"
              title={link.label}
              onPress={() => {
                onClose();
                if (link.kind === "page") router.push(link.path as never);
                else void Linking.openURL(link.url);
              }}
            />
          ))}
        </ListGroup>
      </View>
    </Sheet>
  );
}
