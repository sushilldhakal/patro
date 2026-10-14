import { Pressable, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { space } from "@vedic-patro/design-tokens";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { useRelatedPageLinks } from "@vedic-patro/features/common";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { iconForLinkId, resolveSitePageId, siteLinkHref } from "@/lib/related-page-links";
import { useThemeColors } from "@/lib/theme-context";

/**
 * "Related" cards that close every page on web (`RelatedPageLinks`): learn
 * articles first, then peer pages from the same sidebar group, six at most.
 */
export function RelatedPageLinks() {
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = normalizeMobilePathname(usePathname());
  const related = useRelatedPageLinks(resolveSitePageId(pathname));
  if (related.cards.length === 0) return null;

  const cards = related.cards.map((card) =>
    card.kind === "learn"
      ? { ...card, href: hrefForLearnSlug(card.slug) as string, learnIcon: LEARN_ICONS[card.icon] as string, icon: undefined }
      : { ...card, href: siteLinkHref(card.linkId), learnIcon: undefined, icon: iconForLinkId(card.linkId) },
  );

  return (
    <View className="mt-10 border-t border-border pt-8" accessibilityLabel={related.aria}>
      <View className="mb-3 flex-row items-center gap-2">
        <AppNavIcon name="compass" size={16} color={colors.secondary} />
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {related.heading}
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
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
                {card.label}
              </Text>
              {card.description ? (
                <Text className="mt-0.5 text-xs leading-snug text-muted-foreground" numberOfLines={2} style={nepaliTextStyle(12)}>
                  {card.description}
                </Text>
              ) : null}
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} style={{ marginTop: space.xs }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
