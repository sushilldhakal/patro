import { usePathname, useRouter } from "expo-router";
import { useRelatedPageLinks } from "@vedic-patro/features/common";
import { RelatedPageLinks as RelatedPageLinksView, type RelatedLinkItem } from "@vedic-patro/ui/kit/shell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { iconForLinkId, resolveSitePageId, siteLinkHref } from "@/lib/related-page-links";
import { useThemeColors } from "@/lib/theme-context";

/** Related cards. The list is shared; this file resolves each card's route and icon. */
export function RelatedPageLinks() {
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = normalizeMobilePathname(usePathname());
  const related = useRelatedPageLinks(resolveSitePageId(pathname));
  if (related.cards.length === 0) return null;

  const items: RelatedLinkItem[] = related.cards.map((card) => {
    if (card.kind === "learn") {
      return {
        key: card.key,
        label: card.label,
        description: card.description,
        icon: <Ionicons name={LEARN_ICONS[card.icon] as never} size={16} color={colors.secondary} />,
        onPress: () => router.push(hrefForLearnSlug(card.slug) as never),
      };
    }
    return {
      key: card.key,
      label: card.label,
      description: card.description,
      icon: <AppNavIcon name={iconForLinkId(card.linkId)} size={16} color={colors.secondary} />,
      onPress: () => router.push(siteLinkHref(card.linkId) as never),
    };
  });

  return (
    <RelatedPageLinksView
      heading={related.heading}
      label={related.aria}
      headingIcon={<AppNavIcon name="compass" size={16} color={colors.secondary} />}
      items={items}
    />
  );
}
