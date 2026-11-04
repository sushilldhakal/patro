/**
 * Wall-clock times in a named zone. An event is written as a date and a time in the place's zone
 * (a साइत's window is Nepal's local time), and stored as the instant they name.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Offset of `zone` from UTC at `utcMs`, in minutes (Kathmandu: +345). */
function zoneOffsetMinutes(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
}

/** "2026-11-20" + "10:15" in `zone` → the instant, as ISO with Z. */
export function zonedToIso(date: string, time: string, zone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, hh ?? 0, mm ?? 0);
  const first = guess - zoneOffsetMinutes(guess, zone) * 60000;
  // Across a DST change the offset at the answer can differ from the guess's; one more pass settles it.
  const ms = guess - zoneOffsetMinutes(first, zone) * 60000;
  return new Date(ms).toISOString();
}

/** An instant → its date and time in `zone`. */
export function isoToZoned(iso: string, zone: string): { date: string; time: string } {
  const ms = Date.parse(iso);
  const local = new Date(ms + zoneOffsetMinutes(ms, zone) * 60000);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/** Today's date in `zone`. */
export function todayIn(zone: string): string {
  return isoToZoned(new Date().toISOString(), zone).date;
}

/** "10:15" + minutes, wrapping past midnight (the date is the caller's to move). */
export function addMinutes(time: string, minutes: number): { time: string; dayShift: number } {
  const [h, m] = time.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const dayShift = Math.floor(total / 1440);
  const t = ((total % 1440) + 1440) % 1440;
  return { time: `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, dayShift };
}

/** "2026-11-20" moved by `days`. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
