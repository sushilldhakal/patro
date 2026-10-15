import { View } from "react-native";
import { useRouter } from "expo-router";
import type { LocationParams, PanchangaDay } from "@/lib/api";
import { PlanetEventsPanel, SunriseD1ChartPanel } from "@vedic-patro/ui/kit/panchanga";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { GhatiClock } from "@/components/panchanga/GhatiClock";

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
  /** Route for the planet events' "view more" link; no link without it. */
  planetEventsHref?: string;
};

export function PanchangaAsidePanels({
  sunrise,
  sunset,
  timezone,
  chartData,
  jdUt,
  refDateAd,
  location,
  planetEventsHref,
}: Props) {
  const router = useRouter();
  return (
    <View className="gap-4">
      <GhatiClock sunrise={sunrise} sunset={sunset} timezone={timezone} />
      {chartData ? (
        <SunriseD1ChartPanel
          p={chartData}
          renderChart={(houses) => <D1Chart houses={houses} />}
          renderLegend={() => <GrahaStatusLegend className="mt-1" />}
        />
      ) : null}
      {jdUt != null && refDateAd ? (
        <PlanetEventsPanel
          jdUt={jdUt}
          refDateAd={refDateAd}
          location={location}
          onViewMore={planetEventsHref ? () => router.push(planetEventsHref as never) : undefined}
        />
      ) : null}
    </View>
  );
}
