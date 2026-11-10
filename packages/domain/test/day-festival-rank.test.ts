import assert from "node:assert/strict";
import { test } from "node:test";
import { rankDayFestivals } from "../src/calendar/local-calendar";

test("a day cell names the major festival before community and minor ones", () => {
  const day = [
    { id: "falgunanda-jayanti", importance: "community", category: "kirat" },
    { id: "world-pneumonia-day", importance: "minor", category: "international" },
    { id: "satyayugadi", importance: "regional", category: "hindu" },
    { id: "bhai-tika", importance: "national", category: "hindu" },
  ];
  assert.deepEqual(rankDayFestivals(day).map((f) => f.id), ["bhai-tika", "satyayugadi", "falgunanda-jayanti", "world-pneumonia-day"]);
});

test("the day's own festival comes before the multi-day holiday block", () => {
  const day = [
    { id: "tihar", importance: "national", category: "hindu", is_public_holiday: true, start_date: "2026-11-08", end_date: "2026-11-12" },
    { id: "laxmi-puja", importance: "national", category: "hindu" },
    { id: "laxmi-prasad-devkota-jayanti", importance: "national", category: "cultural" },
    { id: "mha-puja", importance: "regional", category: "newari" },
  ];
  assert.deepEqual(rankDayFestivals(day).map((f) => f.id), ["laxmi-puja", "tihar", "laxmi-prasad-devkota-jayanti", "mha-puja"]);
});

test("a one-day public holiday leads its day; equal ranks keep their order", () => {
  const day = [
    { id: "a", importance: "national", category: "hindu" },
    { id: "chhath", importance: "national", category: "hindu", is_public_holiday: true, start_date: "2026-11-15", end_date: "2026-11-15" },
    { id: "b", importance: "national", category: "hindu" },
  ];
  assert.deepEqual(rankDayFestivals(day).map((f) => f.id), ["chhath", "a", "b"]);
});
