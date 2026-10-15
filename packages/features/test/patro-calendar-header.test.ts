import { test } from "node:test";
import assert from "node:assert/strict";

import { digitsToLatin, monthOptions, parseYearInput } from "../src/patro-date/calendar-header-model";

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
