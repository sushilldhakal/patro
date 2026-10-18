import type { Gana } from "@vedic-patro/domain/jyotish/avakahada-data";
import { AvakahadaWheel as KitWheel } from "@vedic-patro/ui/kit/panchanga";

const GANA_FILL: Record<Gana, string> = {
  देव: "var(--av-gana-dev)",
  नर: "var(--av-gana-nar)",
  राक्षस: "var(--av-gana-rak)",
};

type Props = {
  highlighted?: Parameters<typeof KitWheel>[0]["highlighted"];
};

/** Gana fills stay here so the kit file does not embed those names. */
export function AvakahadaWheel({ highlighted }: Props) {
  return <KitWheel highlighted={highlighted} ganaFill={GANA_FILL} />;
}

export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/domain/jyotish/avakahada-wheel";
export { AVAKAHADA_WHEEL_ROWS } from "@vedic-patro/ui/kit/panchanga";
