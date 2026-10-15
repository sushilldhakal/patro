import { View } from "react-native";
import { FEATURE_ICON } from "@vedic-patro/icons";
import { QuickLinkSection } from "@/components/home/QuickLinkTile";
import { useHomeQuickLinks } from "@vedic-patro/features/home";

/** Shortcut tiles under the calendar — same two groups and order as the web home. */
export function HomeQuickLinks() {
  const { groups } = useHomeQuickLinks();

  return (
    <View className="gap-8">
      {groups.map((group) => (
        <QuickLinkSection
          key={group.id}
          title={group.title}
          links={group.links.map((link) => ({ href: link.to, label: link.label, icon: FEATURE_ICON[link.feature] }))}
        />
      ))}
    </View>
  );
}
