import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroYearNavBlock as View, type PatroYearNavBlockProps } from "@vedic-patro/ui/kit/shell";

export type { PatroYearNavBlockProps };

/** Year navigation with the page spacing. The drawing is `@vedic-patro/ui/kit/shell`. */
export function PatroYearNavBlock(props: Omit<PatroYearNavBlockProps, "locate">) {
  return <View {...props} locate={locateDevice} />;
}
