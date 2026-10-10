import type { ApiHoraSlot, CivilTimeline, PanchangaDay } from "@/lib/api";
import { getAuspiciousWindows } from "@/lib/muhurta-windows";
import {
  formatPakshaNepaliDisplay,
  getInauspiciousWindows,
  getLagnaSpans,
  getHoraSlots,
  getMoonrise,
  getMoonset,
  getPanchangaDetail,
  getPlanetRows,
  getSunrise,
  getSunset,
  toNepaliDigits,
} from "@/lib/panchanga-format";
import { KARANA_EN, WHEEL_TITHIS, WHEEL_YOGAS } from "@/lib/tithi-wheel-data";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";

/** Devanagari rashi names → English, for the timeline graha row. */
export const TL_RASHI_EN: Record<string, string> = {
  मेष: "Aries",
  वृष: "Taurus",
  वृषभ: "Taurus",
  मिथुन: "Gemini",
  कर्कट: "Cancer",
  कर्क: "Cancer",
  सिंह: "Leo",
  कन्या: "Virgo",
  तुला: "Libra",
  वृश्चिक: "Scorpio",
  धनु: "Sagittarius",
  मकर: "Capricorn",
  कुम्भ: "Aquarius",
  मीन: "Pisces",
};

/**
 * Devanagari → English for tithi / nakshatra / yoga / karana names. The daily
 * payload's `name` field is not always Latin (some blocks — especially the
 * `next` transitions — only carry `name_ne`), which left English mode showing
 * Devanagari in the timeline. These curated maps guarantee a Latin label; the
 * resolver falls back to any Latin `name` from the API, then the Nepali text.
 */
function normNe(s: string): string {
  return s
    .replace(/पक्ष/g, "")
    .replace(/शुक्ल|कृष्ण/g, "")
    .replace(/[\s,·]+/g, "")
    .trim();
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const TITHI_NE_EN: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const t of WHEEL_TITHIS) m[normNe(t.ne)] = t.en;
  m[normNe("अमावस्या")] = "Aaushi";
  m[normNe("औंसी")] = "Aunsi";
  m[normNe("पूर्णिमा")] = "Purnima";
  return m;
})();

const NAK_NE_EN: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const n of NAKSHATRA_ICONS) m[normNe(n.ne)] = titleCase(n.en);
  return m;
})();

const YOGA_EN_LIST = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
  "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
  "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
  "Indra", "Vaidhriti",
] as const;

const YOGA_NE_EN: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  WHEEL_YOGAS.forEach((ne, i) => {
    m[normNe(ne)] = YOGA_EN_LIST[i] ?? ne;
  });
  return m;
})();

const KARANA_NE_EN: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [ne, en] of Object.entries(KARANA_EN)) m[normNe(ne)] = en;
  return m;
})();

/** Resolve an English label from a Devanagari name: curated map → Latin API name → Nepali. */
type EnResolver = (ne: string, apiEn?: string | null) => string;

function makeResolver(map: Record<string, string>): EnResolver {
  return (ne, apiEn) => {
    const hit = map[normNe(ne)];
    if (hit) return hit;
    if (apiEn && /[A-Za-z]/.test(apiEn)) return apiEn;
    return ne;
  };
}

const tithiEnOf = makeResolver(TITHI_NE_EN);
const nakEnOf = makeResolver(NAK_NE_EN);
const yogaEnOf = makeResolver(YOGA_NE_EN);
const karanaEnOf = makeResolver(KARANA_NE_EN);

export interface TimelineSegment {
  name: string;
  /** English variant of `name` for the English locale. */
  nameEn?: string;
  endG?: number | null;
  bad?: boolean;
  /** Wall-clock label at segment end (used for lagna transitions). */
  transitionLocal?: string;
  /** Planet name above rashi (ग्रह स्थिति row). */
  subLabel?: string;
  /** English variant of `subLabel`. */
  subLabelEn?: string;
}

/** Choghadiya muhurta names (Nepali → English). */
export const CHOGHADIYA_EN: Record<string, string> = {
  उद्वेग: "Udvega",
  चर: "Chara",
  लाभ: "Labha",
  अमृत: "Amrita",
  काल: "Kala",
  शुभ: "Shubha",
  रोग: "Roga",
};

/** Devanagari graha names → English, for the timeline graha row. */
export const TL_GRAHA_EN: Record<string, string> = {
  सूर्य: "Sun",
  चन्द्र: "Moon",
  चन्द्रमा: "Moon",
  मंगल: "Mars",
  मङ्गल: "Mars",
  बुध: "Mercury",
  बृहस्पति: "Jupiter",
  गुरु: "Jupiter",
  शुक्र: "Venus",
  शनि: "Saturn",
  राहु: "Rahu",
  केतु: "Ketu",
};

