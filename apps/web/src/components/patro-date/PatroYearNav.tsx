import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroYearNav as View, type PatroYearNavProps } from "@vedic-patro/ui/kit/shell";

export type { PatroYearNavProps };

/** Year navigation. The drawing is `@vedic-patro/ui/kit/shell`. */
export function PatroYearNav(props: Omit<PatroYearNavProps, "locate">) {
  return <View {...props} locate={locateDevice} />;
}
