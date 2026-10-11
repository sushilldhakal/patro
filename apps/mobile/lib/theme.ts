import {
  brand,
  mobileRoles,
  monthHero,
  neutral,
  tintRgba,
  withAlpha,
} from "@vedic-patro/design-tokens";
export const APP_NAME_NE = "वैदिक पात्रो";
export const APP_NAME_EN = "Vedic Patro";

function channelLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** 0 = black, 1 = white. Used to pick ink that stays readable on a fill. */
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channelLinear(r) + 0.7152 * channelLinear(g) + 0.0722 * channelLinear(b);
}

/**
 * Label color for a solid fill. Dark-mode secondary is gold, so white type
 * vanishes on it; light-mode secondary is teal, so it still wants white.
 */
export function inkOn(fill: string): string {
  return relativeLuminance(fill) > 0.35 ? brand.ink : neutral.white;
}

/** Hex (#rrggbb) → rgba for native styles where Tailwind opacity modifiers are unreliable. */
export const colorWithAlpha = withAlpha;

/** Table header/zebra colors — use via `@/components/ui/DataTable`, not directly. */
export function tableHeaderBackground(colors: ThemeColors, isDark: boolean): string {
  return isDark ? colorWithAlpha(colors.muted, 0.92) : colors.surfaceInset;
}

/** Alternating row backgrounds for readable scan lines. */
export function tableRowBackground(
  colors: ThemeColors,
  isDark: boolean,
  rowIndex: number,
  highlight?: boolean,
): string {
  if (highlight) {
    return colorWithAlpha(colors.secondary, isDark ? 0.2 : 0.11);
  }
  if (rowIndex % 2 === 0) {
    return colors.card;
  }
  return colors.surfaceMuted;
}

export type ThemeColors = {
  background: string;
  foreground: string;
  text: string;
  textMuted: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  secondary: string;
  destructive: string;
  danger: string;
  border: string;
  surfaceInset: string;
  surfaceMuted: string;
  surfaceToday: string;
  surfaceTintDanger: string;
  tabActive: string;
  /** Colour of the single-colour राशि / नक्षत्र glyphs. */
  glyph: string;
  accent: string;
  toneBest: string;
  toneGood: string;
  toneNeutral: string;
  toneBad: string;
  heroOverlay: readonly [string, string, string];
};

// Colours come from @vedic-patro/design-tokens; only the app's own choices live here.
const light = mobileRoles("light");
const dark = mobileRoles("dark");

export const lightTheme: ThemeColors = {
  background: light.background,
  foreground: light.foreground,
  text: light.foreground,
  textMuted: light.foreground,
  card: light.card,
  muted: light.muted,
  // Native muted text stays full ink for contrast on small Devanagari type.
  mutedForeground: light.foreground,
  primary: light.primary,
  secondary: light.secondary,
  destructive: light.destructive,
  danger: light.danger,
  border: light.border,
  surfaceInset: light.surfaceInset,
  surfaceMuted: light.surfaceMuted,
  surfaceToday: tintRgba("surfaceToday"),
  surfaceTintDanger: tintRgba("surfaceTintDanger"),
  tabActive: tintRgba("tabActive"),
  glyph: light.glyph,
  accent: light.accent,
  toneBest: tintRgba("toneBest"),
  toneGood: tintRgba("toneGood"),
  toneNeutral: light.surfaceInset,
  toneBad: tintRgba("toneBad"),
  heroOverlay: ["rgba(0,0,0,0.82)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.4)"],
};

// On midnight the app lays its tints on a little stronger than the website's
// mixes so they still read on a phone screen outdoors.
export const darkTheme: ThemeColors = {
  background: dark.background,
  foreground: dark.foreground,
  text: dark.foreground,
  textMuted: withAlpha(dark.foreground, 0.88),
  card: dark.card,
  muted: dark.muted,
  mutedForeground: dark.mutedForeground,
  primary: dark.primary,
  secondary: dark.secondary,
  destructive: dark.destructive,
  danger: dark.danger,
  border: dark.border,
  surfaceInset: dark.surfaceInset,
  surfaceMuted: dark.surfaceMuted,
  surfaceToday: withAlpha(brand.vermilion, 0.22),
  surfaceTintDanger: withAlpha(brand.vermilion, 0.12),
  tabActive: withAlpha(dark.tabActive, 0.16),
  glyph: dark.glyph,
  accent: dark.accent,
  toneBest: withAlpha(dark.accent, 0.18),
  toneGood: withAlpha(brand.green, 0.14),
  toneNeutral: dark.surfaceInset,
  toneBad: withAlpha(brand.vermilion, 0.14),
  heroOverlay: ["rgba(0,0,0,0.82)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.4)"],
};

/** Month hero base tones — matches web month art palette when images unavailable. */
export const MONTH_HERO_COLORS: Record<number, string> = monthHero;
