#!/usr/bin/env node
// Keeps packages/drawing portable between the website, the mobile app, the UI
// kit and the page hooks: plain TypeScript that imports only from this package,
// @vedic-patro/domain/* and three. No React, React Native or browser APIs, and
// nothing from the kit or the hooks, which both import it.
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
  if (path.endsWith(".tsx")) problems.push(`${rel}: drawing files must be .ts (no JSX)`);
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/^[ \t]*(import|export)(\s+type)?\s*(?:\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?|[\w$]+(?:\s*,\s*\{[^}]*\})?)\s*from\s*["']([^"']+)["']|^[ \t]*import\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
    const spec = m[3] ?? m[4] ?? m[5];
    if (spec.startsWith("./") || spec.startsWith("../")) continue;
    if (spec.startsWith("@vedic-patro/domain/") || spec === "three") continue;
    problems.push(`${rel}: imports "${spec}" — drawing files may import @vedic-patro/domain/* and three`);
  }
  if (/\b(window|document|localStorage|navigator)\.[A-Za-z_]/.test(text)) {
    problems.push(`${rel}: uses a browser API — keep platform code out of packages/drawing`);
  }
}

walk(root);
if (problems.length) {
  console.error("packages/drawing check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("packages/drawing ok");
