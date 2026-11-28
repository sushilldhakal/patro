import { elementTitle } from "@vedic-patro/domain/panchanga/panchanga-i18n";
import { translateKey } from "@vedic-patro/domain/locale";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useContentWidth } from "@/lib/responsive";
import { PageBackBar } from "@/components/navigation/PageBackBar";
import { MobileNavMenu as MobileNavMenuView, type MobileNavItem, type MobileNavSection } from "@vedic-patro/ui/kit/shell";
import { Card } from "@/components/ui/Card";
import { API_BASE } from "@/lib/api";
import { APP_VERSION, SUPPORT_EMAIL } from "@/lib/store-links";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import {
  SITEMAP_ELEMENT_IDS,
  SITEMAP_LEARN_SLUGS,
  SITEMAP_ROUTES,
  SITEMAP_SAIT_CATEGORIES,
  type SitemapRoute,
} from "@/lib/sitemap-routes";
import { CEREMONY_META, ELEMENT_BY_ID } from "@vedic-patro/domain/panchanga/panchanga-elements";
import { elementHref } from "@/lib/element-routes";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import {
  learnTopicDrawerIcon,
  resolveDrawerIcon,
  resolveElementDrawerIcon,
  type DrawerIconName,
} from "@/lib/drawer-icons";
import { tFor } from "@vedic-patro/i18n/runtime";
import { mobileShellClasses as msc } from "@vedic-patro/design-tokens/classes/shell/mobile-shell-classes";

const GROUP_TITLE: Record<SitemapRoute["group"], { ne: string; en: string }> = {
  main: { get ne() { return tFor("ne", "ui.navigation.main"); }, get en() { return tFor("en", "ui.navigation.main"); } },
  panchanga: { get ne() { return tFor("ne", "learn.diagrams.hierarchy_converge"); }, get en() { return tFor("en", "learn.diagrams.hierarchy_converge"); } },
  jyotish: { get ne() { return tFor("ne", "nav.jyotish"); }, get en() { return tFor("en", "nav.jyotish"); } },
  learn: { get ne() { return tFor("ne", "nav.learn"); }, get en() { return tFor("en", "nav.learn"); } },
  sait: { get ne() { return tFor("ne", "ui.more.ceremony_muhurta"); }, get en() { return tFor("en", "ui.more.ceremony_muhurta"); } },
  tools: { get ne() { return tFor("ne", "ui.more.tools"); }, get en() { return tFor("en", "ui.more.tools"); } },
};

function routesByGroup(group: SitemapRoute["group"]) {
  return SITEMAP_ROUTES.filter((r) => r.group === group);
}

export default function MoreScreen() {
  const { t, pick, lang } = useLocale();

  const learnExtra = SITEMAP_LEARN_SLUGS.map((slug) => {
    const topic = LEARN_LIBRARY_BY_SLUG[slug];
    return {
      path: `/learn/${slug}`,
      label: topic ? pick(topic.title.ne, topic.title.en) : slug,
      icon: learnTopicDrawerIcon(topic?.icon),
    };
  });

  const elementRoutes = SITEMAP_ELEMENT_IDS.map((id) => {
    const meta = ELEMENT_BY_ID[id];
    return {
      path: elementHref(id),
      label: meta ? elementTitle(id, lang) : id,
      icon: resolveElementDrawerIcon(id),
    };
  });

  const saitRoutes = SITEMAP_SAIT_CATEGORIES.map((id) => {
    const meta = CEREMONY_META.find((c) => c.id === id);
    const path = id === "vivah" ? "/vivah-sait" : `/sait/${id}`;
    return {
      path,
      label: meta ? translateKey(`sait.categories.${id}`, lang) : id,
      icon: resolveDrawerIcon("sait", id),
    };
  });

  const router = useRouter();
  const colors = useThemeColors();
  const width = useContentWidth();
  // Tiles like the side menu's: 4 a row on a phone, more on a big screen instead of a long list.
  const cols = width >= 1000 ? 8 : width >= 700 ? 6 : 4;
  const tile = (key: string, path: string, label: string, icon: DrawerIconName): MobileNavItem => ({
    key,
    label,
    icon: <AppNavIcon name={icon} size={20} color={colors.danger} />,
    onPress: () => router.push(path as never),
  });
  const sections: MobileNavSection[] = [
    ...(["main", "panchanga", "jyotish", "tools"] as const).flatMap((group) => {
      const routes = routesByGroup(group);
      if (!routes.length) return [];
      const items = routes.map((r) => tile(r.path, r.path, pick(r.ne, r.en), r.icon));
      if (group === "tools") items.push(tile("/account", "/account", t("ui.common.account"), "user"));
      return [{ id: group, title: pick(GROUP_TITLE[group].ne, GROUP_TITLE[group].en), items }];
    }),
    { id: "elements", title: t("ui.more.panchanga_elements"), items: elementRoutes.map((r) => tile(r.path, r.path, r.label, r.icon)) },
    { id: "sait", title: t("ui.more.ceremony_muhurta"), items: saitRoutes.map((r) => tile(r.path, r.path, r.label, r.icon)) },
    {
      id: "learn",
      title: t("ui.more.learn_articles"),
      items: [
        tile("/learn/history", "/learn/history", t("ui.more.history"), "calendar-clock"),
        ...learnExtra.map((r) => tile(r.path, r.path, r.label, r.icon)),
      ],
    },
  ];

  return (
    <AppShell title={t("ui.more.more")} showHeader={false}>
      <PageBackBar title={t("ui.more.more")} fallback="/" />
      <View className="gap-4">
        <Card>
          <MobileNavMenuView label={t("ui.more.more")} sections={sections} cols={cols} />
        </Card>

        <Card>
          <Text className={msc.moreVersionTitle}>
            {t("ui.more.version")} {APP_VERSION}
          </Text>
          <Text className={msc.moreMeta}>{API_BASE}</Text>
          <Text className={msc.moreMetaGap}>{SUPPORT_EMAIL}</Text>
        </Card>
      </View>
    </AppShell>
  );
}
