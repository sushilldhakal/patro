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
  return relativeLuminance(fill) > 0.35 ? "#1a1410" : "#ffffff";
}

/** Hex (#rrggbb) → rgba for native styles where Tailwind opacity modifiers are unreliable. */
export function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  accent: string;
  toneBest: string;
  toneGood: string;
  toneNeutral: string;
  toneBad: string;
  heroOverlay: readonly [string, string, string];
};

export const lightTheme: ThemeColors = {
  background: "#f8f6f2",
  foreground: "#1a1410",
  text: "#1a1410",
  textMuted: "#1a1410",
  card: "#ffffff",
  muted: "#f0ebe3",
  mutedForeground: "#1a1410",
  primary: "#d97706",
  secondary: "#0b565a",
  destructive: "#c62828",
  danger: "#c62828",
  border: "#e8dfd0",
  surfaceInset: "#f5f0e8",
  surfaceMuted: "#f3eee6",
  surfaceToday: "rgba(198, 40, 40, 0.14)",
  surfaceTintDanger: "rgba(198, 40, 40, 0.07)",
  tabActive: "rgba(217, 119, 6, 0.12)",
  accent: "#2e7d32",
  toneBest: "rgba(46, 125, 50, 0.14)",
  toneGood: "rgba(46, 125, 50, 0.09)",
  toneNeutral: "#f5f0e8",
  toneBad: "rgba(198, 40, 40, 0.08)",
  heroOverlay: ["rgba(0,0,0,0.82)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.4)"],
};

export const darkTheme: ThemeColors = {
  background: "#082628",
  foreground: "#ffffff",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.88)",
  card: "#0b3d40",
  muted: "#0a3538",
  mutedForeground: "rgba(248,246,242,0.72)",
  primary: "#e67e22",
  secondary: "#d4a017",
  destructive: "#ff8a80",
  danger: "#ff8a80",
  border: "#1a5558",
  surfaceInset: "#0a3538",
  surfaceMuted: "#093032",
  surfaceToday: "rgba(198, 40, 40, 0.22)",
  surfaceTintDanger: "rgba(198, 40, 40, 0.12)",
  tabActive: "rgba(217, 119, 6, 0.16)",
  accent: "#d4a017",
  toneBest: "rgba(212, 160, 23, 0.18)",
  toneGood: "rgba(46, 125, 50, 0.14)",
  toneNeutral: "#0a3538",
  toneBad: "rgba(198, 40, 40, 0.14)",
  heroOverlay: ["rgba(0,0,0,0.82)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.4)"],
};

/** Month hero base tones — matches web month art palette when images unavailable. */
export const MONTH_HERO_COLORS: Record<number, string> = {
  1: "#0b565a",
  2: "#084548",
  3: "#1b5e20",
  4: "#2e7d32",
  5: "#b45309",
  6: "#c62828",
  7: "#0b565a",
  8: "#084548",
  9: "#1b5e20",
  10: "#2e7d32",
  11: "#b45309",
  12: "#c62828",
};
