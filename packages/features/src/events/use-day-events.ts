import { useQuery } from "@tanstack/react-query";
import { listEvents, type CalendarEvent } from "@vedic-patro/api-client";

/** "YYYY-MM-DD" of an instant on the wall clock of `timeZone`. */
function localDate(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const utcDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};

/** Whether the event is on `date` ("YYYY-MM-DD"): its own span, or one of its repeats from its first day on. */
export function eventOccursOn(event: CalendarEvent, date: string): boolean {
  const first = localDate(event.starts_at, event.timezone);
  const last = localDate(event.ends_at, event.timezone);
  if (event.repeat === "never") return first <= date && date <= last;
  if (date < first) return false;
  const gap = utcDay(date) - utcDay(first);
  const dow = new Date(utcDay(date) * 86_400_000).getUTCDay();
  const [, fm, fd] = first.split("-").map(Number);
  const [, dm, dd] = date.split("-").map(Number);
  const monthsApart = (dm! - fm! + 12) % 12;
  switch (event.repeat) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "weekly":
      return gap % 7 === 0;
    case "fortnightly":
      return gap % 14 === 0;
    case "monthly":
      return dd === fd;
    case "quarterly":
      return dd === fd && monthsApart % 3 === 0;
    case "half_yearly":
      return dd === fd && monthsApart % 6 === 0;
    case "yearly":
      return dd === fd && dm === fm;
    default:
      return false;
  }
}

/** All of the signed-in user's events, tasks and appointments (one cached query shared by every view). */
export function useUserEvents(enabled: boolean) {
  const query = useQuery({
    queryKey: ["events", "all"],
    queryFn: () => listEvents(),
    enabled,
    staleTime: 60_000,
  });
  return { events: query.data ?? [], loading: enabled && query.isLoading };
}

/** The user's events on one day ("YYYY-MM-DD"), earliest first. */
export function eventsOnDate(all: CalendarEvent[], date: string): CalendarEvent[] {
  return all.filter((e) => eventOccursOn(e, date)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** The signed-in user's events, tasks and appointments on one day ("YYYY-MM-DD"), earliest first. */
export function useDayEvents(date: string | null | undefined, enabled: boolean) {
  const all = useUserEvents(enabled);
  return { events: date ? eventsOnDate(all.events, date) : [], loading: all.loading };
}
