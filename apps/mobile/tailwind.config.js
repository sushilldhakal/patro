/**
 * Sizes, breakpoints, fonts, radii and fixed colours come from
 * @vedic-patro/design-tokens (generated JSON, since this file is CommonJS);
 * theme colours are the `--tw-*` channels `npm run tokens` writes into
 * global.css and lib/nativewind-theme-vars.ts injects on native.
 */
const tokens = require("@vedic-patro/design-tokens/mobile-tailwind.json");

/*
 * The web tokens tint surfaces with CSS `color-mix(in srgb, var(--X) N%,
 * var(--card))`. React Native cannot evaluate color-mix, so NativeWind dropped
 * those colours and tone/slot/badge/chip backgrounds rendered as nothing. The
 * same tint drawn as `--X` at N% opacity over the card looks identical.
 */
const MIX_TO_NATIVE_VAR = {
  "--foreground": "--tw-foreground",
  "--color-danger": "--tw-danger",
  "--color-success": "--tw-success",
  "--color-warning": "--tw-warning",
  "--brand-green": "--tw-success",
  "--brand-saffron": "--tw-primary",
  "--brand-gold": "--tw-accent",
};

function nativeColor(value) {
  const m = /^color-mix\(in srgb, var\((--[a-z-]+)\) ([\d.]+)%, var\(--card\)\)$/.exec(String(value));
  if (!m || !MIX_TO_NATIVE_VAR[m[1]]) return value;
  return `rgb(var(${MIX_TO_NATIVE_VAR[m[1]]}) / ${Number(m[2]) / 100})`;
}

const nativeTokenColors = Object.fromEntries(
  Object.entries(tokens.colors).map(([name, value]) => [name, nativeColor(value)]),
);

/**
 * Tailwind 4 (the website) takes any multiple of 0.25 as a spacing step
 * (`size-9.5`, `h-8.5`, `gap-x-3.25`); Tailwind 3 (NativeWind) only knows its
 * fixed scale and silently drops the rest. Every quarter step up to 120 is
 * added here (n × 4px, like the website); the tokens' own values still win.
 */
const quarterSteps = Object.fromEntries(Array.from({ length: 481 }, (_, n) => [String(n / 4), `${n}px`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "../../packages/design-tokens/src/**/*.{js,ts,tsx}",
    "../../packages/domain/src/**/*.{js,ts,tsx}",
    "../../packages/ui/src/**/*.{js,ts,tsx}",
    "../../packages/features/src/**/*.{js,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    /* Same px sizes as the website (packages/design-tokens webTypeScale). */
    fontSize: tokens.fontSize,
    extend: {
      screens: tokens.screens,
      maxWidth: tokens.maxWidth,
      boxShadow: tokens.boxShadow,
      letterSpacing: tokens.letterSpacing,
      colors: {
        background: "rgb(var(--tw-background) / <alpha-value>)",
        foreground: "rgb(var(--tw-foreground) / <alpha-value>)",
        card: "rgb(var(--tw-card) / <alpha-value>)",
        muted: "rgb(var(--tw-muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--tw-muted-foreground) / <alpha-value>)",
        primary: "rgb(var(--tw-primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--tw-primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--tw-secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--tw-secondary-foreground) / <alpha-value>)",
        destructive: "rgb(var(--tw-destructive) / <alpha-value>)",
        danger: "rgb(var(--tw-danger) / <alpha-value>)",
        border: "rgb(var(--tw-border) / <alpha-value>)",
        accent: "rgb(var(--tw-accent) / <alpha-value>)",
        ring: "rgb(var(--tw-primary) / <alpha-value>)",
        saffron: "rgb(var(--tw-primary) / <alpha-value>)",
        vermilion: "rgb(var(--tw-destructive) / <alpha-value>)",
        ...nativeTokenColors,
        /* After the spread: the status colours take an alpha (`bg-success/12`),
           which the plain \`var()\` values in the generated colours cannot. */
        success: "rgb(var(--tw-success) / <alpha-value>)",
        warning: "rgb(var(--tw-warning) / <alpha-value>)",
        info: "rgb(var(--tw-info) / <alpha-value>)",
        input: "rgb(var(--tw-input) / <alpha-value>)",
        "surface-inset": "rgb(var(--tw-surface-inset) / <alpha-value>)",
        "surface-muted": "rgb(var(--tw-surface-muted) / <alpha-value>)",
        /* The website's color-mix(saffron 12% / 6%, card), mixed ahead of time in
           global.css: a fixed alpha here ignored `/70` and drew a solid orange tab. */
        "tab-active": "rgb(var(--tw-tab-active-fill) / <alpha-value>)",
        "tab-hover": "rgb(var(--tw-tab-hover-fill) / <alpha-value>)",
      },
      fontFamily: tokens.fontFamily,
      spacing: { ...quarterSteps, ...tokens.spacing },
      width: { "1/7": "14.2857143%" },
      /* Web (Tailwind 4) accepts any `/N` alpha; v3's scale skips 8, 12, 15, 18, 35,
         45, 55, 65, 85 — so `bg-secondary/8` etc. silently drew nothing here. */
      /* Every `/N` the website's class strings use (Tailwind 4 takes any N). */
      opacity: {
        4: "0.04",
        6: "0.06",
        7: "0.07",
        8: "0.08",
        11: "0.11",
        12: "0.12",
        13: "0.13",
        15: "0.15",
        18: "0.18",
        22: "0.22",
        34: "0.34",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        82: "0.82",
        85: "0.85",
        92: "0.92",
      },
      borderRadius: tokens.borderRadius,
    },
  },
  plugins: [],
};
