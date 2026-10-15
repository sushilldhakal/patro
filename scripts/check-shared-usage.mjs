#!/usr/bin/env node
/**
 * Fails if either frontend stops using the shared packages for the things the
 * monorepo shares: API communication, design tokens, icon identity, copy (one
 * translator) and page logic (packages/features).
 *
 *   npm run check:shared
 *
 * Platform UI stays per app; this only guards the seams that must not fork
 * again (a second fetch to the API, a hand-built base URL, a brand colour
 * typed in by hand, an icon table that stops reading @vedic-patro/icons).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const apps = {
  web: walk(join(root, "apps/web/src")),
  mobile: ["app", "components", "lib"].flatMap((d) => walk(join(root, "apps/mobile", d))),
};
const read = (p) => readFileSync(p, "utf8");
const rel = (p) => relative(root, p);
const failures = [];
const fail = (msg) => failures.push(msg);

// ── API communication ────────────────────────────────────────────────────────

/** Direct fetches that are not API calls (audio files, existence checks on R2). */
const FETCH_ALLOWED = new Set([
  "apps/web/src/lib/shloka-audio-engine.ts",
  "apps/web/src/hooks/use-chapter-track.ts",
  "apps/mobile/lib/learn/use-chapter-track.ts",
]);
/** Each app's transport (lib/api.ts) is where the configured base URL is applied. */
const TRANSPORTS = new Set(["apps/web/src/lib/api.ts", "apps/mobile/lib/api.ts"]);
for (const [app, files] of Object.entries(apps)) {
  for (const f of files) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/(?<![\w.])fetch\(/.test(src) && !FETCH_ALLOWED.has(rel(f)))
      fail(`${rel(f)}: calls fetch() directly — use @vedic-patro/api-client`);
    if (/\$\{(API_BASE|DATA_BASE|API_DATA_BASE)\}/.test(src) && !TRANSPORTS.has(rel(f)))
      fail(`${rel(f)}: builds an API URL by hand — use the shared client`);
  }
  const apiFile = app === "web" ? "apps/web/src/lib/api.ts" : "apps/mobile/lib/api.ts";
  if (!/configureApiClient\(/.test(read(join(root, apiFile)))) fail(`${apiFile}: must call configureApiClient()`);
  const authFile = app === "web" ? "apps/web/src/lib/auth/client.ts" : "apps/mobile/lib/auth/client.ts";
  if (!/configureAuth\(/.test(read(join(root, authFile)))) fail(`${authFile}: must call configureAuth()`);
}

// ── Design tokens ────────────────────────────────────────────────────────────

const css = read(join(root, "apps/web/src/index.css"));
for (const block of ["tailwind-theme", "palette", "theme-light", "theme-dark", "wheel"])
  if (!css.includes(`/* tokens:${block}:start`)) fail(`apps/web/src/index.css: missing generated tokens:${block} block`);
const mcss = read(join(root, "apps/mobile/global.css"));
for (const block of ["light", "dark", "css-light", "css-dark", "palette", "wheel"])
  if (!mcss.includes(`/* tokens:${block}:start`)) fail(`apps/mobile/global.css: missing generated tokens:${block} block`);
if (!/@vedic-patro\/design-tokens\/mobile-tailwind\.json/.test(read(join(root, "apps/mobile/tailwind.config.js"))))
  fail("apps/mobile/tailwind.config.js: must read @vedic-patro/design-tokens/mobile-tailwind.json");
for (const f of ["apps/mobile/lib/theme.ts", "apps/mobile/lib/nativewind-theme-vars.ts", "apps/mobile/lib/responsive.ts"])
  if (!read(join(root, f)).includes("@vedic-patro/design-tokens")) fail(`${f}: must read @vedic-patro/design-tokens`);

/** Brand colours must come from the tokens (brand.*), not be typed in. */
const BRAND_HEX = /["'`]#(d97706|c62828|2e7d32|0b565a|b45309|1a1410|d4a017|e67e22|f8f6f2)["'`]/i;
for (const f of apps.mobile) {
  if (rel(f) === "apps/mobile/lib/theme.ts") continue;
  const m = read(f).match(BRAND_HEX);
  if (m) fail(`${rel(f)}: brand colour ${m[0]} typed in — use brand.* from @vedic-patro/design-tokens`);
}

// ── Icons ────────────────────────────────────────────────────────────────────

for (const f of [
  "apps/web/src/lib/nav-icons.ts",
  "apps/mobile/lib/drawer-icons.ts",
  "apps/mobile/components/icons/Ionicons.tsx",
  "apps/mobile/components/icons/AppNavIcon.tsx",
])
  if (!read(join(root, f)).includes("@vedic-patro/icons")) fail(`${f}: must read @vedic-patro/icons`);

// ── Copy ─────────────────────────────────────────────────────────────────────

// One translator: neither app may bring its own i18n runtime back.
for (const [app, files] of Object.entries(apps))
  for (const f of files) {
    const m = read(f).match(/from\s+["'](i18next|react-i18next|i18n-js|expo-localization)["']/);
    if (m) fail(`${rel(f)}: imports ${m[1]} — use the shared translator (@vedic-patro/i18n/react)`);
  }

// ── One copy of every context-holding library ───────────────────────────────

// The shared packages (features, ui, i18n) resolve these from the repo root; an
// app with its own nested copy would have two React contexts, and a shared hook's
// useQuery would not see the app's QueryClient (it throws at run time, while
// typecheck and builds pass). Keep every workspace on the same version.
const SINGLETONS = ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"];
const installRoots = [root, ...["apps", "packages"].flatMap((d) => readdirSync(join(root, d)).map((n) => join(root, d, n)))];
for (const name of SINGLETONS) {
  const copies = installRoots
    .map((dir) => join(dir, "node_modules", name, "package.json"))
    .filter((p) => { try { return statSync(p).isFile(); } catch { return false; } })
    .map((p) => `${rel(p).replace(/\/package\.json$/, "")} (${JSON.parse(read(p)).version})`);
  if (copies.length > 1) fail(`${name} is installed ${copies.length} times: ${copies.join(", ")} — pin one version in every workspace`);
}

// ── Page logic ───────────────────────────────────────────────────────────────

// A page hook only one app reads shares nothing: each feature must be used by both.
const FEATURES = join(root, "packages/features/src");
for (const feature of readdirSync(FEATURES).filter((n) => !n.startsWith("_") && statSync(join(FEATURES, n)).isDirectory())) {
  const spec = `@vedic-patro/features/${feature}`;
  for (const [app, files] of Object.entries(apps))
    if (!files.some((f) => read(f).includes(`"${spec}"`))) fail(`packages/features/src/${feature}: not used by the ${app} app — both apps draw a shared page`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} shared-package check(s) failed.`);
  process.exit(1);
}
console.log("both apps use the shared API client, design tokens, icon identity, translator and page logic");
