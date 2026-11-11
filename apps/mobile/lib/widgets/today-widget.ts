import { Platform } from "react-native";
import {
  fetchHolidays,
  fetchPanchanga,
  fetchPatroMonth,
  type Holiday,
  type LocationParams,
  type PatroDay,
} from "@vedic-patro/api-client";
import {
  AD_MONTHS_SHORT,
  AD_MONTHS_SHORT_NE,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  WEEKDAYS_EN,
  WEEKDAYS_NE,
  WEEKDAYS_SHORT,
  WEEKDAYS_SHORT_NE,
  bsFromCivilIso,
  formatDigits,
} from "@vedic-patro/domain/calendar/bs-calendar";
import { buildDayTimePicks, type DayTimePick } from "@vedic-patro/features/events";
import { tFor } from "@vedic-patro/i18n/runtime";
import { requireOptionalNativeModule } from "expo";
import { occurrences } from "@/lib/events/alerts";
import type { CalendarEvent } from "@/lib/events/api";
import { isoToZoned, shiftDate, todayIn } from "@/lib/events/time";
import type { TodayWidgetProps, WidgetCell, WidgetDay, WidgetItem } from "@/widgets/today-widget-props";

type Entry = { date: Date; props: TodayWidgetProps };
type Widget = { updateSnapshot(props: TodayWidgetProps): void; updateTimeline?(entries: Entry[]): void };
const widgets: Record<string, Widget | null | undefined> = {};

/**
 * A widget, loaded only when this build has expo-widgets' native module. A top-level import would
 * throw in builds made before the widget was added (app updates reach those too). MonthWidget is
 * only in builds from 1.2.2 (37) on; in older ones its registration is harmless and never drawn.
 */
function load(name: "TodayWidget" | "MonthWidget"): Widget | null {
  if (widgets[name] !== undefined) return widgets[name]!;
  widgets[name] = null;
  if (Platform.OS === "web" || !requireOptionalNativeModule("ExpoWidgets")) return null;
  try {
    widgets[name] =
      name === "TodayWidget"
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports
          (require("../../widgets/TodayWidget") as { default: Widget }).default
        : // eslint-disable-next-line @typescript-eslint/no-require-imports
          (require("../../widgets/MonthWidget") as { default: Widget }).default;
  } catch {
    widgets[name] = null;
  }
  return widgets[name]!;
}

/** First letter of a Devanagari word with its vowel signs: "सोम" → "सो". */
function firstSyllable(word: string): string {
  const chars = [...word];
  let out = chars[0] ?? "";
  for (let i = 1; i < chars.length; i += 1) {
    const c = chars[i]!.codePointAt(0)!;
    const isMark = (c >= 0x0900 && c <= 0x0903) || (c >= 0x093a && c <= 0x094f) || (c >= 0x0951 && c <= 0x0957);
    if (!isMark || c === 0x094d) break;
    out += chars[i];
  }
  return out;
}

const kindOf = (e: CalendarEvent): WidgetItem["kind"] => (e.kind === "task" || e.kind === "appointment" ? e.kind : "event");
const dayAt = (days: PatroDay[], iso: string) => days.find((d) => (d.ad_date ?? d.date) === iso);
const festivalNames = (d: PatroDay | undefined): string[] =>
  (d?.festivals ?? [])
    .map((f) => (typeof f === "string" ? f : (f.name_ne ?? f.name ?? f.name_en ?? "")))
    .filter(Boolean);

function holidayOn(holidays: Holiday[], iso: string): Holiday | undefined {
  return holidays.find((h) => h.is_public_holiday !== false && h.start_date <= iso && (h.end_date ?? h.start_date) >= iso);
}

type Built = {
  today: string;
  months: PatroDay[];
  holidays: Holiday[];
  /** Every शुभ / अशुभ window of the fetched panchanga days, by its own wall-clock date. */
  windows: { kind: "shubh" | "ashubh"; pick: DayTimePick }[];
};

