/**
 * Language and calendar are independent: the four combinations (ne/en × bs/ad)
 * each read right in the pure formatters the pages share.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatDashaInstant, formatDashaMoment } from "@vedic-patro/domain/calendar/bs-calendar";
import {
  crossEraSubtitleFromPanchangaDisplay,
  formatPatroDayCrossEraSubtitle,
  formatPatroMonthCrossEraSubtitle,
  patroHeadlineDigits,
} from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { monthLabel, monthShortLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { formatEventDate } from "@vedic-patro/domain/panchanga/panchanga-format";
import { getSecondaryCellDate } from "@vedic-patro/read-models/calendar/local-calendar";
import { eraDayLabel, stampDate } from "../src/graha/model";
import { setCalculationSystem } from "@vedic-patro/domain/calendar/calculation-system";

// These dates are drik with Lahiri; new installs default to the Surya Siddhanta.
setCalculationSystem("drik");

const day = { day: 1, date_ad: "2026-08-16", tithi: "", festivals: [] } as never;

test("the secondary date in each cell is the other calendar, named in the UI language", () => {
  // BS grid, English: the AD month is English.  BS grid, Nepali: the AD month in Devanagari.
  assert.deepEqual(getSecondaryCellDate(day, "bs", "en", true), { day: 16, monthLabel: "Aug", monthLabelShort: "Aug" });
  assert.equal(getSecondaryCellDate(day, "bs", "ne", true).day, 16);
  assert.match(getSecondaryCellDate(day, "bs", "ne", true).monthLabel ?? "", /[\u0900-\u097F]/);
  // AD grid, Nepali: the BS month in Devanagari.  AD grid, English: romanized BS names.
  assert.equal(getSecondaryCellDate(day, "ad", "ne", true).monthLabel, "साउन");
  assert.equal(getSecondaryCellDate(day, "ad", "en", true).monthLabel, "Shrawan");
  assert.equal(getSecondaryCellDate(day, "ad", "en", true).monthLabelShort, "Sha");
  // Mid-month cells carry only the number.
  assert.deepEqual(getSecondaryCellDate({ ...(day as object), date_ad: "2026-08-20" } as never, "ad", "en", false), { day: 4 });
});

test("month names per era and language", () => {
  assert.equal(monthLabel("bs", 1, "en"), "Baisakh");
  assert.equal(monthLabel("bs", 1, "ne"), "वैशाख");
  assert.equal(monthLabel("ad", 7, "en"), "July");
  assert.equal(monthLabel("ad", 7, "ne"), "जुलाई");
  assert.equal(monthShortLabel("bs", 3, "en"), "Ash");
  assert.equal(monthShortLabel("ad", 7, "en"), "Jul");
});

test("the cross-era line under a BS month is the AD span in both languages", () => {
  const line = (lang: string) => formatPatroMonthCrossEraSubtitle("bs", 2083, 4, lang, patroHeadlineDigits(lang));
  assert.equal(line("en"), "Jul/Aug 2026");
  assert.equal(line("ne"), "जुल/अग २०२६");
});

test("the cross-era line under an AD month is the BS span, with the BS era label", () => {
  const line = (lang: string) => formatPatroMonthCrossEraSubtitle("ad", 2026, 7, lang, patroHeadlineDigits(lang));
  assert.equal(line("en"), "Ash/Sha 2083 BS");
  assert.equal(line("ne"), "असार/साउन २०८३ वि.सं.");
});

test("the cross-era line under a day is the other calendar's date", () => {
  const digits = patroHeadlineDigits;
  assert.equal(formatPatroDayCrossEraSubtitle("2026-08-16", "bs", "en", digits("en")), "16 August 2026 AD");
  assert.equal(formatPatroDayCrossEraSubtitle("2026-08-16", "ad", "en", digits("en")), "Sha 32, 2083 BS");
  assert.equal(formatPatroDayCrossEraSubtitle("2026-08-16", "ad", "ne", digits("ne")), "साउन ३२, २०८३ वि.सं.");
});

test("the API's Devanagari BS line is not shown to English readers when the date is known", () => {
  const display = { bs_ne: "साउन ३२, २०८३", gregorian_en: "16 August 2026" };
  assert.equal(
    crossEraSubtitleFromPanchangaDisplay(display, "ad", { lang: "en", dateAd: "2026-08-16" }),
    "Sha 32, 2083 BS",
  );
  // Nepali keeps the API's own line; a BS era keeps the Gregorian line.
  assert.equal(crossEraSubtitleFromPanchangaDisplay(display, "ad", { lang: "ne", dateAd: "2026-08-16" }), "साउन ३२, २०८३");
  assert.equal(crossEraSubtitleFromPanchangaDisplay(display, "bs", { lang: "en", dateAd: "2026-08-16" }), "16 August 2026");
  assert.equal(crossEraSubtitleFromPanchangaDisplay(display, "ad"), "साउन ३२, २०८३");
});

test("moon-event dates follow the calendar and name the month in the UI language", () => {
  assert.equal(formatEventDate("2026-08-16", "en", "bs"), "Shrawan 32");
  assert.equal(formatEventDate("2026-08-16", "ne", "bs"), "साउन ३२");
  assert.equal(formatEventDate("2026-08-16", "en", "ad"), "Aug 16");
  assert.equal(formatEventDate("2026-08-16", "ne", "ad"), "अगस्ट १६");
});

test("dasha dates follow the calendar and name the month in the UI language", () => {
  const instant = new Date("2026-08-16T06:00:00Z");
  const tz = "Asia/Kathmandu";
  assert.equal(formatDashaInstant(instant, "en", tz, "bs"), "Shrawan 32, 2083");
  assert.equal(formatDashaInstant(instant, "en", tz, "ad"), "Aug 16, 2026");
  assert.equal(formatDashaInstant(instant, "ne", tz, "bs"), "साउन ३२, २०८३");
  assert.equal(formatDashaInstant(instant, "ne", tz, "ad"), "अगस्ट १६, २०२६");
  assert.match(formatDashaMoment(instant, "en", tz, undefined, "bs"), /^Shrawan 32, 2083/);
  assert.match(formatDashaMoment(instant, "en", tz, undefined, "ad"), /^August 16, 2026/);
  assert.match(formatDashaMoment(instant, "ne", tz, undefined, "ad"), /^अगस्ट/);
});

test("graha asta stamps read in the era's calendar", () => {
  assert.equal(eraDayLabel("2083-04-12", "en", "bs"), "Shrawan 12");
  assert.equal(eraDayLabel("2026-07-12", "en", "ad"), "July 12");
  assert.equal(eraDayLabel("2026-07-12", "ne", "ad"), "जुलाई १२");
  assert.equal(stampDate({ iso: "", date_ad: "2026-07-12", date_bs: "2083-03-28", time_short: "" }, "en", "bs"), "2083-03-28");
  assert.equal(stampDate({ iso: "", date_ad: "2026-07-12", date_bs: "2083-03-28", time_short: "" }, "en", "ad"), "2026-07-12");
});
