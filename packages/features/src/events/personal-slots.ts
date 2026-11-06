/**
 * A signed-in profile's filter over the general best-time cards.
 *
 * The day's slots stay where they are. This only changes what a card says:
 * a material card can be downgraded, marked best, or given a note, and a
 * spiritual card can gain a remedy note. Nothing here draws, and nothing
 * here is React. No personal column means the cards are unchanged.
 */
import type { DayGuidance, PersonalGuidance, PersonalLord, PersonalSegment } from "@vedic-patro/api-client";
import type { BestSlot } from "./best-time-slots";

export type SlotReason = {
  code: "ashtama" | "tara" | "asta" | "vakri" | "chandra" | "weak" | "janma" | "remedy";
  /** Set when this state begins inside the slot, so the card can name that time. */
  fromMin?: number;
  nameNe?: string;
  nameEn?: string;
  lordNe?: string;
  lordEn?: string;
};

export type SlotMark =
  | { kind: "plain" }
  | { kind: "routine" | "review" | "best" | "note" | "remedy"; reasons: SlotReason[] };

export type PersonalizedSlot = { slot: BestSlot; mark: SlotMark };

/** One Moon stretch, already clipped onto a calendar date's 0–1440 clock. */
export type LaidSegment = {
  startMin: number;
  endMin: number;
  chandra: PersonalSegment["chandra"];
  tara: PersonalSegment["tara"];
  dasha: PersonalGuidance["dasha"];
};

/** What one calendar column needs from the guidance range. */
export type PersonalColumn = {
  tone: DayGuidance["personal_tone"];
  profileName: string;
  doNe: string[];
  doEn: string[];
  dontNe: string[];
  dontEn: string[];
  carefulNe: string[];
  carefulEn: string[];
  segments: LaidSegment[];
  /** The profile's own reading of the day; null on an API that does not send it yet. */
  reading: DayGuidance["reading"] | null;
};

const clockMin = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

function lay(personal: PersonalGuidance | null | undefined, shift: number): LaidSegment[] {
  if (!personal) return [];
  const out: LaidSegment[] = [];
  for (const seg of personal.segments) {
    const start = clockMin(seg.start) - shift;
    const end = clockMin(seg.end) - shift;
    const a = Math.max(0, start);
    const b = Math.min(1440, end);
    if (b - a < 1) continue;
    out.push({ startMin: a, endMin: b, chandra: seg.chandra, tara: seg.tara, dasha: personal.dasha });
  }
  return out;
}

/**
 * The column for `today`. Segments after midnight come from the previous
 * panchanga day, shifted back onto this date. `today` with no natal block
 * returns null, and the cards stay as they are.
 */
export function personalColumn(
  today: DayGuidance | undefined,
  prev: DayGuidance | undefined,
  profileName: string,
): PersonalColumn | null {
  if (!today?.personal) return null;
  const segments = [...lay(prev?.personal, 1440), ...lay(today.personal, 0)].sort((a, b) => a.startMin - b.startMin);
  return {
    tone: today.personal_tone,
    profileName,
    doNe: today.do_ne,
    doEn: today.do_en,
    dontNe: today.dont_ne,
    dontEn: today.dont_en,
    carefulNe: today.careful_ne,
    carefulEn: today.careful_en,
    segments,
    reading: today.reading ?? null,
  };
}

const overlaps = (slot: BestSlot, seg: LaidSegment) => seg.startMin < slot.endMin && slot.startMin < seg.endMin;

/** A time to name when the state starts after the slot has already begun. */
function began(slot: BestSlot, seg: LaidSegment): number | undefined {
  return seg.startMin > slot.startMin && seg.startMin < slot.endMin ? seg.startMin : undefined;
}

function lords(segs: LaidSegment[]): PersonalLord[] {
  const out: PersonalLord[] = [];
  for (const seg of segs) {
    for (const lord of [seg.dasha.maha, seg.dasha.antar]) {
      if (!out.some((have) => have.lord === lord.lord && have.asta === lord.asta && have.vakri === lord.vakri)) out.push(lord);
    }
  }
  return out;
}