async function gather(timezone: string, location: LocationParams | undefined): Promise<Built> {
  const today = todayIn(timezone);
  const bs = bsFromCivilIso(today);
  const next = bs.month === 12 ? { year: bs.year + 1, month: 1 } : { year: bs.year, month: bs.month + 1 };
  const prev = bs.month === 1 ? { year: bs.year - 1, month: 12 } : { year: bs.year, month: bs.month - 1 };
  // A panchanga day runs sunrise to sunrise: its pre-dawn windows fall on the next date, so the day
  // before today is fetched too.
  const dates = [shiftDate(today, -1), today, shiftDate(today, 1), shiftDate(today, 2)];
  const [p, m, n, hy, hy2, ...day] = await Promise.all([
    fetchPatroMonth(prev.year, prev.month).catch(() => null),
    fetchPatroMonth(bs.year, bs.month).catch(() => null),
    fetchPatroMonth(next.year, next.month).catch(() => null),
    fetchHolidays(bs.year, "bs", location).catch(() => null),
    next.year !== bs.year ? fetchHolidays(next.year, "bs", location).catch(() => null) : Promise.resolve(null),
    ...dates.map((d) => fetchPanchanga(d, "ad", location).catch(() => null)),
  ]);
  const windows: Built["windows"] = [];
  const seen = new Set<string>();
  dates.forEach((d, i) => {
    const row = day[i];
    if (!row) return;
    try {
      const all = buildDayTimePicks(row, d);
      for (const [kind, list] of [["shubh", all.shubh], ["ashubh", all.ashubh]] as const) {
        for (const pick of list) {
          const id = `${pick.key}|${pick.startDate}|${pick.startTime}`;
          if (seen.has(id)) continue;
          seen.add(id);
          windows.push({ kind, pick });
        }
      }
    } catch {
      /* the list just leaves the muhurta out */
    }
  });
  // A window the server splits at sunrise (अमृत काल 04:47–06:21, 06:22–06:34) is one window.
  const abs = (date: string, time: string) => Date.parse(`${date}T${time}:00Z`);
  windows.sort((x, y) => x.pick.key.localeCompare(y.pick.key) || abs(x.pick.startDate, x.pick.startTime) - abs(y.pick.startDate, y.pick.startTime));
  const merged: Built["windows"] = [];
  for (const w of windows) {
    const last = merged.at(-1);
    if (last && last.pick.key === w.pick.key && abs(w.pick.startDate, w.pick.startTime) - abs(last.pick.endDate, last.pick.endTime) <= 2 * 60_000) {
      if (abs(w.pick.endDate, w.pick.endTime) > abs(last.pick.endDate, last.pick.endTime)) {
        last.pick = { ...last.pick, endDate: w.pick.endDate, endTime: w.pick.endTime };
      }
      continue;
    }
    merged.push({ kind: w.kind, pick: { ...w.pick } });
  }
  return {
    today,
    months: [...(p?.days ?? []), ...(m?.days ?? []), ...(n?.days ?? [])],
    holidays: [...(hy?.holidays ?? []), ...(hy2?.holidays ?? [])],
    windows: merged,
  };
}

