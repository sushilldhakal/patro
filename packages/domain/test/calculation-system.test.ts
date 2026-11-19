import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AYANAMSHA,
  DEFAULT_CALCULATION_SYSTEM,
  calculationKey,
  getAyanamsha,
  getCalculationSystem,
  parseStoredAyanamsha,
  setAyanamsha,
  withCalculation,
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

test("the calculation key names the system and drik's ayanamsha, as the API does", () => {
  assert.equal(calculationKey({ system: "drik", ayanamsha: "nepal" }), "drik");
  assert.equal(calculationKey({ system: "drik", ayanamsha: "lahiri" }), "drik");
  assert.equal(calculationKey({ system: "drik", ayanamsha: "kp" }), "drik.kp");
  assert.equal(calculationKey({ system: "surya_siddhanta", ayanamsha: "kp" }), "surya_siddhanta");
});

test("requests carry ayanamsha= under drik only, and never over one they name", () => {
  assert.equal(withCalculation("/panchanga/2083/7", { system: "drik", ayanamsha: "nepal" }), "/panchanga/2083/7");
  assert.equal(withCalculation("/panchanga/2083/7", { system: "drik", ayanamsha: "kp" }), "/panchanga/2083/7?ayanamsha=kp");
  assert.equal(
    withCalculation("/panchanga/2083/7?x=1#top", { system: "drik", ayanamsha: "raman" }),
    "/panchanga/2083/7?x=1&ayanamsha=raman#top",
  );
  assert.equal(
    withCalculation("/panchanga/2083/7", { system: "surya_siddhanta", ayanamsha: "kp" }),
    "/panchanga/2083/7?siddhanta=surya_siddhanta",
  );
  assert.equal(withCalculation("/kundali/detail?ayanamsha=lahiri", { system: "drik", ayanamsha: "kp" }), "/kundali/detail?ayanamsha=lahiri");
});

test("the ayanamsha is part of the calculation: subscribers hear it, the store parses it", () => {
  assert.equal(parseStoredAyanamsha("kp"), "kp");
  assert.equal(parseStoredAyanamsha("bogus"), null);
  let calls = 0;
  const off = subscribeCalculationSystem(() => {
    calls += 1;
  });
  setAyanamsha("raman");
  assert.equal(getAyanamsha(), "raman");
  setAyanamsha(DEFAULT_AYANAMSHA);
  off();
  assert.equal(calls, 2);
});
