import { useCallback } from "react";
import { Share } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { ALL_TABS, planRail, useDuoRail } from "@/lib/duo-rail";
import { FLOATING_NAV, isNavActive } from "@/lib/mobile-nav";
import { useNavPress } from "@/lib/use-nav-press";
import { useLocale } from "@/lib/i18n";
import { requestAddReminder, requestLocationPicker, requestOpenMenu, requestSearch, requestSignIn } from "@/lib/menu-request";
import { loadStoredLocation } from "@/lib/use-panchanga-location";
import { usePatroViewOptions } from "@/lib/patro-view";

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
  const { slots, folded } = useDuoRail();
  const plan = planRail(slots, folded);
  const { pick } = useLocale();
  const viewOptions = usePatroViewOptions();

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
        {/* Monthly BS, monthly panchanga or daily panchanga — Apple Calendar's view menu, the current one ticked. */}
        <Stack.Toolbar.Menu icon="list.bullet" title={t("ui.view_menu.label")} accessibilityLabel={t("ui.view_menu.label")}>
          {viewOptions.map((option) => (
            <Stack.Toolbar.MenuAction key={option.key} icon={option.sf} isOn={option.active} onPress={option.onPress}>
              {option.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="location" accessibilityLabel={t("ui.search.location")} onPress={requestLocationPicker} />
        <Stack.Toolbar.Button icon="magnifyingglass" accessibilityLabel={t("ui.search.search")} onPress={requestSearch} />
        <Stack.Toolbar.Button icon="plus" accessibilityLabel={t("ui.reminders.new_reminder")} onPress={requestAddReminder} />
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
            // Native buttons only: iOS leaves custom views out of the rail, and a button shows its symbol
            // alone (the label is spoken). The current destination is tinted like the tab bar's selection.
            return (
              <Stack.Toolbar.Button
                key={tab}
                icon={TAB_SF[i]}
                accessibilityLabel={pick(item.ne, item.en)}
                tintColor={active ? TAB_ACTIVE : undefined}
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