export interface TimelineRowData {
  label: string;
  en: string;
  kind?: "choghadiya" | "hora" | "lagna" | "graha" | "ashubha" | "shubha";
  items: TimelineSegment[];
}

export interface ChoghadiyaSegment {
  name: string;
  startG: number;
  endG: number;
  bad?: boolean;
}

export interface HoraSegment {
  name: string;
  nameEn: string;
  startG: number;
  endG: number;
  bad?: boolean;
}

/**
 * Inauspicious (अशुभ) span on the 0–60 ghati axis. Overlapping source windows
 * (Rahu / Yamaganda / Gulika / Baana / Dur Muhurtam …) are merged into a single
 * band so labels never collide; `name` is the lone window when there is only one
 * contributor, otherwise a generic "अशुभ". `detail*` lists every contributor for
 * the hover tooltip.
 */
export interface AshubhaSegment {
  name: string;
  nameEn: string;
  detailNe: string;
  detailEn: string;
  startG: number;
  endG: number;
}

/** Auspicious (शुभ) muhurta on the 0–60 ghati axis — distinct named windows. */
export interface ShubhaSegment {
  name: string;
  nameEn: string;
  startG: number;
  endG: number;
}

export interface CivilHourTick {
  hour: number;
  g: number;
}

export interface GrahaSpashtaItem {
  label: string;
  rashiNe?: string;
  /** Patro cells: rashi|deg|min|sec e.g. २|२५|५१|२६ */
  coords?: string;
}

export interface DayTimelineData {
  /** "sunrise" = ghati 0–60 from sunrise (default); "civil" = midnight→midnight. */
  mode?: "sunrise" | "civil";
  /** Civil mode: sunrise/sunset positions on the 0–60 axis, and night bands. */
  sunriseG?: number;
  sunsetG?: number;
  nightBands?: Array<[number, number]>;
  dayG: number;
  gMin: number;
  gMax: number;
  moonriseG: number | null;
  moonsetG: number | null;
  weekdayNe: string;
  weekdayEn: string;
  sunriseMin: number;
  sunriseLabel: string;
  sunsetLabel: string;
  moonriseLabel: string | null;
  moonsetLabel: string | null;
  grahaSpashta: GrahaSpashtaItem[];
  civilHourTicks: CivilHourTick[];
  rows: TimelineRowData[];
  choghadiya: ChoghadiyaSegment[];
  badChoghadiya: ChoghadiyaSegment[];
  hora: HoraSegment[];
  ashubha: AshubhaSegment[];
  ashubhaAll: AshubhaSegment[];
  shubha: ShubhaSegment[];
}

type AngaBlock = {
  name_ne?: string;
  name?: string;
  end_ghati_clock?: string;
  end_hours_clock?: string;
  end_local_time?: string;
  next?: {
    name_ne?: string;
    name?: string;
    end_ghati_clock?: string;
    end_hours_clock?: string;
    end_local_time?: string;
    next?: {
      name_ne?: string;
      name?: string;
      end_ghati_clock?: string;
      end_hours_clock?: string;
      end_local_time?: string;
    };
  };
};

type LagnaSpanBlock = {
  name_ne?: string;
  name?: string;
  degree_in_rashi?: number;
  start_local_time?: string;
  end_local_time?: string;
  start_ghati_clock?: string;
  start_hours_clock?: string;
  end_ghati_clock?: string;
  end_hours_clock?: string;
};

const G_MAX_PAD = 2.5;

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Ghati:pala[:vipala] from sunrise — canonical panchanga position on 0–60 scale. */
function parseGhatiClock(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const gh = parts[0];
  const pa = parts[1] ?? 0;
  if (gh == null || Number.isNaN(gh)) return null;
  return gh + pa / 60;
}

/** Civil hours:minutes:seconds elapsed from sunrise → ghati. */
function parseHoursClockToGhati(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return (h * 60 + m + s / 60) / 24;
}

function ghatiFromBlock(block?: {
  end_ghati_clock?: string;
  end_hours_clock?: string;
}): number | null {
  if (!block) return null;
  return (
    parseHoursClockToGhati(block.end_hours_clock) ??
    parseGhatiClock(block.end_ghati_clock)
  );
}

function minutesToGhati(minutes: number, sunriseMin: number): number {
  let g = (minutes - sunriseMin) / 24;
  while (g < 0) g += 60;
  return Math.min(g, 60);
}

