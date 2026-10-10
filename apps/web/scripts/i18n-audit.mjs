/**
 * Cross-checks the catalogue against the code.
 *
 *   node scripts/i18n-audit.mjs
 *
 * Reports keys that are referenced by a `t("…")` call but missing from the
 * catalogue — those render as the raw key string, which is the failure mode
 * this whole exercise exists to prevent — and keys defined but never used.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "src");

const catalogue = JSON.parse(readFileSync(resolve(root, "src/i18n/ne.json"), "utf8"));

function flatten(node, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, out);
    else out.add(path);
  }
  return out;
}
const defined = flatten(catalogue);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(path)) yield path;
  }
}

/** `t("key")` plus `<Trans i18nKey="key">`, both of which resolve a key. */
const T_CALL = /(?:\bt\(\s*"((?:[^"\\]|\\.)*)"|i18nKey=\{?"((?:[^"\\]|\\.)*)")/g;
const used = new Map(); // key -> [locations]
const dynamic = [];

for (const file of walk(SRC)) {
  // The catalogue's own doc comment mentions t("key") as an example.
  if (file.endsWith(join("src", "i18n", "strings.ts"))) continue;
  const source = readFileSync(file, "utf8");
  const shown = relative(root, file);

  T_CALL.lastIndex = 0;
  let m;
  while ((m = T_CALL.exec(source))) {
    const line = source.slice(0, m.index).split("\n").length;
    const key = JSON.parse(`"${m[1] ?? m[2]}"`);
    if (!used.has(key)) used.set(key, []);
    used.get(key).push(`${shown}:${line}`);
  }

  // t(variable) / t(`template`) cannot be checked statically.
  for (const call of source.matchAll(/\bt\(\s*(?![")])([A-Za-z_$][\w.$[\]?!]*|`)/g)) {
    const line = source.slice(0, call.index).split("\n").length;
    dynamic.push(`${shown}:${line}  t(${call[1]}…)`);
  }
}

const missing = [...used.keys()].filter((k) => !defined.has(k)).sort();
const unused = [...defined].filter((k) => !used.has(k)).sort();

console.log(`catalogue keys: ${defined.size}`);
console.log(`keys referenced by t("…"): ${used.size}`);
console.log(`dynamic t(...) call sites (not statically checkable): ${dynamic.length}`);

console.log(`\nMISSING — referenced in code, absent from catalogue: ${missing.length}`);
for (const key of missing) {
  console.log(`  ${key}`);
  for (const at of used.get(key).slice(0, 3)) console.log(`      ${at}`);
}

console.log(`\nUnused catalogue keys: ${unused.length}`);
if (process.argv.includes("--unused")) for (const key of unused) console.log(`  ${key}`);

if (process.argv.includes("--dynamic")) {
  console.log(`\nDynamic call sites:`);
  for (const line of dynamic) console.log(`  ${line}`);
}

process.exit(missing.length ? 1 : 0);
