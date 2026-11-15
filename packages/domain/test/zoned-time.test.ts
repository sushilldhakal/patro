import assert from "node:assert/strict";
import test from "node:test";
import { todayAdStringInTimezone, validTimeZone } from "../src/calendar/zoned-time";
import { zonedToIso } from "../src/calendar/event-time";

test("validTimeZone keeps a real IANA zone", () => {
  assert.equal(validTimeZone("Asia/Kathmandu"), "Asia/Kathmandu");
});

test("validTimeZone replaces names Intl doesn't know instead of throwing", () => {
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(validTimeZone("India Standard Time"), device);
  assert.equal(validTimeZone(""), device);
  assert.equal(validTimeZone(null), device);
});

test("zone helpers don't throw on a Windows zone name from a synced calendar", () => {
  assert.doesNotThrow(() => todayAdStringInTimezone(new Date(), "Nepal Standard Time"));
  assert.doesNotThrow(() => zonedToIso("2026-11-20", "10:15", "Nepal Standard Time"));
});
