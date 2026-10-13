/**
 * Writes the token values where TypeScript cannot be imported:
 *
 * - marked blocks of apps/web/src/index.css (CSS variables + Tailwind @theme),
 * - marked blocks of apps/mobile/global.css (NativeWind channel variables),
 * - generated/mobile-tailwind.json, read by apps/mobile/tailwind.config.js.
 *
 *   npm run tokens               (repo root) write everything
 *   npm run lint -w @vedic-patro/design-tokens   fail if anything is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  brand,
  breakpoints,
  cssShadow,
  dark,
  diagramTypeScale,
  fontFamily,
  illustration,
  letterSpacing,
  light,
  midnight,
  mobileRoles,
  mobileTypeScale,
  motion,
  neutral,
  radius,
  rgbChannels,
  shadow,
  shadowInk,
  size,
  tintColorMix,
  tintRgba,
  tints,
  webExtras,
  webRadiusBaseRem,
  webTypeScale,
  text5xl,
  spaceUnit,
  wheel,
  withAlpha,
  type MobileRoles,
  type ShadowName,
  type ThemeRoles,
} from "../src/index";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(pkg, "../..");
const check = process.argv.includes("--check");

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d+)/g, "-$1");
const camelKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const rem = (px: number) => `${+(px / 16).toFixed(4)}rem`;

// ─── Website ──────────────────────────────────────────────────────────────────

/** The raw palette its theme variables and artwork reference. */
function webPalette(indent: string): string[] {
  const out = Object.entries(brand).map(([k, v]) =>
    k === "offWhite" || k === "ink" || k === "inkMuted"
      ? `${indent}--${kebab(k)}: ${v};`
      : `${indent}--brand-${kebab(k)}: ${v};`,
  );
  out.push(
    `${indent}--midnight: ${midnight.background};`,
    `${indent}--midnight-card: ${midnight.card};`,
    `${indent}--midnight-popover: ${midnight.popover};`,
    `${indent}--midnight-line: ${midnight.line};`,
    `${indent}--foam: ${midnight.foam};`,
    `${indent}--dark-saffron: ${midnight.saffron};`,
    `${indent}--dark-gold: ${midnight.gold};`,
    `${indent}--dark-vermilion: ${midnight.vermilion};`,
  );
  return out;
}

/** Status colours are not theme-switched on the website (the dark theme keeps them). */
const WEB_STATUS: (keyof ThemeRoles)[] = ["success", "warning", "danger", "info"];
/** Roles the website reads as plain `--name` variables (shadcn names). */
const WEB_ROLE_VARS: (keyof ThemeRoles)[] = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "border",
  "input",
  "ring",
];

function webShadows(theme: "light" | "dark", indent: string): string[] {
  return (Object.keys(shadow) as ShadowName[]).map(
    (n) => `${indent}--shadow-${n}: ${cssShadow(n, theme).replace(/\n {4}/g, `\n${indent}  `)};`,
  );
}

function webTheme(theme: "light" | "dark", indent: string): string[] {
  const roles = theme === "light" ? light : dark;
  const extras = webExtras[theme];
  const out: string[] = [];
  if (theme === "light") {
    for (const k of WEB_STATUS) out.push(`${indent}--color-${k}: ${roles[k]};`);
    out.push(
      `${indent}--font-devanagari: ${fontFamily.web.devanagari};`,
      `${indent}--font-sans: var(--font-devanagari);`,
      `${indent}--font-heading: var(--font-devanagari);`,
      `${indent}--font-en: ${fontFamily.web.en};`,
      `${indent}--font-mono: ${fontFamily.web.mono};`,
      `${indent}--tracking-tight: ${letterSpacing.tight};`,
      `${indent}--tracking-eyebrow: ${letterSpacing.eyebrow};`,
      `${indent}--tracking-eyebrow-wide: ${letterSpacing.eyebrowWide};`,
      `${indent}--radius-base: ${webRadiusBaseRem}rem;`,
      `${indent}--radius-pill: ${radius.pill}px;`,
      `${indent}--motion-fast: ${motion.duration.fast}ms;`,
      `${indent}--motion-standard: ${motion.duration.standard}ms;`,
      `${indent}--motion-slow: ${motion.duration.slow}ms;`,
      `${indent}--motion-spring-interactive: ${motion.easing.springInteractive};`,
      `${indent}--easing-standard: ${motion.easing.standard};`,
    );
  }
  for (const k of WEB_ROLE_VARS) out.push(`${indent}--${kebab(k)}: ${roles[k]};`);
  out.push(
    `${indent}--sidebar-accent: ${extras.sidebarAccent};`,
    `${indent}--parchment-border: ${extras.parchmentBorder};`,
    `${indent}--chart-4: ${extras.chart4};`,
    `${indent}--chart-5: ${extras.chart5};`,
  );
  out.push(...webShadows(theme, indent));
  return out;
}

