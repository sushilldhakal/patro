import type { Gana } from "@vedic-patro/domain/jyotish/avakahada-data";
import { illustration, wheel } from "@vedic-patro/design-tokens";
import { NOTO_DEVANAGARI_CHART, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";
import { AvakahadaWheel as KitWheel, type AvakahadaWheelAssets } from "@vedic-patro/ui/kit/panchanga";

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
  return <KitWheel highlighted={highlighted} assets={assets} />;
}

export default AvakahadaWheel;
export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/domain/jyotish/avakahada-wheel";
export { AVAKAHADA_WHEEL_ROWS } from "@vedic-patro/ui/kit/panchanga";
