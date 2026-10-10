import { cn } from "@vedic-patro/domain/utils";

export const pgxNightwash =
  "fill-[color-mix(in_srgb,var(--brand-teal)_7%,transparent)] dark:fill-[color-mix(in_srgb,var(--foreground)_8%,transparent)]";

export const pgxScaleLabel =
  "text-body fill-muted-foreground font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export function pgxScaleLabelDim(dim?: boolean) {
  return cn(pgxScaleLabel, dim && "opacity-75");
}

export const pgxHour = "text-caption fill-foreground font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgxGhati =
  "text-caption fill-muted-foreground [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgxSunline = "stroke-border [stroke-width:1]";

export const pgxMoonline =
  "stroke-[color-mix(in_srgb,var(--muted-foreground)_35%,var(--border))] [stroke-width:1] [stroke-dasharray:3_5] opacity-70";

export const pgxSunhair =
  "stroke-[var(--color-warning)] [stroke-width:1] [stroke-dasharray:2_4] opacity-[0.55]";

export const pgxSegBase =
  "stroke-[color-mix(in_srgb,var(--foreground)_10%,transparent)] [stroke-width:1]";

const PG_SEG: Record<string, string> = {
  tithi: "fill-[color-mix(in_srgb,var(--brand-yellow)_26%,var(--card))]",
  "tithi-alt": "fill-[color-mix(in_srgb,var(--brand-yellow)_14%,var(--card))]",
  nak: "fill-[color-mix(in_srgb,var(--brand-teal)_18%,var(--card))]",
  "nak-alt": "fill-[color-mix(in_srgb,var(--brand-teal)_9%,var(--card))]",
  yoga: "fill-[color-mix(in_srgb,#6c625a_20%,var(--card))] dark:fill-[color-mix(in_srgb,#9c4e1f_24%,var(--card))]",
  "yoga-alt":
    "fill-[color-mix(in_srgb,#6c625a_10%,var(--card))] dark:fill-[color-mix(in_srgb,#9c4e1f_12%,var(--card))]",
  karana:
    "fill-[color-mix(in_srgb,#cf8400_18%,var(--card))] dark:fill-[color-mix(in_srgb,#1c5d80_22%,var(--card))]",
  "karana-alt":
    "fill-[color-mix(in_srgb,#cf8400_9%,var(--card))] dark:fill-[color-mix(in_srgb,#1c5d80_11%,var(--card))]",
  lagna: "fill-[color-mix(in_srgb,var(--foreground)_7%,var(--card))]",
  "lagna-alt": "fill-[color-mix(in_srgb,var(--foreground)_3%,var(--card))]",
  "lagna-active":
    "fill-[color-mix(in_srgb,var(--secondary)_28%,var(--card))] stroke-secondary [stroke-width:1.5]",
  "cho-good": "fill-[color-mix(in_srgb,var(--color-success)_13%,var(--card))]",
  "cho-bad": "fill-[color-mix(in_srgb,var(--color-danger)_13%,var(--card))]",
  ashubha: "fill-[color-mix(in_srgb,var(--color-danger)_22%,var(--card))]",
  shubha: "fill-[color-mix(in_srgb,var(--color-success)_22%,var(--card))]",
};

export function pgxSeg(
  kind: string,
  opts?: { alt?: boolean; active?: boolean; bad?: boolean },
) {
  if (kind === "cho" || kind === "hora") {
    return cn(pgxSegBase, opts?.bad ? PG_SEG["cho-bad"] : PG_SEG["cho-good"]);
  }
  if (kind === "ashubha" || kind === "shubha") {
    return cn(pgxSegBase, PG_SEG[kind]);
  }
  const key = `${kind}${opts?.alt ? "-alt" : ""}${opts?.active ? "-active" : ""}`;
  return cn(pgxSegBase, PG_SEG[key] ?? PG_SEG[kind]);
}

export const pgxSegname =
  "text-body fill-foreground font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgxSegnameSm =
  "text-body fill-foreground font-semibold tracking-tight [font-family:Noto_Sans_Devanagari,sans-serif]";

export function pgxSegnameCho(bad?: boolean) {
  return cn(pgxSegname, "text-caption", bad && "fill-[var(--color-danger)]");
}

/** Inauspicious (अशुभ) band label — danger-tinted, slightly smaller. */
export const pgxSegnameBad =
  "text-body fill-[var(--color-danger)] font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

/** Auspicious (शुभ) band label — success-tinted. */
export const pgxSegnameGood =
  "text-body fill-[var(--color-success)] font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgxPaksha =
  "text-body fill-muted-foreground [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgxArrow =
  "[&_line]:stroke-[var(--brand-teal)] [&_line]:[stroke-width:1.6] [&_line]:stroke-round [&_path]:fill-[var(--brand-teal)] dark:[&_line]:stroke-[var(--brand-yellow)] dark:[&_path]:fill-[var(--brand-yellow)]";

export const pgxArrowBound =
  "stroke-[var(--brand-teal)] [stroke-width:1.3] opacity-100 dark:stroke-[var(--brand-yellow)]";

export const pgxTime = "text-caption fill-foreground [font-family:Noto_Sans_Devanagari,sans-serif]";

export function pgxTimeLagna(lagna?: boolean) {
  return cn(pgxTime, lagna && "opacity-90");
}

export const pgxNowLine = "stroke-[var(--color-danger)] [stroke-width:1.4]";

export const pgxNowPill = "fill-[var(--color-danger)]";

export const pgxNowText =
  "text-caption fill-white font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgTlVgridMajor =
  "pointer-events-none stroke-[color-mix(in_srgb,#0000007a_28%,#d1d1d157)] dark:stroke-[color-mix(in_srgb,#ffffff55_28%,#04253e50)] [stroke-width:1] [stroke-dasharray:3_4]";

export const pgTlAxis =
  "stroke-foreground stroke-opacity-45 [stroke-width:1.2]";

export const pgTlTick =
  "stroke-foreground stroke-opacity-40 [stroke-width:1]";

export const pgTlSunDisc =
  "fill-[color-mix(in_srgb,var(--color-warning)_88%,#fff)] stroke-[color-mix(in_srgb,var(--color-warning)_70%,#c9a000)] [stroke-width:0.75]";

export const pgTlSunHorizon =
  "stroke-[color-mix(in_srgb,var(--color-warning)_55%,var(--muted-foreground))] [stroke-width:1] stroke-round";

export const pgTlMoonEmoji = "text-body";

export const pgTlEventTime =
  "text-caption fill-[var(--color-warning)] font-semibold [font-family:Noto_Sans_Devanagari,sans-serif]";

export function pgTlEventTimeMoon(moon?: boolean) {
  return cn(pgTlEventTime, moon && "fill-muted-foreground");
}

export const pgTlRowlabel =
  "text-caption fill-foreground font-bold [font-family:Noto_Sans_Devanagari,sans-serif]";

export const pgTlRowlabelEn =
  "text-body fill-muted-foreground font-semibold uppercase tracking-wide [font-family:Noto_Sans_Devanagari,sans-serif]";

const ROW_LINES = [
  "stroke-[color-mix(in_srgb,var(--brand-teal)_22%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--brand-yellow)_18%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--color-danger)_16%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--secondary)_20%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--brand-teal)_14%,transparent)]",
  "stroke-[color-mix(in_srgb,var(--brand-yellow)_12%,transparent)]",
] as const;

export function pgTlRowline(i: number) {
  return cn("[stroke-width:1.4] stroke-round", ROW_LINES[i % ROW_LINES.length]);
}
