import { memo, type ComponentProps } from "react";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand, neutral, withAlpha } from "@vedic-patro/design-tokens";
import Ketu from "@/assets/graha/ketu.svg";
import Rahu from "@/assets/graha/rahu.svg";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { WheelPanel } from "@/components/panchanga/WheelPanel";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { NOTO_DEVANAGARI_CHART } from "@/lib/fonts";
import { fetchPanchangaAtTime, panchangaKeys } from "@/lib/api";
import { PanchangaWheel as KitWheel, type WheelAtTimeClient, type WheelChartAssets } from "@vedic-patro/ui/kit/panchanga";

const chartAssets: WheelChartAssets = {
  fontFamily: NOTO_DEVANAGARI_CHART,
  skyTop: {
    sun: require("@/assets/sky3d/top/sun.png"),
    moon: require("@/assets/sky3d/top/moon.png"),
    mars: require("@/assets/sky3d/top/mars.png"),
    mercury: require("@/assets/sky3d/top/mercury.png"),
    jupiter: require("@/assets/sky3d/top/jupiter.png"),
    venus: require("@/assets/sky3d/top/venus.png"),
    saturn: require("@/assets/sky3d/top/saturn.png"),
  },
  earthTop: require("@/assets/sky3d/top/earth.png"),
  nodeIcons: [Rahu, Ketu],
};

const atTime: WheelAtTimeClient = {
  queryKey: (query) => panchangaKeys.atTime(query.datetime ?? "", query.locationParams),
  queryFn: (query) => fetchPanchangaAtTime(query.datetime ?? "", query.locationParams),
};

type Props = Omit<
  ComponentProps<typeof KitWheel>,
  "chartAssets" | "atTime" | "renderSkySheet" | "renderRashiPanel" | "renderScrubber" | "safeTop" | "safeBottom" | "loadingMark"
>;

function PanchangaWheelImpl(props: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KitWheel
      {...props}
      chartAssets={chartAssets}
      atTime={atTime}
      // The screen's status line already says what is loading.
      loadingMark={<VedicPatroLoader label={null} size={88} />}
      safeTop={insets.top}
      safeBottom={insets.bottom}
      safeRight={insets.right}
      renderScrubber={({ value, onChange, trackWidth }) => (
        <Slider
          style={{ width: trackWidth, height: 32 }}
          minimumValue={0}
          maximumValue={60}
          step={0.25}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={brand.vermilion}
          maximumTrackTintColor={withAlpha(neutral.white, 0.14)}
          thumbTintColor={brand.vermilion}
          accessibilityLabel="Time scrubber"
        />
      )}
      renderSkySheet={(slot) => (
        <SkyTimeSheet
          timeMs={slot.timeMs}
          zoneOffsetMs={slot.zoneOffsetMs}
          transport={slot.transport}
          onApplyMs={slot.onApplyMs}
          onClose={slot.onClose}
        />
      )}
      renderRashiPanel={(panel) => (
        <WheelPanel sel={panel.sel} open={panel.open} num={panel.num} onClose={panel.onClose} />
      )}
    />
  );
}

/** Fetch, sky sheet, rashi panel, and photographs stay in the app. The wheel drawing lives in the kit. */
export const PanchangaWheel = memo(PanchangaWheelImpl);
export type { WheelCalendarPick, YearWheelScrub } from "@vedic-patro/ui/kit/panchanga";
