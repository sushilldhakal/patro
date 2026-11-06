import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarEvent } from "@vedic-patro/api-client";
import { zonedToIso } from "@vedic-patro/domain/calendar/event-time";
import {
  bestTimeSlots,
  clipBestSlot,
  dayYogas,
  placeBestSlots,
  slotCovered,
  type SlotWindow,
} from "../src/events/best-time-slots";

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

const w = (key: string, start: string, end: string): SlotWindow => ({
  key,
  nameNe: key,
  nameEn: key,
  startMin: at(start),
  endMin: at(end),
});

const brief = (slots: { intent: string; startMin: number; endMin: number; sources: { key: string }[] }[]) =>
  slots.map((s) => [s.intent, s.startMin, s.endMin, s.sources.map((x) => x.key).join("+")]);

test("a material window partly under Rahu is trimmed, then held 2 minutes off that edge", () => {
  const got = bestTimeSlots([
    w("rahu_kalam", "10:24", "11:47"),
    w("abhijit", "11:25", "12:09"),
  ]);
  assert.deepEqual(brief(got), [["material", at("11:49"), at("12:09"), "abhijit"]]);
});

test("a material window fully inside Varjyam is removed", () => {
  const got = bestTimeSlots([
    w("varjyam", "12:51", "14:30"),
    w("vijaya_muhurta", "13:36", "14:20"),
  ]);
  assert.deepEqual(got, []);
});

test("a slot under 10 minutes is dropped", () => {
  const got = bestTimeSlots([
    w("godhuli_muhurta", "17:16", "17:25"),
    w("brahma_muhurta", "04:32", "04:40"),
  ]);
  assert.deepEqual(got, []);
});

test("a Wednesday payload with no abhijit window has no abhijit card", () => {
  const windows = [w("godhuli_muhurta", "17:16", "17:42")];
  assert.deepEqual(brief(bestTimeSlots(windows)), [["material", at("17:16"), at("17:42"), "godhuli_muhurta"]]);
  assert.deepEqual(brief(bestTimeSlots([w("abhijit", "11:25", "12:09")])), [["material", at("11:25"), at("12:09"), "abhijit"]]);
});

test("a spiritual window across midnight is one slot, then one piece on each date", () => {
  const [slot] = bestTimeSlots([w("nishita_muhurta", "23:00", "25:00")]);
  assert.ok(slot);
  assert.equal(slot.intent, "spiritual");
  assert.deepEqual([slot.startMin, slot.endMin], [at("23:00"), at("25:00")]);
  const first = clipBestSlot(slot, "2026-11-06", "2026-11-06");
  const second = clipBestSlot(slot, "2026-11-06", "2026-11-07");
  assert.deepEqual(first && [first.startMin, first.endMin], [at("23:00"), at("24:00")]);
  assert.deepEqual(second && [second.startMin, second.endMin], [at("00:00"), at("01:00")]);
});

test("a Tier 3 window over a material window does not trim it", () => {
  const plain = bestTimeSlots([w("godhuli_muhurta", "17:16", "17:42")]);
  const covered = bestTimeSlots([
    w("godhuli_muhurta", "17:16", "17:42"),
    w("baana", "17:00", "18:00"),
    w("gulika", "17:10", "17:30"),
    w("vidaal_yoga", "17:16", "17:42"),
  ]);
  assert.deepEqual(brief(covered), brief(plain));
});

/** Kathmandu, 5 and 6 Nov 2026, from the live panchanga (lat 27.7, lon 85.3167). */
const NOV5: SlotWindow[] = [
  w("abhijit", "11:25", "12:09"),
  w("vijaya_muhurta", "13:37", "14:21"),
  w("godhuli_muhurta", "17:17", "17:43"),
  w("sayahna_sandhya", "17:17", "18:35"),
  w("amrit_kalam", "20:51", "22:29"),
  w("nishita_muhurta", "23:21", "24:13"),
  w("brahma_muhurta", "28:32", "29:25"),
  w("pratah_sandhya", "28:59", "30:17"),
  w("yamaganda", "06:17", "07:39"),
  w("baana", "06:17", "21:22"),
  w("gulika", "09:02", "10:24"),
  w("dur_muhurtam", "09:57", "10:41"),
  w("tithi_randhra", "10:51", "14:51"),
  w("varjyam", "11:05", "12:42"),
  w("rahu_kalam", "13:09", "14:32"),
  w("visha_tithi", "18:49", "20:25"),
  w("vidaal_yoga", "28:11", "30:17"),
];

const NOV6: SlotWindow[] = [
  w("abhijit", "11:25", "12:09"),
  w("vijaya_muhurta", "13:36", "14:20"),
  w("godhuli_muhurta", "17:16", "17:42"),
  w("sayahna_sandhya", "17:16", "18:34"),
  w("amrit_kalam", "22:46", "24:25"),
  w("nishita_muhurta", "23:21", "24:13"),
  w("brahma_muhurta", "28:33", "29:25"),
  w("pratah_sandhya", "28:59", "30:17"),
  w("vidaal_yoga", "06:17", "21:18"),
  w("baana", "06:17", "21:18"),
  w("gulika", "07:40", "09:02"),
  w("dur_muhurtam", "08:29", "09:13"),
  w("rahu_kalam", "10:24", "11:47"),
  w("dur_muhurtam", "12:09", "12:53"),
  w("varjyam", "12:51", "14:30"),
  w("yamaganda", "14:31", "15:54"),
  w("visha_tithi", "14:49", "16:26"),
];

