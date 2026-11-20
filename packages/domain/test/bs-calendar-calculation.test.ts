import { test } from "node:test";
import assert from "node:assert/strict";

import { adToBS, bsToAD, getBSMonthLength } from "../src/calendar/bs-calendar";
import { DEFAULT_AYANAMSHA, DEFAULT_CALCULATION_SYSTEM, setAyanamsha, setCalculationSystem } from "../src/calendar/calculation-system";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

test("the device's BS dates follow the reader's calculation, as the API's do", () => {
  try {
    setCalculationSystem("drik");
    // Drik with Lahiri: Baisakh 1, 2083 is 14 April 2026, Kartik 1 is 17 October.
    assert.equal(iso(bsToAD(2083, 1, 1)), "2026-04-14");
    assert.equal(iso(bsToAD(2083, 7, 1)), "2026-10-17");
    // Raman's zodiac starts earlier: Baisakh 1 is 12 April.
    setAyanamsha("raman");
    assert.equal(iso(bsToAD(2083, 1, 1)), "2026-04-12");
    assert.deepEqual({ ...adToBS(utc("2026-04-12")), monthName: undefined }, { year: 2083, month: 1, day: 1, monthName: undefined });
    // The Surya Siddhanta keeps its own months whatever ayanamsha drik had.
    setCalculationSystem("surya_siddhanta");
    assert.equal(iso(bsToAD(2083, 1, 1)), "2026-04-14");
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => getBSMonthLength(2083, m)),
      [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    );
  } finally {
    setCalculationSystem(DEFAULT_CALCULATION_SYSTEM);
    setAyanamsha(DEFAULT_AYANAMSHA);
  }
});
