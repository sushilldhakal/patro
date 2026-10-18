#!/usr/bin/env node
// Keeps packages/read-models portable between the website and the mobile app:
// plain TypeScript over the API contract (`import type` from
// @vedic-patro/api-client) and the domain (@vedic-patro/domain/*), nothing else.
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
  if (path.endsWith(".tsx")) problems.push(`${rel}: read-model files must be .ts (no JSX)`);
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/^[ \t]*(import|export)(\s+type)?\s*(?:\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?|[\w$]+(?:\s*,\s*\{[^}]*\})?)\s*from\s*["']([^"']+)["']|^[ \t]*import\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
    const spec = m[3] ?? m[4] ?? m[5];
    if (spec.startsWith("./") || spec.startsWith("../")) continue;
    if (spec.startsWith("@vedic-patro/domain/")) continue;
    // The API contract is types only, so there is no runtime edge to the client.
    if (spec === "@vedic-patro/api-client" && m[2]) continue;
    problems.push(`${rel}: imports "${spec}" — read models may import @vedic-patro/domain/* and \`import type\` from @vedic-patro/api-client`);
  }
  if (/\b(window|document|localStorage|navigator)\.[A-Za-z_]/.test(text)) {
    problems.push(`${rel}: uses a browser API — keep platform code out of packages/read-models`);
  }
}

walk(root);
if (problems.length) {
  console.error("packages/read-models check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("packages/read-models ok");
