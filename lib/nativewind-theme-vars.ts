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
} as const;

const DARK_TW_VARS = {
  "--tw-background": "8 38 40",
  "--tw-foreground": "255 255 255",
  "--tw-card": "11 61 64",
  "--tw-muted": "10 53 56",
  "--tw-muted-foreground": "198 195 190",
  "--tw-primary": "230 126 34",
  "--tw-primary-foreground": "26 20 16",
  "--tw-secondary": "212 160 23",
  "--tw-secondary-foreground": "26 20 16",
  "--tw-destructive": "255 138 128",
  "--tw-danger": "255 138 128",
  "--tw-border": "26 85 88",
  "--tw-accent": "212 160 23",
  "--tw-surface-inset": "10 53 56",
  "--tw-surface-muted": "9 48 50",
  "--tw-tab-active": "230 126 34",
} as const;

export function nativeWindThemeVars(resolvedTheme: "light" | "dark") {
  return vars(resolvedTheme === "dark" ? DARK_TW_VARS : LIGHT_TW_VARS);
}
