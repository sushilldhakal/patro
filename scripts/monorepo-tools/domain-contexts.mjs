#!/usr/bin/env node
/**
 * Bounded-context folders for packages/domain and packages/read-models
 * (docs/DDD-PLAN.md, Phase 5).
 *
 *   node scripts/monorepo-tools/domain-contexts.mjs           rewrite imports only (idempotent)
 *   node scripts/monorepo-tools/domain-contexts.mjs --move    one-time: git mv + rewrite
 *
 * After merging a branch that still imports the old flat paths
 * (`@vedic-patro/domain/panchanga/panchanga-format`), run it without flags: every
 * `@vedic-patro/{domain,read-models}/<old>` specifier in apps/ and packages/
 * becomes `<context>/<old>`. Paths already in a context folder are left alone.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";

const REPO = resolve(dirname(new URL(import.meta.url).pathname), "../..");

/** context -> modules (paths under src/, no extension; a trailing / moves a folder). */
const CONTEXTS = {
  astronomy: ["ayanamsha", "moon-phase-svg", "sunrise-icon-art", "eclipse-date", "ephemeris-adapters", "sky3d/"],
  calendar: [
    "bs-calendar", "bs-calendar-data.json", "era", "instant", "instant-query", "zoned-time",
    "patro-day", "patro-browse-params", "patro-browse-range", "patro-era-label", "patro-month-labels",
    "patro-year-axis", "patro-year-browse-step", "patro-headline-subtitle", "samvatsara",
    "samvatsara-table.json", "local-calendar", "ritu-display",
  ],
  panchanga: [
    "choghadiya-display", "day-timeline-data", "day-timeline-layout", "ghati-clock", "hora-short-name",
    "month-grid-moon", "nakshatra-icons", "nakshatra-icons-data.json", "nakshatra-short", "navatara-bala",
    "balam-cards", "muhurta-now", "panchanga-elements", "panchanga-format", "panchanga-i18n",
    "panchanga-layout", "panchanga-mode", "panchanga-shell-paths", "panchanga-sunrise-d1", "panchanga-wheel",
    "panchanga-year-page", "panchanga-year-wheel", "rashi-i18n", "related-page-links", "tithi-wheel-data",
    "time-format", "vertical-edge-label", "wheel-bodies", "wheel-chart-geometry", "wheel-data",
    "wheel-locale", "wheel-year-playback", "panchak/",
  ],
  festivals: ["sait-data", "sait-rules-content"],
  jyotish: [
    "avakahada-data", "avakahada-locale", "avakahada-wheel", "bhava", "birth-panchanga-meta", "dasha",
    "gochar-page-utils", "graha-detail-descriptions", "graha-details", "graha-status", "janma-phala-tables",
    "rashifal-ui", "varga-display", "kundali/", "dainikKranti/", "shanti/",
  ],
  vastu: ["vastu", "vastu-guna", "vastu-house-template", "vastu-plan", "vastu-plot-input", "vastu-purusha-wheel", "vastu-ring"],
  geography: ["compass-heading", "panchanga-location", "cities/"],
  learn: ["document-categories", "sukta-attribution", "sukta-attribution-ne.json", "veda-cite", "word-tracking", "history/"],
  identity: ["birth-date", "legal-copy"],
};
// learn/ already is the Learn context's folder; locale and vocabulary stay at the root (shared kernel).

const PKGS = ["domain", "read-models"];
const MAP = new Map(); // old path (no ext, or folder/) -> new
for (const [ctx, mods] of Object.entries(CONTEXTS)) for (const m of mods) MAP.set(m.replace(/\.json$/, ".json"), `${ctx}/${m}`);
const oldToNew = (p) => {
  if (MAP.has(p)) return MAP.get(p);
  for (const [o, n] of MAP) if (o.endsWith("/") && p.startsWith(o)) return n + p.slice(o.length);
  return null;
};

