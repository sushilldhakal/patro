/**
 * Vedic Patro design tokens — the one place the design's values are defined.
 * The website and the mobile app both read them:
 *
 * - Mobile imports this file (lib/theme.ts, lib/nativewind-theme-vars.ts,
 *   lib/responsive.ts) and its tailwind.config.js reads the generated
 *   `generated/mobile-tailwind.json`.
 * - CSS cannot import TypeScript, so `npm run tokens` writes the values into
 *   marked blocks in apps/web/src/index.css and apps/mobile/global.css.
 *   `npm run lint -w @vedic-patro/design-tokens` fails if anything is stale.
 *
 * Change a value here, run `npm run tokens` at the repo root, commit.
 */
export * from "./color";
export * from "./scale";