/** Tailwind @theme: breakpoints, text scale, radii and the tinted surfaces. */
/**
 * Tailwind colour names for artwork: \`bg-ill-amber40\`, \`fill-ill-brand-saffron\`.
 * The illustration palette plus the raw brand / midnight / neutral / wheel colours.
 */
function illustrationColors(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, hex] of Object.entries(illustration)) out[`ill-${name}`] = hex;
  for (const [ns, group] of Object.entries({ brand, midnight, neutral, wheel }))
    for (const [key, hex] of Object.entries(group)) out[`ill-${ns}-${camelKebab(key)}`] = hex;
  return out;
}

/** Chrome of the controls floating over the wheel: \`border-wheel-control-border bg-wheel-control\`. */
function wheelControlColors(): Record<string, string> {
  return {
    "wheel-control": withAlpha(wheel.surface, 0.96),
    "wheel-control-border": withAlpha(wheel.line, 0.32),
  };
}

function webTailwindTheme(indent: string): string[] {
  const out: string[] = [
    `${indent}--breakpoint-xs: ${rem(breakpoints.xs)};`,
    `${indent}--breakpoint-compact: ${rem(breakpoints.compact)};`,
    `${indent}--breakpoint-calendar: ${rem(breakpoints.calendarWide)};`,
    `${indent}--container-page: ${rem(size.pageMax)};`,
    `${indent}--container-page-wide: ${rem(size.pageWide)};`,
  ];
  for (const name of [...Object.keys(webTypeScale), "5xl"]) {
    out.push(
      `${indent}--text-${name}: var(--vp-text-${name});`,
      `${indent}--text-${name}--line-height: var(--vp-text-${name}-line);`,
    );
  }
  for (const [name, size] of Object.entries(diagramTypeScale)) out.push(`${indent}--text-diagram-${name}: ${size}px;`);
  out.push(
    `${indent}--radius-sm: calc(var(--radius-base) - 4px);`,
    `${indent}--radius-md: calc(var(--radius-base) - 2px);`,
    `${indent}--radius-lg: var(--radius-base);`,
    `${indent}--radius-xl: calc(var(--radius-base) + 4px);`,
    `${indent}--radius-2xl: ${radius["2xl"]}px;`,
  );
  for (const name of Object.keys(tints)) {
    out.push(`${indent}--color-${kebab(name)}: ${tintColorMix(name as keyof typeof tints)};`);
  }
  for (const [name, hex] of Object.entries(illustrationColors())) out.push(`${indent}--color-${name}: ${hex};`);
  for (const [name, value] of Object.entries(wheelControlColors())) out.push(`${indent}--color-${name}: ${value};`);
  return out;
}

