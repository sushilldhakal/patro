import { View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { AppShell } from "@/components/AppShell";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { RituSeasons } from "@/components/RituSeasons";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useTheme } from "@/lib/theme-context";
import { useRituScreen } from "@vedic-patro/features/ritu";

export default function RituScreen() {
  const { colors, isDark } = useTheme();
  const { location } = usePanchangaLocation();
  const ritu = useRituScreen(location);

  return (
    <AppShell title="" showHeader={false}>
      <PatroPageHeader
        className="mb-4"
        icon={<AppNavIcon name="leaf" size={28} color={isDark ? colors.primary : colors.secondary} />}
        title={ritu.title}
        subtitle={ritu.subtitle}
      />

      {/* The place is picked from the toolbar's location button. */}
      <View className="mb-8">
        <RituSeasons location={location} />
      </View>
    </AppShell>
  );
}
