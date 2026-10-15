import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroMonthYearNav as View, type PatroMonthYearNavProps } from "@vedic-patro/ui/kit/shell";

export type { PatroMonthYearNavProps };

/** Month + year navigation. The drawing is `@vedic-patro/ui/kit/shell`. */
export function PatroMonthYearNav(props: Omit<PatroMonthYearNavProps, "locate">) {
  return <View {...props} locate={locateDevice} />;
}
