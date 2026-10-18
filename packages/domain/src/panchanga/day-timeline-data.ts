import { toNepaliDigits } from "./panchanga-format";
import { toWesternRashi } from "./rashi-i18n";
import { KARANA_EN, WHEEL_TITHIS, WHEEL_YOGAS } from "./tithi-wheel-data";
import { NAKSHATRA_ICONS } from "./nakshatra-icons";
import { resolveRashiDisplay } from "./rashi-i18n";

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
export type EnResolver = (ne: string, apiEn?: string | null) => string;

function makeResolver(map: Record<string, string>): EnResolver {
  return (ne, apiEn) => {
    const hit = map[normNe(ne)];
    if (hit) return hit;
    if (apiEn && /[A-Za-z]/.test(apiEn)) return apiEn;
    return ne;
  };
}

export const tithiEnOf = makeResolver(TITHI_NE_EN);
export const nakEnOf = makeResolver(NAK_NE_EN);
export const yogaEnOf = makeResolver(YOGA_NE_EN);
export const karanaEnOf = makeResolver(KARANA_NE_EN);

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
  /** The window's API key ("rahu_kalam", "varjyam" …), so a reminder can name it. */
  key?: string;
  name: string;
  nameEn: string;
  detailNe: string;
  detailEn: string;
  startG: number;
  endG: number;
}

/**
 * Auspicious (शुभ) muhurta on the 0–60 ghati axis. Unlike {@link AshubhaSegment}
 * these are kept as distinct named windows (not merged), so each muhurta —
 * Amrit Kalam, Abhijit, Vijaya … — keeps its own name and number badge.
 */
export interface ShubhaSegment {
  /** The window's API key ("abhijit", "amrit_kalam" …). */
  key?: string;
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
  /** Panchang-Shuddhi subset shown on the chart band. */
  ashubha: AshubhaSegment[];
  /** Full अशुभ list shown in the cards below the chart. */
  ashubhaAll: AshubhaSegment[];
  shubha: ShubhaSegment[];
}

export type AngaBlock = {
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

export type LagnaSpanBlock = {
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

export const G_MAX_PAD = 2.5;

export function parseTimeToMinutes(time?: string | null): number | null {
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

export function minutesToGhati(minutes: number, sunriseMin: number): number {
  let g = (minutes - sunriseMin) / 24;
  while (g < 0) g += 60;
  return Math.min(g, 60);
}

/** Parse a local wall-clock ("HH:MM", "HH:MM:SS", or "HH:MM AM/PM") to minutes. */
export function clockToMinutes(raw?: string | null): number | null {
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
 * The doshas shown on the Panchang-Shuddhi (अशुभ) chart row, keyed by backend
 * dosha key and relabelled to match the drikpanchang chart. Only these keep the
 * chart band uncluttered; every other inauspicious window (yamaganda, gulika,
 * baana, aadal/vidal, dur muhurtam …) still appears in the card list below via
 * {@link buildAshubhaAllSegments}.
 */
export const SHUDDHI_DOSHAS: Record<string, { ne: string; en: string }> = {
  tithi: { ne: "तिथि", en: "Tithi" },
  tithi_randhra: { ne: "तिथि रन्ध्र", en: "Tithi Randhra" },
  visha_tithi: { ne: "तिथि विष", en: "Tithi Visha" },
  varjyam: { ne: "नक्षत्र विष", en: "Nakshatra Visha" },
  visha_yoga: { ne: "योग विष", en: "Yoga Visha" },
  rahu_kalam: { ne: "राहु", en: "Rahu" },
  bhadra: { ne: "करण", en: "Karana" },
};

/** Ghati for the "now" needle on a sunrise-to-sunrise chart; null before today's sunrise. */
export function needleGhatiOnVedicChart(
  civilMins: number,
  sunriseMin: number
): number | null {
  if (civilMins < sunriseMin) return null;
  const g = (civilMins - sunriseMin) / 24;
  return g <= 60 ? g : null;
}

export function computeGMin(sunriseMin: number): number {
  const sunriseHourFloor = Math.floor(sunriseMin / 60) * 60;
  return (sunriseHourFloor - sunriseMin) / 24;
}

export function buildCivilHourTicks(
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

export function nextKarana(name: string): KaranaName {
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
export function angaSegments(
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

export function karanaSegments(anga?: AngaBlock | null): TimelineSegment[] {
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

export function lagnaSegments(spans?: LagnaSpanBlock[] | null): TimelineSegment[] {
  if (!spans?.length) return [];
  return spans.map((span, index) => ({
    name: span.name_ne ?? span.name ?? "",
    // The API's `name` is the Sanskrit romanization (Simha) — English readers
    // get the western sign.
    nameEn: toWesternRashi(span.name ?? span.name_ne) ?? "",
    endG: index < spans.length - 1 ? ghatiFromBlock(span) : null,
    transitionLocal:
      index < spans.length - 1 ? lagnaLocalClock(span.end_local_time) : undefined,
  }));
}

/** Equal-width columns for Navagraha at Udayakal (sunrise). */
export function grahaSegments(planets: GrahaSpashtaItem[]): TimelineSegment[] {
  const list = planets.filter(
    (p) => p.rashiNe && p.coords && p.coords !== "—"
  );
  const n = list.length;
  if (!n) return [];
  return list.map((p, i) => ({
    name: p.coords!,
    subLabel: `${p.label}-${p.rashiNe}`,
    subLabelEn: `${TL_GRAHA_EN[p.label] ?? p.label}-${resolveRashiDisplay(p.rashiNe, undefined, "en") ?? p.rashiNe ?? ""}`,
    endG: i < n - 1 ? ((i + 1) / n) * 60 : null,
  }));
}

export function buildChoghadiyaFromApi(
  segments: Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean }>
): ChoghadiyaSegment[] {
  return segments.map((c) => ({
    name: c.name_ne,
    startG: c.start_g,
    endG: c.end_g,
    bad: Boolean(c.bad),
  }));
}

/** Minutes-from-midnight → position on the shared 0–60 axis (1440 min = 60). */
export function minToG(min: number): number {
  return Math.max(0, Math.min(60, min / 24));
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
