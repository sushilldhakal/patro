/**
 * Everything that is not a colour: type, spacing, radii, shadows, sizes,
 * motion and breakpoints.
 *
 * Some values differ by platform on purpose, and are kept apart here rather
 * than forced equal:
 * - Type: the app reads at arm's length on a phone and uses four larger sizes
 *   (15/18/22/28 px); the website uses the Tailwind scale from 10.8 px.
 * - Radii: the app's touch cards are rounder (8/12 px) than the website's
 *   (4.8/8.8 px, from a 0.3 rem base).
 * - NativeWind on iOS/Android counts 1 rem as 14 px, so `p-4` is 14 px in the
 *   app and 16 px on the website. Use `space` (px) when a size must match.
 */

// ─── Typography ───────────────────────────────────────────────────────────────

/** Both apps set every script in Noto Sans Devanagari; code in Fira Code. */
export const fontFamily = {
  /** CSS stacks (website). */
  web: {
    devanagari: '"Noto Sans Devanagari", sans-serif',
    en: '"Noto Sans Devanagari", sans-serif',
    mono: '"Fira Code", monospace',
  },
  /** Loaded font names (app — expo-google-fonts registers one family per weight). */
  native: {
    regular: "NotoSansDevanagari_400Regular",
    medium: "NotoSansDevanagari_500Medium",
    semibold: "NotoSansDevanagari_600SemiBold",
    bold: "NotoSansDevanagari_700Bold",
    mono: "FiraCode_400Regular",
  },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** The website's text scale (px, line height px) — the only sizes it uses. */
export const webTypeScale = {
  xs: { size: 10.8, lineHeight: 13.6 },
  sm: { size: 14, lineHeight: 20 },
  base: { size: 16, lineHeight: 24 },
  lg: { size: 18, lineHeight: 28 },
  xl: { size: 20, lineHeight: 28 },
  "2xl": { size: 24, lineHeight: 32 },
  "3xl": { size: 30, lineHeight: 36 },
  "4xl": { size: 36, lineHeight: 40 },
} as const;

/** The app's only four text sizes (px), with line heights (~1.6 for Devanagari matras). */
export const mobileTypeScale = {
  caption: { size: 15, lineHeight: 24 },
  body: { size: 18, lineHeight: 29 },
  title: { size: 22, lineHeight: 36 },
  display: { size: 28, lineHeight: 45 },
} as const;

export const letterSpacing = {
  tight: "-0.01em",
  eyebrow: "0.12em",
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

/** Base spacing step (px). Tailwind's `1` on the website. */
export const spaceUnit = 4;

/** Named spacings (px) for layout code that sets sizes outside Tailwind. */
export const space = {
  none: 0,
  hair: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────

/** Website radius base (rem); its sm…xl radii are offsets from it. */
export const webRadiusBaseRem = 0.3;

export const radius = {
  /** Website: sm/md/lg/xl = base −4/−2/0/+4 px; 2xl fixed. */
  web: { sm: 0.8, md: 2.8, lg: 4.8, xl: 8.8, "2xl": 16 },
  /** App: rounder touch cards. */
  mobile: { lg: 8, xl: 12 },
  pill: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

/** Shadow ink: a warm brown in the light theme, near-black in the dark. */
export const shadowInk = {
  light: { hsl: "28.125 25% 25.098%", hex: "#503f30" },
  dark: { hsl: "0 0% 10.196%", hex: "#1a1a1a" },
} as const;

/** One shadow layer: offset y, blur, spread (px) and opacity. */
interface ShadowLayer {
  y: number;
  blur: number;
  spread: number;
  opacity: number;
}

export const shadow = {
  xs: [{ y: 2, blur: 3, spread: 0, opacity: 0.09 }],
  sm: [
    { y: 2, blur: 3, spread: 0, opacity: 0.18 },
    { y: 1, blur: 2, spread: -1, opacity: 0.18 },
  ],
  md: [
    { y: 2, blur: 3, spread: 0, opacity: 0.18 },
    { y: 2, blur: 4, spread: -1, opacity: 0.18 },
  ],
  lg: [
    { y: 2, blur: 3, spread: 0, opacity: 0.18 },
    { y: 4, blur: 6, spread: -1, opacity: 0.18 },
  ],
} as const satisfies Record<string, readonly ShadowLayer[]>;

export type ShadowName = keyof typeof shadow;

/** A shadow as a CSS `box-shadow` value. */
export function cssShadow(name: ShadowName, theme: "light" | "dark" = "light"): string {
  const ink = shadowInk[theme].hsl;
  return shadow[name]
    .map((l) => `0px ${l.y}px ${l.blur}px ${l.spread}px hsl(${ink} / ${l.opacity})`)
    .join(",\n    ");
}

/**
 * A shadow as React Native style props. Native draws one layer, so this takes
 * the deepest layer; `elevation` is Android's equivalent depth.
 */
export function nativeShadow(name: ShadowName, theme: "light" | "dark" = "light") {
  const layers = shadow[name];
  const l = layers[layers.length - 1];
  return {
    shadowColor: shadowInk[theme].hex,
    shadowOffset: { width: 0, height: l.y },
    shadowOpacity: l.opacity,
    shadowRadius: l.blur / 2,
    elevation: Math.max(1, Math.round(l.y + l.blur / 2)),
  };
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

/** Icon sizes (px). Both apps draw the same concept at the same size. */
export const iconSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  hero: 48,
} as const;

export type IconSize = keyof typeof iconSize;

export const size = {
  /** Smallest comfortable touch target (Apple HIG 44 pt, Material 48 dp → 44). */
  touchTarget: 44,
  /** Extra hit area around small native controls (`hitSlop`). */
  hitSlop: 8,
  /** Control heights (px): website buttons/inputs (shadcn h-8/h-9/h-10). */
  control: { sm: 32, md: 36, lg: 40 },
  /** Day cell in the month grid: minimum and per-breakpoint maximum (px). */
  calendarCell: { phone: 52, tablet: 64, desktop: 72 },
  /** Readable text column (px). */
  proseMaxWidth: 720,
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────

export const motion = {
  duration: { fast: 120, standard: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    springInteractive: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  },
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

/** Layout breakpoints (min width, px). Same in both apps. */
export const breakpoints = {
  xs: 400,
  sm: 640,
  md: 768,
  /** Month grid switches to its wide layout. */
  calendarWide: 992,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** `(min-width: Npx)` for matchMedia, from a named breakpoint. */
export function minWidthQuery(bp: Breakpoint): string {
  return `(min-width: ${breakpoints[bp]}px)`;
}