test("6 Nov 2026 in Kathmandu keeps the buffered clean slots and joins the ones that touch", () => {
  const date = "2026-11-06";
  // Friday. The previous panchanga day carries the small hours.
  const prev = bestTimeSlots(NOV5);
  const cur = bestTimeSlots(NOV6);
  const clipped = [...prev.map((s) => clipBestSlot(s, "2026-11-05", date)), ...cur.map((s) => clipBestSlot(s, date, date))].filter((s) => s != null);
  assert.deepEqual(brief(clipped), [
    ["spiritual", at("04:32"), at("06:17"), "brahma_muhurta+pratah_sandhya"],
    ["material", at("11:49"), at("12:07"), "abhijit"],
    ["material", at("17:16"), at("17:42"), "godhuli_muhurta"],
    ["spiritual", at("17:16"), at("18:34"), "sayahna_sandhya"],
    ["material", at("22:46"), at("24:00"), "amrit_kalam"],
    ["spiritual", at("22:46"), at("24:00"), "amrit_kalam+nishita_muhurta"],
  ]);
  assert.equal(clipped.some((s) => s!.sources.some((x) => x.key === "vijaya_muhurta")), false);
  const evening = clipped.filter((s) => s!.startMin === at("17:16"));
  const placed = placeBestSlots(evening);
  assert.equal(placed.length, evening.length);
  assert.deepEqual(
    placed.map((p) => [p.slot.intent, p.slot.startMin, p.slot.endMin, p.lane, p.lanes]),
    [
      ["spiritual", at("17:16"), at("18:34"), 0, 2],
      ["material", at("17:16"), at("17:42"), 1, 2],
    ],
  );
});

test("Sarvartha Siddhi running through the next morning is a day yoga, not a slot", () => {
  const windows = [w("sarvartha_siddhi", "06:14", "28:45"), w("abhijit", "11:25", "12:09")];
  const got = bestTimeSlots(windows);
  assert.equal(got.some((s) => s.sources.some((x) => x.key === "sarvartha_siddhi")), false);
  assert.deepEqual(brief(got), [["material", at("11:25"), at("12:09"), "abhijit"]]);
  assert.deepEqual(dayYogas(windows).map((s) => s.key), ["sarvartha_siddhi"]);
});

test("a Tier 2 window longer than 3 hours is never a slot", () => {
  assert.deepEqual(bestTimeSlots([w("amrit_kalam", "06:00", "09:01")]), []);
  assert.equal(bestTimeSlots([w("amrit_kalam", "06:00", "09:00")]).length, 2);
});

test("overlapping material and spiritual slots are one card each", () => {
  const slots = bestTimeSlots([
    w("godhuli_muhurta", "17:16", "17:42"),
    w("sayahna_sandhya", "17:16", "18:34"),
  ]);
  const placed = placeBestSlots(slots);
  assert.equal(placed.length, 2);
  assert.deepEqual(
    placed.map((p) => [p.slot.startMin, p.slot.endMin]),
    [
      [at("17:16"), at("18:34")],
      [at("17:16"), at("17:42")],
    ],
  );
});

test("a 13-minute clipped tail is dropped and the longer piece stays", () => {
  const [slot] = bestTimeSlots([w("nishita_muhurta", "23:21", "24:13")]);
  assert.ok(slot);
  assert.equal(clipBestSlot(slot, "2026-11-05", "2026-11-06"), null);
  const kept = clipBestSlot(slot, "2026-11-05", "2026-11-05");
  assert.deepEqual(kept && [kept.startMin, kept.endMin], [at("23:21"), at("24:00")]);
});

function item(kind: CalendarEvent["kind"], start: string, end: string, extra?: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "1",
    title: "Work",
    location: null,
    notes: null,
    all_day: false,
    starts_at: zonedToIso("2026-11-06", start, "Asia/Kathmandu"),
    ends_at: zonedToIso("2026-11-06", end, "Asia/Kathmandu"),
    timezone: "Asia/Kathmandu",
    repeat: "never",
    alerts: [],
    source_kind: null,
    source_key: null,
    invitees: [],
    profile_id: null,
    kind,
    ...extra,
  };
}

const abhijit = { startMin: at("11:49"), endMin: at("12:07") };

test("a timed task over a slot hides it; an all-day event or a reminder does not", () => {
  const date = "2026-11-06";
  assert.equal(slotCovered(abhijit, [item("task", "11:50", "12:00")], date), true);
  assert.equal(slotCovered(abhijit, [item("event", "11:40", "11:55")], date), true);
  assert.equal(slotCovered(abhijit, [item("appointment", "12:00", "12:30")], date), true);
  assert.equal(slotCovered(abhijit, [item("task", "12:07", "12:40")], date), false);
  assert.equal(slotCovered(abhijit, [item("task", "11:49", "11:49")], date), true);
  assert.equal(slotCovered(abhijit, [item("event", "11:49", "12:07", { all_day: true })], date), false);
  assert.equal(slotCovered(abhijit, [item("reminder", "11:49", "12:07")], date), false);
});
