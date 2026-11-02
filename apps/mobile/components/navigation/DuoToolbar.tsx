import { useCallback } from "react";
import { Share } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { planRail, useDuoRail } from "@/lib/duo-rail";
import { useLocale } from "@/lib/i18n";
import { requestOpenMenu, requestSignIn } from "@/lib/menu-request";
import { loadStoredLocation } from "@/lib/use-panchanga-location";

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
  const { slots } = useDuoRail();
  const plan = planRail(slots, tabsInBar);

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
          <Stack.Toolbar.MenuAction icon="bell" onPress={() => router.push("/reminders" as never)}>
            {t("ui.reminders.reminders")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sun.max" onPress={() => router.push("/rashifal" as never)}>
            {t("nav.jyotish_rashifal")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
