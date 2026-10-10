import { cn } from "./utils";

export const wRimCircle = "fill-none stroke-[var(--w-rim)]";

export const wSep = "stroke-[var(--w-sep)]";

export const wTick = "stroke-[var(--w-ink-faint)]";

export function wTickMajor(major?: boolean) {
  return cn(wTick, major && "stroke-[var(--w-ink-dim)]");
}

export function wDaytick(major?: boolean) {
  return cn(
    "stroke-[var(--w-ink-faint)] [stroke-width:0.55] opacity-60",
    major && "stroke-[var(--w-ink-dim)] [stroke-width:0.9] opacity-85",
  );
}

export function wSegNak(opts?: { alt?: boolean; hot?: boolean; sel?: boolean }) {
  return cn(
    "fill-[var(--w-band)] stroke-[var(--w-sep-soft)] [stroke-width:0.6] transition-[fill] duration-150 ease-in-out",
    opts?.alt && "fill-[var(--w-band-alt)]",
    opts?.hot && "fill-[color-mix(in_srgb,var(--w-accent)_26%,var(--w-band-alt))]",
    opts?.sel && "fill-[color-mix(in_srgb,var(--w-accent)_40%,var(--w-band-alt))]",
  );
}

export function wSegRashi(opts?: { alt?: boolean; hot?: boolean; sel?: boolean }) {
  return cn(
    "fill-[var(--w-rashi)] stroke-[var(--w-sep-soft)] [stroke-width:0.6] transition-[fill] duration-150 ease-in-out",
    opts?.alt && "fill-[var(--w-rashi-alt)]",
    opts?.hot && "fill-[color-mix(in_srgb,var(--w-accent)_26%,var(--w-band-alt))]",
    opts?.sel && "fill-[color-mix(in_srgb,var(--w-accent)_40%,var(--w-band-alt))]",
  );
}

export function wSegPada(alt?: boolean) {
  return cn(
    "fill-[var(--w-pada)] stroke-[var(--w-sep-soft)] [stroke-width:0.4]",
    alt && "fill-[var(--w-pada-alt)]",
  );
}

export const wHit = "fill-transparent cursor-pointer";

export const wSegNow =
  "fill-[color-mix(in_srgb,var(--w-accent)_18%,transparent)] stroke-[var(--w-accent)] [stroke-width:1.2]";

export const wLabel =
  "fill-[var(--w-ink)] font-semibold [font-family:var(--pn-font)]";

export const wMonthGreg =
  "fill-[var(--w-ink-faint)] text-sm font-semibold tracking-[0.04em] [font-family:var(--pn-font)]";

export function wMonthNe(now?: boolean) {
  return cn(
    "fill-[var(--w-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]",
    now && "fill-[var(--w-accent)] text-base font-extrabold",
  );
}

export function wNakName(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] text-sm font-semibold [font-family:var(--pn-font)]",
    sel && "fill-[var(--w-accent)]",
  );
}

export function wRashiName(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] text-sm font-semibold [font-family:var(--pn-font)]",
    sel && "fill-[var(--w-accent)]",
  );
}

export const wPadaNum =
  "fill-[var(--w-ink-dim)] text-sm text-base [font-family:var(--pn-num)]";

export const wPadaAkshar =
  "fill-[var(--w-ink-dim)] text-sm font-semibold [font-family:var(--pn-font)]";

export const wRashiRay =
  "stroke-[var(--w-sep-soft)] [stroke-width:0.9] opacity-90 pointer-events-none";

export const wCoreSep =
  "stroke-[var(--w-sep)] [stroke-width:0.6] [stroke-dasharray:1_5] opacity-[0.42]";

export function wTwNum(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink-faint)] text-sm font-semibold [font-family:var(--pn-num)]",
    sel && "fill-[var(--w-accent)]",
  );
}

export function wTwName(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] text-sm font-semibold [font-family:var(--pn-font)] [paint-order:stroke_fill] stroke-[rgba(0,0,0,0.55)] [stroke-width:0.4px]",
    sel && "fill-[var(--w-accent)] stroke-[rgba(0,0,0,0.7)]",
  );
}

export const wTwPaksha =
  "fill-[var(--w-ink-faint)] text-xs font-semibold tracking-[0.04em] [font-family:var(--pn-font)]";

export function wKarLbl(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] text-sm font-bold [font-family:var(--pn-font)] [paint-order:stroke_fill] stroke-[rgba(6,31,33,0.85)] [stroke-width:0.7px]",
    sel && "fill-[#ffe8e4]",
  );
}

export function wYogaLbl(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] text-sm font-semibold [font-family:var(--pn-font)] [paint-order:stroke_fill] stroke-[rgba(6,31,33,0.85)] [stroke-width:0.7px]",
    sel && "fill-[#f3edff]",
  );
}

export const wYear =
  "fill-[var(--w-accent)] text-lg font-bold tracking-[0.02em] [font-family:var(--pn-num)]";

export const wRashiGlyph = "fill-[var(--w-ink)] font-normal";

export const wLagnaLine =
  "stroke-[#f9c800] [stroke-width:1.4] [stroke-dasharray:3_4] opacity-90";

export const wLagnaCap = "fill-[#f9c800]";

export const wOrbit =
  "fill-none stroke-[color-mix(in_srgb,#8fbfc1_14%,transparent)] [stroke-width:1]";

export const wPlanetGlow = "blur-[5px] opacity-55";

export const wPlanetName =
  "fill-[var(--w-ink-dim)] text-[8.5px] text-base [font-family:var(--pn-font)]";
