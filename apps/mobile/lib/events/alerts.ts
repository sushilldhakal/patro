import { tFor } from "@vedic-patro/i18n/runtime";
import type { PlannedNotification } from "@/lib/notifications/plan";
import type { CalendarEvent } from "./api";
import { isoToZoned, shiftDate, zonedToIso } from "./time";

/** How far ahead event alerts are booked; the next sync books further. */
const HORIZON_DAYS = 30;
const DAY_MS = 86_400_000;

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = (y! * 12 + (m! - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d!, last)).padStart(2, "0")}`;
}

/** 0 Sunday … 6 Saturday of a "YYYY-MM-DD" date. */
const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
};

/** The `i`-th candidate day of a repeat; weekdays / weekends step a day at a time and skip the rest. */
function candidateDay(repeat: CalendarEvent["repeat"], date: string, i: number): string | null {
  switch (repeat) {
    case "daily":
      return shiftDate(date, i);
    case "weekdays":
    case "weekends": {
      const day = shiftDate(date, i);
      const wd = weekdayOf(day);
      const weekend = wd === 0 || wd === 6;
      return (repeat === "weekends") === weekend ? day : null;
    }
    case "weekly":
      return shiftDate(date, 7 * i);
    case "fortnightly":
      return shiftDate(date, 14 * i);
    case "monthly":
      return addMonths(date, i);
    case "quarterly":
      return addMonths(date, 3 * i);
    case "half_yearly":
      return addMonths(date, 6 * i);
    default:
      return addMonths(date, 12 * i);
  }
}

/** Start instants of `event` from `fromMs` up to the horizon (a repeat keeps its wall-clock time). */
export function occurrences(event: CalendarEvent, fromMs: number, untilMs: number): number[] {
  const first = Date.parse(event.starts_at);
  if (event.repeat === "never") return first >= fromMs && first <= untilMs ? [first] : [];
  const { date, time } = isoToZoned(event.starts_at, event.timezone);
  const out: number[] = [];
  for (let i = 0; i < 800 && out.length < 40; i += 1) {
    const day = candidateDay(event.repeat, date, i);
    if (day == null) continue;
    const at = Date.parse(zonedToIso(day, time, event.timezone));
    if (at > untilMs) break;
    if (at >= fromMs) out.push(at);
  }
  return out;
}

/** Local notifications for the user's events: each alert of each occurrence in the next 30 days. */
export function planEventAlerts(events: CalendarEvent[], now: Date, lang: "ne" | "en"): PlannedNotification[] {
  const nowMs = now.getTime();
  const until = nowMs + HORIZON_DAYS * DAY_MS;
  const out: PlannedNotification[] = [];
  for (const event of events) {
    if (event.alerts.length === 0) continue;
    const maxLead = Math.max(...event.alerts) * 60_000;
    for (const start of occurrences(event, nowMs, until + maxLead)) {
      for (const lead of event.alerts) {
        const fireAt = start - lead * 60_000;
        if (fireAt <= nowMs || fireAt > until) continue;
        const { time } = isoToZoned(new Date(start).toISOString(), event.timezone);
        out.push({
          id: `event:${event.id}:${start}:${lead}`,
          fireAt: new Date(fireAt),
          title: event.title,
          body:
            lead === 0
              ? tFor(lang, "events.alert_now", { time })
              : tFor(lang, "events.alert_body", { time, minutes: String(lead) }),
          channel: "reminders",
          data: { kind: "event", eventId: event.id, url: "/reminders" },
        });
      }
    }
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
