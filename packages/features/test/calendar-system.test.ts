import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { DEFAULT_CALENDAR, setCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";
import { defaultMonthBrowseParts } from "@vedic-patro/domain/calendar/patro-browse-params";
import { registerBundle, setLanguage } from "@vedic-patro/i18n/runtime";
import { convertBrowseMonth } from "../src/patro-date/convert-browse-month";
import { usePatroMonthBrowse } from "../src/patro-date/use-patro-month-browse";
import { usePatroYearBrowse } from "../src/patro-date/use-patro-year-browse";
import { useCalendarSystemToggle } from "../src/patro-date/use-calendar-system-toggle";
import { renderHook } from "./helpers/render-hook";

const require = createRequire(import.meta.url);
registerBundle("ne", require("@vedic-patro/i18n/ne.json"));
registerBundle("en", require("@vedic-patro/i18n/en.json"));

beforeEach(async () => {
  setCalendarSystem(DEFAULT_CALENDAR);
  await setLanguage("ne");
});

/** The first day of BS month → the AD civil date it falls on. */
const adOfBsFirst = (year: number, month: number) => civilIsoFromDate(bsToAD(year, month, 1));

// ─── convertBrowseMonth ──────────────────────────────────────────────────────

/** A "now" far from every month the first-day tests browse, so they never hit the current-month rule. */
const LONG_AGO = new Date(Date.UTC(2000, 0, 15));

test("a BS month converts to the AD month holding its first day", () => {
  // Shrawan 1, 2083 is mid-July 2026.
  const iso = adOfBsFirst(2083, 4);
  const [y, m] = iso.split("-").map(Number);
  assert.deepEqual(convertBrowseMonth("bs", 2083, 4, "ad"), { era: "ad", year: y, month: m });
});

test("an AD month converts to the BS month holding its first day", () => {
  const bs = adToBS(new Date(Date.UTC(2026, 6, 1)));
  assert.deepEqual(convertBrowseMonth("ad", 2026, 7, "bs"), { era: "bs", year: bs.year, month: bs.month });
});

test("round trips land on the same month or the one before it, never further", () => {
  for (const [year, month] of [[2083, 1], [2083, 4], [2082, 9], [2084, 12]] as const) {
    const ad = convertBrowseMonth("bs", year, month, "ad");
    assert.equal(ad.era, "ad");
    const back = convertBrowseMonth("ad", ad.year, ad.month, "bs");
    assert.equal(back.era, "bs");
    // The AD month usually starts mid-BS-month, so going back may land one BS month earlier,
    // never later, and never more than one away.
    const diff = back.year * 12 + back.month - (year * 12 + month);
    assert.ok(diff === 0 || diff === -1, `bs ${year}/${month} → ad ${ad.year}/${ad.month} → bs ${back.year}/${back.month}`);
  }
  for (const [year, month] of [[2026, 1], [2026, 7], [2025, 12]] as const) {
    const bs = convertBrowseMonth("ad", year, month, "bs");
    const back = convertBrowseMonth("bs", bs.year, bs.month, "ad");
    const diff = back.year * 12 + back.month - (year * 12 + month);
    assert.ok(diff === 0 || diff === -1, `ad ${year}/${month} → bs ${bs.year}/${bs.month} → ad ${back.year}/${back.month}`);
  }
});

test("the BS month an AD month converts to is the one holding the AD month's first day", () => {
  for (let year = 2024; year <= 2028; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const firstAd = civilIsoFromDate(new Date(Date.UTC(year, month - 1, 1)));
      const bs = convertBrowseMonth("ad", year, month, "bs", LONG_AGO);
      const start = civilIsoFromDate(bsToAD(bs.year, bs.month, 1));
      const next = bs.month === 12 ? { year: bs.year + 1, month: 1 } : { year: bs.year, month: bs.month + 1 };
      const end = civilIsoFromDate(bsToAD(next.year, next.month, 1));
      assert.ok(start <= firstAd && firstAd < end, `${firstAd} should sit in BS ${bs.year}/${bs.month} (${start}..${end})`);
    }
  }
});

test("the current month converts to the current month, and back, without drifting", () => {
  // Fri 23 Oct 2026 = Kartik 6, 2083: BS Kartik holds the 23rd, AD October holds it too.
  const now = new Date(2026, 9, 23, 12);
  const bs = adToBS(now);
  const ad = convertBrowseMonth("bs", bs.year, bs.month, "ad", now);
  assert.deepEqual(ad, { era: "ad", year: 2026, month: 10 });
  assert.deepEqual(convertBrowseMonth("ad", 2026, 10, "bs", now), { era: "bs", year: bs.year, month: bs.month });
  for (let i = 0, cur = ad; i < 4; i += 1) {
    const toBs = convertBrowseMonth(cur.era, cur.year, cur.month, "bs", now);
    cur = convertBrowseMonth(toBs.era, toBs.year, toBs.month, "ad", now);
    assert.deepEqual(cur, { era: "ad", year: 2026, month: 10 });
  }
});

