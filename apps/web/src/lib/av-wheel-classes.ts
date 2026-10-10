import { cn } from "./utils";

/** Theme vars for Avakahada hub fills — keep on `.av-wheel` parent. */
export const avWheelTheme = "av-wheel";

export const avWheelRim =
  "fill-none stroke-[var(--w-rim)] [stroke-width:1.5]";

export const avWheelSpoke =
  "stroke-[var(--w-sep-soft)] [stroke-width:0.5]";

export function avWheelSegPada(opts?: {
  alt?: boolean;
  ringSel?: boolean;
  dim?: boolean;
}) {
  return cn(
    "fill-[var(--w-pada)] stroke-[var(--w-sep-soft)] [stroke-width:0.35] cursor-pointer transition-[filter] duration-150 ease-in-out",
    opts?.alt && "fill-[var(--w-pada-alt)]",
    opts?.ringSel &&
      "brightness-[1.25] stroke-[var(--w-accent)] [stroke-width:1]",
    opts?.dim && "opacity-[0.22]",
  );
}

export function avWheelSegAttr(
  ringId: string,
  opts?: { alt?: boolean; sel?: boolean; ringSel?: boolean; dim?: boolean },
) {
  return cn(
    "fill-[color-mix(in_srgb,var(--brand-teal,#2d8a86)_14%,#0a1518)] stroke-[var(--w-sep-soft)] [stroke-width:0.3] pointer-events-none",
    opts?.alt && "fill-[color-mix(in_srgb,var(--brand-teal,#2d8a86)_22%,#0b181a)]",
    opts?.sel && "brightness-[1.15]",
    ringId === "gana" && opts?.sel && "brightness-[1.15]",
    opts?.ringSel &&
      "brightness-[1.28] stroke-[var(--w-accent)] [stroke-width:1.1]",
    opts?.dim && "opacity-[0.22]",
  );
}

export function avWheelAttrVal(
  ringId: string,
  opts?: { sel?: boolean },
) {
  return cn(
    "fill-[var(--w-ink-dim)] font-semibold [font-family:var(--pn-font)] pointer-events-none",
    ringId === "gana" && "fill-[#b8e8d8] font-bold",
    ringId === "nadi" && "fill-[#c4d4f0]",
    opts?.sel && "fill-[var(--w-accent)]",
  );
}

export const avWheelRingGuide =
  "fill-[var(--w-accent)] font-bold opacity-85 pointer-events-none [font-family:var(--pn-font)]";

export const avWheelGuideCircle =
  "fill-none stroke-[var(--w-sep-soft)] [stroke-width:0.35] opacity-55 pointer-events-none";

export const avWheelHit = "fill-transparent cursor-pointer";

export function avWheelSegNak(opts?: { alt?: boolean; sel?: boolean; dim?: boolean }) {
  return cn(
    "stroke-[var(--w-sep)] [stroke-width:0.55] cursor-pointer transition-[filter,opacity] duration-150 ease-in-out",
    opts?.alt && "brightness-[1.06]",
    opts?.sel && "brightness-[1.22] stroke-[var(--w-accent)] [stroke-width:1.2]",
    opts?.dim && "opacity-[0.22]",
  );
}

export function avWheelNakIdx(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink-faint)] font-semibold [font-family:var(--pn-num)] pointer-events-none",
    sel && "fill-[var(--w-accent)]",
  );
}

export function avWheelNakName(sel?: boolean) {
  return cn(
    "fill-[var(--w-ink)] font-semibold [font-family:var(--pn-font)] pointer-events-none",
    sel && "fill-[var(--w-accent)]",
  );
}

export const avWheelPadaAkshar =
  "fill-[var(--w-ink-dim)] font-semibold [font-family:var(--pn-font)] pointer-events-none";

export const avWheelHubRing =
  "stroke-[var(--w-surface-border)] [stroke-width:1]";