/** Parse a local wall-clock ("HH:MM", "HH:MM:SS", or "HH:MM AM/PM") to minutes. */
function clockToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  const mer = m[3]?.toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * The doshas shown on the Panchang-Shuddhi (अशुभ) row, keyed by the backend
 * dosha key and relabelled to match the drikpanchang chart. Any other
 * inauspicious timing (yamaganda, gulika, baana, ganda moola, …) is excluded.
 * Covers the Visha Ghati of each panchanga element: तिथि विष (tithi),
 * नक्षत्र विष (varjyam), योग विष (yoga), and करण / भद्रा (bhadra).
 */
const SHUDDHI_DOSHAS: Record<string, { ne: string; en: string }> = {
  tithi: { ne: "तिथि", en: "Tithi" },
  tithi_randhra: { ne: "तिथि रन्ध्र", en: "Tithi Randhra" },
  visha_tithi: { ne: "तिथि विष", en: "Tithi Visha" },
  varjyam: { ne: "नक्षत्र विष", en: "Nakshatra Visha" },
  visha_yoga: { ne: "योग विष", en: "Yoga Visha" },
  rahu_kalam: { ne: "राहु", en: "Rahu" },
  bhadra: { ne: "करण", en: "Karana" },
};

function windowToSpan(
  w: ReturnType<typeof getInauspiciousWindows>[number],
  toG: (minutes: number) => number,
): { startG: number; endG: number } | null {
  const sMin = clockToMinutes(w.start);
  if (sMin == null) return null;
  const startG = toG(sMin);
  if (startG < 0 || startG > 60) return null;
  let endG: number;
  if (w.tillFullNight) {
    endG = 60;
  } else {
    const eMin = clockToMinutes(w.end);
    if (eMin == null) return null;
    endG = toG(eMin);
    if (endG < startG) endG = 60;
  }
  endG = Math.min(endG, 60);
  if (endG <= startG) return null;
  return { startG, endG };
}

/**
 * Convert raw inauspicious windows (local clock ranges) into ashubha segments on
 * the shared 0–60 axis. `toG` maps minutes-from-midnight to a ghati position
 * (sunrise-relative for Day-Night, `min/24` for civil). Degenerate/zero-length
 * or sunrise-straddling windows are dropped so the row stays clean.
 */
function buildAshubhaSegments(
  windows: ReturnType<typeof getInauspiciousWindows>,
  toG: (minutes: number) => number,
): AshubhaSegment[] {
  // 1) Convert each window to a position on the 0–60 axis. `tillFullNight`
  //    windows run to the next sunrise (g = 60); midnight-spanning windows are
  //    handled by `toG`, which wraps pre-sunrise clocks past 60 back to 0–60.
  //    Only the five Panchang-Shuddhi doshas are shown, relabelled per drik.
  const parsed: { s: number; e: number; ne: string; en: string }[] = [];
  for (const w of windows) {
    const label = SHUDDHI_DOSHAS[w.key];
    if (!label) continue;
    const sMin = clockToMinutes(w.start);
    if (sMin == null) continue;
    const startG = toG(sMin);
    if (startG < 0 || startG > 60) continue;
    let endG: number;
    if (w.tillFullNight) {
      endG = 60;
    } else {
      const eMin = clockToMinutes(w.end);
      if (eMin == null) continue;
      endG = toG(eMin);
      if (endG < startG) endG = 60; // window carried past the axis end
    }
    endG = Math.min(endG, 60);
    if (endG <= startG) continue;
    parsed.push({ s: startG, e: endG, ne: label.ne, en: label.en });
  }

  if (!parsed.length) return [];

  // 2) Panchang-shuddhi sweep line: cut the axis at every window boundary, then
  //    for each elementary slice record the *set* of doshas active there. This
  //    yields drikpanchang-style contiguous bands where band 4 might be
  //    "तिथि, राहु" and band 6 "करण, तिथि" — the overlap is spelled out per band.
  const bounds = new Set<number>();
  for (const iv of parsed) {
    bounds.add(Number(iv.s.toFixed(3)));
    bounds.add(Number(iv.e.toFixed(3)));
  }
  const pts = [...bounds].sort((a, b) => a - b);

  const slices: { s: number; e: number; ne: string[]; en: string[] }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i]!;
    const e = pts[i + 1]!;
    if (e - s < 0.02) continue;
    const mid = (s + e) / 2;
    const ne: string[] = [];
    const en: string[] = [];
    for (const iv of parsed) {
      if (iv.s <= mid && mid < iv.e && !ne.includes(iv.ne)) {
        ne.push(iv.ne);
        en.push(iv.en);
      }
    }
    if (!ne.length) continue;
    slices.push({ s, e, ne, en });
  }

  // 3) Merge neighbouring slices that carry the identical dosha set.
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  const merged: { s: number; e: number; ne: string[]; en: string[] }[] = [];
  for (const sl of slices) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.e - sl.s) < 0.02 && sameSet(last.ne, sl.ne)) {
      last.e = sl.e;
    } else {
      merged.push({ s: sl.s, e: sl.e, ne: [...sl.ne], en: [...sl.en] });
    }
  }

  return merged.map((m) => ({
    name: m.ne.join(", "),
    nameEn: m.en.join(", "),
    detailNe: m.ne.join(", "),
    detailEn: m.en.join(", "),
    startG: m.s,
    endG: m.e,
  }));
}

