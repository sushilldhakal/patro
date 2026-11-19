/**
 * Shared pieces of the Surya Siddhanta figures: shape types, number
 * formatting in Nepali or English digits, plane helpers and the text's own
 * sine table (2.17–22) with its interpolation (2.31–33). copy-ok-file
 */
export type Lang = "ne" | "en";
export type Tone = "ink" | "muted" | "faint" | "sun" | "moon" | "earth" | "accent" | "shadow" | "planet";

export type Style = { fill?: Tone; stroke?: Tone; w?: number; dash?: string; opacity?: number };
export type Shape =
  | ({ k: "circle"; x: number; y: number; r: number } & Style)
  | ({ k: "line"; x1: number; y1: number; x2: number; y2: number } & Style)
  | ({ k: "path"; d: string } & Style)
  | { k: "text"; x: number; y: number; text: string; tone: Tone; size?: number; anchor?: "start" | "middle" | "end"; bold?: boolean };

/** One line of a figure's key: the coloured mark, the initial drawn beside it, and what it stands for. */
export type KeyItem = { tone: Tone; mark?: string; text: string; as?: "dot" | "line" | "ring" };
export type FigureFrame = { shapes: Shape[]; readout: string[]; steps?: Step[]; key?: KeyItem[] };

/** Short initials for the bodies, as the figures letter them. */
const INITIALS: Record<string, [string, string]> = {
  चन्द्र: ["च", "Mo"],
  सूर्य: ["सू", "Su"],
  मङ्गल: ["मं", "Ma"],
  बुध: ["बु", "Me"],
  गुरु: ["गु", "Ju"],
  बृहस्पति: ["बृ", "Ju"],
  शुक्र: ["शु", "Ve"],
  शनि: ["श", "Sa"],
};

/** The initial for a body's Nepali name (falls back to its first two letters). */
export function initial(lang: Lang, ne: string, en: string): string {
  const hit = INITIALS[ne.split(" ")[0]!];
  if (hit) return lang === "en" ? hit[1] : hit[0];
  return lang === "en" ? en.slice(0, 2) : [...ne].slice(0, 2).join("");
}

/** A key item. */
export function key(tone: Tone, mark: string, text: string, as: "dot" | "line" | "ring" = "dot"): KeyItem {
  return { tone, mark, text, as };
}

/** One line of worked mathematics under a figure. A part is plain text or a fraction. */
export type MathPart = string | { n: string; d: string };
export type Step = { say: string; eq: MathPart[] };

// ---------------------------------------------------------------- helpers

export const DEV = "०१२३४५६७८९";
export const RAD = Math.PI / 180;
export const W = 360;
export const H = 200;

export function num(lang: Lang, value: number | string): string {
  const s = String(value);
  return lang === "ne" ? s.replace(/[0-9]/g, (d) => DEV[Number(d)]!) : s;
}
export function fmt(lang: Lang, value: number, digits = 0): string {
  return num(lang, value.toFixed(digits)).replace(/^-/, "−");
}
/** 23.5 → 23°30′ */
export function dms(lang: Lang, deg: number): string {
  const sign = deg < 0 ? "−" : "";
  let a = Math.abs(deg);
  let d = Math.floor(a);
  let m = Math.round((a - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  a = d;
  return `${sign}${num(lang, a)}°${m ? num(lang, String(m).padStart(2, "0")) + "′" : ""}`;
}
export function L(lang: Lang, ne: string, en: string): string {
  return lang === "en" ? en : ne;
}
export function circle(x: number, y: number, r: number, s: Style): Shape {
  return { k: "circle", x, y, r, ...s };
}
export function line(x1: number, y1: number, x2: number, y2: number, s: Style): Shape {
  return { k: "line", x1, y1, x2, y2, ...s };
}
export function path(d: string, s: Style): Shape {
  return { k: "path", d, ...s };
}
export function text(x: number, y: number, t: string, tone: Tone = "ink", size = 11, anchor: "start" | "middle" | "end" = "middle", bold = false): Shape {
  return { k: "text", x, y, text: t, tone, size, anchor, bold };
}
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  // 0° points right, angles grow anticlockwise (east is anticlockwise on these sky drawings)
  return { x: cx + r * Math.cos(deg * RAD), y: cy - r * Math.sin(deg * RAD) };
}
export function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 0 : 1;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}
export const wrap = (deg: number) => ((deg % 360) + 360) % 360;
export const tri = (t: number) => 1 - Math.abs(1 - 2 * t); // 0 → 1 → 0

/** Surya Siddhanta 2.17–22: the 24 sines in minutes, radius 3438. */
export const SURYA_SINES = [225, 449, 671, 890, 1105, 1315, 1520, 1719, 1910, 2093, 2267, 2431, 2585, 2728, 2859, 2978, 3084, 3177, 3256, 3321, 3372, 3409, 3431, 3438];
export const TRIJYA = 3438;

/** Linear interpolation in the Surya Siddhanta's own table (2.31–32). */
export function suryaJya(deg: number): number {
  const a = wrap(deg);
  const q = a % 180;
  const x = q > 90 ? 180 - q : q;
  const idx = x / 3.75;
  const i = Math.floor(idx);
  const lo = i === 0 ? 0 : SURYA_SINES[i - 1]!;
  const hi = SURYA_SINES[Math.min(23, i)]!;
  const v = lo + (hi - lo) * (idx - i);
  return a >= 180 ? -v : v;
}
export function suryaArc(jya: number): number {
  const s = Math.min(TRIJYA, Math.abs(jya));
  let prev = 0;
  for (let i = 0; i < 24; i += 1) {
    const hi = SURYA_SINES[i]!;
    if (s <= hi) {
      const deg = (i + (s - prev) / (hi - prev)) * 3.75;
      return jya < 0 ? -deg : deg;
    }
    prev = hi;
  }
  return jya < 0 ? -90 : 90;
}
