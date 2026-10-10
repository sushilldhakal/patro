/**
 * Moves bilingual pairs out of components and into the catalogue.
 *
 *   node scripts/i18n-apply.mjs <map.json> <file...>
 *
 * The map is `{ "<catalogue key>": { "ne": "…", "en": "…" } }`. Every call site
 * whose pair matches an entry is rewritten to `t("<key>")`, and keys that are
 * not in src/i18n/strings.ts yet get appended to their namespace section.
 *
 * Matching is on the exact pair rather than on position, so a pair that appears
 * in six places collapses to one key and a near-duplicate that differs only in
 * capitalisation keeps its own. Anything left behind is listed at the end —
 * those need a human, usually because the strings are built at runtime.
 *
 * Pass --dry to see the report without writing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
/**
 * Splitting the two halves of the job lets several migrations run at once:
 * each rewrites its own components with --no-catalogue, then a single
 * --keys-only pass folds every map into strings.ts without racing on it.
 */
const noCatalogue = args.includes("--no-catalogue");
const keysOnly = args.includes("--keys-only");
const FLAGS = new Set(["--dry", "--no-catalogue", "--keys-only"]);
const [mapPath, ...files] = args.filter((a) => !FLAGS.has(a));
if (!mapPath || (files.length === 0 && !keysOnly)) {
  console.error(
    "usage: node scripts/i18n-apply.mjs <map.json> <file...> [--dry] [--no-catalogue] [--keys-only]",
  );
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE = resolve(root, "src/i18n/strings.ts");

const map = JSON.parse(readFileSync(mapPath, "utf8"));

/** pair -> key, so identical copy anywhere collapses onto one entry. */
const byPair = new Map();
const duplicatePairs = [];
for (const [key, value] of Object.entries(map)) {
  const { ne, en } = value;
  if (typeof ne !== "string" || typeof en !== "string") {
    console.error(`${key}: map entries need string "ne" and "en".`);
    process.exit(1);
  }
  const pair = JSON.stringify([ne, en]);
  if (byPair.has(pair)) {
    // Rewriting needs one key per pair or the replacement is ambiguous. Merely
    // adding keys does not, so two keys holding the same text is only worth a
    // note — usually a reused key sitting alongside a redundant new one.
    if (!keysOnly) {
      console.error(`Pair for ${key} is already mapped to ${byPair.get(pair)}.`);
      process.exit(1);
    }
    duplicatePairs.push(`${key} duplicates ${byPair.get(pair)}`);
    continue;
  }
  byPair.set(pair, key);
}

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
/** Trailing comma before the paren — prettier adds one to wrapped calls. */
const END = String.raw`\s*,?\s*\)`;
const PATTERNS = [
  new RegExp(String.raw`\bpick\(\s*${STR}\s*,\s*${STR}${END}`, "g"),
  new RegExp(String.raw`\bbilingualText\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
  new RegExp(String.raw`\bpickLocale\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
];

const usedKeys = new Set();
const unmatched = [];
let replacedTotal = 0;

// --keys-only adds every mapped key, since no file is scanned to discover use.
if (keysOnly) for (const key of Object.keys(map)) usedKeys.add(key);

for (const file of keysOnly ? [] : files) {
  const absolute = resolve(file);
  const original = readFileSync(absolute, "utf8");
  let updated = original;
  let replaced = 0;

  for (const pattern of PATTERNS) {
    updated = updated.replace(pattern, (literal, rawNe, rawEn) => {
      const ne = JSON.parse(`"${rawNe}"`);
      const en = JSON.parse(`"${rawEn}"`);
      const key = byPair.get(JSON.stringify([ne, en]));
      if (!key) {
        unmatched.push({ file: relative(root, absolute), literal });
        return literal;
      }
      usedKeys.add(key);
      replaced++;
      return `t(${JSON.stringify(key)})`;
    });
  }

  if (replaced === 0) {
    console.log(`${relative(root, absolute)}: nothing to replace`);
    continue;
  }
  replacedTotal += replaced;
  console.log(`${relative(root, absolute)}: ${replaced} call site(s) -> t()`);
  if (!dry) writeFileSync(absolute, updated, "utf8");
}

/* ── add any new keys to the catalogue ─────────────────────────────────── */

function catalogueKeys(source) {
  const keys = new Set();
  const re = /^ {2}"([^"]+)":/gm;
  let m;
  while ((m = re.exec(source))) keys.add(m[1]);
  return keys;
}