/** Full अशुभ list for cards below the chart — one row per window (Rahu, Gulika, Baana, …). */
function buildAshubhaAllSegments(
  windows: ReturnType<typeof getInauspiciousWindows>,
  toG: (minutes: number) => number,
): AshubhaSegment[] {
  const segs: AshubhaSegment[] = [];
  for (const w of windows) {
    const span = windowToSpan(w, toG);
    if (!span) continue;
    segs.push({
      name: w.nameNe,
      nameEn: w.nameEn,
      detailNe: w.nameNe,
      detailEn: w.nameEn,
      startG: span.startG,
      endG: span.endG,
    });
  }
  segs.sort((a, b) => a.startG - b.startG);
  return segs;
}

/** Convert auspicious windows into शुभ segments on the 0–60 axis. */
function buildShubhaSegments(
  windows: ReturnType<typeof getAuspiciousWindows>,
  toG: (minutes: number) => number,
): ShubhaSegment[] {
  const segs: ShubhaSegment[] = [];
  for (const w of windows) {
    const sMin = clockToMinutes(w.start);
    if (sMin == null) continue;
    const startG = toG(sMin);
    if (startG < 0 || startG > 60) continue;
    let endG: number;
    if (w.tillFullNight) {
      endG = 60;
    } else {
      const eMin = clockToMinutes(w.end);
      if (eMin == null) continue;
      endG = toG(eMin);
      if (endG < startG) endG = 60;
    }
    endG = Math.min(endG, 60);
    if (endG <= startG) continue;
    segs.push({ name: w.nameNe, nameEn: w.nameEn, startG, endG });
  }
  segs.sort((a, b) => a.startG - b.startG);
  return segs;
}

/** Ghati for the "now" needle on a sunrise-to-sunrise chart; null before today's sunrise. */
export function needleGhatiOnVedicChart(
  civilMins: number,
  sunriseMin: number
): number | null {
  if (civilMins < sunriseMin) return null;
  const g = (civilMins - sunriseMin) / 24;
  return g <= 60 ? g : null;
}

function computeGMin(sunriseMin: number): number {
  const sunriseHourFloor = Math.floor(sunriseMin / 60) * 60;
  return (sunriseHourFloor - sunriseMin) / 24;
}

function buildCivilHourTicks(
  sunriseMin: number,
  _gMin: number,
  gMax: number
): CivilHourTick[] {
  const ticks: CivilHourTick[] = [];
  const firstHourMin = Math.ceil(sunriseMin / 60) * 60;
  for (let m = firstHourMin; m < sunriseMin + 1440; m += 60) {
    const g = (m - sunriseMin) / 24;
    if (g > gMax) break;
    const hh = Math.floor((m % 1440) / 60);
    ticks.push({ hour: hh === 0 ? 24 : hh, g });
  }
  return ticks;
}

type KaranaName = { ne: string; en: string };

/**
 * Canonical "next karana" transitions covering the 7 movable *and* 4 fixed
 * karanas. A lunar month ends with the fixed sequence
 * विष्टि → शकुनि → चतुष्पाद → नाग → किमस्तुघ्न, so predicting the segment after a
 * fixed karana must NOT fall back into the movable cycle. Keys include both
 * backend and wheel spelling variants (चतुष्पाद/चतुष्पद, किमस्तुघ्न/किंस्तुघ्न).
 */
const KARANA_NEXT: Record<string, KaranaName> = {
  "बव": { ne: "बालव", en: "Balava" },
  "बालव": { ne: "कौलव", en: "Kaulava" },
  "कौलव": { ne: "तैतिल", en: "Taitila" },
  "तैतिल": { ne: "गर", en: "Gara" },
  "गर": { ne: "वणिज", en: "Vanija" },
  "वणिज": { ne: "विष्टि", en: "Vishti" },
  "विष्टि": { ne: "बव", en: "Bava" },
  "शकुनि": { ne: "चतुष्पाद", en: "Chatushpada" },
  "चतुष्पाद": { ne: "नाग", en: "Naga" },
  "चतुष्पद": { ne: "नाग", en: "Naga" },
  "नाग": { ne: "किमस्तुघ्न", en: "Kimstughna" },
  "किमस्तुघ्न": { ne: "बव", en: "Bava" },
  "किंस्तुघ्न": { ne: "बव", en: "Bava" },
};

