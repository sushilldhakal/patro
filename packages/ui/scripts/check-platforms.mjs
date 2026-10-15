#!/usr/bin/env node
// Keeps the two halves of the UI kit in step:
//  - src/web draws with HTML only (no React Native), src/native with React Native only (no DOM);
//  - both export every component the contract names;
//  - shared files (contract, classes) import neither platform;
//  - no copy (Nepali text) and no hand-typed colours anywhere in the kit.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const src = new URL("../src/", import.meta.url).pathname;
const problems = [];
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
})(src);

const NATIVE_ONLY = /from\s+["'](react-native|react-native-svg|nativewind|expo[\w/-]*|@expo\/[\w/-]+)["']/;
const WEB_ONLY = /from\s+["'](react-dom[\w/-]*|lucide-react[\w/-]*|@base-ui\/[\w/-]+|radix-ui)["']|\b(document|window|localStorage)\./;
const DOM_TAGS = /<(div|span|button|table|svg|p|h[1-6]|section|input)\b/;

for (const f of files) {
  const full = relative(src, f);
  const rel = full.replace(/^kit\/[^/]+\//, "");
  const text = readFileSync(f, "utf8");
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  if (/[ऀ-ॿ]/.test(code)) problems.push(`${full}: Nepali text — copy comes in through props (from t())`);
  if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(/.test(code)) problems.push(`${full}: hand-typed colour — use theme roles / design tokens`);
  if (/\.(web|native|ios|android)\.tsx?$/.test(f)) problems.push(`${full}: no platform file suffixes — platforms are the web/ and native/ folders`);
  if (rel.startsWith("web/")) {
    if (NATIVE_ONLY.test(code)) problems.push(`${full}: imports React Native code — the website kit is plain HTML`);
  } else if (rel.startsWith("native/")) {
    if (WEB_ONLY.test(code)) problems.push(`${full}: uses web-only code — the app kit is React Native`);
    if (DOM_TAGS.test(code)) problems.push(`${full}: renders an HTML element — use React Native components`);
  } else {
    if (NATIVE_ONLY.test(code) || WEB_ONLY.test(code)) problems.push(`${full}: shared kit files must not import either platform`);
  }
}

// Both platforms export every component of the contract.
const contract = readFileSync(join(src, "contract.ts"), "utf8");
const kitBlock = contract.match(/export type UiKit = \{([\s\S]*?)\n\};/)?.[1] ?? "";
const components = [...kitBlock.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
for (const platform of ["web", "native"]) {
  const index = readFileSync(join(src, platform, "index.ts"), "utf8");
  for (const name of components)
    if (!new RegExp(`export \\{[^}]*\\b${name}\\b`).test(index)) problems.push(`${platform}/index.ts: does not export ${name}`);
}

if (problems.length) {
  console.error("packages/ui check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`packages/ui ok (${components.length} components on both platforms)`);
