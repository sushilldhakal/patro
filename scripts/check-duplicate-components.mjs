#!/usr/bin/env node
/**
 * Duplicate component ratchet. A screen piece should be drawn once, in
 * packages/ui/src/kit/<area>, with each app holding at most a thin binder.
 * This lists component file names present in BOTH apps/web/src/components and
 * apps/mobile/components and fails if a name appears that is not in
 * scripts/duplicate-components-baseline.json.
 *
 *   npm run check:duplicates             compare against the baseline
 *   npm run check:duplicates -- --write  rewrite the baseline (names only ever leave it)
 *   npm run check:duplicates -- --report print the current list
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(root, "scripts/duplicate-components-baseline.json");

function names(dir) {
  const out = new Set();
  (function walk(d) {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx$/.test(n)) out.add(n.replace(/\.(web|native|ios|android)?\.?tsx$/, "").replace(/\.tsx$/, ""));
    }
  })(dir);
  return out;
}

const web = names(join(root, "apps/web/src/components"));
const mobile = names(join(root, "apps/mobile/components"));
const both = [...web].filter((n) => mobile.has(n)).sort();

if (process.argv.includes("--report")) {
  console.log(both.join("\n"));
  console.log(`\n${both.length} component names exist in both apps`);
  process.exit(0);
}
if (process.argv.includes("--write")) {
  writeFileSync(baselinePath, JSON.stringify(both, null, 2) + "\n");
  console.log(`baseline written: ${both.length} names`);
  process.exit(0);
}
const baseline = new Set(existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : []);
const added = both.filter((n) => !baseline.has(n));
if (added.length) {
  console.error(`New component name(s) in both apps: ${added.join(", ")}\nDraw it once in packages/ui/src/kit/<area> and import it from both apps.`);
  process.exit(1);
}
const gone = [...baseline].filter((n) => !both.includes(n));
console.log(`no new duplicate components (${both.length} remain${gone.length ? `, ${gone.length} can be dropped: run with --write` : ""})`);
