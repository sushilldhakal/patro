import { useEffect, useRef } from "react";
import {
  getCalendarSystem,
  subscribeCalendarSystem,
  type CalendarSystem,
} from "@vedic-patro/domain/calendar/calendar-system";

/**
 * Run `onSwitch` when the reader flips the calendar system (BS/AD) — and only then.
 *
 * Subscribes to the store directly instead of watching a React value: the
 * preference is loaded before the first render, but a hydrating page still renders
 * the server default (BS) first, and that must not read as a switch. Browse hooks
 * use this to move the page they show into the new calendar; a URL that names an
 * era on its own is left alone.
 */
export function useOnCalendarSwitch(onSwitch: (calendar: CalendarSystem) => void): void {
  const latest = useRef(onSwitch);
  useEffect(() => {
    latest.current = onSwitch;
  });
  useEffect(() => {
    let seen = getCalendarSystem();
    return subscribeCalendarSystem(() => {
      const next = getCalendarSystem();
      if (next === seen) return;
      seen = next;
      latest.current(next);
    });
  }, []);
}
