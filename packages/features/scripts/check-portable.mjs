#!/usr/bin/env node
// Keeps packages/features shared between the website and the mobile app:
// React hooks and plain TypeScript, no React Native, no DOM, no router.
// Drawing belongs in each app (or in @vedic-patro/ui; its geometry in
// @vedic-patro/drawing); this package decides
// what a page shows and how it behaves.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../src/", import.meta.url).pathname;
const problems = [];

/** Packages a page hook may use: React, data fetching and the other shared packages. */
const ALLOWED = [
  "react",
  "@tanstack/react-query",
  "@vedic-patro/api-client",
  "@vedic-patro/domain/",
  "@vedic-patro/drawing/",
  "@vedic-patro/read-models/",
  "@vedic-patro/i18n/runtime",
  "@vedic-patro/i18n/react",
  "@vedic-patro/design-tokens",
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name)) check(path);
  }
}

function check(path) {
  const rel = relative(root, path);
  if (path.endsWith(".tsx")) problems.push(`${rel}: feature files must be .ts — markup belongs in the apps or @vedic-patro/ui`);
  if (/\.(web|native|ios|android)\.ts$/.test(path)) problems.push(`${rel}: no platform-specific files in packages/features`);
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/^[ \t]*(import|export)(\s+type)?\s*(?:\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?|[\w$]+(?:\s*,\s*\{[^}]*\})?)\s*from\s*["']([^"']+)["']|^[ \t]*import\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
    const spec = m[3] ?? m[4] ?? m[5];
    if (spec.startsWith("./") || spec.startsWith("../")) continue;
    if (ALLOWED.some((a) => spec === a || (a.endsWith("/") ? spec.startsWith(a) : spec.startsWith(`${a}/`)))) continue;
    problems.push(
      `${rel}: imports "${spec}" — page logic may only use react, @tanstack/react-query and the shared @vedic-patro packages (no react-native, react-dom, expo, router or icon libraries)`,
    );
  }
  if (/\b(window|document|localStorage|sessionStorage|navigator)\.[A-Za-z_]/.test(text)) {
    problems.push(`${rel}: uses a browser API — keep platform code in the apps`);
  }
  if (/[ऀ-ॿ]/.test(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))) {
    problems.push(`${rel}: has Nepali text — copy goes in packages/i18n/src/strings.ts and is read with t()`);
  }
}

walk(root);
if (problems.length) {
  console.error("packages/features check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("packages/features ok");
