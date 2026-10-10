// Audit: every t("key") used in the given files must exist either in the
// curated map or in the already-generated catalogue. Reports both directions.
import fs from "node:fs";

const [mapPath, ...files] = process.argv.slice(2);
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const ne = JSON.parse(fs.readFileSync("src/i18n/ne.json", "utf8"));

const flat = new Set();
(function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") flat.add(key);
    else if (v && typeof v === "object") walk(v, key);
  }
})(ne, "");

const used = new Map();
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"([^"`]+)"/g)) push(m[1], file);
  for (const m of src.matchAll(/\bt\(\s*`\$\{K\}([^`]+)`/g)) push(`learn.study.calc.${m[1]}`, file);
  for (const m of src.matchAll(/`\$\{K\}([a-z0-9_]+)`/g)) push(`learn.study.calc.${m[1]}`, file);
  for (const m of src.matchAll(/"(learn\.study\.[a-z0-9_.]+)"/g)) push(m[1], file);
}
function push(key, file) {
  if (!used.has(key)) used.set(key, new Set());
  used.get(key).add(file);
}

const missing = [];
const reused = [];
for (const [key, where] of [...used].sort()) {
  if (map[key]) continue;
  if (flat.has(key)) {
    reused.push(key);
    continue;
  }
  missing.push(`${key}   <- ${[...where].join(", ")}`);
}

const unusedMapKeys = Object.keys(map).filter((k) => !used.has(k));

console.log(`used keys: ${used.size}`);
console.log(`in map: ${[...used].filter(([k]) => map[k]).length}`);
console.log(`reused from catalogue (not in map): ${reused.length}`);
for (const r of reused) console.log(`  reuse ${r}`);
console.log(`\nMISSING (${missing.length}):`);
for (const m of missing) console.log(`  ${m}`);
console.log(`\nmap keys not used by these files (${unusedMapKeys.length}):`);
for (const k of unusedMapKeys) console.log(`  ${k}`);
