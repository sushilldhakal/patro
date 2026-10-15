import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroCalendarHeader as View, type CalendarHeaderSegment, type PatroCalendarHeaderProps } from "@vedic-patro/ui/kit/shell";

export type { CalendarHeaderSegment, PatroCalendarHeaderProps };

/** Supplies the device geolocation. The drawing is `@vedic-patro/ui/kit/shell`. */
export function PatroCalendarHeader(props: Omit<PatroCalendarHeaderProps, "locate">) {
  return <View {...props} locate={locateDevice} />;
}
