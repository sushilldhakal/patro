/** Milliseconds `timeZone` is ahead of UTC at `date` (minute precision). */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** The instant at which the wall clock in `timeZone` reads `dateAd` `hhmm`. */
export function zonedInstant(dateAd: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateAd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const naive = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  let instant = naive - zoneOffsetMs(new Date(naive), timeZone);
  const corrected = naive - zoneOffsetMs(new Date(instant), timeZone);
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

/** Day of week (0 = Sunday) of a civil date — independent of any timezone. */
export function weekdayOf(dateAd: string): number {
  const [y, m, d] = dateAd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function todayIn(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