function nextKarana(name: string): KaranaName {
  const norm = name.trim();
  if (KARANA_NEXT[norm]) return KARANA_NEXT[norm];
  for (const key of Object.keys(KARANA_NEXT)) {
    if (norm.includes(key)) return KARANA_NEXT[key]!;
  }
  return { ne: "कौलव", en: "Kaulava" };
}

/**
 * Build timeline segments from API anga block.
 * Uses end_hours_clock / end_ghati_clock (sunrise-relative), not naive local-time compare.
 */
function angaSegments(
  anga?: AngaBlock | null,
  toEn: EnResolver = (ne, apiEn) => apiEn ?? ne,
): TimelineSegment[] {
  if (!anga) return [];
  const current = anga.name_ne ?? anga.name;
  if (!current) return [];

  const items: TimelineSegment[] = [];
  const endG = ghatiFromBlock(anga);

  items.push({ name: current, nameEn: toEn(current, anga.name), endG: endG ?? null });

  const next = anga.next;
  if (next?.name_ne || next?.name) {
    const nextEndG = ghatiFromBlock(next);
    const nextNe = next.name_ne ?? next.name ?? "";
    items.push({
      name: nextNe,
      nameEn: toEn(nextNe, next.name),
      endG: nextEndG ?? null,
    });

    const third = next.next;
    if (third?.name_ne || third?.name) {
      const thirdEndG = ghatiFromBlock(third);
      const thirdNe = third.name_ne ?? third.name ?? "";
      items.push({
        name: thirdNe,
        nameEn: toEn(thirdNe, third.name),
        endG: thirdEndG != null && thirdEndG < 60 ? thirdEndG : null,
      });
    }
  }

  return items.filter((s) => s.name);
}

function karanaSegments(anga?: AngaBlock | null): TimelineSegment[] {
  const items = angaSegments(anga, karanaEnOf);
  if (items.length >= 2) {
    const second = items[1];
    if (second && second.endG != null && second.endG < 60) {
      const nk = nextKarana(second.name);
      items.push({ name: nk.ne, nameEn: nk.en, endG: null });
    }
  }
  return items;
}

function lagnaLocalClock(local?: string | null): string | undefined {
  if (!local) return undefined;
  const m = local.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return local;
  return `${m[1]}:${m[2]}`;
}

function lagnaSegments(spans?: LagnaSpanBlock[] | null): TimelineSegment[] {
  if (!spans?.length) return [];
  return spans.map((span, index) => ({
    name: span.name_ne ?? span.name ?? "",
    nameEn: span.name ?? span.name_ne ?? "",
    endG: index < spans.length - 1 ? ghatiFromBlock(span) : null,
    transitionLocal:
      index < spans.length - 1 ? lagnaLocalClock(span.end_local_time) : undefined,
  }));
}

/** Equal-width columns for Navagraha at Udayakal (sunrise). */
function grahaSegments(planets: GrahaSpashtaItem[]): TimelineSegment[] {
  const list = planets.filter(
    (p) => p.rashiNe && p.coords && p.coords !== "—"
  );
  const n = list.length;
  if (!n) return [];
  return list.map((p, i) => ({
    name: p.coords!,
    subLabel: `${p.label}-${p.rashiNe}`,
    subLabelEn: `${TL_GRAHA_EN[p.label] ?? p.label}-${TL_RASHI_EN[p.rashiNe ?? ""] ?? p.rashiNe ?? ""}`,
    endG: i < n - 1 ? ((i + 1) / n) * 60 : null,
  }));
}

function tithiSegments(tithi: AngaBlock | undefined, p: PanchangaDay): TimelineSegment[] {
  const paksha = formatPakshaNepaliDisplay(p);
  const pakshaEn = /कृष्ण/.test(paksha ?? "") ? "Krishna Paksha" : /शुक्ल/.test(paksha ?? "") ? "Shukla Paksha" : "";
  return angaSegments(tithi, tithiEnOf).map((seg, i) => ({
    ...seg,
    name: i === 0 && paksha ? `${seg.name}, ${paksha}` : seg.name,
    nameEn: i === 0 && pakshaEn ? `${seg.nameEn ?? seg.name}, ${pakshaEn}` : (seg.nameEn ?? seg.name),
  }));
}

