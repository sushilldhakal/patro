import { useRouter } from "expo-router";
import { FEATURE_ICON } from "@vedic-patro/icons";
import { useHomeQuickLinks } from "@vedic-patro/features/home";
import { HomeQuickLinks as HomeQuickLinksView, type HomeQuickLinkGroup } from "@vedic-patro/ui/kit/shell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import { useCurrentRitu } from "@/lib/ritu-display";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useThemeColors } from "@/lib/theme-context";

const ICON_SIZE = 28;

/** The current season's emoji, as on the website; the sprout until it is known. */
function RituIcon({ location, color }: { location: PanchangaLocation; color: string }) {
  const { current, loading } = useCurrentRitu(location);
  if (!loading && current?.emoji) return <Text className="text-base">{current.emoji}</Text>;
  return <AppNavIcon name={FEATURE_ICON.ritu} size={ICON_SIZE} color={color} />;
}

/** Shortcut tiles. The drawing is `@vedic-patro/ui/kit/shell`; this file opens the route. */
export function HomeQuickLinks({ location }: { location: PanchangaLocation }) {
  const router = useRouter();
  const colors = useThemeColors();
  const { groups } = useHomeQuickLinks();
  const viewGroups: HomeQuickLinkGroup[] = groups.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.links.map((link) => ({
      key: link.to,
      label: link.label,
      icon:
        link.feature === "ritu" ? (
          <RituIcon location={location} color={colors.danger} />
        ) : (
          <AppNavIcon name={FEATURE_ICON[link.feature]} size={ICON_SIZE} color={colors.danger} />
        ),
      onPress: () => router.push(link.to as never),
    })),
  }));
  return <HomeQuickLinksView groups={viewGroups} />;
}