/** The दिन-चक्र wheel's night-sky palette (same block in both CSS files). */
function wheelBlock(indent: string): string[] {
  const line = (p: number) => `color-mix(in srgb, ${wheel.line} ${p}%, transparent)`;
  return [
    `${indent}--pn-ring-soft: ${line(18)};`,
    `${indent}--w-sky-0: ${wheel.sky0};`,
    `${indent}--w-sky-1: ${wheel.sky1};`,
    `${indent}--w-sky-2: ${wheel.sky2};`,
    `${indent}--w-surface: ${wheel.surface};`,
    `${indent}--w-surface-border: ${line(28)};`,
    `${indent}--w-band: color-mix(in srgb, var(--brand-green) 30%, ${wheel.bandBase});`,
    `${indent}--w-band-alt: color-mix(in srgb, var(--brand-green) 44%, ${wheel.bandAltBase});`,
    `${indent}--w-rashi: color-mix(in srgb, var(--brand-green) 22%, ${wheel.rashiBase});`,
    `${indent}--w-rashi-alt: color-mix(in srgb, var(--brand-green) 34%, ${wheel.rashiAltBase});`,
    `${indent}--w-pada: ${wheel.pada};`,
    `${indent}--w-pada-alt: ${wheel.padaAlt};`,
    `${indent}--w-sep: ${line(42)};`,
    `${indent}--w-sep-soft: ${line(16)};`,
    `${indent}--w-rim: color-mix(in srgb, ${wheel.rim} 50%, transparent);`,
    `${indent}--w-ink: ${wheel.ink};`,
    `${indent}--w-ink-dim: ${wheel.inkDim};`,
    `${indent}--w-ink-faint: ${wheel.inkFaint};`,
    `${indent}--w-accent: var(--brand-vermilion);`,
    `${indent}--w-accent-soft: color-mix(in srgb, var(--brand-vermilion) 22%, transparent);`,
  ];
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

/** NativeWind: Tailwind colours as "r g b" channels. */
function mobileChannels(roles: MobileRoles, indent: string): string[] {
  return (Object.keys(roles) as (keyof MobileRoles)[]).map(
    (k) => `${indent}--tw-${kebab(k)}: ${rgbChannels(roles[k])};`,
  );
}

/** Plain CSS variables the app's web build reads (panchanga SVG, wheel, timeline). */
function mobileCssVars(theme: "light" | "dark", indent: string): string[] {
  const roles = theme === "light" ? light : dark;
  const out: string[] = [];
  out.push(
    `${indent}--background: ${roles.background};`,
    `${indent}--foreground: ${roles.foreground};`,
    `${indent}--card: ${roles.card};`,
    `${indent}--muted-foreground: ${roles.mutedForeground};`,
    `${indent}--secondary: ${roles.secondary};`,
    `${indent}--color-success: ${roles.success};`,
    `${indent}--color-warning: ${theme === "light" ? roles.warning : midnight.saffron};`,
    `${indent}--color-danger: ${theme === "light" ? roles.danger : roles.destructive};`,
    `${indent}--brand-teal: ${brand.green};`,
  );
  return out;
}

function mobilePalette(indent: string): string[] {
  return [
    `${indent}--off-white: ${brand.offWhite};`,
    `${indent}--ink: ${brand.ink};`,
    `${indent}--ink-muted: ${brand.inkMuted};`,
    `${indent}--brand-saffron: ${brand.saffron};`,
    `${indent}--brand-saffron-bright: ${brand.saffronBright};`,
    `${indent}--brand-vermilion: ${brand.vermilion};`,
    `${indent}--brand-gold: ${brand.gold};`,
    `${indent}--brand-green: ${brand.green};`,
    `${indent}--pn-num: ${fontFamily.web.devanagari};`,
  ];
}

/**
 * Tailwind's spacing scale in px (step × 4, `px` = 1). Same pixels as the
 * website, where 1rem is 16px.
 */
function tailwindSpacing(): Record<string, string> {
  const steps = [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 3.75, 4, 5, 5.5, 6, 7.5, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
  const out: Record<string, string> = { px: "1px" };
  for (const step of steps) out[String(step)] = `${step * spaceUnit}px`;
  return out;
}

/** The one stylesheet both apps import for type size and page padding. */
function themeCss(): string {
  const lines = [
    "/* Generated from packages/design-tokens. Imported by apps/web and apps/mobile. */",
    ":root {",
  ];
  const scale = { ...webTypeScale, "5xl": text5xl };
  for (const [name, t] of Object.entries(scale)) {
    lines.push(
      `  --vp-text-${name}: ${rem(t.size)}; /* ${t.size}px */`,
      `  --vp-text-${name}-line: ${+(t.lineHeight / t.size).toFixed(4)};`,
    );
  }
  lines.push(
    `  --vp-space: ${spaceUnit}px;`,
    "  --vp-page-px: 16px; /* px-4 */",
    "  --vp-page-px-wide: 24px; /* sm:px-6 */",
    "  --vp-page-py: 32px; /* py-8 */",
    "  --vp-home-card-px: 10px; /* max-sm:mx-2.5 / px-2.5 */",
    "}",
    "",
  );
  return lines.join("\n");
}

/** Everything apps/mobile/tailwind.config.js needs (it is CommonJS and cannot import TS). */
function mobileTailwind() {
  const px = (n: number) => `${n}px`;
  return {
    fontSize: Object.fromEntries([
      ...Object.entries(mobileTypeScale).map(([k, v]) => [k, [px(v.size), { lineHeight: px(v.lineHeight) }]] as const),
      ...Object.entries(diagramTypeScale).map(([k, size]) => [`diagram-${k}`, [px(size), { lineHeight: px(Math.round(size * 1.3)) }]] as const),
    ]),
    letterSpacing: { eyebrow: letterSpacing.eyebrow, "eyebrow-wide": letterSpacing.eyebrowWide, tight: letterSpacing.tight },
    /**
     * Native draws one shadow layer, so each size takes the website's deepest
     * layer, in the light theme's ink (shadows are faint on midnight anyway).
     */
    boxShadow: Object.fromEntries(
      Object.entries(shadow).map(([name, layers]) => {
        const l = layers[layers.length - 1];
        return [name, `0px ${l.y}px ${l.blur}px ${l.spread}px ${withAlpha(shadowInk.light.hex, l.opacity)}`];
      }),
    ),
    maxWidth: { page: px(size.pageMax), "page-wide": px(size.pageWide) },
    maxWidth: { page: px(size.pageMax), "page-wide": px(size.pageWide) },
    screens: {
      xs: px(breakpoints.xs),
      compact: px(breakpoints.compact),
      calendar: px(breakpoints.calendarWide),
      sm: px(breakpoints.sm),
      md: px(breakpoints.md),
      lg: px(breakpoints.lg),
      xl: px(breakpoints.xl),
    },
    fontFamily: {
      sans: [fontFamily.native.regular],
      medium: [fontFamily.native.medium],
      semibold: [fontFamily.native.semibold],
      bold: [fontFamily.native.bold],
      mono: [fontFamily.native.mono],
      num: [fontFamily.native.regular],
      "num-bold": [fontFamily.native.bold],
    },
    borderRadius: { sm: px(radius.sm), md: px(radius.md), lg: px(radius.lg), xl: px(radius.xl), "2xl": px(radius["2xl"]) },
    /**
     * Padding, margin and gap in px. NativeWind otherwise treats 1rem as 14px,
     * so `p-4` was 14px in the app and 16px on the website.
     */
    spacing: tailwindSpacing(),
    /** Fixed colours (not theme channels). Tints use the website's color-mix. */
    colors: {
      gold: brand.gold,
      ...illustrationColors(),
      ...wheelControlColors(),
      success: "var(--color-success)",
      "surface-today": tintRgba("surfaceToday"),
      "surface-today-hover": tintRgba("surfaceTodayHover"),
      "surface-hover": tintRgba("surfaceHover"),
      "surface-tint-danger": tintRgba("surfaceTintDanger"),
      "fest-today": withAlpha(brand.vermilion, 0.08),
      ...Object.fromEntries(
        Object.entries(tints)
          .filter(([name]) => !["surfaceToday", "surfaceTodayHover", "surfaceHover", "surfaceTintDanger"].includes(name))
          .map(([name]) => [kebab(name), tintColorMix(name as keyof typeof tints)]),
      ),
    },
  };
}

// ─── Writing ──────────────────────────────────────────────────────────────────

let stale = 0;

function write(path: string, next: string, current: string): void {
  if (next === current) return;
  if (check) {
    console.error(`stale: ${relative(repo, path)}`);
    stale++;
    return;
  }
  writeFileSync(path, next);
  console.log(`wrote ${relative(repo, path)}`);
}

function fill(file: string, blocks: Record<string, (indent: string) => string[]>): void {
  const path = resolve(repo, file);
  const text = readFileSync(path, "utf8");
  let next = text;
  for (const [name, body] of Object.entries(blocks)) {
    const re = new RegExp(
      `([ \\t]*)/\\* tokens:${name}:start[^*]*\\*/\\n(?:[\\s\\S]*?\\n)?[ \\t]*/\\* tokens:${name}:end \\*/`,
    );
    const m = next.match(re);
    if (!m) throw new Error(`${file}: missing /* tokens:${name}:start */ … /* tokens:${name}:end */ markers`);
    const indent = m[1] ?? "";
    const block = [
      `${indent}/* tokens:${name}:start — generated from packages/design-tokens, run \`npm run tokens\` */`,
      ...body(indent),
      `${indent}/* tokens:${name}:end */`,
    ].join("\n");
    next = next.replace(re, () => block);
  }
  write(path, next, text);
}

fill("apps/web/src/index.css", {
  "tailwind-theme": webTailwindTheme,
  palette: webPalette,
  "theme-light": (i) => webTheme("light", i),
  "theme-dark": (i) => webTheme("dark", i),
  wheel: wheelBlock,
});

fill("apps/mobile/global.css", {
  light: (i) => mobileChannels(mobileRoles("light"), i),
  "css-light": (i) => mobileCssVars("light", i),
  dark: (i) => mobileChannels(mobileRoles("dark"), i),
  "css-dark": (i) => mobileCssVars("dark", i),
  palette: mobilePalette,
  wheel: wheelBlock,
});

{
  const path = resolve(pkg, "theme.css");
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    /* first run */
  }
  write(path, themeCss(), current);
}

{
  const path = resolve(pkg, "generated/mobile-tailwind.json");
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    /* first run */
  }
  write(path, `${JSON.stringify(mobileTailwind(), null, 2)}\n`, current);
}

if (check && stale) {
  console.error("\nToken output is out of date — run `npm run tokens` and commit.");
  process.exit(1);
}
if (check) console.log("design tokens up to date");
