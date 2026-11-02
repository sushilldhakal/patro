import { useCallback } from "react";
import { Pressable, Share, View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { mobileTypeScale } from "@vedic-patro/design-tokens";
import { useAuth } from "@/lib/auth/AuthContext";
import { ALL_TABS, planRail, useDuoRail } from "@/lib/duo-rail";
import { FLOATING_NAV, isNavActive } from "@/lib/mobile-nav";
import { useNavPress } from "@/lib/use-nav-press";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { requestOpenMenu, requestSignIn } from "@/lib/menu-request";
import { loadStoredLocation } from "@/lib/use-panchanga-location";

/** SF Symbol per tab, in `ALL_TABS` order. */
const TAB_SF = ["house", "calendar", "sparkles", "moon", "safari", "book"] as const;

/** The system tint the tab bar on home uses for the selected tab. */
const TAB_ACTIVE = "#007AFF"; // design-ok: the system tint of the native tab bar this imitates

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
 * The iPhone Duo's header actions, as native toolbar items: iOS puts them in the vertical rail (or
 * the top bar in portrait), Back first. Every page gets the same set, so the tabs and the pages
 * pushed over them behave alike. What does not fit the rail goes into the "…" menu.
 */
export function DuoToolbar({ tabsInBar }: { tabsInBar: boolean }) {
  const { t, lang } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const navPress = useNavPress();
  const { slots, folded, horizontal } = useDuoRail();
  const colors = useThemeColors();
  const plan = planRail(slots, folded);
  const { pick } = useLocale();

  const onProfile = useCallback(() => {
    if (isAuthenticated) router.push("/account" as never);
    else requestSignIn();
  }, [isAuthenticated, router]);
  const onShare = useCallback(async () => {
    const url = await pageLink(pathname, lang);
    void Share.share({ message: url, url }).catch(() => {});
  }, [pathname, lang]);
  const toSettings = () => router.push("/account/settings" as never);

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
        {plan.settings ? (
          <Stack.Toolbar.Button icon="gearshape" accessibilityLabel={t("account_page.settings")} onPress={toSettings} />
        ) : null}
        {plan.share ? (
          <Stack.Toolbar.Button icon="square.and.arrow.up" accessibilityLabel={t("ui.more.share_the_app")} onPress={() => void onShare()} />
        ) : null}
        <Stack.Toolbar.Menu icon="ellipsis" title={t("menu_open")}>
          {plan.settings ? null : (
            <Stack.Toolbar.MenuAction icon="gearshape" onPress={toSettings}>
              {t("account_page.settings")}
            </Stack.Toolbar.MenuAction>
          )}
          {plan.share ? null : (
            <Stack.Toolbar.MenuAction icon="square.and.arrow.up" onPress={() => void onShare()}>
              {t("ui.more.share_the_app")}
            </Stack.Toolbar.MenuAction>
          )}
          {plan.overflowTabs.map((tab) => {
            const i = ALL_TABS.indexOf(tab);
            return (
              <Stack.Toolbar.MenuAction key={tab} icon={TAB_SF[i]} onPress={() => navPress(FLOATING_NAV[i].href)}>
                {pick(FLOATING_NAV[i].ne, FLOATING_NAV[i].en)}
              </Stack.Toolbar.MenuAction>
            );
          })}
          <Stack.Toolbar.MenuAction icon="bell" onPress={() => router.push("/reminders" as never)}>
            {t("ui.reminders.reminders")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sun.max" onPress={() => router.push("/rashifal" as never)}>
            {t("nav.jyotish_rashifal")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      {/* On a page pushed over the tabs: the destinations in the system's own bottom toolbar, which iOS
          lays out like the tab bar on the home page (below the page in portrait, as its own group at the
          foot of the rail in landscape and folded). */}
      {!tabsInBar ? (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.Spacer />
          {ALL_TABS.filter((tab) => plan.tabs.has(tab)).map((tab) => {
            const i = ALL_TABS.indexOf(tab);
            const item = FLOATING_NAV[i];
            const active = isNavActive(pathname, item.href);
            // Portrait: icon over label like the system tab bar on home (a toolbar button cannot show both).
            // The rail has no labels on home, so there it stays a plain symbol button.
            return horizontal ? (
              <Stack.Toolbar.View key={tab}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={pick(item.ne, item.en)}
                  accessibilityState={{ selected: active }}
                  onPress={() => navPress(item.href)}
                  style={{ width: 94, height: 52, alignItems: "center", justifyContent: "center", gap: 3 }}
                >
                  <AppNavIcon name={item.icon} size={24} color={active ? TAB_ACTIVE : colors.foreground} />
                  <View>
                    <Text
                      numberOfLines={1}
                      style={[{ fontSize: mobileTypeScale.xs.size, fontWeight: "500", color: active ? TAB_ACTIVE : colors.foreground }, nepaliTextStyle()]}
                    >
                      {pick(item.ne, item.en)}
                    </Text>
                  </View>
                </Pressable>
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                key={tab}
                icon={TAB_SF[i]}
                accessibilityLabel={pick(item.ne, item.en)}
                selected={active}
                onPress={() => navPress(item.href)}
              />
            );
          })}
          <Stack.Toolbar.Spacer />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
