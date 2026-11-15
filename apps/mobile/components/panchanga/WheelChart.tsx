import { memo, type ComponentProps } from "react";
import Ketu from "@/assets/graha/ketu.svg";
import Rahu from "@/assets/graha/rahu.svg";
import { NOTO_DEVANAGARI_CHART } from "@/lib/fonts";
import { WheelChart as KitWheelChart, type WheelChartAssets } from "@vedic-patro/ui/kit/panchanga";

const assets: WheelChartAssets = {
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

type Props = Omit<ComponentProps<typeof KitWheelChart>, "assets">;

function WheelChartImpl(props: Props) {
  return <KitWheelChart {...props} assets={assets} />;
}

/** Photographs, node SVGs, and the chart font stay in the app. The drawing lives in the kit. */
export const WheelChart = memo(WheelChartImpl);
export type { WheelHover, WheelPick } from "@vedic-patro/ui/kit/panchanga";
