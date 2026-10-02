import { Linking, Platform, Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppShell, LangToggle } from "@/components/AppShell";
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
import { CEREMONY_META, ELEMENT_BY_ID } from "@/lib/panchanga-elements";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import {
  learnTopicDrawerIcon,
  resolveDrawerIcon,
  resolveElementDrawerIcon,
  type DrawerIconName,
} from "@/lib/drawer-icons";

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
      <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
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
      <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
      <AppNavIcon name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const GROUP_TITLE: Record<SitemapRoute["group"], { ne: string; en: string }> = {
  main: { ne: "मुख्य", en: "Main" },
  panchanga: { ne: "पञ्चाङ्ग", en: "Panchanga" },
  jyotish: { ne: "ज्योतिष", en: "Jyotish" },
  learn: { ne: "सिकाइ", en: "Learn" },
  sait: { ne: "शुभ साइत", en: "Ceremony muhurta" },
  tools: { ne: "उपकरण", en: "Tools" },
};

function routesByGroup(group: SitemapRoute["group"]) {
  return SITEMAP_ROUTES.filter((r) => r.group === group);
}

export default function MoreScreen() {
  const { pick } = useLocale();
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
      path: `/panchanga/element/${id}`,
      label: meta ? pick(meta.titleNe, meta.titleEn) : id,
      icon: resolveElementDrawerIcon(id),
    };
  });

  const saitRoutes = SITEMAP_SAIT_CATEGORIES.map((id) => {
    const meta = CEREMONY_META.find((c) => c.id === id);
    const path = id === "vivah" ? "/vivah-sait" : `/sait/${id}`;
    return {
      path,
      label: meta ? pick(meta.titleNe, meta.titleEn) : id,
      icon: resolveDrawerIcon("sait", id),
    };
  });

  const { isCalendarWide } = useBreakpoint();

  return (
    <AppShell title={pick("थप", "More")} showHeader={false}>
      {!isCalendarWide ? (
        <View className="mb-3 flex-row justify-end">
          <LangToggle />
        </View>
      ) : null}
      <View className={isTablet ? "flex-row flex-wrap gap-4" : "gap-4"}>
        {(["main", "panchanga", "jyotish", "tools"] as const).map((group) => {
          const routes = routesByGroup(group);
          if (!routes.length) return null;
          const title = GROUP_TITLE[group];
          return (
            <Card key={group} className={isTablet ? "min-w-[45%] flex-1" : ""}>
              <Text className="mb-2 text-base font-semibold text-foreground">
                {pick(title.ne, title.en)}
              </Text>
              {routes.map((r) => (
                <RouteRow key={r.path} path={r.path} label={pick(r.ne, r.en)} icon={r.icon} />
              ))}
              {group === "tools" ? (
                <RouteRow path="/account" label={pick("खाता", "Account")} icon="user" />
              ) : null}
            </Card>
          );
        })}

        <Card className={isTablet ? "min-w-[45%] flex-1" : ""}>
          <Text className="mb-2 text-base font-semibold text-foreground">
            {pick("पञ्चाङ्ग तत्त्व", "Panchanga elements")}
          </Text>
          {elementRoutes.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card className={isTablet ? "min-w-[45%] flex-1" : ""}>
          <Text className="mb-2 text-base font-semibold text-foreground">
            {pick("सिकाइ लेख", "Learn articles")}
          </Text>
          <RouteRow
            path="/learn/history"
            label={pick("इतिहास", "History")}
            icon="calendar-clock"
          />
          {learnExtra.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card className={isTablet ? "w-full" : ""}>
          <Text className="mb-2 text-base font-semibold text-foreground">
            {pick("शुभ साइत", "Ceremony muhurta")}
          </Text>
          {saitRoutes.map((r) => (
            <RouteRow key={r.path} path={r.path} label={r.label} icon={r.icon} />
          ))}
        </Card>

        <Card>
          <Text className="mb-2 text-base font-semibold text-foreground">
            {pick("सेटिङ", "Settings")}
          </Text>
          <View className="flex-row items-center justify-between gap-3 border-b border-border/40 py-3">
            <Text className="text-sm font-medium text-foreground">{pick("थिम", "Theme")}</Text>
            <ThemeSwitcher showLabel />
          </View>
          <ActionRow
            label={pick("एप रेट गर्नुहोस्", "Rate Vedic Patro")}
            icon="star"
            onPress={() => void Linking.openURL(reviewUrl(Platform.OS)).catch(() => {})}
          />
          <ActionRow
            label={pick("प्रतिक्रिया पठाउनुहोस्", "Send feedback")}
            icon="heart"
            onPress={() =>
              void Linking.openURL(
                feedbackMailto(`Vedic Patro ${APP_VERSION} feedback`),
              ).catch(() => {})
            }
          />
          <ActionRow
            label={pick("एप साझा गर्नुहोस्", "Share the app")}
            icon="sparkles"
            onPress={() =>
              void Share.share({
                message: pick(
                  `वैदिक पात्रो — नेपाली पात्रो र पञ्चाङ्ग: ${storeListingUrl(Platform.OS)}`,
                  `Vedic Patro — Nepali calendar & panchanga: ${storeListingUrl(Platform.OS)}`,
                ),
              }).catch(() => {})
            }
          />
        </Card>

        <Card>
          <Text className="mb-2 text-base font-semibold text-foreground">
            {pick("कानुनी", "Legal")}
          </Text>
          <RouteRow path="/privacy" label={pick("गोपनीयता नीति", "Privacy Policy")} icon="shield" />
          <RouteRow path="/terms" label={pick("प्रयोगका सर्त", "Terms of Use")} icon="file-text" />
        </Card>

        <Card>
          <Text className="mb-1 text-sm font-semibold text-foreground">
            {pick("संस्करण", "Version")} {APP_VERSION}
          </Text>
          <Text className="font-mono text-xs text-muted-foreground">{API_BASE}</Text>
          <Text className="mt-2 text-xs text-muted-foreground">{SUPPORT_EMAIL}</Text>
        </Card>
      </View>
    </AppShell>
  );
}
