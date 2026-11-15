import type { Gana } from "@vedic-patro/domain/jyotish/avakahada-data";
import { illustration, wheel } from "@vedic-patro/design-tokens";
import { useMemo } from "react";
import { useSvgChartFonts } from "@/lib/svg-chart-font";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvakahadaWheel as KitWheel, ZoomStageInsets, type AvakahadaWheelAssets } from "@vedic-patro/ui/kit/panchanga";

const assetsBase: Omit<AvakahadaWheelAssets, "chartFont" | "regularFont"> = {
  ganaFill: {
    देव: illustration.green17,
    नर: wheel.sky0,
    राक्षस: illustration.red18,
  },
};

type Props = {
  highlighted?: Parameters<typeof KitWheel>[0]["highlighted"];
};

/** Fonts and gana fills stay in the app. The drawing lives in the kit. */
export function AvakahadaWheel({ highlighted }: Props) {
  const insets = useSafeAreaInsets();
  const fonts = useSvgChartFonts();
  const assets = useMemo<AvakahadaWheelAssets>(
    () => ({ ...assetsBase, chartFont: fonts.chart, regularFont: fonts.regular }),
    [fonts],
  );
  return (
    <ZoomStageInsets value={{ top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }}>
      <KitWheel highlighted={highlighted} assets={assets} />
    </ZoomStageInsets>
  );
}

export default AvakahadaWheel;
export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/drawing/jyotish/avakahada-wheel";
export { AVAKAHADA_WHEEL_ROWS } from "@vedic-patro/ui/kit/panchanga";