function taraReason(slot: BestSlot, seg: LaidSegment): SlotReason {
  return { code: "tara", fromMin: began(slot, seg), nameNe: seg.tara.name_ne, nameEn: seg.tara.name_en };
}

/**
 * One card per slot, still. The mark is the worst personal state the slot
 * overlaps. A change inside the slot keeps the one card and names that time.
 */
export function personalizeSlots(slots: BestSlot[], column: PersonalColumn | null): PersonalizedSlot[] {
  if (!column) return slots.map((slot) => ({ slot, mark: { kind: "plain" } }));
  return slots.map((slot) => ({ slot, mark: markOf(slot, column.segments.filter((seg) => overlaps(slot, seg))) }));
}

function dashaReasons(segs: LaidSegment[]): SlotReason[] {
  const reasons: SlotReason[] = [];
  for (const lord of lords(segs)) {
    if (lord.asta) reasons.push({ code: "asta", lordNe: lord.lord_ne, lordEn: lord.lord_en });
    if (lord.vakri) reasons.push({ code: "vakri", lordNe: lord.lord_ne, lordEn: lord.lord_en });
  }
  return reasons;
}

function markOf(slot: BestSlot, segs: LaidSegment[]): SlotMark {
  if (segs.length === 0) return { kind: "plain" };
  const ashtama = segs.find((seg) => seg.chandra.state === "ashtama");
  const badTara = segs.find((seg) => seg.tara.state === "bad");
  // Only the Moon's house and tara move during the day, so only those downgrade a card.
  // A dasha lord stays combust or retrograde for weeks and is a note, not a new colour.
  const moving = Boolean(ashtama || badTara);

  if (slot.intent === "spiritual") {
    return moving ? { kind: "remedy", reasons: [{ code: "remedy" }] } : { kind: "plain" };
  }

  const dasha = dashaReasons(segs);
  if (moving) {
    const reasons: SlotReason[] = [];
    if (ashtama) reasons.push({ code: "ashtama", fromMin: began(slot, ashtama) });
    if (badTara) reasons.push(taraReason(slot, badTara));
    reasons.push(...dasha);
    return { kind: "routine", reasons };
  }

  const allGood = segs.every((seg) => seg.chandra.state === "good" && seg.tara.state === "good");
  const combust = dasha.some((reason) => reason.code === "asta");
  if (allGood && !combust) {
    const seg = segs[0]!;
    return { kind: "best", reasons: [taraReason(slot, seg), { code: "chandra" }, ...dasha] };
  }

  const reasons: SlotReason[] = [];
  const weak = segs.find((seg) => seg.chandra.state === "weak");
  const janma = segs.find((seg) => seg.tara.state === "caution");
  if (weak) reasons.push({ code: "weak", fromMin: began(slot, weak) });
  if (janma) reasons.push({ code: "janma", fromMin: began(slot, janma) });
  reasons.push(...dasha);
  return reasons.length > 0 ? { kind: "note", reasons } : { kind: "plain" };
}

/** The loudest reason on a date, for the all-day chip. Dasha notes stay in the popover. */
export function strongestReason(column: PersonalColumn): SlotReason | null {
  const segs = column.segments;
  const ashtama = segs.find((seg) => seg.chandra.state === "ashtama");
  if (ashtama) return { code: "ashtama" };
  const bad = segs.find((seg) => seg.tara.state === "bad");
  if (bad) return { code: "tara", nameNe: bad.tara.name_ne, nameEn: bad.tara.name_en };
  if (segs.some((seg) => seg.chandra.state === "weak")) return { code: "weak" };
  if (segs.some((seg) => seg.tara.state === "caution")) return { code: "janma" };
  return null;
}

/** अस्त and वक्री lines for the all-day popover. A lord can be both. */
export function dashaNotes(column: PersonalColumn): SlotReason[] {
  return dashaReasons(column.segments);
}
