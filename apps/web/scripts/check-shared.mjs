#!/usr/bin/env node
// Keeps src/shared portable between the website and the mobile app: plain
// TypeScript that imports only from inside src/shared. See src/shared/README.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../src/shared/", import.meta.url).pathname;
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
  if (path.endsWith(".tsx")) problems.push(`${rel}: shared files must be .ts (no JSX)`);
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    if (!m[1].startsWith("./") && !m[1].startsWith("../")) {
      problems.push(`${rel}: imports "${m[1]}" — shared files may only import from src/shared`);
    }
  }
  if (/\b(window|document|localStorage|navigator)\./.test(text)) {
    problems.push(`${rel}: uses a browser API — keep platform code out of src/shared`);
  }
}

walk(root);
if (problems.length) {
  console.error("src/shared check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("src/shared ok");
