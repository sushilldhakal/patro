import { MoonPhaseIcon } from "@vedic-patro/ui/kit/weather";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import {
  TodayHighlightCard as TodayHighlightCardView,
  type TodayHighlightCardProps,
} from "@vedic-patro/ui/kit/shell";

type Props = Omit<TodayHighlightCardProps, "moon" | "className"> & {
  selectedDay: CalendarDay | null;
  p?: PanchangaDay;
};

/** Binds the app's moon drawing to the shared card. */
export function TodayHighlightCard(props: Props) {
  return (
    <TodayHighlightCardView
      {...props}
      moon={({ tithiIndex }) => <MoonPhaseIcon tithiIndex={tithiIndex} size={32} />}
    />
  );
}
