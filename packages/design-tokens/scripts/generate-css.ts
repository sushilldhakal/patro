/**
 * Writes the token values into the marked blocks of the two apps' CSS files.
 *
 *   npm run tokens               (repo root) write the blocks
 *   npm run lint -w @vedic-patro/design-tokens   fail if a block is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brand, dark, light, midnight, rgbChannels, type ThemeRoles } from "../src/index";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const check = process.argv.includes("--check");

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Mobile (NativeWind): Tailwind colours as "r g b" channels. */
function mobileBlock(roles: ThemeRoles, indent: string): string[] {
  const lines = (Object.keys(roles) as (keyof ThemeRoles)[]).map(
    (k) => `${indent}--tw-${kebab(k)}: ${rgbChannels(roles[k])};`,
  );
  lines.push(`${indent}--tw-danger: ${rgbChannels(roles.destructive)};`);
  return lines;
}

/** Website: the raw palette its theme variables are built from. */
function webBlock(indent: string): string[] {
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

let stale = 0;
function fill(file: string, name: string, body: (indent: string) => string[]): void {
  const path = resolve(repo, file);
  const text = readFileSync(path, "utf8");
  const re = new RegExp(`([ \\t]*)/\\* tokens:${name}:start[^*]*\\*/\\n(?:[\\s\\S]*?\\n)?[ \\t]*/\\* tokens:${name}:end \\*/`);
  const m = text.match(re);
  if (!m) throw new Error(`${file}: missing /* tokens:${name}:start */ … /* tokens:${name}:end */ markers`);
  const indent = m[1] ?? "";
  const block = [
    `${indent}/* tokens:${name}:start — generated from packages/design-tokens, run \`npm run tokens\` */`,
    ...body(indent),
    `${indent}/* tokens:${name}:end */`,
  ].join("\n");
  const next = text.replace(re, block);
  if (next === text) return;
  if (check) {
    console.error(`stale: ${relative(repo, path)} (${name})`);
    stale++;
    return;
  }
  writeFileSync(path, next);
  console.log(`wrote ${relative(repo, path)} (${name})`);
}

fill("apps/mobile/global.css", "light", (i) => mobileBlock(light, i));
fill("apps/mobile/global.css", "dark", (i) => mobileBlock(dark, i));
fill("apps/web/src/index.css", "palette", (i) => webBlock(i));

if (check && stale) {
  console.error("\nToken blocks are out of date — run `npm run tokens` and commit.");
  process.exit(1);
}
if (check) console.log("design tokens up to date");
