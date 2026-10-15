import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroHeaderLocation as View, type PatroHeaderLocationProps } from "@vedic-patro/ui/kit/shell";

export type { PatroHeaderLocationProps };

/** Supplies the browser geolocation. The drawing is `@vedic-patro/ui/kit/shell`. */
export function PatroHeaderLocation(props: Omit<PatroHeaderLocationProps, "locate">) {
  return <View {...props} locate={locateDevice} />;
}