/** One-line entry if it fits the file's width, otherwise split. */
function entryFor(key, { ne, en }) {
  const oneLine = `  ${JSON.stringify(key)}: { ne: ${JSON.stringify(ne)}, en: ${JSON.stringify(en)} },`;
  if (oneLine.length <= 118) return oneLine;
  return [
    `  ${JSON.stringify(key)}: {`,
    `    ne: ${JSON.stringify(ne)},`,
    `    en: ${JSON.stringify(en)},`,
    `  },`,
  ].join("\n");
}

let catalogue = readFileSync(CATALOGUE, "utf8");
const existing = catalogueKeys(catalogue);
const toAdd = [...usedKeys].filter((k) => !existing.has(k)).sort();

if (toAdd.length && !dry && !noCatalogue) {
  const lines = catalogue.split("\n");
  for (const key of toAdd) {
    const namespace = key.split(".")[0];
    // Insert after the last key in the same top-level namespace so the file
    // stays grouped the way the section comments promise.
    let insertAt = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = /^ {2}"([^"]+)":/.exec(lines[i]);
      if (!m || m[1].split(".")[0] !== namespace) continue;
      // Walk to the end of this entry (multi-line entries close with "  },").
      let j = i;
      if (!lines[i].trimEnd().endsWith("},")) {
        while (j < lines.length && lines[j] !== "  },") j++;
      }
      insertAt = j;
    }
    const entry = entryFor(key, map[key]);
    if (insertAt === -1) {
      const close = lines.findIndex((l) => l.startsWith("} satisfies Record"));
      const header = `  /* ── ${namespace} ${"─".repeat(Math.max(3, 66 - namespace.length))} */`;
      lines.splice(close, 0, "", header, ...entry.split("\n"));
    } else {
      lines.splice(insertAt + 1, 0, ...entry.split("\n"));
    }
  }
  catalogue = lines.join("\n");
  writeFileSync(CATALOGUE, catalogue, "utf8");
}

if (duplicatePairs.length) {
  console.log(`\n${duplicatePairs.length} key(s) hold text another key already has (worth collapsing later):`);
  for (const line of duplicatePairs) console.log(`  ${line}`);
}

console.log(`\n${replacedTotal} call site(s) rewritten, ${usedKeys.size} key(s) used.`);
console.log(`${toAdd.length} key(s) ${dry ? "would be" : ""} added to src/i18n/strings.ts.`);
if (toAdd.length) console.log(`  ${toAdd.join("\n  ")}`);

const reused = [...usedKeys].filter((k) => existing.has(k)).sort();
if (reused.length) {
  console.log(`\n${reused.length} existing key(s) reused:`);
  console.log(`  ${reused.join("\n  ")}`);

  // Reusing a key adopts the catalogue's wording. Where that differs from what
  // the component said, the rendered text changes — say so rather than let it
  // slip through silently.
  const changed = [];
  for (const key of reused) {
    const entry = new RegExp(
      `^ {2}${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^/, '"').replace(/$/, '"')}: \\{[\\s\\S]*?\\n?.*?\\},?$`,
      "m",
    );
    const block = entry.exec(catalogue)?.[0] ?? "";
    for (const lang of ["ne", "en"]) {
      const m = new RegExp(`${lang}: ("(?:[^"\\\\]|\\\\.)*")`).exec(block);
      if (!m) continue;
      const current = JSON.parse(m[1]);
      if (current !== map[key][lang]) {
        changed.push(`  ${key} (${lang}): component said ${JSON.stringify(map[key][lang])}, catalogue says ${JSON.stringify(current)}`);
      }
    }
  }
  if (changed.length) {
    console.log(`\nWording adopted from the catalogue (rendered text changes):`);
    console.log(changed.join("\n"));
  }
}

if (unmatched.length) {
  const distinct = [...new Set(unmatched.map((u) => `${u.file}  ${u.literal}`))];
  console.log(`\n${distinct.length} pair(s) left in place (not in the map):`);
  for (const line of distinct.slice(0, 40)) console.log(`  ${line}`);
  if (distinct.length > 40) console.log(`  … and ${distinct.length - 40} more`);
}
