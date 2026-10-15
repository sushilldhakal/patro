import { elementBlurb, elementTitle } from "@vedic-patro/domain/panchanga-i18n";
import { translateKey } from "@vedic-patro/domain/locale";
import { Linking, Platform, Pressable, Share, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useBreakpoint } from "@/lib/responsive";
import { Card } from "@/components/ui/Card";
import { API_BASE } from "@/lib/api";
import {
  APP_VERSION,
  SUPPORT_EMAIL,
  feedbackMailto,
  reviewUrl,
  storeListingUrl,
} from "@/lib/store-links";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import {
  SITEMAP_ELEMENT_IDS,
  SITEMAP_LEARN_SLUGS,
  SITEMAP_ROUTES,
  SITEMAP_SAIT_CATEGORIES,
  type SitemapRoute,
} from "@/lib/sitemap-routes";
import { CEREMONY_META, ELEMENT_BY_ID } from "@vedic-patro/domain/panchanga-elements";
import { elementHref } from "@/lib/element-routes";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import {
  learnTopicDrawerIcon,
  resolveDrawerIcon,
  resolveElementDrawerIcon,
  type DrawerIconName,
} from "@/lib/drawer-icons";
import { tFor } from "@vedic-patro/i18n/runtime";

function ActionRow({
  onPress,
  label,
  icon,
}: {
  onPress: () => void;
  label: string;
  icon: DrawerIconName;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-b border-border/40 py-3 active:opacity-80"
    >
      <AppNavIcon name={icon} size={20} color={colors.secondary} />
      <Text className="text-body flex-1 font-medium text-foreground">{label}</Text>
      <AppNavIcon name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function RouteRow({
  path,
  label,
  icon,
}: {
  path: string;
  label: string;
  icon: DrawerIconName;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push(path as never)}
      className="flex-row items-center gap-3 border-b border-border/40 py-3 active:opacity-80"
    >
      <AppNavIcon name={icon} size={20} color={colors.secondary} />
      <Text className="text-body flex-1 font-medium text-foreground">{label}</Text>
      <AppNavIcon name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

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
  const { isTablet } = useBreakpoint();

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

  const { isCalendarWide } = useBreakpoint();

  return (
    <AppShell title={t("ui.more.more")} showHeader={false}>
      <View className={isTablet ? "flex-row flex-wrap gap-4" : "gap-4"}>
        {(["main", "panchanga", "jyotish", "tools"] as const).map((group) => {
          const routes = routesByGroup(group);
          if (!routes.length) return null;
          const title = GROUP_TITLE[group];
          return (
            <Card key={group} className={isTablet ? "min-w-[45%] flex-1" : ""}>
              <Text className="text-body mb-2 font-semibold text-foreground">
                {pick(title.ne, title.en)}
              </Text>
              {routes.map((r) => (
                <RouteRow key={r.path} path={r.path} label={pick(r.ne, r.en)} icon={r.icon} />
              ))}
              {group === "tools" ? (
                <RouteRow path="/account" label={t("ui.common.account")} icon="user" />
              ) : null}
            </Card>
          );
        })}

        <Card className={isTablet ? "min-w-[45%] flex-1" : ""}>
          <Text className="text-body mb-2 font-semibold text-foreground">
            {t("ui.more.panchanga_elements")}
          </Text>
          {elementRoutes.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card className={isTablet ? "min-w-[45%] flex-1" : ""}>
          <Text className="text-body mb-2 font-semibold text-foreground">
            {t("ui.more.learn_articles")}
          </Text>
          <RouteRow
            path="/learn/history"
            label={t("ui.more.history")}
            icon="calendar-clock"
          />
          {learnExtra.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card className={isTablet ? "w-full" : ""}>
          <Text className="text-body mb-2 font-semibold text-foreground">
            {t("ui.more.ceremony_muhurta")}
          </Text>
          {saitRoutes.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card>
          <Text className="text-body mb-2 font-semibold text-foreground">
            {t("ui.more.settings")}
          </Text>
          <View className="flex-row items-center justify-between gap-3 border-b border-border/40 py-3">
            <Text className="text-body font-medium text-foreground">{t("ui.common.theme")}</Text>
            <ThemeSwitcher showLabel />
          </View>
          <ActionRow
            label={t("ui.more.rate_vedic_patro")}
            icon="star"
            onPress={() => void Linking.openURL(reviewUrl(Platform.OS)).catch(() => {})}
          />
          <ActionRow
            label={t("ui.more.send_feedback")}
            icon="heart"
            onPress={() =>
              void Linking.openURL(
                feedbackMailto(`Vedic Patro ${APP_VERSION} feedback`),
              ).catch(() => {})
            }
          />
          <ActionRow
            label={t("ui.more.share_the_app")}
            icon="sparkles"
            onPress={() =>
              void Share.share({
                message: t("ui.more.vedic_patro_nepali_calendar_panchanga_os", { OS: storeListingUrl(Platform.OS) }),
              }).catch(() => {})
            }
          />
        </Card>

        <Card>
          <Text className="text-body mb-2 font-semibold text-foreground">
            {t("ui.more.legal")}
          </Text>
          <RouteRow path="/privacy" label={t("auth.privacy")} icon="shield" />
          <RouteRow path="/terms" label={t("auth.terms")} icon="file-text" />
        </Card>

        <Card>
          <Text className="text-body mb-1 font-semibold text-foreground">
            {t("ui.more.version")} {APP_VERSION}
          </Text>
          <Text className="text-caption font-mono text-muted-foreground">{API_BASE}</Text>
          <Text className="text-caption mt-2 text-muted-foreground">{SUPPORT_EMAIL}</Text>
        </Card>
      </View>
    </AppShell>
  );
}
