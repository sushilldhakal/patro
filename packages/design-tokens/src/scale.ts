/**
 * Everything that is not a colour: type, spacing, radii, shadows, sizes,
 * motion and breakpoints.
 *
 * The website's values are the design; the app uses them as they are. One
 * platform quirk remains, and is handled by using px here:
 * - NativeWind on iOS/Android counts 1 rem as 14 px, so the app's Tailwind
 *   config states spacing, font sizes and radii in px (generated from here)
 *   and \`p-4\` is 16 px in both.
 * Type does not differ. Both apps use `webTypeScale`. The app stores those
 * sizes in px, because a rem on iOS/Android is 14 px and would come out small.
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
    regular: "NotoSansDevanagariSemiCondensed-Regular",
    medium: "NotoSansDevanagariSemiCondensed-Medium",
    semibold: "NotoSansDevanagariSemiCondensed-SemiBold",
    bold: "NotoSansDevanagariSemiCondensed-Bold",
    mono: "FiraCode_400Regular",
  },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** The website's text scale (px, line height px). Both apps use these sizes. */
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

/**
 * Tailwind's `text-5xl` (3rem). The website uses it for the ghati clock and
 * the wheel glyph; it is not one of the eight steps above.
 */
export const text5xl = { size: 48, lineHeight: 48 } as const;

/**
 * The app's Tailwind font sizes, in px so they match the website even where
 * 1 rem is 14 px. `caption` / `body` / `title` / `display` are the older class
 * names, aliased to the website step they stand in for: xs, sm, lg, 2xl.
 */
export const mobileTypeScale = {
  ...webTypeScale,
  "5xl": text5xl,
  caption: webTypeScale.xs,
  body: webTypeScale.sm,
  title: webTypeScale.lg,
  display: webTypeScale["2xl"],
} as const;

/**
 * Label sizes for diagrams, wheels and the sky scene (px). The artwork sets
 * text smaller than the page's smallest step (\`xs\`, 10.8), so these sit below
 * it. Three steps replace the ad-hoc 7, 7.5, 8, 8.5, 9, 10, 12 and 13 px sizes.
 * No line height: labels sit in SVG or in tight boxes that size themselves.
 */
export const diagramTypeScale = {
  "2xs": 8,
  xs: 10,
  sm: 12,
} as const;

export const letterSpacing = {
  tight: "-0.01em",
  /** Small uppercase labels (the site also sets 0.08–0.1em in places; those are this). */
  eyebrow: "0.12em",
  /** Wider-tracked section labels (0.14–0.22em in the old code). */
  eyebrowWide: "0.18em",
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

/** Both apps: sm/md/lg/xl = base −4/−2/0/+4 px; 2xl fixed. */
export const radius = {
  sm: 0.8,
  md: 2.8,
  lg: 4.8,
  xl: 8.8,
  "2xl": 16,
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

/**
 * Text and image effects that sit on top of artwork (labels over the sky,
 * scrims over a running scene). CSS strings, so both apps can use them on web;
 * native uses the same blur/offset/opacity through its own text shadow props.
 */
export const effect = {
  /** Label legible over a busy night sky. */
  labelShadow: "0 1px 4px rgba(0, 0, 0, 0.95)",
  labelShadowSoft: "0 1px 3px rgba(0, 0, 0, 0.9)",
  /** Upward lift under the sky time sheet. */
  sheetLift: "0 -12px 40px rgba(0, 0, 0, 0.45)",
  /** Ring around the daylight slider thumb. */
  thumbRing: "0 0 0 2px rgba(0, 0, 0, 0.35)",
} as const;

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
  /** Page content column (px): `max-w-page`, and the wide variant `max-w-page-wide`. */
  pageMax: 1400,
  pageWide: 1600,
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────

export const motion = {
  duration: { fast: 120, standard: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    springInteractive: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  },
  /**
   * Native motion. Plain numbers only — Reanimated builds its easings and
   * springs from these in `@vedic-patro/ui/motion`, so no screen hand-types a curve.
   * `easeOut` enters and exits, `easeInOut` moves something already on screen,
   * `easeSheet` is the iOS sheet curve.
   */
  native: {
    easeOut: [0.23, 1, 0.32, 1],
    easeInOut: [0.77, 0, 0.175, 1],
    easeSheet: [0.32, 0.72, 0, 1],
    spring: {
      settle: { duration: 400, dampingRatio: 1 },
      snap: { duration: 400, dampingRatio: 0.8 },
      sheet: { duration: 300, dampingRatio: 0.8 },
    },
    pressScale: 0.97,
    enterScale: 0.95,
    shift: 8,
  },
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

/** Layout breakpoints (min width, px). Same in both apps. */
export const breakpoints = {
  /** Phone layouts tighten (icons, docks) below this. */
  compact: 480,
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
