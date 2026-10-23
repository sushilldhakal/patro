import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CALENDAR_STORAGE_KEY,
  DEFAULT_CALENDAR,
  calendarForEra,
  configureCalendarPersistence,
  eraForCalendar,
  getCalendarSystem,
  parseStoredCalendar,
  setCalendarSystem,
  subscribeCalendarSystem,
} from "../src/calendar/calendar-system";

test("constants", () => {
  assert.equal(DEFAULT_CALENDAR, "bs");
  assert.equal(CALENDAR_STORAGE_KEY, "calendarSystem");
  assert.equal(getCalendarSystem(), "bs");
});

test("parseStoredCalendar edge cases", () => {
  assert.equal(parseStoredCalendar("bs"), "bs");
  assert.equal(parseStoredCalendar("ad"), "ad");
  assert.equal(parseStoredCalendar("AD"), "ad");
  assert.equal(parseStoredCalendar(" Bs "), "bs");
  assert.equal(parseStoredCalendar(""), null);
  assert.equal(parseStoredCalendar("gregorian"), null);
  assert.equal(parseStoredCalendar("bbs"), null);
  assert.equal(parseStoredCalendar(null), null);
  assert.equal(parseStoredCalendar(undefined), null);
  assert.equal(parseStoredCalendar(42 as unknown as string), null);
});

test("era <-> calendar mapping", () => {
  assert.equal(eraForCalendar("bs"), "bs");
  assert.equal(eraForCalendar("ad"), "ad");
  assert.equal(calendarForEra("bs"), "bs");
  assert.equal(calendarForEra("bbs"), "bs");
  assert.equal(calendarForEra("ad"), "ad");
  assert.equal(calendarForEra("bc"), "ad");
});

test("set notifies subscribers once per change and calls the persist hook", () => {
  const persisted: string[] = [];
  configureCalendarPersistence({ persist: (c) => persisted.push(c) });
  let calls = 0;
  const unsubscribe = subscribeCalendarSystem(() => calls++);

  setCalendarSystem("ad");
  assert.equal(getCalendarSystem(), "ad");
  assert.equal(calls, 1);
  assert.deepEqual(persisted, ["ad"]);

  // Same value: no notification, but still persisted (onboarding may pick the default).
  setCalendarSystem("ad");
  assert.equal(calls, 1);
  assert.deepEqual(persisted, ["ad", "ad"]);

  unsubscribe();
  setCalendarSystem("bs");
  assert.equal(getCalendarSystem(), "bs");
  assert.equal(calls, 1);
  assert.deepEqual(persisted, ["ad", "ad", "bs"]);
});

test("a throwing persist hook does not break the store", () => {
  configureCalendarPersistence({
    persist: () => {
      throw new Error("disk full");
    },
  });
  setCalendarSystem("ad");
  assert.equal(getCalendarSystem(), "ad");
  setCalendarSystem("bs");
  configureCalendarPersistence({ persist: () => {} });
});
