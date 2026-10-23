import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { setCalendarSystem } from "../src/calendar/calendar-system";
import {
  buildApiQuery,
  getLanguageForEra,
  parseEraFromUrl,
  toggleEraForCalendar,
  withEra,
} from "../src/calendar/era";

afterEach(() => setCalendarSystem("bs"));

test("era defaults from the calendar preference, never from the language", () => {
  assert.deepEqual(parseEraFromUrl({}, "ne"), { era: "bs", language: "ne", year: undefined, month: undefined, day: undefined });
  assert.equal(parseEraFromUrl({}, "en").era, "bs");
  assert.equal(parseEraFromUrl({}, "en").language, "en");
  setCalendarSystem("ad");
  assert.equal(parseEraFromUrl({}, "ne").era, "ad");
  assert.equal(parseEraFromUrl({}, "ne").language, "ne");
  assert.equal(parseEraFromUrl({}, "en").era, "ad");
});

test("fallbackEra overrides the calendar preference", () => {
  setCalendarSystem("ad");
  assert.equal(parseEraFromUrl({}, "en", "bbs").era, "bbs");
});

test("an explicit era in the URL does not change the language", () => {
  assert.equal(parseEraFromUrl({ era: "ad" }, "ne").language, "ne");
  assert.equal(parseEraFromUrl({ era: "bs" }, "en").language, "en");
  assert.equal(parseEraFromUrl({ era: "bc" }, "ne").language, "ne");
  assert.equal(parseEraFromUrl({ era: "bbs" }, "en").language, "en");
});

test("an explicit language in the URL wins over the fallback", () => {
  assert.equal(parseEraFromUrl({ era: "bs", language: "en" }, "ne").language, "en");
  assert.equal(parseEraFromUrl({ era: "ad", language: "ne" }, "en").language, "ne");
  assert.equal(parseEraFromUrl({ language: "fr" }, "en").language, "en");
});

test("invalid era falls back to the calendar era", () => {
  assert.equal(parseEraFromUrl({ era: "xx" }, "en").era, "bs");
});

test("withEra keeps the language", () => {
  const base = { era: "bs", language: "en", year: 2083, month: 1, day: 2 } as const;
  assert.deepEqual(withEra(base, "ad"), { ...base, era: "ad" });
  assert.equal(withEra({ ...base, language: "ne" }, "ad").language, "ne");
});

test("the API query carries the explicit language for English+BS", () => {
  const q = buildApiQuery(parseEraFromUrl({}, "en"));
  assert.equal(q.get("era"), "bs");
  assert.equal(q.get("language"), "en");
});

test("toggleEraForCalendar pairs", () => {
  assert.equal(toggleEraForCalendar("bs", "bs"), "bbs");
  assert.equal(toggleEraForCalendar("bbs", "bs"), "bs");
  assert.equal(toggleEraForCalendar("ad", "ad"), "bc");
  assert.equal(toggleEraForCalendar("bc", "ad"), "ad");
  assert.equal(toggleEraForCalendar("ad", "bs"), "bs");
  assert.equal(toggleEraForCalendar("bs", "ad"), "ad");
});

test("deprecated getLanguageForEra still exported", () => {
  assert.equal(getLanguageForEra("bs"), "ne");
});
