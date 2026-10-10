#!/usr/bin/env node
// Keeps packages/domain portable between the website and the mobile app:
// plain TypeScript that imports only from inside this package.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../src/", import.meta.url).pathname;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name)) check(path);
  }
}

function check(path) {
  const rel = relative(root, path);
  if (path.endsWith(".tsx")) problems.push(`${rel}: domain files must be .ts (no JSX)`);
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/(import|export)(\s+type)?\b[^;]*?\bfrom\s*["']([^"']+)["']|import\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[3] ?? m[4];
    if (spec.startsWith("./") || spec.startsWith("../")) continue;
    // API response types are the one thing domain code may name from outside —
    // type-only, so there is no runtime edge between the packages.
    if (spec === "@vedic-patro/api-client" && m[2]) continue;
    problems.push(`${rel}: imports "${spec}" — domain files may only import from this package (plus \`import type\` from @vedic-patro/api-client)`);
  }
  if (/\b(window|document|localStorage|navigator)\./.test(text)) {
    problems.push(`${rel}: uses a browser API — keep platform code out of packages/domain`);
  }
}

walk(root);
if (problems.length) {
  console.error("packages/domain check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("packages/domain ok");
