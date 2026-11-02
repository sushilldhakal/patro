import { useCallback, useState } from "react";
import { Share } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { NavDrawerHost } from "@/components/AppHeader";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { requestOpenMenu } from "@/lib/menu-request";
import { FLOATING_NAV } from "@/lib/mobile-nav";
import { loadStoredLocation } from "@/lib/use-panchanga-location";

/** SF Symbol per tab, in `FLOATING_NAV` order (home, panchanga, kundali, transit, vastu, learn). */
const TAB_SF = ["house", "calendar", "sparkles", "moon", "safari", "book"] as const;

/** Route name per tab, in `FLOATING_NAV` order. */
const TAB_ROUTE = ["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"] as const;

const SITE = "https://www.vedicpatro.com";

/**
 * The link to what the user is looking at, with their language and place so it opens the same way.
 * The page itself is the current route; the presets ride along as query parameters.
 */
async function pageLink(pathname: string, lang: string): Promise<string> {
  const path = pathname === "/index" ? "/" : pathname;
  const { params } = await loadStoredLocation();
  const query = new URLSearchParams({ lang, lat: String(params.lat), lon: String(params.lon) });
  return `${SITE}${path}?${query.toString()}`;
}

/**
 * iPhone Duo only. iOS 27.1 moves the bars it owns (the tab bar and the native header's toolbar)
 * into a vertical rail beside the app, on the side the app sits on, and back to horizontal bars in
 * portrait (Expo's iPhone Duo guide). So the tabs are the system tab bar and the header actions are
 * native toolbar items: icons only, ordered by priority, and iOS folds what does not fit into its
 * overflow menu. Every other device keeps the floating bar and the JS header.
 */
export function DuoNativeTabs() {
  const { t, pick, lang } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const onProfile = useCallback(() => {
    if (isAuthenticated) router.push("/account" as never);
    else setAuthOpen(true);
  }, [isAuthenticated, router]);

  const onShare = useCallback(async () => {
    const url = await pageLink(pathname, lang);
    void Share.share({ message: url, url }).catch(() => {});
  }, [pathname, lang]);

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="sidebar.left" accessibilityLabel={t("menu_open")} onPress={requestOpenMenu} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={isAuthenticated ? "person.crop.circle.fill" : "person.crop.circle"}
          accessibilityLabel={t("account_page.title")}
          onPress={onProfile}
        />
        <Stack.Toolbar.Button icon="gearshape" accessibilityLabel={t("account_page.settings")} onPress={() => router.push("/account/settings" as never)} />
        <Stack.Toolbar.Menu icon="ellipsis" title={t("menu_open")}>
          <Stack.Toolbar.MenuAction icon="square.and.arrow.up" onPress={() => void onShare()}>
            {t("ui.more.share_the_app")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="bell" onPress={() => router.push("/reminders" as never)}>
            {t("ui.reminders.reminders")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sun.max" onPress={() => router.push("/rashifal" as never)}>
            {t("nav.jyotish_rashifal")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <NativeTabs>
        {FLOATING_NAV.map((item, i) => (
          <NativeTabs.Trigger key={TAB_ROUTE[i]} name={TAB_ROUTE[i]}>
            <NativeTabs.Trigger.Icon sf={TAB_SF[i]} />
            <NativeTabs.Trigger.Label>{pick(item.ne, item.en)}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
      <NavDrawerHost />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
    </>
  );
}
