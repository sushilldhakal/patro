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
  /** Civil-day Julian identity (`jd_ut`) for the planet events. */
  jdUt?: number;
  /** Civil `date_ad` the planet events count days from. */
  refDateAd?: string;
  location: LocationParams;
};

export function PanchangaAsidePanels({
  sunrise,
  sunset,
  timezone,
  chartData,
  jdUt,
  refDateAd,
  location,
}: Props) {
  return (
    <View className="gap-4">
      <GhatiClock sunrise={sunrise} sunset={sunset} timezone={timezone} />
      {chartData ? <SunriseD1ChartPanel p={chartData} /> : null}
      {jdUt != null && refDateAd ? <PlanetEventsPanel jdUt={jdUt} refDateAd={refDateAd} location={location} /> : null}
    </View>
  );
}
