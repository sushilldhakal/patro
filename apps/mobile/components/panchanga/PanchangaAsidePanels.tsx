import { View } from "react-native";
import { useRouter } from "expo-router";
import type { LocationParams, PanchangaDay } from "@/lib/api";
import { PlanetEventsPanel, SunriseD1ChartPanel } from "@vedic-patro/ui/kit/panchanga";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { GhatiClock } from "@vedic-patro/ui/kit/panchanga";

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
  /** Room for two columns (a tablet in portrait, under the page): the chart and the events side by side. */
  twoColumn?: boolean;
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
  twoColumn = false,
}: Props) {
  const router = useRouter();
  const columnStyle = twoColumn ? { flex: 1, minWidth: 0 } : undefined;
  return (
    <View className="gap-4">
      <GhatiClock sunrise={sunrise} sunset={sunset} timezone={timezone} />
      <View className={twoColumn ? "flex-row items-start gap-4" : "gap-4"}>
        {chartData ? (
          <View style={columnStyle}>
            <SunriseD1ChartPanel
              p={chartData}
              renderChart={(houses) => <D1Chart houses={houses} />}
              renderLegend={() => <GrahaStatusLegend className="mt-1" />}
            />
          </View>
        ) : null}
        {jdUt != null && refDateAd ? (
          <View style={columnStyle}>
            <PlanetEventsPanel
              jdUt={jdUt}
              refDateAd={refDateAd}
              location={location}
              onViewMore={planetEventsHref ? () => router.push(planetEventsHref as never) : undefined}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
