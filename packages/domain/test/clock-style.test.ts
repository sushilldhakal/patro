import { test } from "node:test";
import assert from "node:assert/strict";
import { formatClock12 } from "../src/calendar/clock-style";

test("12-hour clock", () => {
  assert.equal(formatClock12("13:05", "en"), "1:05 pm");
  assert.equal(formatClock12("00:30", "en"), "12:30 am");
  assert.equal(formatClock12("06:10", "ne"), "बिहान 6:10");
  assert.equal(formatClock12("21:00", "ne"), "राति 9:00");
});
