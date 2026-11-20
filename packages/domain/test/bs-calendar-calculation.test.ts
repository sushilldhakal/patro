import { test } from "node:test";
import assert from "node:assert/strict";

import { adToBS, bsToAD, getBSMonthLength } from "../src/calendar/bs-calendar";
import { DEFAULT_AYANAMSHA, DEFAULT_CALCULATION_SYSTEM, setAyanamsha, setCalculationSystem } from "../src/calendar/calculation-system";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

test("every calculation shows the patro's month grid: drik's months are the Surya Siddhanta's", () => {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const grid = () => ({
    baisakh1: iso(bsToAD(2083, 1, 1)),
    shrawan1: iso(bsToAD(2083, 4, 1)),
    kartik1: iso(bsToAD(2083, 7, 1)),
    lengths: months.map((m) => getBSMonthLength(2083, m)),
  });
  try {
    setCalculationSystem("surya_siddhanta");
    const surya = grid();
    assert.deepEqual(surya, {
      baisakh1: "2026-04-14",
      shrawan1: "2026-07-17",
      kartik1: "2026-10-18",
      lengths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    });
    // Drik with Lahiri used to open Shrawan, Kartik, Mangsir and Magh 2083 a day early.
    setCalculationSystem("drik");
    assert.deepEqual(grid(), surya);
    // Another ayanamsha changes drik's panchanga, never which day opens a month.
    setAyanamsha("raman");
    assert.deepEqual(grid(), surya);
    assert.deepEqual({ ...adToBS(utc("2026-04-14")), monthName: undefined }, { year: 2083, month: 1, day: 1, monthName: undefined });
  } finally {
    setCalculationSystem(DEFAULT_CALCULATION_SYSTEM);
    setAyanamsha(DEFAULT_AYANAMSHA);
  }
});
