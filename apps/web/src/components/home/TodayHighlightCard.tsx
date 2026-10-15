import { Sunrise, Sunset } from "lucide-react";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import type { CalendarMonthContext } from "@/components/CalendarView";
import { type CalendarDay, type PanchangaDay } from "@/lib/api";
import { useTodayHighlight } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  monthContext: CalendarMonthContext;
  p?: PanchangaDay;
  className?: string;
};

/**
 * The selected day's date, festival, moon, sunrise and sunset. Rendered once,
 * inside today's panchanga card, on every screen size.
 */
export function TodayHighlightCard({ selectedDay, selectedAdDate, todayAd, monthContext, p, className }: Props) {
  const h = useTodayHighlight({
    selectedDay,
    selectedAdDate,
    todayAd,
    isAdCalendar: monthContext.isAdCalendar,
    year: monthContext.isAdCalendar ? monthContext.adYear : monthContext.year,
    month: monthContext.isAdCalendar ? monthContext.adMonth : monthContext.month,
    p,
  });

  return (
    <div id="home-today-highlight" className={cn(homeClasses.highlight, className)}>
      <div className={homeClasses.highlightTop}>
        <div className={cn(homeClasses.highlightDay, "min-w-[3.4rem] text-[2.75rem]")}>{h.day}</div>
        <div className={homeClasses.highlightDate}>
          <div className={homeClasses.highlightMonth}>{h.month}</div>
          <div className={homeClasses.highlightWeekday}>{h.weekday}</div>
          <div className={homeClasses.highlightCrossEra}>{h.crossEra}</div>
          {h.nepalSambat ? <div className={homeClasses.highlightNs}>{h.nepalSambat}</div> : null}
        </div>
      </div>

      <div className={homeClasses.highlightSpecial}>
        <div className={cn(homeClasses.highlightKicker, "text-xs")}>{h.kicker}</div>
        <div className={homeClasses.highlightTitle}>{h.title}</div>
        {h.subtitle ? <div className={homeClasses.highlightSubtitle}>{h.subtitle}</div> : null}

        {h.phase && h.tithiIndex != null ? (
          <div className={cn(homeClasses.highlightMoon, homeClasses.highlightMoonText)}>
            <CalendarMoonPhaseIcon tithiIndex={h.tithiIndex} className="size-6" title={h.phase} />
            <span>{h.phase}</span>
          </div>
        ) : null}

        {h.sunrise || h.sunset ? (
          <div className={cn(homeClasses.highlightSun, homeClasses.highlightMoonText)}>
            {h.sunrise ? (
              <span className={homeClasses.highlightSunItem}>
                <Sunrise className="size-4 text-warning" aria-hidden />
                <span className={homeClasses.highlightSunText}>{h.sunrise}</span>
              </span>
            ) : null}
            {h.sunset ? (
              <span className={homeClasses.highlightSunItem}>
                <Sunset className="size-4 text-warning" aria-hidden />
                <span className={homeClasses.highlightSunText}>{h.sunset}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
