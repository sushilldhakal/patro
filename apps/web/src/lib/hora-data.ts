import { brand, illustration, midnight, wheel } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
export type HoraPlanetKey =
  | "shani"
  | "guru"
  | "mangala"
  | "ravi"
  | "shukra"
  | "budha"
  | "soma";

export interface HoraPlanet {
  nep: string;
  en: string;
  color: string;
  text: string;
}

export const HORA_PLANETS: Record<HoraPlanetKey, HoraPlanet> = {
  shani: { nep: "Shani", en: "Saturn", color: illustration.orange52, text: brand.ink },
  guru: { nep: "Brihaspati", en: "Jupiter", color: illustration.orange44, text: midnight.foam },
  mangala: { nep: "Mangala", en: "Mars", color: illustration.red51b, text: brand.offWhite },
  ravi: { nep: "Āditya", en: "Sun", color: illustration.orange53b, text: illustration.amber5 },
  shukra: { nep: "Shukra", en: "Venus", color: illustration.teal61, text: wheel.pada },
  budha: { nep: "Budha", en: "Mercury", color: illustration.gray63, text: wheel.pada },
  soma: { nep: "Soma", en: "Moon", color: illustration.sky84, text: wheel.pada },
};

export const HORA_DEVA: Record<HoraPlanetKey, string> = {
  get shani() { return tFor("ne", "kundali.graha_name_saturn"); },
  get guru() { return tFor("ne", "kundali.graha_name_jupiter"); },
  get mangala() { return tFor("ne", "grahas.mars"); },
  get ravi() { return tFor("ne", "ui.hora_data.x_f8f0bc57"); },
  get shukra() { return tFor("ne", "kundali.graha_name_venus"); },
  get budha() { return tFor("ne", "kundali.graha_name_mercury"); },
  get soma() { return tFor("ne", "vastu.pada.soma.name"); },
};

export const HORA_CYCLE: HoraPlanetKey[] = [
  "shani",
  "guru",
  "mangala",
  "ravi",
  "shukra",
  "budha",
  "soma",
];

export interface HoraWeekDay {
  ruler: HoraPlanetKey;
  day: string;
  rom: string;
  en: string;
}

export const HORA_WEEK: HoraWeekDay[] = [
  { ruler: "ravi", get day() { return tFor("ne", "ui.panchanga.x_296abb3f"); }, rom: "Āitabār", en: "Sunday" },
  { ruler: "soma", get day() { return tFor("ne", "ui.panchanga.x_de395c78"); }, rom: "Sombār", en: "Monday" },
  { ruler: "mangala", get day() { return tFor("ne", "ui.hora_data.x_40728421"); }, rom: "Maṅgalbār", en: "Tuesday" },
  { ruler: "budha", get day() { return tFor("ne", "ui.hora_data.x_d8cdfd5c"); }, rom: "Budhabār", en: "Wednesday" },
  { ruler: "guru", get day() { return tFor("ne", "ui.hora_data.x_d1899f97"); }, rom: "Bihībār", en: "Thursday" },
  { ruler: "shukra", get day() { return tFor("ne", "ui.hora_data.x_7967d87e"); }, rom: "Śukrabār", en: "Friday" },
  { ruler: "shani", get day() { return tFor("ne", "ui.hora_data.x_3ceeaf93"); }, rom: "Śanibār", en: "Saturday" },
];

export const HORA_CX = 470;
export const HORA_CY = 448;
export const HORA_R_OUT0 = 372;
export const HORA_BAND = 38;
export const HORA_DRAW = 33;
export const HORA_NRINGS = 7;
export const HORA_SEG = 15;
export const HORA_GAP = 1.1;
export const HORA_TOTAL = HORA_NRINGS * 24;
export const HORA_WEEK_MS = 98_000;

/** Inner edge of the innermost day ring (आइतबार). */
export const HORA_R_INNER_BASE =
  HORA_R_OUT0 - (HORA_NRINGS - 1) * HORA_BAND - HORA_DRAW;

/** Center hub — dawn meridian starts here. */
export const HORA_R_HUB = 42;

/** Rings grow outward: r=0 innermost (Sunday), r=6 outermost (Saturday). */
export function horaRingInner(r: number): number {
  return HORA_R_INNER_BASE + r * HORA_BAND;
}

export function horaRingOuter(r: number): number {
  return horaRingInner(r) + HORA_DRAW;
}

export function horaRingMid(r: number): number {
  return horaRingInner(r) + HORA_DRAW / 2;
}

export const HORA_R_HOLE = HORA_R_INNER_BASE;

export function horaPol(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [HORA_CX + r * Math.cos(a), HORA_CY + r * Math.sin(a)];
}

export function horaSegPath(rO: number, rI: number, a0: number, a1: number): string {
  const [ox0, oy0] = horaPol(rO, a0);
  const [ox1, oy1] = horaPol(rO, a1);
  const [ix1, iy1] = horaPol(rI, a1);
  const [ix0, iy0] = horaPol(rI, a0);
  return `M${ox0} ${oy0} A${rO} ${rO} 0 0 1 ${ox1} ${oy1} L${ix1} ${iy1} A${rI} ${rI} 0 0 0 ${ix0} ${iy0} Z`;
}

export function horaTextArc(r: number, a0: number, a1: number, flip: boolean): string {
  if (!flip) {
    const [x0, y0] = horaPol(r, a0);
    const [x1, y1] = horaPol(r, a1);
    return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
  }
  const [x0, y0] = horaPol(r, a1);
  const [x1, y1] = horaPol(r, a0);
  return `M${x0} ${y0} A${r} ${r} 0 0 0 ${x1} ${y1}`;
}

function cycleIndex(key: HoraPlanetKey): number {
  return HORA_CYCLE.indexOf(key);
}

export function horaRingSeq(ring: number): HoraPlanetKey[] {
  const base = cycleIndex(HORA_WEEK[ring]!.ruler);
  return Array.from({ length: 24 }, (_, i) => HORA_CYCLE[(base + i) % 7]!);
}

export function horaRulerAt(ring: number, horaIdx: number): HoraPlanetKey {
  return HORA_CYCLE[(cycleIndex(HORA_WEEK[ring]!.ruler) + horaIdx) % 7]!;
}

export function horaPad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Map JS weekday (0=Sun) to hora ring index. */
export function horaRingFromJsDay(jsDay: number): number {
  return ((jsDay % 7) + 7) % 7;
}

/** Progress 0–1 for a given ring + hora index (0-based hora). */
export function horaProgFromRingHora(ring: number, horaIdx: number): number {
  return Math.min(0.99999, (ring * 24 + horaIdx) / HORA_TOTAL);
}
