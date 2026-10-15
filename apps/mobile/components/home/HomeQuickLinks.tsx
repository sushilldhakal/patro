import { useRouter } from "expo-router";
import { FEATURE_ICON } from "@vedic-patro/icons";
import { useHomeQuickLinks } from "@vedic-patro/features/home";
import { HomeQuickLinks as HomeQuickLinksView, type HomeQuickLinkGroup } from "@vedic-patro/ui/kit/shell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useThemeColors } from "@/lib/theme-context";

/** Shortcut tiles. The drawing is `@vedic-patro/ui/kit/shell`; this file opens the route. */
export function HomeQuickLinks() {
  const router = useRouter();
  const colors = useThemeColors();
  const { groups } = useHomeQuickLinks();
  const viewGroups: HomeQuickLinkGroup[] = groups.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.links.map((link) => ({
      key: link.to,
      label: link.label,
      icon: <AppNavIcon name={FEATURE_ICON[link.feature]} size={28} color={colors.danger} />,
      onPress: () => router.push(link.to as never),
    })),
  }));
  return <HomeQuickLinksView groups={viewGroups} />;
}
