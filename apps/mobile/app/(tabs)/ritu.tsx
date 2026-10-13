import { View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { AppShell } from "@/components/AppShell";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { RituSeasons } from "@/components/RituSeasons";
import { useLocale } from "@/lib/i18n";
import { displayLocationLabel, usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

export default function RituScreen() {
  const { pick, lang } = useLocale();
  const { colors, isDark } = useTheme();
  const { location, setLocation } = usePanchangaLocation();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  const subtitle = `${pick("सायन ऋतु · विषुव–अयनान्त", "Tropical seasons · equinox–solstice")}${
    locationLabel ? ` · ${locationLabel}` : ""
  }`;

  return (
    <AppShell title="" showHeader={false}>
      {/* Web: header and the compact place picker share a wrapping row. */}
      <View className={cn("mb-8 flex-row flex-wrap", rituClasses.headerRow)}>
        <PatroPageHeader
          className="mb-0"
          icon={<AppNavIcon name="sprout" size={28} color={isDark ? colors.primary : colors.secondary} />}
          title={pick("ऋतु", "Season")}
          subtitle={subtitle}
        />
        <LocationSelector location={location} onLocationChange={setLocation} />
      </View>

      <View className="mb-8">
        <RituSeasons location={location} />
      </View>

      <LearnMoreCard slugs={["sidereal-vs-tropical"]} />
    </AppShell>
  );
}
