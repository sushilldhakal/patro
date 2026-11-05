/**
 * The day's times a new event or reminder can be set to, besides a साइत: the शुभ समय (अभिजित्,
 * विजय, गोधूलि, अमृत काल, ब्रह्म मुहूर्त …), the अशुभ समय (राहु काल, यमगण्ड, गुलिक, दुर्मुहूर्त,
 * वर्ज्यम्, बाण …) — a reminder when one starts is as useful as one for a good time — and the
 * पुष्कर नवांश moments of each lagna. All from the day's panchanga, so they match its page.
 *
 * The panchanga day runs sunrise to sunrise: a time before sunrise (ब्रह्म मुहूर्त ४:३२) or past
 * 24:00 (निशिता २४:१३) is on the next calendar date, and so is an end before its start.
 */
import type { PanchangaDay } from "@vedic-patro/api-client";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { getAuspiciousWindows, getInauspiciousWindows, getSunrise, getUdayaLagna } from "@vedic-patro/read-models/panchanga/panchanga-format";

export type DayTimePickSource = "shubh" | "ashubh" | "pushkara";

export interface DayTimePick {
  /** Unique within the day. */
  id: string;
  source: DayTimePickSource;
  /** The window's key (`abhijit`, `rahu_kalam` …) or, for पुष्कर, the lagna's English name. */
  key: string;
  nameNe: string;
  nameEn: string;
  /** Local wall clock in the place's zone, "YYYY-MM-DD" and "HH:MM" (end on the next date past midnight). */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export interface DayTimePicks {
  shubh: DayTimePick[];
  ashubh: DayTimePick[];
  pushkara: DayTimePick[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "13:09", "1:09 PM", "24:13" → minutes from the date's midnight (24:13 → 1453); null if unreadable. */
export function clockMinutes(raw: string | null | undefined): number | null {
  const m = raw?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes from `date`'s midnight → that wall clock's date and "HH:MM". */
function at(date: string, minutes: number): { date: string; time: string } {
  const days = Math.floor(minutes / 1440);
  const t = minutes - days * 1440;
  return { date: days ? shiftDate(date, days) : date, time: `${pad(Math.floor(t / 60))}:${pad(t % 60)}` };
}

/** Minutes on the panchanga day's own clock: before sunrise is the next morning. */
function onDay(minutes: number, sunrise: number | null): number {
  return sunrise != null && minutes < sunrise ? minutes + 1440 : minutes;
}

function windowPicks(
  source: "shubh" | "ashubh",
  rows: { key: string; nameNe: string; nameEn: string; start: string; end: string; tillFullNight?: boolean }[],
  date: string,
  sunrise: number | null,
): DayTimePick[] {
  const out: (DayTimePick & { sort: number })[] = [];
  rows.forEach((w, i) => {
    const s = clockMinutes(w.start);
    if (s == null) return;
    const start = onDay(s, sunrise);
    const e = clockMinutes(w.end);
    let end = w.tillFullNight || e == null ? (sunrise ?? 360) + 1440 : onDay(e, sunrise);
    while (end <= start) end += 1440;
    const a = at(date, start);
    const b = at(date, end);
    out.push({
      id: `${source}:${w.key}:${i}`,
      source,
      key: w.key,
      nameNe: w.nameNe,
      nameEn: w.nameEn,
      startDate: a.date,
      startTime: a.time,
      endDate: b.date,
      endTime: b.time,
      sort: start,
    });
  });
  return out.sort((x, y) => x.sort - y.sort).map(({ sort: _sort, ...pick }) => pick);
}

/**
 * Each पुष्कर नवांश moment of the day's lagnas. The navamsha is a ninth of the sign, so it lasts
 * about a ninth of the lagna's span (12–15 minutes); that is the pick's end.
 */
function pushkaraPicks(p: PanchangaDay, date: string, sunrise: number | null): DayTimePick[] {
  const out: (DayTimePick & { sort: number })[] = [];
  (getUdayaLagna(p) ?? []).forEach((row, r) => {
    const spanStart = clockMinutes(row.start_local_time_short ?? row.start_local_time);
    const spanEnd = clockMinutes(row.end_local_time_short ?? row.end_local_time);
    let span = spanStart != null && spanEnd != null ? spanEnd - spanStart : null;
    if (span != null && span <= 0) span += 1440;
    const length = span != null && span > 0 ? Math.max(5, Math.round(span / 9)) : 12;
    (row.pushkara_navamsha ?? []).forEach((hit, h) => {
      const m = clockMinutes(hit.local_time_short ?? hit.local_time);
      if (m == null) return;
      const start = onDay(m, sunrise);
      const a = at(date, start);
      const b = at(date, start + length);
      const en = row.name ?? row.name_ne ?? "Lagna";
      out.push({
        id: `pushkara:${en}:${r}:${h}`,
        source: "pushkara",
        key: en.toLowerCase(),
        nameNe: row.name_ne ?? en,
        nameEn: en,
        startDate: a.date,
        startTime: a.time,
        endDate: b.date,
        endTime: b.time,
        sort: start,
      });
    });
  });
  return out.sort((x, y) => x.sort - y.sort).map(({ sort: _sort, ...pick }) => pick);
}

/** The day's शुभ / अशुभ / पुष्कर times; `date` is the panchanga's Gregorian date ("YYYY-MM-DD"). */
export function buildDayTimePicks(p: PanchangaDay, date: string): DayTimePicks {
  const sunrise = clockMinutes(getSunrise(p));
  return {
    shubh: windowPicks("shubh", getAuspiciousWindows(p), date, sunrise),
    ashubh: windowPicks("ashubh", getInauspiciousWindows(p), date, sunrise),
    pushkara: pushkaraPicks(p, date, sunrise),
  };
}
