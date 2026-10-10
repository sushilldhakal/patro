import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { RituSeasons } from "@/components/RituSeasons";
import { useLocale } from "@/lib/i18n";
import { displayLocationLabel, usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useThemeColors } from "@/lib/theme-context";

export default function RituScreen() {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  const subtitle = `${pick("सायन ऋतु · विषुव–अयनान्त", "Tropical seasons · equinox–solstice")}${
    locationLabel ? ` · ${locationLabel}` : ""
  }`;

  return (
    <AppShell title="" showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="leaf-outline" size={28} color={colors.secondary} />}
        title={pick("ऋतु", "Season")}
        subtitle={subtitle}
      />
      {/* Web puts the place picker on its own row under the header. */}
      <View className="mb-4 self-start">
        <LocationSelector location={location} onLocationChange={setLocation} />
      </View>

      <RituSeasons location={location} />

      <LearnMoreCard className="mt-7" slugs={["sidereal-vs-tropical"]} />
    </AppShell>
  );
}
