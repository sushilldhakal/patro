import { vars } from "nativewind";

/**
 * Tailwind color tokens as RGB channels — must match global.css :root / .dark.
 * NativeWind on iOS/Android does not apply .dark CSS rules; inject via vars() at runtime.
 */
const LIGHT_TW_VARS = {
  "--tw-background": "248 246 242",
  "--tw-foreground": "26 20 16",
  "--tw-card": "255 255 255",
  "--tw-muted": "240 235 227",
  "--tw-muted-foreground": "92 74 58",
  "--tw-primary": "217 119 6",
  "--tw-primary-foreground": "255 255 255",
  "--tw-secondary": "11 86 90",
  "--tw-secondary-foreground": "255 255 255",
  "--tw-destructive": "198 40 40",
  "--tw-danger": "198 40 40",
  "--tw-border": "232 223 208",
  "--tw-accent": "46 125 50",
  "--tw-surface-inset": "245 240 232",
  "--tw-surface-muted": "243 238 230",
  "--tw-tab-active": "217 119 6",
  "--tw-glyph": "26 20 16",
} as const;

const DARK_TW_VARS = {
  "--tw-background": "15 18 32",
  "--tw-foreground": "243 239 232",
  "--tw-card": "23 28 49",
  "--tw-muted": "20 25 41",
  "--tw-muted-foreground": "166 171 192",
  "--tw-primary": "245 158 66",
  "--tw-primary-foreground": "26 20 16",
  "--tw-secondary": "232 195 106",
  "--tw-secondary-foreground": "26 20 16",
  "--tw-destructive": "255 143 133",
  "--tw-danger": "255 143 133",
  "--tw-border": "39 46 74",
  "--tw-accent": "232 195 106",
  "--tw-surface-inset": "20 25 41",
  "--tw-surface-muted": "18 22 38",
  "--tw-tab-active": "245 158 66",
  "--tw-glyph": "243 239 232",
} as const;

export function nativeWindThemeVars(resolvedTheme: "light" | "dark") {
  return vars(resolvedTheme === "dark" ? DARK_TW_VARS : LIGHT_TW_VARS);
}