function buildChoghadiyaFromApi(
  segments: Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean }>
): ChoghadiyaSegment[] {
  return segments.map((c) => ({
    name: c.name_ne,
    startG: c.start_g,
    endG: c.end_g,
    bad: Boolean(c.bad),
  }));
}

/** Server hora slot from the daily panchanga payload. */
export type { ApiHoraSlot };

export function getApiHora(p: PanchangaDay): ApiHoraSlot[] {
  return getHoraSlots(p);
}

function buildHoraTimelineSegments(p: PanchangaDay): HoraSegment[] {
  return getApiHora(p).map((slot) => ({
    name: slot.planet_ne,
    nameEn: slot.planet_en,
    startG: slot.start_g,
    endG: Math.min(slot.end_g, 60),
    bad: slot.bad,
  }));
}

export function buildDayTimelineData(p: PanchangaDay, _dateAd?: string): DayTimelineData | null {
  const detail = getPanchangaDetail(p);
  const sunrise = getSunrise(p);
  const sunset = getSunset(p);
  const sunriseMin = parseTimeToMinutes(sunrise);
  const sunsetMin = parseTimeToMinutes(sunset);
  if (sunriseMin == null || sunsetMin == null) return null;

  const dayG =
    (detail?.day_ghati as number | undefined) ??
    minutesToGhati(sunsetMin, sunriseMin);
  const gMin = computeGMin(sunriseMin);
  const gMax = 60 + G_MAX_PAD;
  const moonriseMin = parseTimeToMinutes(getMoonrise(p));
  const moonsetMin = parseTimeToMinutes(getMoonset(p));
  const moonriseG = moonriseMin != null ? minutesToGhati(moonriseMin, sunriseMin) : null;
  const moonsetG = moonsetMin != null ? minutesToGhati(moonsetMin, sunriseMin) : null;

  const vaara = (detail?.vaara ?? {}) as {
    name_ne?: string;
    name_english?: string;
    number?: number;
  };
  const weekdayNe = vaara.name_ne ?? p.weekday ?? "—";
  const weekdayEn = vaara.name_english ?? p.weekday ?? "—";

  const tithi = (detail?.tithi ?? p.tithi) as AngaBlock | undefined;
  const nakshatra = (detail?.nakshatra ?? p.nakshatra) as AngaBlock | undefined;
  const yoga = (detail?.yoga ?? p.yoga) as AngaBlock | undefined;
  const karana = (detail?.karana ?? p.karana) as AngaBlock | undefined;

  const apiChoghadiya = detail?.choghadiya as
    | Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean }>
    | undefined;
  // Both choghadiya and hora come pre-computed from the API daily payload.
  const cho = apiChoghadiya?.length ? buildChoghadiyaFromApi(apiChoghadiya) : [];
  const hora = buildHoraTimelineSegments(p);
  const inauspiciousWindows = getInauspiciousWindows(p);
  const ashubha = buildAshubhaSegments(inauspiciousWindows, (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const ashubhaAll = buildAshubhaAllSegments(inauspiciousWindows, (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const shubha = buildShubhaSegments(getAuspiciousWindows(p), (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const lagnaSpans = (getLagnaSpans(p) ?? []) as LagnaSpanBlock[];
  const grahaSpashta = getPlanetRows(p).map(({ label, rashiNe, coords }) => ({
    label,
    rashiNe,
    coords,
  }));

  return {
    dayG,
    gMin,
    gMax,
    moonriseG,
    moonsetG,
    weekdayNe,
    weekdayEn,
    sunriseMin,
    sunriseLabel: sunrise ?? "",
    sunsetLabel: sunset ?? "",
    moonriseLabel: getMoonrise(p) ?? null,
    moonsetLabel: getMoonset(p) ?? null,
    grahaSpashta,
    civilHourTicks: buildCivilHourTicks(sunriseMin, gMin, gMax),
    rows: [
      { label: "तिथि", en: "Tithi", items: tithiSegments(tithi, p) },
      { label: "नक्षत्र", en: "Nakshatra", items: angaSegments(nakshatra, nakEnOf) },
      { label: "योग", en: "Yoga", items: angaSegments(yoga, yogaEnOf) },
      { label: "करण", en: "Karana", items: karanaSegments(karana) },
      {
        label: "चौघडिया",
        en: weekdayEn,
        kind: "choghadiya",
        items: cho.map((c) => ({
          name: c.name,
          endG: c.endG,
          bad: c.bad,
        })),
      },
      {
        label: "होरा",
        en: "Hora",
        kind: "hora",
        items: hora.map((h) => ({
          name: h.name,
          nameEn: h.nameEn,
          endG: h.endG,
          bad: h.bad,
        })),
      },
      ...(lagnaSpans.length > 0
        ? [
            {
              label: "लग्न",
              en: "Lagna",
              kind: "lagna" as const,
              items: lagnaSegments(lagnaSpans),
            },
          ]
        : []),
      ...(ashubha.length > 0
        ? [{ label: "अशुभ", en: "Ashubha", kind: "ashubha" as const, items: [] }]
        : []),
      ...(shubha.length > 0
        ? [{ label: "शुभ", en: "Shubha", kind: "shubha" as const, items: [] }]
        : []),
      ...(grahaSpashta.length > 0
        ? [
            {
              label: "ग्रह",
              en: "Planets at sunrise",
              kind: "graha" as const,
              items: grahaSegments(grahaSpashta),
            },
          ]
        : []),
    ],
    choghadiya: cho,
    badChoghadiya: cho.filter((c) => c.bad),
    hora,
    ashubha,
    ashubhaAll,
    shubha,
  };
}

/** Minutes-from-midnight → position on the shared 0–60 axis (1440 min = 60). */
function minToG(min: number): number {
  return Math.max(0, Math.min(60, min / 24));
}

/**
 * Civil-day (midnight→midnight) timeline built from the backend `civil_timeline`
 * block. Reuses the same 0–60 axis as the sunrise chart by treating position as
 * `minutes / 24`, so `dualTimeAtGhati(g, 0)` yields civil clock labels directly.
 */
export function buildCivilTimelineData(
  civil: CivilTimeline,
  p?: PanchangaDay,
): DayTimelineData {
  const sunriseG = minToG(civil.sunrise_min);
  const sunsetG = civil.sunset_min != null ? minToG(civil.sunset_min) : 60;
  const pakshaNe = civil.paksha_ne ?? "";
  const pakshaEn = /कृष्ण/.test(pakshaNe) ? "Krishna Paksha" : /शुक्ल/.test(pakshaNe) ? "Shukla Paksha" : "";

  const angaItems = (
    segs: CivilTimeline["rows"]["tithi"],
    opts?: { paksha?: boolean; karana?: boolean; toEn?: EnResolver },
  ): TimelineSegment[] => {
    const toEn: EnResolver = opts?.toEn ?? ((ne, apiEn) => apiEn ?? ne);
    const items: TimelineSegment[] = segs.map((s, i) => {
      const ne = s.name_ne ?? s.name ?? "";
      const en = toEn(ne, s.name);
      return {
        name: opts?.paksha && i === 0 && pakshaNe ? `${ne}, ${pakshaNe}` : ne,
        nameEn: opts?.paksha && i === 0 && pakshaEn ? `${en}, ${pakshaEn}` : en,
        endG: minToG(s.end_min),
      };
    });
    const last = items[items.length - 1];
    if (last) {
      // A segment that reaches the end of the day is open-ended (fills to 24:00).
      if (last.endG != null && last.endG >= 59.9) {
        last.endG = null;
      } else if (opts?.karana && last.endG != null) {
        // Karana chain stops short of midnight — continue with the correct
        // successor (handles the month-end fixed karanas, not just movable).
        const nk = nextKarana(last.name);
        items.push({ name: nk.ne, nameEn: nk.en, endG: null });
      }
    }
    return items;
  };

  const choghadiya: ChoghadiyaSegment[] = civil.choghadiya.map((c) => ({
    name: c.name_ne ?? "",
    startG: minToG(c.start_min),
    endG: minToG(c.end_min),
    bad: Boolean(c.bad),
  }));
  const hora: HoraSegment[] = civil.hora.map((h) => ({
    name: h.planet_ne ?? "",
    nameEn: h.planet_en ?? h.planet_ne ?? "",
    startG: minToG(h.start_min),
    endG: minToG(h.end_min),
    bad: Boolean(h.bad),
  }));

  const lagnaItems: TimelineSegment[] = civil.lagna.map((s, i, arr) => ({
    name: s.name_ne ?? s.name ?? "",
    nameEn: s.name ?? s.name_ne ?? "",
    endG: i < arr.length - 1 ? minToG(s.end_min) : null,
    transitionLocal:
      i < arr.length - 1 ? ghatiToCivilClockLabel(minToG(s.end_min), 0) : undefined,
  }));

  // Civil hours 0…24 across the axis (0–60), every 3h for a clean ruler.
  const civilHourTicks: CivilHourTick[] = Array.from({ length: 9 }, (_, i) => ({
    hour: i * 3,
    g: i * 3 * 2.5,
  }));

  const ashubha = p
    ? buildAshubhaSegments(getInauspiciousWindows(p), (min) => minToG(min))
    : [];
  const ashubhaAll = p
    ? buildAshubhaAllSegments(getInauspiciousWindows(p), (min) => minToG(min))
    : [];
  const shubha = p
    ? buildShubhaSegments(getAuspiciousWindows(p), (min) => minToG(min))
    : [];

  const rows: TimelineRowData[] = [
    { label: "तिथि", en: "Tithi", items: angaItems(civil.rows.tithi, { paksha: true, toEn: tithiEnOf }) },
    { label: "नक्षत्र", en: "Nakshatra", items: angaItems(civil.rows.nakshatra, { toEn: nakEnOf }) },
    { label: "योग", en: "Yoga", items: angaItems(civil.rows.yoga, { toEn: yogaEnOf }) },
    { label: "करण", en: "Karana", items: angaItems(civil.rows.karana, { karana: true, toEn: karanaEnOf }) },
    { label: "चौघडिया", en: civil.weekday_en ?? "", kind: "choghadiya", items: [] },
    { label: "होरा", en: "Hora", kind: "hora", items: [] },
    ...(lagnaItems.length > 0
      ? [{ label: "लग्न", en: "Lagna", kind: "lagna" as const, items: lagnaItems }]
      : []),
    ...(ashubha.length > 0
      ? [{ label: "अशुभ", en: "Ashubha", kind: "ashubha" as const, items: [] }]
      : []),
    ...(shubha.length > 0
      ? [{ label: "शुभ", en: "Shubha", kind: "shubha" as const, items: [] }]
      : []),
  ];

  return {
    mode: "civil",
    sunriseG,
    sunsetG,
    nightBands: [
      [0, sunriseG],
      [sunsetG, 60],
    ],
    dayG: sunsetG,
    gMin: 0,
    gMax: 60,
    moonriseG: civil.moonrise_min != null ? minToG(civil.moonrise_min) : null,
    moonsetG: civil.moonset_min != null ? minToG(civil.moonset_min) : null,
    weekdayNe: civil.weekday_ne ?? "—",
    weekdayEn: civil.weekday_en ?? "—",
    sunriseMin: 0,
    sunriseLabel: ghatiToCivilClockLabel(sunriseG, 0),
    sunsetLabel: civil.sunset_min != null ? ghatiToCivilClockLabel(sunsetG, 0) : "",
    moonriseLabel: null,
    moonsetLabel: null,
    grahaSpashta: [],
    civilHourTicks,
    rows,
    choghadiya,
    badChoghadiya: choghadiya.filter((c) => c.bad),
    hora,
    ashubha,
    ashubhaAll,
    shubha,
  };
}

export function choghadiyaTone(name: string, bad?: boolean): "bad" | "good" | "neutral" {
  if (bad) return "bad";
  if (name === "लाभ" || name === "अमृत" || name === "शुभ") return "good";
  return "neutral";
}

export function choghadiyaQuality(name: string, bad?: boolean): "शुभ" | "अशुभ" | "सामान्य" {
  const tone = choghadiyaTone(name, bad);
  if (tone === "good") return "शुभ";
  if (tone === "bad") return "अशुभ";
  return "सामान्य";
}

/** Civil clock from sunrise; after 24:00 wraps to 1, 2, 3… (not 25, 26, 27). */
export function ghatiToCivilClockLabel(g: number, sunriseMin: number): string {
  const totalMin = sunriseMin + g * 24;
  let h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h > 24) h = ((h - 1) % 24) + 1;
  return toNepaliDigits(`${h}:${String(m).padStart(2, "0")}`);
}

export function ghatiToClockLabel(g: number, sunriseMin: number): string {
  return ghatiToCivilClockLabel(g, sunriseMin);
}

export function ghatiShortLabel(g: number): string {
  const gh = Math.floor(g);
  const pa = Math.floor((g - gh) * 60);
  return toNepaliDigits(`${gh}:${String(pa).padStart(2, "0")}`);
}

export function ghatiShortLabelLong(g: number): string {
  const gh = Math.floor(g);
  const pa = Math.floor((g - gh) * 60);
  return toNepaliDigits(`${gh} घडी ${pa} पला`);
}

export function dualTimeAtGhati(
  g: number,
  sunriseMin: number
): { ghati: string; clock: string; ghatiLong: string } {
  return {
    ghati: ghatiShortLabel(g),
    ghatiLong: ghatiShortLabelLong(g),
    clock: ghatiToCivilClockLabel(g, sunriseMin),
  };
}
