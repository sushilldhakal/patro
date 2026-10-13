#!/usr/bin/env node
/**
 * Design drift ratchet. Counts hand-typed visual values in both apps — colours,
 * font sizes, radii, spacing, shadows — that should come from
 * @vedic-patro/design-tokens, and fails if any file gets MORE of them than the
 * checked-in baseline (scripts/design-baseline.json).
 *
 *   npm run check:design            compare against the baseline
 *   npm run check:design -- --write rewrite the baseline (after fixing files)
 *   npm run check:design -- --report print totals per app and rule
 *   npm run check:design -- --list <path-prefix>  print file:line:rule for every violation under a path
 *
 * Escape hatch for a value that is real artwork geometry, not shared design:
 * put `design-ok` in a comment on the line (or `design-ok-file` anywhere in a
 * file made entirely of such values, e.g. a fixed-size share-image canvas).
 *
 * The baseline only goes down: fix a file, rewrite the baseline, commit both.
 * New files start at zero, so they must use tokens from the first line.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(root, "scripts/design-baseline.json");
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets", "generated"]);
/** Where raw values are the point: the token tables themselves. */
const EXEMPT = new Set(["apps/mobile/lib/theme.ts", "apps/mobile/lib/nativewind-theme-vars.ts"]);

/** rule → pattern, matched on source with comments removed. */
const RULES = {
  hex: /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b(?![\w-])/g,
  rgb: /\brgba?\(/g,
  fontSize: /\bfontSize\s*:\s*\d/g,
  radius: /\bborderRadius\s*:\s*\d/g,
  spacing: /\b(?:padding|margin)(?:Top|Bottom|Left|Right|Horizontal|Vertical)?\s*:\s*(?:[1-9]|0\.)/g,
  // Sizes of one element (w-[300px], h-[30px], top-[76px], blur-[46px]) are layout,
  // not shared design, so they are not counted. Type, radius, spacing and
  // breakpoints must come from the tokens.
  arbitraryPx: /(?<![\w-])(?!(?:min-|max-)?[wh]-|size-|top-|left-|right-|bottom-|inset|-?translate|-?[xy]-|blur-|backdrop-blur-|border-[a-z]*-?\[|-left-|-right-|-top-|-bottom-)[a-z-]*(?:\bmin|\bmax)?-?\[-?\d+(?:\.\d+)?px\]/g,
  remText: /\btext-\[\d+(?:\.\d+)?rem\]/g,
  shadow: /\b(?:elevation|shadowRadius|shadowOpacity|shadowOffset)\s*:/g,
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(root, "apps/web/src")),
  ...["app", "components", "lib"].flatMap((d) => walk(join(root, "apps/mobile", d))),
  // The shared UI kit and page logic start at zero like any new file.
  ...walk(join(root, "packages/ui/src")),
  ...walk(join(root, "packages/features/src")),
];

/** { "apps/mobile/components/x.tsx": { hex: 3, fontSize: 1 } }, zero counts left out. */
function scan() {
  const result = {};
  for (const f of files) {
    const path = relative(root, f);
    if (EXEMPT.has(path)) continue;
    const text = readFileSync(f, "utf8");
    if (text.includes("design-ok-file")) continue;
    const src = text
      .split("\n")
      .map((l) => (l.includes("design-ok") ? "" : l))
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    const counts = {};
    for (const [rule, re] of Object.entries(RULES)) {
      const n = (src.match(re) ?? []).length;
      if (n) counts[rule] = n;
    }
    if (Object.keys(counts).length) result[path] = counts;
  }
  return result;
}

const current = scan();
const args = new Set(process.argv.slice(2));

if (args.has("--list")) {
  const prefix = process.argv[process.argv.indexOf("--list") + 1] ?? "";
  for (const f of files) {
    const path = relative(root, f);
    if (!path.startsWith(prefix) || EXEMPT.has(path)) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("design-ok") || /^\s*(\*|\/\/|\/\*)/.test(line)) return;
      const code = line.replace(/\/\/.*$/, "");
      for (const [rule, re] of Object.entries(RULES)) if ((code.match(re) ?? []).length) console.log(`${path}:${i + 1}: ${rule}: ${line.trim().slice(0, 140)}`);
    });
  }
  process.exit(0);
}

if (args.has("--report")) {
  const totals = {};
  for (const [path, counts] of Object.entries(current)) {
    const app = path.split("/")[1];
    totals[app] ??= {};
    for (const [rule, n] of Object.entries(counts)) totals[app][rule] = (totals[app][rule] ?? 0) + n;
  }
  console.log(JSON.stringify(totals, null, 2));
  process.exit(0);
}

if (args.has("--write")) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`baseline written: ${Object.keys(sorted).length} files with drift`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("scripts/design-baseline.json is missing — run: npm run check:design -- --write");
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const failures = [];
let improved = 0;
for (const [path, counts] of Object.entries(current)) {
  for (const [rule, n] of Object.entries(counts)) {
    const allowed = baseline[path]?.[rule] ?? 0;
    if (n > allowed) failures.push(`${path}: ${n} ${rule} (baseline ${allowed}) — use a token from @vedic-patro/design-tokens`);
  }
}
for (const [path, counts] of Object.entries(baseline))
  for (const [rule, n] of Object.entries(counts)) if ((current[path]?.[rule] ?? 0) < n) improved++;

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} design drift increase(s). Hand-typed colours/sizes/spacing must come from the design tokens.`);
  process.exit(1);
}
console.log(`no design drift added${improved ? ` (${improved} baseline entries can be lowered: run with --write)` : ""}`);
