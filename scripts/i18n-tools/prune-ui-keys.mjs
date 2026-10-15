#!/usr/bin/env node
/**
 * Removes `ui.*` catalogue entries no code reads any more (after a page moved
 * to packages/features, its old inline-copy keys are usually orphaned).
 *
 *   node scripts/i18n-tools/prune-ui-keys.mjs           list them
 *   node scripts/i18n-tools/prune-ui-keys.mjs --write   remove them (then run `npm run i18n`)
 *
 * Only `ui.*` keys are touched: those are always read as literal strings, so a
 * text search is exact. Other keys may be built at run time and are left alone.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOGUE = join(root, "packages/i18n/src/strings.ts");
const SOURCES = ["apps/web/src", "apps/mobile/app", "apps/mobile/components", "apps/mobile/lib", "packages/features/src", "packages/ui/src", "packages/domain/src"];
const SKIP = new Set(["node_modules", "dist", "dist-web", ".expo"]);

let code = "";
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) code += readFileSync(p, "utf8");
  }
};
for (const d of SOURCES) walk(join(root, d));

let cat = readFileSync(CATALOGUE, "utf8");
const keys = [...cat.matchAll(/^ {2}"(ui\.[^"]+)":/gm)].map((m) => m[1]);
const unused = keys.filter((k) => !code.includes(`"${k}"`));
console.log(`${keys.length} ui.* keys, ${unused.length} unused${unused.length ? ":\n  " + unused.join("\n  ") : ""}`);
if (!process.argv.includes("--write") || !unused.length) process.exit(0);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const k of unused) {
  cat = cat
    .replace(new RegExp(`^  "${esc(k)}": \\{[^\\n]*\\},\\n`, "m"), "")
    .replace(new RegExp(`^  "${esc(k)}": \\{\\n    ne: [^\\n]*\\n    en: [^\\n]*\\n  \\},\\n`, "m"), "");
}
// Drop section headers left with no entries.
cat = cat.replace(/^ {2}\/\* ── ui\.[\w]+ ─+ \*\/\n(?=\n| {2}\/\* ── |\} satisfies)/gm, "");
writeFileSync(CATALOGUE, cat);
console.log(`removed ${unused.length}`);
