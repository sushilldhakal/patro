import { View } from "react-native";
import type { LocationParams, PanchangaDay } from "@/lib/api";
import { GhatiClock } from "@/components/panchanga/GhatiClock";
import { PlanetEventsPanel } from "@/components/panchanga/PlanetEventsPanel";
import { SunriseD1ChartPanel } from "@/components/panchanga/SunriseD1ChartPanel";

type Props = {
  sunrise?: string;
  sunset?: string;
  timezone: string;
  chartData?: PanchangaDay | null;
  chartAd: string;
  location: LocationParams;
};

export function PanchangaAsidePanels({
  sunrise,
  sunset,
  timezone,
  chartData,
  chartAd,
  location,
}: Props) {
  return (
    <View className="gap-4">
      <GhatiClock sunrise={sunrise} sunset={sunset} timezone={timezone} />
      {chartData ? <SunriseD1ChartPanel p={chartData} /> : null}
      <PlanetEventsPanel dateAd={chartAd} location={location} />
    </View>
  );
}
