/**
 * Vedic Patro design tokens — the one place colours, the mobile type scale and
 * radii are defined. The website and the mobile app both read them:
 *
 * - Mobile (lib/theme.ts, lib/nativewind-theme-vars.ts) imports this file.
 * - CSS cannot import TypeScript, so `npm run tokens` writes the values into
 *   marked blocks in apps/web/src/index.css and apps/mobile/global.css.
 *   `npm run lint -w @vedic-patro/design-tokens` fails if those blocks are stale.
 *
 * Change a colour here, run `npm run tokens` at the repo root, commit.
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
  muted: "#141929",
  surfaceMuted: "#121626",
  saffron: "#f59e42",
  gold: "#e8c36a",
  vermilion: "#ff8f85",
} as const;

/** Semantic colour roles, per theme. Both apps name their UI colours after these. */
export interface ThemeRoles {
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
  /** Single-colour राशि / नक्षत्र glyphs. */
  glyph: string;
}

export const light: ThemeRoles = {
  background: brand.offWhite,
  foreground: brand.ink,
  card: "#ffffff",
  muted: "#f0ebe3",
  mutedForeground: brand.inkMuted,
  primary: brand.saffron,
  primaryForeground: "#ffffff",
  secondary: brand.blue,
  secondaryForeground: "#ffffff",
  destructive: brand.vermilion,
  border: "#e8dfd0",
  accent: brand.green,
  surfaceInset: "#f5f0e8",
  surfaceMuted: "#f3eee6",
  tabActive: brand.saffron,
  glyph: brand.ink,
};

export const dark: ThemeRoles = {
  background: midnight.background,
  foreground: midnight.foam,
  card: midnight.card,
  muted: midnight.muted,
  mutedForeground: midnight.mutedForeground,
  primary: midnight.saffron,
  primaryForeground: brand.ink,
  secondary: midnight.gold,
  secondaryForeground: brand.ink,
  destructive: midnight.vermilion,
  border: midnight.line,
  accent: midnight.gold,
  surfaceInset: midnight.muted,
  surfaceMuted: midnight.surfaceMuted,
  tabActive: midnight.saffron,
  glyph: midnight.foam,
};

/** The mobile app's only four text sizes (px), with line heights. */
export const mobileTypeScale = {
  caption: { size: 15, lineHeight: 24 },
  body: { size: 18, lineHeight: 29 },
  title: { size: 22, lineHeight: 36 },
  display: { size: 28, lineHeight: 45 },
} as const;

export const radius = { lg: 8, xl: 12 } as const;

/** "#rrggbb" → "r g b" (the channel form Tailwind's `<alpha-value>` colours need). */
export function rgbChannels(hex: string): string {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
}

/** "#rrggbb" → rgba(), for native styles where Tailwind opacity modifiers are unreliable. */
export function withAlpha(hex: string, alpha: number): string {
  return `rgba(${rgbChannels(hex).split(" ").join(", ")}, ${alpha})`;
}
