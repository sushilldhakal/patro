import { test } from "node:test";
import assert from "node:assert/strict";

import { digitsToLatin, monthOptions, parseYearInput } from "../src/patro-date/calendar-header-model";
import { createRequire } from "node:module";
import { QueryClient, QueryClientContext } from "@tanstack/react-query";
import { DEFAULT_CALENDAR, setCalendarSystem, type CalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { registerBundle, setLanguage } from "@vedic-patro/i18n/runtime";
import { WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { usePatroCalendarHeader } from "../src/patro-date/use-patro-calendar-header";
import { useBsCalendarGrid } from "../src/home/use-bs-calendar-grid";
import { usePanchangaMonthGrid } from "../src/home/use-panchanga-month-grid";
import { renderHook } from "./helpers/render-hook";

const require = createRequire(import.meta.url);
registerBundle("ne", require("@vedic-patro/i18n/ne.json"));
registerBundle("en", require("@vedic-patro/i18n/en.json"));

test("Nepali, Latin and mixed digits read the same", () => {
  assert.equal(digitsToLatin("२०८३"), "2083");
  assert.equal(digitsToLatin("2083"), "2083");
  assert.equal(digitsToLatin("२0८3 वि.सं."), "2083");
  assert.equal(digitsToLatin("abc"), "");
});

test("the jump box accepts any year the era allows, far past 2999", () => {
  assert.equal(parseYearInput("1300", "bs"), 1300);
  assert.equal(parseYearInput("२०८३", "bs"), 2083);
  assert.equal(parseYearInput("12000", "bs"), 12000);
});

test("empty, zero and out-of-range years are rejected", () => {
  assert.equal(parseYearInput("", "bs"), null);
  assert.equal(parseYearInput("0", "bs"), null);
  assert.equal(parseYearInput("99999", "bs"), null);
});

test("the month grid has twelve months in the era's names, one selected", () => {
  const bs = monthOptions("bs", 6, "ne");
  assert.equal(bs.length, 12);
  assert.equal(bs[5]!.label, "असोज");
  assert.deepEqual(bs.filter((m) => m.selected).map((m) => m.month), [6]);
  assert.equal(monthOptions("ad", 1, "en")[0]!.label, "January");
});

import {
  dayCells,
  firstWeekdayOfMonth,
  formatClock,
  gregorianSpanOfBsYear,
  parseClock,
  shiftYearPage,
  stepClock,
  yearPageStart,
  yearPageYears,
} from "../src/patro-date/calendar-header-model";

test("the year page opens with four years before the current one and never starts below 1", () => {
  assert.equal(yearPageStart(2083), 2079);
  assert.equal(yearPageStart(3), 1);
});

test("year pages are twelve years, move by a page and stay inside the era", () => {
  assert.deepEqual(yearPageYears("bs", 2079).length, 12);
  assert.equal(shiftYearPage("bs", 2079, 1), 2091);
  assert.equal(shiftYearPage("bs", 2079, -1), 2067);
  assert.equal(shiftYearPage("bs", 5, -1), 1);
  const max = 17191;
  assert.equal(shiftYearPage("ad", max - 5, 1) <= max, true);
  assert.equal(yearPageYears("ad", max - 5).every((y) => y <= max), true);
});

test("a Bikram Sambat year spans two Gregorian years; other eras have no span", () => {
  assert.deepEqual(gregorianSpanOfBsYear("bs", 2083), [2026, 2027]);
  assert.equal(gregorianSpanOfBsYear("ad", 2026), null);
});

test("the day grid starts on the right weekday and numbers every day", () => {
  // The 15th is a Tuesday (2): the 1st is a Tuesday - 14 days = Tuesday.
  assert.equal(firstWeekdayOfMonth(15, 2), 2);
  assert.equal(firstWeekdayOfMonth(1, 6), 6);
  assert.equal(firstWeekdayOfMonth(3, 0), 5);
  const cells = dayCells(30, 5);
  assert.equal(cells.length, 35);
  assert.equal(cells.filter((c) => c.day === null).length, 5);
  assert.deepEqual(cells[5], { day: 1, weekday: 5 });
  assert.equal(cells[cells.length - 1]!.day, 30);
  assert.equal(cells.find((c) => c.day === 2)!.weekday, 6);
  assert.equal(cells.find((c) => c.day === 3)!.weekday, 0);
});

test("clock text is read leniently and written with two digits", () => {
  assert.deepEqual(parseClock("09:30"), { hour: 9, minute: 30 });
  assert.deepEqual(parseClock("99:99"), { hour: 23, minute: 59 });
  assert.deepEqual(parseClock(undefined), { hour: 0, minute: 0 });
  assert.equal(formatClock({ hour: 7, minute: 5 }), "07:05");
});

test("steppers move hours by one and minutes by five, wrapping round", () => {
  assert.deepEqual(stepClock({ hour: 23, minute: 55 }, "hour", 1), { hour: 0, minute: 55 });
  assert.deepEqual(stepClock({ hour: 0, minute: 0 }, "hour", -1), { hour: 23, minute: 0 });
  assert.deepEqual(stepClock({ hour: 9, minute: 55 }, "minute", 1), { hour: 9, minute: 0 });
  assert.deepEqual(stepClock({ hour: 9, minute: 0 }, "minute", -1), { hour: 9, minute: 55 });
});

import { playbackToRung, rungToPlayback } from "../src/sky3d/wheel-transport";

test("the wheel's playback maps to the sheet's slider and back", () => {
  assert.equal(playbackToRung(0, 4), 0);
  assert.equal(playbackToRung(1, 1), 1);
  assert.equal(playbackToRung(1, 8), 4);
  assert.equal(playbackToRung(-1, 2), -2);
  assert.deepEqual(rungToPlayback(0), { direction: 0, speed: 1 });
  assert.deepEqual(rungToPlayback(3), { direction: 1, speed: 4 });
  assert.deepEqual(rungToPlayback(-4), { direction: -1, speed: 8 });
  assert.deepEqual(rungToPlayback(9), { direction: 1, speed: 32 });
});

// ─── language × calendar ─────────────────────────────────────────────────────

const queryClient = new QueryClient();
const withQueryClient = (context: unknown) =>
  context === QueryClientContext ? queryClient : (context as { _currentValue: unknown })._currentValue;

type Combo = { lang: "ne" | "en"; calendar: CalendarSystem; era: "bs" | "ad" };
const COMBOS: Combo[] = [
  { lang: "ne", calendar: "bs", era: "bs" },
  { lang: "en", calendar: "ad", era: "ad" },
  { lang: "en", calendar: "bs", era: "bs" },
  { lang: "ne", calendar: "ad", era: "ad" },
];

async function useCombo({ lang, calendar }: Combo) {
  setCalendarSystem(calendar);
  await setLanguage(lang);
}

test.afterEach(async () => {
  setCalendarSystem(DEFAULT_CALENDAR);
  await setLanguage("ne");
});

test("the month title and picker follow the era in the UI language (all four combinations)", async () => {
  const expected: Record<string, { month: string; year: string; eraLabel: string; first: string }> = {
    "ne-bs": { month: "असोज", year: "२०८३", eraLabel: "वि.सं.", first: "वैशाख" },
    "en-ad": { month: "September", year: "2026", eraLabel: "AD", first: "January" },
    "en-bs": { month: "Ashwin", year: "2083", eraLabel: "BS", first: "Baisakh" },
    "ne-ad": { month: "सेप्टेम्बर", year: "२०२६", eraLabel: "ई.सं.", first: "जनवरी" },
  };
  for (const combo of COMBOS) {
    await useCombo(combo);
    const year = combo.era === "bs" ? 2083 : 2026;
    const header = renderHook(() => usePatroCalendarHeader({ era: combo.era, year, month: combo.era === "bs" ? 6 : 9, onChange: () => {} }));
    const want = expected[`${combo.lang}-${combo.calendar}`]!;
    assert.equal(header.result.title.month, want.month, `${combo.lang}+${combo.calendar} month title`);
    assert.equal(header.result.title.year, want.year, `${combo.lang}+${combo.calendar} year`);
    assert.equal(header.result.eraLabel, want.eraLabel, `${combo.lang}+${combo.calendar} era label`);
    assert.equal(header.result.months[0]!.label, want.first, `${combo.lang}+${combo.calendar} first month`);
  }
});

test("English + BS shows the Nepali month names in English letters, with Western digits", () => {
  assert.deepEqual(
    monthOptions("bs", 1, "en").map((m) => m.label),
    ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"],
  );
  assert.equal(monthOptions("ad", 1, "ne")[6]!.label, "जुलाई");
});

/** BS 1 / AD 16 (the test day), in the combination's digits. */
const bigDay = ({ lang, calendar }: Combo) => (calendar === "bs" ? (lang === "ne" ? "१" : "1") : lang === "ne" ? "१६" : "16");

const day = (date_ad: string, bsDay: number) =>
  ({ day: bsDay, date_ad, tithi: "", festivals: [] }) as never;

test("the home grid's primary date follows the calendar, never the language", async () => {
  const days = [day("2026-07-16", 1), day("2026-07-17", 2)];
  for (const combo of COMBOS) {
    await useCombo(combo);
    const primaryDate = combo.calendar;
    const grid = renderHook(() => useBsCalendarGrid({ days, todayAd: "2026-07-16", primaryDate }), withQueryClient).result;
    assert.equal(grid.primaryDate, combo.calendar, `${combo.lang}+${combo.calendar}`);
    const first = grid.cells[0]!;
    // The big number is the BS day in a BS grid, the AD day in an AD grid; digits follow the language.
    assert.equal(first.primaryDay, bigDay(combo));
  }
});

test("weekday labels are English short names in English and Nepali ones in Nepali, in either calendar", async () => {
  for (const combo of COMBOS) {
    await useCombo(combo);
    const primaryDate = combo.calendar;
    const grid = renderHook(() => useBsCalendarGrid({ days: [], todayAd: "2026-07-16", primaryDate }), withQueryClient).result;
    const panchanga = renderHook(() => usePanchangaMonthGrid({ days: [], todayAd: "2026-07-16", primaryDate })).result;
    for (const weekdays of [grid.weekdays, panchanga.weekdays]) {
      assert.deepEqual(weekdays.map((w) => w.short), combo.lang === "en" ? WEEKDAYS_SHORT : [...WEEKDAYS_SHORT_NE]);
      assert.equal(weekdays[0]!.weekend && weekdays[6]!.weekend, true);
    }
  }
});

test("the panchanga month grid also takes its primary day from the calendar", async () => {
  const days = [{ ...(day("2026-07-16", 1) as object), outsideMonth: false }] as never[];
  for (const combo of COMBOS) {
    await useCombo(combo);
    const primaryDate = combo.calendar;
    const cell = renderHook(() => usePanchangaMonthGrid({ days, todayAd: "2026-07-16", primaryDate })).result.cells[0]!;
    assert.equal(cell.primaryDay, bigDay(combo), `${combo.lang}+${combo.calendar}`);
  }
});
