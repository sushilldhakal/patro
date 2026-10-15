import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import type { CalendarMonthContext } from "@/components/CalendarView";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { TodayHighlightCard as TodayHighlightCardView } from "@vedic-patro/ui/kit/shell";

type Props = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  monthContext: CalendarMonthContext;
  p?: PanchangaDay;
  className?: string;
};

/** Binds the website's month context and moon drawing to the shared card. */
export function TodayHighlightCard({ monthContext, ...props }: Props) {
  return (
    <TodayHighlightCardView
      {...props}
      isAdCalendar={monthContext.isAdCalendar}
      year={monthContext.isAdCalendar ? monthContext.adYear : monthContext.year}
      month={monthContext.isAdCalendar ? monthContext.adMonth : monthContext.month}
      moon={({ tithiIndex, title }) => <CalendarMoonPhaseIcon tithiIndex={tithiIndex} className="size-6" title={title} />}
    />
  );
}
