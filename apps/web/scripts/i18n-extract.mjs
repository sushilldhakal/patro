/**
 * Finds bilingual string pairs still living inside components and proposes
 * catalogue keys for them.
 *
 *   node scripts/i18n-extract.mjs <namespace> <file...>
 *
 * Recognises the shapes this codebase actually uses:
 *   pick("ने", "en")            local closure over useLocale().lang
 *   bilingualText(lang, "ने", "en")
 *   pickLocale(lang, "ने", "en")
 *   { ne: "ने", en: "en" }      inline data objects
 *
 * Prints a JSON mapping of proposed key to { ne, en } plus the literal source
 * text each one came from, so the rewrite can be checked before it is applied.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const [namespace, ...files] = process.argv.slice(2);
if (!namespace || files.length === 0) {
  console.error("usage: node scripts/i18n-extract.mjs <namespace> <file...>");
  process.exit(1);
}

/** A double-quoted TS string literal, allowing escapes. */
const STR = String.raw`"((?:[^"\\]|\\.)*)"`;

/** Trailing comma before the paren — prettier adds one to wrapped calls. */
const END = String.raw`\s*,?\s*\)`;

const PATTERNS = [
  { name: "pick", re: new RegExp(String.raw`\bpick\(\s*${STR}\s*,\s*${STR}${END}`, "g") },
  {
    name: "bilingualText",
    re: new RegExp(String.raw`\bbilingualText\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
  },
  {
    name: "pickLocale",
    re: new RegExp(String.raw`\bpickLocale\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
  },
  {
    name: "object",
    re: new RegExp(String.raw`\{\s*ne:\s*${STR}\s*,\s*en:\s*${STR}\s*,?\s*\}`, "g"),
  },
  // Lookup tables of [nepali, english] tuples.
  { name: "tuple", re: new RegExp(String.raw`\[\s*${STR}\s*,\s*${STR}\s*,?\s*\]`, "g") },
];

/** Key stem from the English text — readable and stable across edits. */
function slug(english, fallback) {
  const base = english
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .slice(0, 6)
    .join("_");
  return base || fallback;
}

const found = new Map(); // key -> { ne, en, from: [] }
const collisions = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const label = basename(file).replace(/\.[jt]sx?$/, "");

  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(source))) {
      const [literal, rawNe, rawEn] = match;
      // Un-escape so the value stored matches what renders.
      const ne = JSON.parse(`"${rawNe}"`);
      const en = JSON.parse(`"${rawEn}"`);
      if (!ne.trim() && !en.trim()) continue;

      const line = source.slice(0, match.index).split("\n").length;
      let key = `${namespace}.${slug(en, slug(ne, "text"))}`;

      const existing = found.get(key);
      if (existing) {
        if (existing.ne === ne && existing.en === en) {
          existing.from.push(`${label}:${line}`);
          continue;
        }
        // Same English, different Nepali (or vice versa) — needs a distinct key.
        let n = 2;
        while (found.has(`${key}_${n}`)) n++;
        collisions.push({ key, resolvedAs: `${key}_${n}`, ne, en, at: `${label}:${line}` });
        key = `${key}_${n}`;
      }
      found.set(key, { ne, en, via: name, from: [`${label}:${line}`], literal });
    }
  }
}

const out = {};
for (const [key, value] of [...found.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  out[key] = { ne: value.ne, en: value.en, _via: value.via, _at: value.from.join(", ") };
}

console.log(JSON.stringify(out, null, 2));
console.error(`\n${found.size} distinct pair(s) across ${files.length} file(s).`);
if (collisions.length) {
  console.error(`${collisions.length} key collision(s) auto-suffixed — review these:`);
  for (const c of collisions) console.error(`  ${c.key} -> ${c.resolvedAs}  (${c.at})`);
}
