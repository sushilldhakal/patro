/**
 * Colours. The raw palette, the semantic roles each theme maps onto it, and
 * the tint recipes the surfaces are mixed from.
 *
 * The values are the website's (the design's source of truth). Where the app
 * had drifted (muted, border, inset and muted surfaces) it now takes these.
 */

/** Brand colours (light theme and artwork). */
export const brand = {
  saffron: "#d97706",
  saffronBright: "#e67e22",
  saffronPressed: "#b45309",
  vermilion: "#c62828",
  vermilionPressed: "#9e1f1f",
  gold: "#d4a017",
  goldPressed: "#b8860b",
  green: "#2e7d32",
  greenPressed: "#1b5e20",
  blue: "#0b565a",
  bluePressed: "#084548",
  offWhite: "#f8f6f2",
  ink: "#1a1410",
  inkMuted: "#5c4a3a",
} as const;

/** Midnight indigo — the dark theme's raw colours. */
export const midnight = {
  background: "#0f1220",
  card: "#171c31",
  popover: "#0b0e1a",
  line: "#272e4a",
  foam: "#f3efe8",
  mutedForeground: "#a6abc0",
  saffron: "#f59e42",
  gold: "#e8c36a",
  vermilion: "#ff8f85",
} as const;

/** Neutrals the palette mixes against. */
export const neutral = {
  white: "#ffffff",
  black: "#000000",
  /** Base of the light theme's warm-silver border. */
  silverBase: "#d8d4cc",
  /** Text-field outline in the light theme. */
  slateInput: "#4a4540",
} as const;

