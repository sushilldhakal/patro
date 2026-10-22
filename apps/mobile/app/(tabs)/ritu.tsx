import { View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { AppShell } from "@/components/AppShell";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { RituSeasons } from "@/components/RituSeasons";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useTheme } from "@/lib/theme-context";
import { useRituScreen } from "@vedic-patro/features/ritu";

export default function RituScreen() {
  const { colors, isDark } = useTheme();
  const { location, setLocation } = usePanchangaLocation();
  const ritu = useRituScreen(location);

  return (
    <AppShell title="" showHeader={false}>
      <PatroPageHeader
        className="mb-4"
        icon={<AppNavIcon name="leaf" size={28} color={isDark ? colors.primary : colors.secondary} />}
        title={ritu.title}
        subtitle={ritu.subtitle}
      />

      {/* The place picker shares the why-link's row: each on a row of its own left a tall gap above the cards. */}
      <View className="mb-8">
        <RituSeasons location={location} toolbarStart={<PatroHeaderLocation location={location} onLocationChange={setLocation} />} />
      </View>

      <LearnMoreCard slugs={ritu.learnSlugs} />
    </AppShell>
  );
}
