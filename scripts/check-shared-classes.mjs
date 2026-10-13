#!/usr/bin/env node
/**
 * Pages that read their styling from a shared class map (packages/design-tokens/
 * src/classes/<page>-classes.ts) must not drift back to their own class strings.
 *
 *   npm run check:classes            compare against scripts/shared-classes-baseline.json
 *   npm run check:classes -- --write rewrite the baseline (after moving strings into a map)
 *
 * It checks two things:
 *  1. every shared map written for a page is imported by at least one file in
 *     the website and one in the app (a map only one side reads shares nothing);
 *  2. in files that import any shared map, the number of long literal class
 *     strings (className="..." / cn("...") with 5+ utilities) cannot grow.
 *     Long literals belong in the map; short local ones (layout, one-offs) are fine.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(root, "scripts/shared-classes-baseline.json");
const MAPS = join(root, "packages/design-tokens/src/classes");
const SKIP = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets", "generated"]);
/** Maps that are not per-page (diagram internals etc.) can be read by one side only. */
const ONE_SIDED_OK = new Set(["learn-classes", "diagram-classes", "wheel-svg-classes", "av-wheel-classes", "hora-classes", "timeline-classes", "wheel-classes"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const web = walk(join(root, "apps/web/src"));
const app = ["app", "components", "lib"].flatMap((d) => walk(join(root, "apps/mobile", d)));
const read = (f) => readFileSync(f, "utf8");
const IMPORT = /@vedic-patro\/design-tokens\/classes\/([\w-]+)|\/packages\/design-tokens\/src\/classes\/([\w-]+)/g;

const importsOf = (files) => {
  const m = new Map();
  for (const f of files) for (const x of read(f).matchAll(IMPORT)) (m.get(x[1] ?? x[2]) ?? m.set(x[1] ?? x[2], new Set()).get(x[1] ?? x[2])).add(f);
  return m;
};
const webImports = importsOf(web), appImports = importsOf(app);
const failures = [];

for (const file of readdirSync(MAPS).filter((f) => f.endsWith("-classes.ts"))) {
  const name = file.replace(/\.ts$/, "");
  if (ONE_SIDED_OK.has(name)) continue;
  if (!webImports.has(name)) failures.push(`${name}: no website file reads this shared map`);
  if (!appImports.has(name)) failures.push(`${name}: no app file reads this shared map`);
}

/** Long literal class strings in a file. */
function longLiterals(src) {
  let n = 0;
  for (const m of src.matchAll(/(?:className|Class|class)=\s*"([^"]+)"|\bcn\(\s*"([^"]+)"|\bcn\(\s*`([^`$]+)`/g)) {
    const text = m[1] ?? m[2] ?? m[3];
    if (text.trim().split(/\s+/).length >= 5) n++;
  }
  return n;
}
const current = {};
for (const f of [...web, ...app]) {
  const src = read(f);
  if (!/design-tokens\/(?:src\/)?classes\//.test(src)) continue;
  const n = longLiterals(src);
  if (n) current[relative(root, f)] = n;
}

if (process.argv.includes("--write")) {
  writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))), null, 2) + "\n");
  console.log(`baseline written: ${Object.keys(current).length} files`);
  process.exit(0);
}
const baseline = existsSync(BASELINE) ? JSON.parse(read(BASELINE)) : {};
for (const [f, n] of Object.entries(current)) {
  const allowed = baseline[f] ?? 0;
  if (n > allowed) failures.push(`${f}: ${n} long class strings (baseline ${allowed}): move them into the page's shared map`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} shared-class check(s) failed.`);
  process.exit(1);
}
console.log(`shared class maps are read by both apps; ${Object.keys(current).length} converted files, no new long class strings`);