/** The snapshot for `today` (a timeline entry can be built for tomorrow from the same data). */
function propsFor(today: string, data: Built, lang: "ne" | "en", timezone: string, events: CalendarEvent[], now: number): TodayWidgetProps {
  const en = lang === "en";
  const digits = (s: string | number) => formatDigits(s, lang);
  const tomorrow = shiftDate(today, 1);
  const bs = bsFromCivilIso(today);
  const monthName = (m: number) => (en ? BS_MONTH_NAMES[m - 1] : BS_MONTHS_NE[m - 1]) ?? "";
  const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
  const weekdayName = (iso: string) => (en ? WEEKDAYS_EN : WEEKDAYS_NE)[weekdayOf(iso)] ?? "";
  const bsShort = (iso: string) => {
    const b = bsFromCivilIso(iso);
    return `${monthName(b.month)} ${digits(b.day)}`;
  };
  const adShort = (iso: string) => {
    const [y, mo, d] = iso.split("-").map(Number) as [number, number, number];
    return en ? `${AD_MONTHS_SHORT[mo - 1]} ${d}, ${y}` : `${digits(d)} ${AD_MONTHS_SHORT_NE[mo - 1]}`;
  };
  const row = dayAt(data.months, today);

  // ── The month grid: whole weeks, Sunday first ──────────────────────────────
  const monthDays = data.months.filter((d) => bsFromCivilIso(d.ad_date ?? d.date ?? "").month === bs.month && bsFromCivilIso(d.ad_date ?? d.date ?? "").year === bs.year);
  const first = monthDays[0]?.ad_date ?? monthDays[0]?.date;
  const cells: WidgetCell[] = [];
  const eventDates = new Set<string>();
  const monthEnd = monthDays.at(-1)?.ad_date ?? monthDays.at(-1)?.date ?? today;
  const startMs = Date.parse(`${first ?? today}T00:00:00Z`) - 86_400_000;
  const endMs = Date.parse(`${monthEnd}T23:59:59Z`) + 86_400_000;
  for (const e of events) {
    for (const at of occurrences(e, startMs, endMs)) eventDates.add(isoToZoned(new Date(at).toISOString(), timezone).date);
  }
  if (first) {
    const lead = weekdayOf(first);
    const total = Math.ceil((lead + monthDays.length) / 7) * 7;
    for (let i = 0; i < total; i += 1) {
      const iso = shiftDate(first, i - lead);
      const b = bsFromCivilIso(iso);
      const outside = i < lead || i >= lead + monthDays.length;
      let k = "";
      if (iso === today) k += "t";
      if (!outside && holidayOn(data.holidays, iso)) k += "h";
      if (weekdayOf(iso) === 6) k += "s";
      if (outside) k += "o";
      if (!outside && festivalNames(dayAt(data.months, iso)).length > 0) k += "f";
      if (!outside && eventDates.has(iso)) k += "e";
      cells.push({ d: digits(b.day), a: String(Number(iso.slice(8, 10))), k });
    }
  }
  const firstAd = first ?? today;
  const lastAd = monthEnd;
  const adMonths = (iso: string) => Number(iso.slice(5, 7));
  const adMonthName = (m: number) => (en ? AD_MONTHS_SHORT[m - 1] : AD_MONTHS_SHORT_NE[m - 1]) ?? "";
  const monthSub =
    adMonths(firstAd) === adMonths(lastAd)
      ? `${adMonthName(adMonths(firstAd))} ${digits(firstAd.slice(0, 4))}`
      : `${adMonthName(adMonths(firstAd))} – ${adMonthName(adMonths(lastAd))} ${digits(lastAd.slice(0, 4))}`;

  // ── A day's list ─────────────────────────────────────────────────────────────
  const clock = (t: string) => digits(t);
  const SHOWN = new Set(["brahma_muhurta", "abhijit", "abhijit_muhurta", "amrit_kalam", "vijaya_muhurta", "godhuli_muhurta", "rahu_kalam", "yamaganda", "gulika"]);
  const dayItems = (iso: string): WidgetItem[] => {
    const items: WidgetItem[] = [];
    // A public holiday first, then the user's own entries (what they asked to see), then up to two
    // festivals, then the day's times: a widget row is small, and Tihar alone has six names.
    const holiday = holidayOn(data.holidays, iso);
    if (holiday) items.push({ time: "", title: (en ? holiday.name_en : holiday.name_ne) ?? holiday.name_ne ?? "", kind: "holiday" });
    const from = Date.parse(`${iso}T00:00:00Z`) - 14 * 3_600_000;
    const until = Date.parse(`${iso}T23:59:59Z`) + 14 * 3_600_000;
    const mine: { at: number; item: WidgetItem }[] = [];
    for (const e of events) {
      for (const at of occurrences(e, from, until)) {
        const z = isoToZoned(new Date(at).toISOString(), timezone);
        if (z.date !== iso) continue;
        mine.push(e.all_day ? { at: 0, item: { time: "", title: e.title, kind: kindOf(e) } } : { at, item: { time: clock(z.time), title: e.title, kind: kindOf(e) } });
      }
    }
    mine.sort((a, b) => a.at - b.at);
    items.push(...mine.map((m) => m.item));
    const fests = festivalNames(dayAt(data.months, iso)).filter((f) => !holiday || (f !== holiday.name_ne && f !== holiday.name_en));
    for (const f of fests.slice(0, holiday ? 1 : 2)) items.push({ time: "", title: f, kind: "festival" });

    const d = dayAt(data.months, iso);
    const timed: { sort: string; item: WidgetItem }[] = [];
    if (d?.sunrise) timed.push({ sort: d.sunrise, item: { time: clock(d.sunrise), title: tFor(lang, "widgets.sunrise"), kind: "sun" } });
    if (d?.sunset) timed.push({ sort: d.sunset, item: { time: clock(d.sunset), title: tFor(lang, "widgets.sunset"), kind: "sun" } });
    const nowClock = iso === today ? isoToZoned(new Date(now).toISOString(), timezone).time : "00:00";
    for (const { kind, pick: w } of data.windows) {
      if (!SHOWN.has(w.key)) continue;
      const startsHere = w.startDate === iso;
      const runsInto = w.startDate < iso && w.endDate === iso;
      if (!startsHere && !runsInto) continue;
      if (w.endDate === iso && w.endTime < nowClock) continue; // over already
      timed.push({
        sort: startsHere ? w.startTime : "00:00",
        item: { time: `${clock(w.startTime)}–${clock(w.endTime)}`, title: en ? w.nameEn : w.nameNe, kind },
      });
    }
    timed.sort((a, b) => a.sort.localeCompare(b.sort));
    items.push(...timed.map((t) => t.item));
    return items;
  };
  const days: WidgetDay[] = [
    { title: tFor(lang, "widgets.today"), sub: `${bsShort(today)} · ${weekdayName(today)}`, items: dayItems(today) },
    { title: tFor(lang, "widgets.tomorrow"), sub: `${bsShort(tomorrow)} · ${weekdayName(tomorrow)}`, items: dayItems(tomorrow) },
  ];

  // ── Coming festivals and holidays (month widget) ──────────────────────────
  const upcoming: WidgetItem[] = [];
  for (const d of data.months) {
    const iso = d.ad_date ?? d.date ?? "";
    if (iso < today || upcoming.length >= 8) continue;
    const holiday = holidayOn(data.holidays, iso);
    const names = festivalNames(d);
    const title = holiday ? ((en ? holiday.name_en : holiday.name_ne) ?? names[0]) : names[0];
    if (!title) continue;
    if (upcoming.at(-1)?.title === title) continue; // a holiday over several days, once
    const when = iso === today ? tFor(lang, "widgets.today") : iso === tomorrow ? tFor(lang, "widgets.tomorrow") : bsShort(iso);
    upcoming.push({ time: when, title, kind: holiday ? "holiday" : "festival" });
  }

  const nextFestival = upcoming[0];
  const nextEvent = days[0]!.items.concat(days[1]!.items).find((i) => i.kind === "event" || i.kind === "task" || i.kind === "appointment");
  const tithi = (en ? row?.tithi : row?.tithi_ne) ?? "";
  return {
    v: now,
    bsDate: `${monthName(bs.month)} ${digits(bs.day)}, ${digits(bs.year)}`,
    weekday: weekdayName(today),
    tithi,
    paksha: "",
    day: digits(bs.day),
    month: monthName(bs.month),
    year: digits(bs.year),
    adDate: adShort(today),
    sunrise: row?.sunrise ? clock(row.sunrise) : "",
    sunset: row?.sunset ? clock(row.sunset) : "",
    monthTitle: `${monthName(bs.month)} ${digits(bs.year)}`,
    monthSub,
    heads: (en ? WEEKDAYS_SHORT.map((w) => w.slice(0, 2)) : WEEKDAYS_SHORT_NE.map(firstSyllable)) as string[],
    cells,
    days,
    upcoming,
    empty: tFor(lang, "widgets.nothing"),
    url: "vedicpatro://",
    festival: nextFestival?.title ?? "",
    festivalWhen: nextFestival?.time ?? "",
    event: nextEvent?.title ?? "",
    eventWhen: nextEvent?.time ?? "",
  };
}

