import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CALCULATION_SYSTEM,
  getCalculationSystem,
  parseStoredCalculationSystem,
  setCalculationSystem,
  subscribeCalculationSystem,
  withCalculationSystem,
} from "../src/calendar/calculation-system";

test("drik requests go out unchanged; the Surya Siddhanta adds siddhanta=", () => {
  assert.equal(withCalculationSystem("/panchanga/2083/7", "drik"), "/panchanga/2083/7");
  assert.equal(withCalculationSystem("/panchanga/2083/7", "surya_siddhanta"), "/panchanga/2083/7?siddhanta=surya_siddhanta");
  assert.equal(
    withCalculationSystem("/kundali/detail?datetime=x#top", "surya_siddhanta"),
    "/kundali/detail?datetime=x&siddhanta=surya_siddhanta#top",
  );
});

test("a request that already names a system keeps it", () => {
  const url = "/kundali/detail?siddhanta=drik";
  assert.equal(withCalculationSystem(url, "surya_siddhanta"), url);
});

test("stored values parse loosely and the store notifies on change only", () => {
  assert.equal(parseStoredCalculationSystem(" Surya-Siddhanta "), "surya_siddhanta");
  assert.equal(parseStoredCalculationSystem("bogus"), null);
  let calls = 0;
  const off = subscribeCalculationSystem(() => {
    calls += 1;
  });
  setCalculationSystem("surya_siddhanta");
  setCalculationSystem("surya_siddhanta");
  assert.equal(getCalculationSystem(), "surya_siddhanta");
  setCalculationSystem(DEFAULT_CALCULATION_SYSTEM);
  off();
  assert.equal(calls, 2);
});
