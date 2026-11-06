import { test } from "node:test";
import assert from "node:assert/strict";
import type { PersonalLord } from "@vedic-patro/api-client";
import { personalizeSlots, type LaidSegment, type PersonalColumn } from "../src/events/personal-slots";
import type { BestSlot } from "../src/events/best-time-slots";

const lord = (over: Partial<PersonalLord> = {}): PersonalLord => ({
  lord: "jupiter",
  lord_ne: "Guru",
  lord_en: "Jupiter",
  asta: false,
  vakri: false,
  ...over,
});

const dasha = (maha: Partial<PersonalLord> = {}, antar: Partial<PersonalLord> = {}) => ({
  maha: lord(maha),
  antar: lord({ lord: "venus", lord_ne: "Shukra", lord_en: "Venus", ...antar }),
});

const seg = (start: string, end: string, chandra: LaidSegment["chandra"]["state"], tara: LaidSegment["tara"]["state"], motion = dasha()): LaidSegment => {
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const num = tara === "bad" ? 3 : tara === "caution" ? 1 : 2;
  return {
    startMin: at(start),
    endMin: at(end),
    chandra: { house: chandra === "ashtama" ? 8 : chandra === "good" ? 1 : 2, state: chandra },
    tara: { num, name_ne: num === 3 ? "Vipat" : num === 1 ? "Janma" : "Sampat", name_en: num === 3 ? "Vipat" : num === 1 ? "Janma" : "Sampat", state: tara },
    dasha: motion,
  };
};

const column = (segments: LaidSegment[]): PersonalColumn => ({
  tone: "neutral",
  profileName: "Mina",
  doNe: [],
  doEn: [],
  dontNe: [],
  dontEn: [],
  carefulNe: [],
  carefulEn: [],
  segments,
});

const slot = (intent: BestSlot["intent"], start: string, end: string): BestSlot => {
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return { id: `${intent}:${start}`, intent, startMin: at(start), endMin: at(end), sources: [{ key: "abhijit", nameNe: "Abhijit", nameEn: "Abhijit" }] };
};

const only = (slots: BestSlot[], segments: LaidSegment[]) => personalizeSlots(slots, column(segments))[0]!;

test("ashtama over Abhijit is a routine card", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "ashtama", "good")]);
  assert.equal(got.mark.kind, "routine");
  assert.equal(got.mark.kind === "routine" && got.mark.reasons.some((r) => r.code === "ashtama"), true);
});

test("vipat tara is a routine card", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "good", "bad")]);
  assert.equal(got.mark.kind, "routine");
  assert.equal(got.mark.kind === "routine" && got.mark.reasons.some((r) => r.code === "tara"), true);
});

test("a combust lord with good tara and good chandra stays green, with a note and no star", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "good", "good", dasha({ asta: true, lord_en: "Mercury" }))]);
  assert.equal(got.mark.kind, "note");
  assert.equal(got.mark.kind === "note" && got.mark.reasons.some((r) => r.code === "asta" && r.lordEn === "Mercury"), true);
});

test("a combust lord with a bad tara is an amber card", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "good", "bad", dasha({ asta: true }))]);
  assert.equal(got.mark.kind, "routine");
});

test("a retrograde lord stays green and carries the retro note", () => {
  const got = only([slot("material", "17:16", "17:42")], [seg("06:18", "30:15", "good", "good", dasha({}, { vakri: true, lord_en: "Venus" }))]);
  assert.notEqual(got.mark.kind, "routine");
  assert.equal(got.mark.kind === "best" && got.mark.reasons.some((r) => r.code === "vakri"), true);
});

test("good tara and good chandra is a best card", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "good", "good")]);
  assert.equal(got.mark.kind, "best");
  assert.equal(got.mark.kind === "best" && got.mark.reasons.some((r) => r.code === "chandra"), true);
});

test("weak chandra keeps the green card and adds a note", () => {
  const got = only([slot("material", "11:49", "12:07")], [seg("06:18", "30:15", "weak", "good")]);
  assert.equal(got.mark.kind, "note");
  assert.equal(got.mark.kind === "note" && got.mark.reasons.some((r) => r.code === "weak"), true);
});

test("a spiritual slot under ashtama stays itself and gains the remedy note", () => {
  const got = only([slot("spiritual", "04:32", "06:17")], [seg("00:00", "06:18", "ashtama", "bad")]);
  assert.equal(got.slot.intent, "spiritual");
  assert.equal(got.mark.kind, "remedy");
});

test("a Moon change inside a slot keeps one card and names the time", () => {
  const got = only(
    [slot("material", "11:00", "13:00")],
    [seg("06:18", "11:50", "good", "good"), seg("11:50", "30:15", "ashtama", "good")],
  );
  assert.equal(got.mark.kind, "routine");
  assert.equal(got.slot.endMin - got.slot.startMin, 120);
  const reason = got.mark.kind === "routine" ? got.mark.reasons.find((r) => r.code === "ashtama") : null;
  assert.equal(reason?.fromMin, 11 * 60 + 50);
});

test("no personal data leaves the slots unchanged", () => {
  const slots = [slot("material", "11:49", "12:07"), slot("spiritual", "17:16", "18:34")];
  const got = personalizeSlots(slots, null);
  assert.deepEqual(got.map((item) => item.slot), slots);
  assert.deepEqual(got.map((item) => item.mark.kind), ["plain", "plain"]);
});