// ─── Colour maths ─────────────────────────────────────────────────────────────

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** "#rrggbb" → "r g b" (the channel form Tailwind's `<alpha-value>` colours need). */
export function rgbChannels(hex: string): string {
  return channels(hex).join(" ");
}

/** "#rrggbb" → rgba(), for native styles where Tailwind opacity modifiers are unreliable. */
export function withAlpha(hex: string, alpha: number): string {
  return `rgba(${channels(hex).join(", ")}, ${alpha})`;
}

/**
 * `percent`% of `a` over `b`, as CSS `color-mix(in srgb, a percent%, b)` gives it.
 * Lets a role the website writes as a mix be one hex value both apps share.
 */
export function mix(a: string, percent: number, b: string): string {
  const p = percent / 100;
  const ca = channels(a);
  const cb = channels(b);
  return `#${ca
    .map((v, i) => Math.round(v * p + cb[i] * (1 - p)).toString(16).padStart(2, "0"))
    .join("")}`;
}

// ─── Semantic roles ───────────────────────────────────────────────────────────

/** Semantic colour roles, per theme. Both apps name their UI colours after these. */
export interface ThemeRoles {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  /** Highlight (menus, hover chips, dashed reference lines) — gold in both themes. */
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  /** Text-field outline. */
  input: string;
  /** Focus ring. */
  ring: string;
  /** Inset panels (table headers, wells). */
  surfaceInset: string;
  /** Zebra rows and quiet panels. */
  surfaceMuted: string;
  /** Selected tab / chip. */
  tabActive: string;
  /** Single-colour राशि / नक्षत्र glyphs. */
  glyph: string;
  /** Good / positive (शुभ, done, success). */
  success: string;
  warning: string;
  /** Bad / negative (अशुभ, errors) — the status colour, not the button fill. */
  danger: string;
  info: string;
}

export const light: ThemeRoles = {
  background: brand.offWhite,
  foreground: brand.ink,
  card: neutral.white,
  cardForeground: brand.ink,
  popover: neutral.white,
  popoverForeground: brand.ink,
  primary: brand.saffron,
  primaryForeground: neutral.white,
  secondary: brand.blue,
  secondaryForeground: neutral.white,
  muted: mix(brand.gold, 18, brand.offWhite),
  mutedForeground: brand.inkMuted,
  accent: brand.gold,
  accentForeground: brand.ink,
  destructive: brand.vermilion,
  destructiveForeground: neutral.white,
  border: mix(brand.gold, 22, neutral.silverBase),
  input: neutral.slateInput,
  ring: brand.saffron,
  surfaceInset: mix(brand.ink, 3, neutral.white),
  surfaceMuted: mix(brand.ink, 2.5, neutral.white),
  tabActive: brand.saffron,
  glyph: brand.ink,
  success: brand.green,
  warning: brand.saffronBright,
  danger: brand.vermilion,
  info: brand.blue,
};

export const dark: ThemeRoles = {
  background: midnight.background,
  foreground: midnight.foam,
  card: midnight.card,
  cardForeground: midnight.foam,
  popover: midnight.popover,
  popoverForeground: midnight.foam,
  primary: midnight.saffron,
  primaryForeground: brand.ink,
  secondary: midnight.gold,
  secondaryForeground: brand.ink,
  muted: mix(midnight.line, 40, midnight.background),
  mutedForeground: midnight.mutedForeground,
  accent: midnight.gold,
  accentForeground: brand.ink,
  destructive: midnight.vermilion,
  destructiveForeground: brand.ink,
  border: midnight.line,
  input: mix(midnight.foam, 18, midnight.card),
  ring: midnight.gold,
  surfaceInset: mix(midnight.foam, 3, midnight.card),
  surfaceMuted: mix(midnight.foam, 2.5, midnight.card),
  tabActive: midnight.saffron,
  glyph: midnight.foam,
  success: brand.green,
  warning: brand.saffronBright,
  danger: brand.vermilion,
  info: brand.blue,
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

/** Website-only extras on top of the roles (shadcn sidebar, charts, parchment edge). */
export const webExtras = {
  light: {
    sidebarAccent: brand.saffron,
    parchmentBorder: mix(brand.gold, 32, brand.offWhite),
    chart4: brand.blue,
    chart5: brand.saffronBright,
  },
  dark: {
    sidebarAccent: midnight.saffron,
    parchmentBorder: mix(midnight.gold, 20, midnight.card),
    chart4: midnight.gold,
    chart5: midnight.saffron,
  },
} as const;

// ─── Tints ────────────────────────────────────────────────────────────────────

/** A role or brand colour, named the way the generated CSS names it. */
export type TintBase =
  | "saffron"
  | "vermilion"
  | "gold"
  | "green"
  | "danger"
  | "warning"
  | "foreground";

/**
 * Quiet fills: `percent`% of a colour laid over the card. The website mixes
 * them with the card (`color-mix`); the app lays the colour over the card at
 * that alpha, which draws the same pixel on a card.
 */
export const tints = {
  surfaceInset: { base: "foreground", percent: 3 },
  surfaceMuted: { base: "foreground", percent: 2.5 },
  surfaceHover: { base: "saffron", percent: 7 },
  surfaceToday: { base: "vermilion", percent: 14 },
  surfaceTodayHover: { base: "vermilion", percent: 22 },
  surfaceTintDanger: { base: "danger", percent: 7 },
  surfaceTintTeal: { base: "green", percent: 9 },
  chipPublic: { base: "danger", percent: 12 },
  chipFestival: { base: "green", percent: 14 },
  tabActive: { base: "saffron", percent: 12 },
  tabHover: { base: "saffron", percent: 6 },
  warningSurface: { base: "warning", percent: 10 },
  errorSurface: { base: "danger", percent: 10 },
  gocharChip: { base: "gold", percent: 28 },
  holTilePublic: { base: "danger", percent: 11 },
  holTileFestival: { base: "green", percent: 13 },
  toneBest: { base: "green", percent: 12 },
  toneGood: { base: "green", percent: 8 },
  toneNeutral: { base: "foreground", percent: 4 },
  toneBad: { base: "danger", percent: 6 },
  toneWorst: { base: "danger", percent: 10 },
  slotGood: { base: "green", percent: 10 },
  slotBad: { base: "danger", percent: 8 },
  slotNeutral: { base: "foreground", percent: 4 },
  badgeGood: { base: "green", percent: 16 },
  badgeBad: { base: "danger", percent: 12 },
  badgeNeutral: { base: "foreground", percent: 8 },
  pushkaraHit: { base: "green", percent: 10 },
} as const satisfies Record<string, { base: TintBase; percent: number }>;

export type TintName = keyof typeof tints;

/** The hex a tint base resolves to in a theme. */
export function tintBaseColor(base: TintBase, theme: ThemeName = "light"): string {
  const roles = themes[theme];
  switch (base) {
    case "saffron":
      return brand.saffron;
    case "vermilion":
      return brand.vermilion;
    case "gold":
      return brand.gold;
    case "green":
      return brand.green;
    case "danger":
      return roles.danger;
    case "warning":
      return roles.warning;
    case "foreground":
      return roles.foreground;
  }
}

/** A tint as an rgba() overlay (React Native). */
export function tintRgba(name: TintName, theme: ThemeName = "light"): string {
  const t = tints[name];
  return withAlpha(tintBaseColor(t.base, theme), t.percent / 100);
}

/** CSS variables the tint mixes read. Same names on the website and in the app. */
const TINT_CSS_VAR: Record<TintBase, string> = {
  saffron: "var(--brand-saffron)",
  vermilion: "var(--brand-vermilion)",
  gold: "var(--brand-gold)",
  green: "var(--brand-green)",
  danger: "var(--color-danger)",
  warning: "var(--color-warning)",
  foreground: "var(--foreground)",
};

/**
 * The website's `--color-<tint>` value. Mobile Tailwind and any inline fill
 * call this so a percent change here updates both apps.
 */
export function tintColorMix(name: TintName): string {
  const t = tints[name];
  return `color-mix(in srgb, ${TINT_CSS_VAR[t.base]} ${t.percent}%, var(--card))`;
}

// ─── Panchanga wheel ──────────────────────────────────────────────────────────

/**
 * The दिन-चक्र wheel is always a night sky, whatever the theme. Its own
 * palette; `mix` values are written as colour-mix recipes in CSS.
 */
export const wheel = {
  sky0: "#112c2a",
  sky1: "#0a1a1b",
  sky2: "#050c0d",
  surface: "#0b1416",
  pada: "#0d2024",
  padaAlt: "#112a2f",
  ink: "#eaf3f1",
  inkDim: "#a7c4c3",
  inkFaint: "#84a3a2",
  /** Line colour the separators and ring are drawn from. */
  line: "#8fbfc1",
  rim: "#a9d4d4",
  bandBase: "#0a1618",
  bandAltBase: "#0b181a",
  rashiBase: "#091315",
  rashiAltBase: "#0a1518",
} as const;

/** Month hero base tones (shown when month artwork is unavailable). */
export const monthHero: Record<number, string> = {
  1: brand.blue,
  2: brand.bluePressed,
  3: brand.greenPressed,
  4: brand.green,
  5: brand.saffronPressed,
  6: brand.vermilion,
  7: brand.blue,
  8: brand.bluePressed,
  9: brand.greenPressed,
  10: brand.green,
  11: brand.saffronPressed,
  12: brand.vermilion,
};

// ─── The app's role set ───────────────────────────────────────────────────────

/** The colour channels the app's NativeWind classes (`bg-card`, `text-accent`, …) read. */
/**
 * The roles the app reads. They are the website's roles, unchanged: `accent`
 * is the gold highlight and `danger` the status red, in both apps. Positive
 * states (✓, शुभ) use `success`, as on the website.
 */
export interface MobileRoles {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  destructive: string;
  border: string;
  accent: string;
  surfaceInset: string;
  surfaceMuted: string;
  tabActive: string;
  glyph: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export function mobileRoles(theme: ThemeName): MobileRoles {
  const r = themes[theme];
  return {
    background: r.background,
    foreground: r.foreground,
    card: r.card,
    muted: r.muted,
    mutedForeground: r.mutedForeground,
    primary: r.primary,
    primaryForeground: r.primaryForeground,
    secondary: r.secondary,
    secondaryForeground: r.secondaryForeground,
    destructive: r.destructive,
    border: r.border,
    accent: r.accent,
    surfaceInset: r.surfaceInset,
    surfaceMuted: r.surfaceMuted,
    tabActive: r.tabActive,
    glyph: r.glyph,
    success: r.success,
    warning: r.warning,
    danger: r.danger,
    info: r.info,
  };
}
