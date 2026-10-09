import { Pressable, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import { useLocale } from "@/lib/i18n";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  RELATED_CARD_LIMIT,
  SITE_LINK_BLURB_KEY,
  SITE_LINK_LABEL_KEY,
  getRelatedLearnSlugs,
  getRelatedSiteLinkIds,
  iconForLinkId,
  resolveSitePageId,
  siteLinkHref,
} from "@/lib/related-page-links";
import { useThemeColors } from "@/lib/theme-context";

type Card = { key: string; label: string; description?: string; href: string; learnIcon?: string; icon?: ReturnType<typeof iconForLinkId> };

/**
 * "Related" cards that close every page on web (`RelatedPageLinks`): learn
 * articles first, then peer pages from the same sidebar group, six at most.
 */
export function RelatedPageLinks() {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = normalizeMobilePathname(usePathname());

  const pageId = resolveSitePageId(pathname);
  if (!pageId) return null;

  const learnCards: Card[] = getRelatedLearnSlugs(pageId)
    .map((slug): Card | null => {
      const topic = LEARN_LIBRARY_BY_SLUG[slug];
      if (!topic || topic.status !== "published") return null;
      return {
        key: `learn:${slug}`,
        label: pick(topic.title.ne, topic.title.en),
        description: pick(topic.summary.ne, topic.summary.en),
        href: hrefForLearnSlug(slug) as string,
        learnIcon: topic.icon as string,
      };
    })
    .filter((c): c is Card => c !== null);

  const siteCards: Card[] = getRelatedSiteLinkIds(pageId).map((linkId) => {
    let label: string;
    let description: string | undefined;
    if (linkId.startsWith("element:")) {
      const id = linkId.slice(8);
      label = t(`panchanga_elements.${id}.title`);
      description = t(`panchanga_elements.${id}.blurb`);
    } else if (linkId.startsWith("sait:")) {
      label = t(`sait.categories.${linkId.slice(5)}`);
      description = t("sidebar_nav.items.sait_moment.blurb");
    } else {
      const labelKey = SITE_LINK_LABEL_KEY[linkId];
      label = labelKey ? t(labelKey) : linkId;
      const blurbKey = SITE_LINK_BLURB_KEY[linkId];
      description = blurbKey ? t(blurbKey) : undefined;
    }
    return { key: linkId, label, description, href: siteLinkHref(linkId), icon: iconForLinkId(linkId) };
  });

  const cards = [...learnCards, ...siteCards].slice(0, RELATED_CARD_LIMIT);
  if (cards.length === 0) return null;

  return (
    <View className="mt-10 border-t border-border pt-8" accessibilityLabel={t("related_pages.aria")}>
      <View className="mb-3 flex-row items-center gap-2">
        <AppNavIcon name="compass" size={16} color={colors.secondary} />
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {t("related_pages.heading")}
        </Text>
      </View>
      <View className="gap-2">
        {cards.map((card) => (
          <Pressable
            key={card.key}
            onPress={() => router.push(card.href as never)}
            accessibilityRole="link"
            className="flex-row items-start gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 active:opacity-90"
          >
            <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              {card.icon ? (
                <AppNavIcon name={card.icon} size={16} color={colors.secondary} />
              ) : (
                <Ionicons name={card.learnIcon as never} size={16} color={colors.secondary} />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-body font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
                {card.label}
              </Text>
              {card.description ? (
                <Text className="text-caption mt-0.5 text-muted-foreground" numberOfLines={2} style={nepaliTextStyle(12)}>
                  {card.description}
                </Text>
              ) : null}
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} style={{ marginTop: 4 }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
