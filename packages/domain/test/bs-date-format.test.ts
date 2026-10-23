import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBsDate, formatBsMonthYear } from "../src/calendar/bs-date-format";
import { monthLabel, monthShortLabel } from "../src/calendar/patro-month-labels";
import { patroEraShortLabel } from "../src/calendar/patro-era-label";

test("formatBsDate in both languages", () => {
  assert.equal(formatBsDate({ year: 2083, month: 1, day: 12 }, "en"), "Baisakh 12, 2083 BS");
  assert.equal(formatBsDate({ year: 2083, month: 1, day: 12 }, "ne"), "वैशाख १२, २०८३ वि.सं.");
  assert.equal(formatBsDate({ year: 2082, month: 12, day: 30 }, "en-US"), "Chaitra 30, 2082 BS");
});

test("formatBsMonthYear in both languages", () => {
  assert.equal(formatBsMonthYear(2083, 2, "en"), "Jestha 2083 BS");
  assert.equal(formatBsMonthYear(2083, 2, "ne"), "जेठ २०८३ वि.सं.");
});

test("custom digit function wins", () => {
  assert.equal(formatBsDate({ year: 2083, month: 1, day: 5 }, "en", (v) => `<${v}>`), "Baisakh <5>, <2083> BS");
});

test("monthLabel: language x calendar", () => {
  assert.equal(monthLabel("bs", 1, "ne"), "वैशाख"); // Nepali + BS
  assert.equal(monthLabel("bs", 1, "en"), "Baisakh"); // English + BS (new)
  assert.equal(monthLabel("bbs", 3, "en"), "Ashadh");
  assert.equal(monthLabel("ad", 7, "en"), "July"); // English + AD
  assert.equal(monthLabel("ad", 7, "ne"), "जुलाई"); // Nepali + AD (new)
  assert.equal(monthLabel("bc", 12, "ne"), "डिसेम्बर");
  assert.equal(monthLabel("bs", 13, "en"), "");
});

test("monthShortLabel: language x calendar", () => {
  assert.equal(monthShortLabel("bs", 1, "en"), "Bai");
  assert.equal(monthShortLabel("bs", 1, "ne"), "वैशाख");
  assert.equal(monthShortLabel("ad", 1, "en"), "Jan");
  assert.equal(monthShortLabel("ad", 7, "ne"), "जुलाई");
});

test("patroEraShortLabel: every era x language", () => {
  const expected = {
    en: { bs: "BS", ad: "AD", bc: "BC", bbs: "BBS" },
    ne: { bs: "वि.सं.", ad: "ई.सं.", bc: "ई.पू.", bbs: "पू.वि.सं." },
  } as const;
  for (const lang of ["en", "ne"] as const) {
    for (const era of ["bs", "ad", "bc", "bbs"] as const) {
      assert.equal(patroEraShortLabel(era, lang), expected[lang][era], `${era}/${lang}`);
    }
  }
});
