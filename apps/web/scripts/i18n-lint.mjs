/**
 * Ratchet on bilingual strings still living outside the catalogue.
 *
 *   npm run i18n:lint
 *
 * Counts inline `pick("ने","en")` / `bilingualText(lang, …)` / `{ ne, en }`
 * literals across src and fails if the total has grown since BASELINE. The
 * migration is not finished, so a plain "must be zero" check would just fail
 * every run and get ignored; a ratchet lets the number only go down.
 *
 * When you migrate more files, lower BASELINE to the new total.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Inline bilingual literals remaining in src. Lower this as you migrate.
 *
 * Roughly 1,500 of these are the Learn article bodies under
 * src/lib/learn/articles/, which are structured `{ ne, en }` content rather
 * than UI labels and are migrating separately.
 */
const BASELINE = 2291;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "src");
const SKIP = [resolve(SRC, "i18n")];

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
const END = String.raw`\s*,?\s*\)`;
const PATTERNS = [
  new RegExp(String.raw`\bpick\(\s*${STR}\s*,\s*${STR}${END}`, "g"),
  new RegExp(String.raw`\bbilingualText\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
  new RegExp(String.raw`\bpickLocale\(\s*lang\s*,\s*${STR}\s*,\s*${STR}${END}`, "g"),
  new RegExp(String.raw`\{\s*ne:\s*${STR}\s*,\s*en:\s*${STR}\s*,?\s*\}`, "g"),
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (SKIP.some((s) => path.startsWith(s))) continue;
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(path)) yield path;
  }
}

const perFile = [];
let total = 0;

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  let count = 0;
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    while (pattern.exec(source)) count++;
  }
  if (count) {
    perFile.push([relative(root, file), count]);
    total += count;
  }
}

perFile.sort((a, b) => b[1] - a[1]);

console.log(`Inline bilingual strings outside the catalogue: ${total} in ${perFile.length} file(s)`);
console.log(`Baseline: ${BASELINE}\n`);
for (const [file, count] of perFile.slice(0, 30)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}
if (perFile.length > 30) console.log(`  … and ${perFile.length - 30} more file(s)`);

if (total > BASELINE) {
  console.error(
    `\nThis is ${total - BASELINE} more than the baseline. New copy belongs in ` +
      `src/i18n/strings.ts and should be read with t("key"), not written inline.`,
  );
  process.exit(1);
}
if (total < BASELINE) {
  console.log(`\n${BASELINE - total} fewer than baseline — lower BASELINE in this script to ${total}.`);
}