/**
 * Refresh the home-screen widgets: the BS month, today and tomorrow (festivals, the user's events,
 * tasks and appointments, the day's muhurta), and the festivals to come. Called on each notification
 * sync. On iOS a timeline entry for tomorrow flips the widget at midnight without the app running.
 * A failure only leaves the last snapshot in place.
 */
export async function refreshTodayWidget(options: {
  lang: "ne" | "en";
  timezone: string;
  events: CalendarEvent[];
  location?: LocationParams;
}): Promise<void> {
  const today = load("TodayWidget");
  const month = load("MonthWidget");
  if (!today && !month) return;
  const { lang, timezone, events, location } = options;
  const data = await gather(timezone, location);
  const tomorrowIso = shiftDate(data.today, 1);
  // Local midnight in the place's zone, as an instant.
  const offset = Date.parse(`${data.today}T12:00:00Z`) - Date.parse(`${isoToZoned(`${data.today}T12:00:00Z`, timezone).date}T${isoToZoned(`${data.today}T12:00:00Z`, timezone).time}:00Z`);
  const midnight = new Date(Date.parse(`${tomorrowIso}T00:00:00Z`) + offset);
  const now = propsFor(data.today, data, lang, timezone, events, Date.now());
  const tomorrow = propsFor(tomorrowIso, data, lang, timezone, events, midnight.getTime());
  for (const w of [today, month]) {
    if (!w) continue;
    try {
      w.updateSnapshot(now);
    } catch {
      continue; // no widget support (Expo Go, old build)
    }
    // iOS: tomorrow's entry flips the widget at local midnight without the app running. The snapshot
    // above stays if the timeline call fails.
    if (Platform.OS === "ios" && w.updateTimeline) {
      try {
        w.updateTimeline([
          { date: new Date(), props: now },
          { date: midnight, props: tomorrow },
        ]);
      } catch {
        /* keep the snapshot */
      }
    }
  }
}
