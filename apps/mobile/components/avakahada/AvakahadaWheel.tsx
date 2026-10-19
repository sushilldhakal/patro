import type { Gana } from "@vedic-patro/domain/avakahada-data";
import { illustration, wheel } from "@vedic-patro/design-tokens";
import { NOTO_DEVANAGARI_CHART, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvakahadaWheel as KitWheel, ZoomStageInsets, type AvakahadaWheelAssets } from "@vedic-patro/ui/kit/panchanga";

const assets: AvakahadaWheelAssets = {
  chartFont: NOTO_DEVANAGARI_CHART,
  regularFont: NOTO_DEVANAGARI_REGULAR,
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
  return (
    <ZoomStageInsets value={{ top: insets.top, bottom: insets.bottom }}>
      <KitWheel highlighted={highlighted} assets={assets} />
    </ZoomStageInsets>
  );
}

export default AvakahadaWheel;
export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/domain/avakahada-wheel";
export { AVAKAHADA_WHEEL_ROWS } from "@vedic-patro/ui/kit/panchanga";
