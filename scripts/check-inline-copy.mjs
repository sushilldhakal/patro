#!/usr/bin/env node
/**
 * Inline copy ratchet. Interface text belongs in packages/i18n/src/strings.ts
 * (read with `t("key")`), so it is written once for the website and the app.
 * This counts Nepali (Devanagari) text typed into the apps' source — string
 * literals, template text and JSX text, not comments — and fails if any file
 * gets MORE of it than the checked-in baseline (scripts/copy-baseline.json).
 *
 *   npm run check:copy             compare against the baseline
 *   npm run check:copy -- --write  rewrite the baseline (after moving copy out)
 *   npm run check:copy -- --report print totals per app and the biggest files
 *   npm run check:copy -- --list <path-prefix>  print file:line:text for every hit under a path
 *
 * New files start at zero. The shared page logic and UI kit (packages/features,
 * packages/ui) must stay at zero: copy reaches them through `t()` only.
 *
 * Escape hatch for text that is data, not copy (a Devanagari digit table, a
 * matra regex): put `copy-ok` in a comment on the line, or `copy-ok-file`
 * anywhere in a file made of such values.
 *
 * Moving copy: `node scripts/i18n-tools/extract-inline-copy.mjs --write` moves
 * every `pick("ने", "en")` it can; the rest is moved by hand.
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", { paths: [join(root, "apps/mobile"), join(root, "apps/web"), root] }));
const BASELINE = join(root, "scripts/copy-baseline.json");
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets", "generated"]);
const DEVANAGARI = /[\u0900-\u097F]/;

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

const APP_FILES = [
  ...walk(join(root, "apps/web/src")),
  ...["app", "components", "lib"].flatMap((d) => walk(join(root, "apps/mobile", d))),
];
/** Must stay at zero whatever the baseline says. */
const ZERO_FILES = [...walk(join(root, "packages/features/src")), ...walk(join(root, "packages/ui/src"))];

/** Every string, template piece and JSX text run that holds Devanagari: [line, text]. */
function hits(file) {
  const src = readFileSync(file, "utf8");
  if (src.includes("copy-ok-file")) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = src.split("\n");
  const found = [];
  const visit = (n) => {
    let text;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) text = n.text;
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) text = n.text;
    if (text !== undefined && DEVANAGARI.test(text)) {
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
      if (!/copy-ok/.test(lines[line] ?? "")) found.push([line + 1, text.trim()]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

const rel = (f) => relative(root, f).split("\\").join("/");
const counts = {};
for (const f of APP_FILES) {
  const n = hits(f).length;
  if (n) counts[rel(f)] = n;
}

const args = process.argv.slice(2);

if (args[0] === "--list") {
  const prefix = args[1] ?? "";
  for (const f of [...APP_FILES, ...ZERO_FILES].filter((f) => rel(f).startsWith(prefix)))
    for (const [line, text] of hits(f)) console.log(`${rel(f)}:${line}: ${text.slice(0, 80)}`);
  process.exit(0);
}

if (args.includes("--report")) {
  const total = (app) => Object.entries(counts).filter(([f]) => f.startsWith(`apps/${app}/`)).reduce((s, [, n]) => s + n, 0);
  const files = (app) => Object.keys(counts).filter((f) => f.startsWith(`apps/${app}/`)).length;
  console.log(`web:    ${total("web")} inline Nepali texts in ${files("web")} files`);
  console.log(`mobile: ${total("mobile")} inline Nepali texts in ${files("mobile")} files`);
  console.log("\nbiggest:");
  for (const [f, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${String(n).padStart(4)}  ${f}`);
  process.exit(0);
}

if (args.includes("--write")) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`baseline written: ${Object.values(counts).reduce((s, n) => s + n, 0)} inline Nepali texts in ${Object.keys(counts).length} files`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
const failures = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (n > allowed)
    failures.push(`${file}: ${n} inline Nepali texts (baseline ${allowed}) — move the copy into packages/i18n/src/strings.ts and read it with t()`);
}
for (const f of ZERO_FILES) {
  const n = hits(f).length;
  if (n) failures.push(`${rel(f)}: ${n} inline Nepali texts — shared packages read copy through t() only`);
}
const lowered = Object.entries(baseline).filter(([f, n]) => (counts[f] ?? 0) < n).length;

if (failures.length) {
  console.error(`inline copy check failed:\n  ${failures.join("\n  ")}`);
  console.error("\n(`npm run check:copy -- --list <file>` shows each one.)");
  process.exit(1);
}
const now = Object.values(counts).reduce((s, n) => s + n, 0);
console.log(
  `no inline copy added (${now} inline Nepali texts left in ${Object.keys(counts).length} files)` +
    (lowered ? `; ${lowered} files are below the baseline — run \`npm run check:copy -- --write\` to lock that in` : ""),
);
