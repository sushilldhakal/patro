import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { QueryClient, QueryClientContext } from "@tanstack/react-query";
import { BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { DEFAULT_CALENDAR, setCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { registerBundle, setLanguage } from "@vedic-patro/i18n/runtime";
import { useOwnerCompatibility } from "../src/vastu/use-owner-compatibility";
import { renderHook } from "./helpers/render-hook";

const require = createRequire(import.meta.url);
registerBundle("ne", require("@vedic-patro/i18n/ne.json"));
registerBundle("en", require("@vedic-patro/i18n/en.json"));

const queryClient = new QueryClient();
const withQueryClient = (context: unknown) =>
  context === QueryClientContext ? queryClient : (context as { _currentValue: unknown })._currentValue;

const fetchDay = () => Promise.reject(new Error("not used"));
const render = () => renderHook(() => useOwnerCompatibility({ fetchDay }), withQueryClient);
const field = (fields: { id: string }[], part: string) => fields.find((f) => f.id.endsWith(part)) as {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
};

beforeEach(async () => {
  setCalendarSystem(DEFAULT_CALENDAR);
  await setLanguage("ne");
});

test("by default the construction date is picked in Bikram Sambat, with Nepali month names", () => {
  const hook = render();
  hook.result.setCandidateDate("2026-11-01");
  const fields = hook.rerender().dateFields;
  assert.equal(field(fields, "year").value, "2083");
  assert.equal(field(fields, "month").value, "7");
  assert.equal(field(fields, "day").value, "15");
  assert.deepEqual(field(fields, "month").options.map((o) => o.label), BS_MONTHS_NE);
});

test("a BS pick is stored as the AD day it falls on", () => {
  const hook = render();
  hook.result.setCandidateDate("2026-11-01");
  field(hook.rerender().dateFields, "month").onChange("1"); // वैशाख 15, 2083
  assert.equal(hook.rerender().candidateDate, "2026-04-28");
  field(hook.result.dateFields, "day").onChange("32"); // past the month's end → its last day
  const days = field(hook.rerender().dateFields, "day");
  assert.equal(days.value, String(days.options.length));
});

test("Gregorian months appear only when the calendar is switched to AD", () => {
  setCalendarSystem("ad");
  const hook = render();
  hook.result.setCandidateDate("2026-11-01");
  const fields = hook.rerender().dateFields;
  assert.equal(field(fields, "year").value, "2026");
  assert.equal(field(fields, "month").value, "11");
  assert.equal(field(fields, "day").value, "1");
  assert.ok(!BS_MONTHS_NE.includes(field(fields, "month").options[10]!.label));
});
