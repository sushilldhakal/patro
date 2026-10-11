/**
 * Sizes, breakpoints, fonts, radii and fixed colours come from
 * @vedic-patro/design-tokens (generated JSON, since this file is CommonJS);
 * theme colours are the `--tw-*` channels `npm run tokens` writes into
 * global.css and lib/nativewind-theme-vars.ts injects on native.
 */
const tokens = require("@vedic-patro/design-tokens/mobile-tailwind.json");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    /* Replaces Tailwind's default scale: the app's only four text sizes. */
    fontSize: tokens.fontSize,
    extend: {
      screens: tokens.screens,
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
        ...tokens.colors,
        "surface-inset": "rgb(var(--tw-surface-inset) / <alpha-value>)",
        "surface-muted": "rgb(var(--tw-surface-muted) / <alpha-value>)",
        "tab-active": "rgba(var(--tw-tab-active) / 0.12)",
        "tab-hover": "rgba(var(--tw-tab-active) / 0.06)",
      },
      fontFamily: tokens.fontFamily,
      /* Web (Tailwind 4) accepts any `/N` alpha; v3's scale skips 8, 12, 15, 18, 35,
         45, 55, 65, 85 — so `bg-secondary/8` etc. silently drew nothing here. */
      opacity: {
        8: "0.08",
        12: "0.12",
        15: "0.15",
        18: "0.18",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
      },
      borderRadius: tokens.borderRadius,
    },
  },
  plugins: [],
};
