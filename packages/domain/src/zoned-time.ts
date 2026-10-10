/**
 * A calendar year as arithmetic wants it, from formatted parts.
 *
 * `Intl` prints proleptic years before 1 CE as a positive number with a `BC`
 * era beside it — 5057 BCE reads as "5058 BC" — so a reader that takes only the
 * digits lands ten millennia away from the instant it was handed. The
 * astronomical year is `1 − n`: 1 BC is year 0, 2 BC is −1.
 */
function astronomicalYear(year: number, era: string | undefined): number {
  return era && /^b/i.test(era) ? 1 - year : year;
}

/**
 * `Date.UTC`, without the two-digit-year rule.
 *
 * `Date.UTC(50, …)` means 1950, which is not what a calendar picker offering
 * year 50 asked for. Years outside 0–99 are unaffected, negatives included.
 */
function utcMsFromParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number {
  const ms = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  if (year < 0 || year > 99) return ms;
  const d = new Date(ms);
  d.setUTCFullYear(year);
  return d.getTime();
}

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

/**
 * How far ahead of UT the zone stands at `date`, in ms.
 *
 * Read off the formatter rather than a table: it is the only thing that knows
 * what the offset actually was on that date, DST and historic shifts included.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    era: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hour = read("hour");
  if (hour === 24) hour = 0;

  /* The era matters here: without it a BCE instant reads back as the same
     number of years *after* Christ, and the "offset" that comes out of the
     subtraction is ten thousand years wide — which is how a पू.वि.सं. date in
     the sky landed in 35,000 BCE with the obliquity to match. */
  const year = astronomicalYear(read("year"), parts.find((p) => p.type === "era")?.value);

  const wallAsUtc = utcMsFromParts(year, read("month"), read("day"), hour, read("minute"), read("second"));
  // Whole seconds on both sides, so a fractional input cannot leak into the offset.
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * A wall-clock reading in some place → the instant it names.
 *
 * The inverse of {@link getZonedTimeParts}, and the thing to reach for whenever
 * a user picks "10:30 in Kathmandu": `new Date(y, m, d, h, min)` would build
 * 10:30 on *this device's* clock, which is a different moment entirely for
 * anyone outside that zone.
 *
 * Solved by iteration because the offset depends on the answer: guess the
 * instant by reading the wall time as UT, then correct by the offset in force
 * there. A second pass settles the DST edges, where the first guess can land on
 * the wrong side of a jump.
 */
export function zonedWallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
  second = 0
): Date {
  const wallAsUtc = utcMsFromParts(year, month, day, hour, minute, second);
  const first = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  return new Date(wallAsUtc - zoneOffsetMs(new Date(first), timeZone));
}

export function getZonedDateTimeParts(
  date: Date,
  timeZone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const t = getZonedTimeParts(date, timeZone);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    era: "short",
  });
  const bag: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  let year = Number(bag.year);
  if (bag.era === "BC" || bag.era === "BCE") year = 1 - year;
  return {
    year,
    month: Number(bag.month),
    day: Number(bag.day),
    hour: t.hour,
    minute: t.minute,
    second: t.second,
  };
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

/**
 * HH:MM — the wall clock a place is reading right now.
 *
 * The `24:00` midnight hour is already folded back to `00` by
 * {@link getZonedTimeParts}, so this is safe to hand straight to a time picker.
 */
export function clockStringInTimezone(
  date: Date,
  timeZone: string,
  withSeconds = false,
): string {
  const { hour, minute, second } = getZonedTimeParts(date, timeZone);
  const hm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return withSeconds ? `${hm}:${String(second).padStart(2, "0")}` : hm;
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