const listFiles = (dir, pred, out = []) => {
  for (const n of readdirSync(dir)) {
    if (["node_modules", "dist", "dist-web", ".expo", ".turbo"].includes(n)) continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? listFiles(p, pred, out) : pred(p) && out.push(p);
  }
  return out;
};
const SRC_EXT = /\.(ts|tsx|mts|mjs|js|cjs)$/;

function move() {
  for (const pkg of PKGS) {
    const src = join(REPO, "packages", pkg, "src");
    const before = new Map(); // new abs path (no ext) -> old abs path (no ext), to rebase relative imports
    for (const [o, n] of MAP) {
      const from = join(src, o.endsWith("/") ? o.slice(0, -1) : o + (o.endsWith(".json") ? "" : ".ts"));
      if (!existsSync(from)) continue;
      const to = join(src, n.endsWith("/") ? n.slice(0, -1) : n + (n.endsWith(".json") ? "" : ".ts"));
      mkdirSync(dirname(to), { recursive: true });
      execFileSync("git", ["mv", from, to], { cwd: REPO });
      if (o.endsWith("/")) {
        for (const f of listFiles(to, (p) => /\.(ts|json)$/.test(p))) before.set(f, join(from, relative(to, f)));
      } else before.set(to, from);
    }
    // rebase relative imports of every file in the package: resolve against the file's
    // old location, map the target through MAP, re-relativise from the new location
    const oldLoc = (f) => before.get(f) ?? f;
    const newLocOfOld = (absOldNoExt) => {
      const rel = relative(src, absOldNoExt).split("\\").join("/");
      const mapped = oldToNew(rel);
      return mapped ? join(src, mapped) : absOldNoExt;
    };
    for (const f of listFiles(src, (p) => /\.ts$/.test(p))) {
      const text = readFileSync(f, "utf8");
      const out = text.replace(/(from\s+|import\s*\(\s*|import\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (all, kw, q, spec) => {
        const target = resolve(dirname(oldLoc(f)), spec);
        const moved = newLocOfOld(target);
        let r = relative(dirname(f), moved).split("\\").join("/");
        if (!r.startsWith(".")) r = "./" + r;
        return `${kw}${q}${r}${q}`;
      });
      if (out !== text) writeFileSync(f, out);
    }
    // tests next to the package import ../src/<path>
    const testDir = join(REPO, "packages", pkg, "test");
    if (existsSync(testDir)) for (const f of listFiles(testDir, (p) => SRC_EXT.test(p))) {
      const text = readFileSync(f, "utf8");
      const out = text.replace(/(["'])\.\.\/src\/([^"']+?)(\.ts)?\1/g, (all, q, p, ext) => {
        const n = oldToNew(p); return n ? `${q}../src/${n}${ext ?? ""}${q}` : all;
      });
      if (out !== text) writeFileSync(f, out);
    }
  }
}

function rewriteSpecifiers() {
  // Quoted or backticked (comments cite modules in `code`); the path stops at any quote or space.
  const re = new RegExp("([\"'`])@vedic-patro/(" + PKGS.join("|") + ")/([^\"'`\\s]+)\\1", "g");
  let files = 0, specs = 0;
  for (const base of ["apps", "packages", "scripts"]) {
    for (const f of listFiles(join(REPO, base), (p) => SRC_EXT.test(p) || p.endsWith(".css"))) {
      const text = readFileSync(f, "utf8");
      if (!text.includes("@vedic-patro/")) continue;
      let n = 0;
      const out = text.replace(re, (all, q, pkg, p) => {
        const mapped = oldToNew(p);
        if (!mapped || mapped === p) return all;
        n++; return `${q}@vedic-patro/${pkg}/${mapped}${q}`;
      });
      if (n) { writeFileSync(f, out); files++; specs += n; }
    }
  }
  console.log(`rewrote ${specs} specifiers in ${files} files`);
}

if (process.argv.includes("--move")) move();
rewriteSpecifiers();
