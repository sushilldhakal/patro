#!/usr/bin/env node
/**
 * Copies the website's src/shared folder into this repo's shared/ folder.
 *
 * That folder is the single source for code both apps use — edit it in
 * dhakal-patro/src/shared, never here. Usage:
 *   npm run shared:sync    copy the files over
 *   npm run shared:check   fail if shared/ is out of date (skips, with a
 *                          warning, when the website repo is not next to this one)
 * Set SHARED_SRC to point at another checkout of dhakal-patro/src/shared.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "..", "shared");
const src = process.env.SHARED_SRC ?? join(here, "..", "..", "dhakal-patro", "src", "shared");
const check = process.argv.includes("--check");
const HEADER =
  "// GENERATED from dhakal-patro/src/shared — do not edit here.\n" +
  "// Change it in the website repo, then run `npm run shared:sync`.\n";

function list(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? list(path) : [path];
  });
}

if (!existsSync(src)) {
  const msg = `shared: source not found at ${src} (set SHARED_SRC)`;
  if (check) {
    console.warn(`${msg} — skipping check`);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

const wanted = new Map();
for (const path of list(src)) {
  const rel = relative(src, path);
  if (!rel.endsWith(".ts")) continue;
  wanted.set(rel, HEADER + readFileSync(path, "utf8"));
}
wanted.set(
  "README.md",
  "# shared/ — generated, do not edit\n\n" +
    "These files are copied from `dhakal-patro/src/shared`, the one place the code both\n" +
    "apps use is edited. Change it there, then run `npm run shared:sync` here and\n" +
    "commit both repos. Import as `@/shared/<file>`.\n",
);

const existing = new Set(list(dest).map((p) => relative(dest, p)));
const stale = [...existing].filter((rel) => !wanted.has(rel));
const changed = [...wanted].filter(
  ([rel, body]) => !existing.has(rel) || readFileSync(join(dest, rel), "utf8") !== body,
);

if (check) {
  if (stale.length || changed.length) {
    console.error(
      "shared/ is out of date with dhakal-patro/src/shared — run `npm run shared:sync`:\n  " +
        [...changed.map(([r]) => r), ...stale.map((r) => `${r} (removed upstream)`)].join("\n  "),
    );
    process.exit(1);
  }
  console.log("shared/ is up to date");
  process.exit(0);
}

for (const rel of stale) rmSync(join(dest, rel));
for (const [rel, body] of changed) {
  mkdirSync(dirname(join(dest, rel)), { recursive: true });
  writeFileSync(join(dest, rel), body);
}
console.log(`shared: ${changed.length} updated, ${stale.length} removed`);
