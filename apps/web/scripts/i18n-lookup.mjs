/**
 * Finds catalogue keys that already hold a given pair, so a migration reuses an
 * existing definition instead of adding a second one.
 *
 *   node scripts/i18n-lookup.mjs <map.json>     report reusable keys for a map
 *   node scripts/i18n-lookup.mjs --ne "नेपाली"   search by Nepali text
 *   node scripts/i18n-lookup.mjs --en "English" search by English text
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function flatten(tree, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const ne = flatten(JSON.parse(readFileSync(resolve(root, "src/i18n/ne.json"), "utf8")));
const en = flatten(JSON.parse(readFileSync(resolve(root, "src/i18n/en.json"), "utf8")));

const byPair = new Map();
for (const key of Object.keys(ne)) {
  if (typeof ne[key] !== "string" || typeof en[key] !== "string") continue;
  const pair = JSON.stringify([ne[key], en[key]]);
  if (!byPair.has(pair)) byPair.set(pair, []);
  byPair.get(pair).push(key);
}

const args = process.argv.slice(2);

if (args[0] === "--ne" || args[0] === "--en") {
  const table = args[0] === "--ne" ? ne : en;
  const needle = args[1] ?? "";
  const hits = Object.keys(table).filter(
    (k) => typeof table[k] === "string" && table[k].includes(needle),
  );
  for (const k of hits) console.log(`${k}\n  ne: ${ne[k]}\n  en: ${en[k]}`);
  if (!hits.length) console.log("(no match)");
  process.exit(0);
}

const map = JSON.parse(readFileSync(args[0], "utf8"));
const reusable = [];
const fresh = [];
for (const [key, value] of Object.entries(map)) {
  const hit = byPair.get(JSON.stringify([value.ne, value.en]));
  if (hit && !hit.includes(key)) reusable.push(`${key} -> reuse ${hit.join(" | ")}`);
  else if (hit) reusable.push(`${key} (already in catalogue)`);
  else fresh.push(key);
}

console.log(`${reusable.length} entr(ies) duplicate an existing catalogue pair:`);
for (const line of reusable) console.log(`  ${line}`);
console.log(`\n${fresh.length} new key(s).`);
