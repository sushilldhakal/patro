/** Wall-clock parts for a timezone (24h). */
export function getZonedTimeParts(
  date: Date,
  timeZone: string
): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hour = read("hour");
  if (hour === 24) hour = 0;

  return { hour, minute: read("minute"), second: read("second") };
}

/** Minutes since local midnight in the given timezone. */
export function minutesSinceMidnightInTimezone(
  date: Date,
  timeZone: string,
  includeSeconds = false
): number {
  const { hour, minute, second } = getZonedTimeParts(date, timeZone);
  return hour * 60 + minute + (includeSeconds ? second / 60 : 0);
}

/** YYYY-MM-DD for "today" in the given timezone. */
export function todayAdStringInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function resolveTimeZone(
  apiTimezone?: string | null,
  locationTimezone?: string | null
): string {
  return (
    apiTimezone ??
    locationTimezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}