test("the same calendar returns the month unchanged", () => {
  assert.deepEqual(convertBrowseMonth("bs", 2083, 4, "bs"), { era: "bs", year: 2083, month: 4 });
  assert.deepEqual(convertBrowseMonth("ad", 2026, 7, "ad"), { era: "ad", year: 2026, month: 7 });
});

test("bbs and bc fall back to today's month in the target system", () => {
  assert.deepEqual(convertBrowseMonth("bbs", 500, 3, "ad"), { era: "ad", ...defaultMonthBrowseParts("ad") });
  assert.deepEqual(convertBrowseMonth("bc", 300, 3, "bs"), { era: "bs", ...defaultMonthBrowseParts("bs") });
  assert.deepEqual(convertBrowseMonth("bbs", 500, 3, "bs"), { era: "bs", ...defaultMonthBrowseParts("bs") });
});

test("a date outside the offline table falls back to today's month", () => {
  assert.deepEqual(convertBrowseMonth("bs", 5000, 1, "ad"), { era: "ad", ...defaultMonthBrowseParts("ad") });
  assert.deepEqual(convertBrowseMonth("ad", 3500, 1, "bs"), { era: "bs", ...defaultMonthBrowseParts("bs") });
});

// ─── browse hooks ────────────────────────────────────────────────────────────

test("the month browse starts in the era of the calendar preference", () => {
  assert.equal(renderHook(() => usePatroMonthBrowse()).result.era, "bs");
  setCalendarSystem("ad");
  assert.equal(renderHook(() => usePatroMonthBrowse()).result.era, "ad");
  assert.equal(renderHook(() => usePatroYearBrowse()).result.era, "ad");
  // An era the app passes still wins.
  assert.equal(renderHook(() => usePatroMonthBrowse(undefined, { era: "bs" })).result.era, "bs");
});

test("changing the language does not reset the era, year or month", async () => {
  const month = renderHook(() => usePatroMonthBrowse({ year: 2083, month: 4 }, { era: "bs" }));
  const year = renderHook(() => usePatroYearBrowse({ year: 2080 }, { era: "bs" }));
  month.result.stepMonth(1);
  month.rerender();
  assert.deepEqual([month.result.era, month.result.year, month.result.month], ["bs", 2083, 5]);

  await setLanguage("en");
  month.rerender();
  year.rerender();
  assert.deepEqual([month.result.era, month.result.year, month.result.month], ["bs", 2083, 5]);
  assert.deepEqual([year.result.era, year.result.year], ["bs", 2080]);

  await setLanguage("ne");
  month.rerender();
  assert.deepEqual([month.result.era, month.result.year, month.result.month], ["bs", 2083, 5]);

  // Same for an AD browse reached through the calendar preference.
  setCalendarSystem("ad");
  const ad = renderHook(() => usePatroMonthBrowse());
  const adBefore = [ad.result.era, ad.result.year, ad.result.month];
  await setLanguage("en");
  ad.rerender();
  assert.deepEqual([ad.result.era, ad.result.year, ad.result.month], adBefore);
});

test("changing the calendar preference converts the browsed month, in both languages", async () => {
  for (const lang of ["ne", "en"]) {
    setCalendarSystem("bs");
    await setLanguage(lang);
    const hook = renderHook(() => usePatroMonthBrowse({ year: 2083, month: 4 }, { era: "bs" }));
    setCalendarSystem("ad");
    hook.rerender();
    assert.deepEqual(
      [hook.result.era, hook.result.year, hook.result.month],
      (({ era, year, month }) => [era, year, month])(convertBrowseMonth("bs", 2083, 4, "ad")),
    );
    assert.equal(hook.result.era, "ad");

    setCalendarSystem("bs");
    hook.rerender();
    assert.equal(hook.result.era, "bs");
    assert.equal(hook.result.year, 2083);
  }
});

test("changing the calendar preference converts the browsed year", () => {
  setCalendarSystem("bs");
  const hook = renderHook(() => usePatroYearBrowse({ year: 2083 }, { era: "bs" }));
  setCalendarSystem("ad");
  hook.rerender();
  assert.deepEqual([hook.result.era, hook.result.year], ["ad", 2026]);
  setCalendarSystem("bs");
  hook.rerender();
  assert.deepEqual([hook.result.era, hook.result.year], ["bs", 2083]);
});

// ─── the BS / AD toggle ──────────────────────────────────────────────────────

test("the calendar toggle lists BS then AD, marks the active one and selects", async () => {
  const hook = renderHook(() => useCalendarSystemToggle());
  assert.deepEqual(hook.result.options.map((o) => [o.calendar, o.active]), [["bs", true], ["ad", false]]);
  hook.result.select("ad");
  hook.rerender();
  assert.deepEqual(hook.result.options.map((o) => [o.calendar, o.active]), [["bs", false], ["ad", true]]);

  await setLanguage("en");
  hook.rerender();
  assert.equal(hook.result.options[0]!.label, "BS");
  assert.equal(hook.result.label, "Calendar");
  assert.ok(hook.result.options[0]!.hint.length > 0);
  assert.ok(hook.result.ariaLabel.length > 0);
});
