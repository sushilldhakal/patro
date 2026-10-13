/**
 * One-off codemod: replace hand-typed hex colours in both apps with named
 * design tokens.
 *
 *   node --import tsx scripts/monorepo-tools/palette.mts --plan    cluster colours, write packages/design-tokens/src/illustration.ts
 *   node --import tsx scripts/monorepo-tools/palette.mts --apply   rewrite the source files to use the tokens
 *   node --import tsx scripts/monorepo-tools/palette.mts --report  print the clusters (no writes)
 *
 * Colours within RGB distance THRESHOLD of an existing token (brand, midnight,
 * neutral, wheel) snap to that token; the rest are grouped, and each group is
 * named <hue family><lightness %> after its most-used member.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { brand, midnight, neutral, wheel } from "../../packages/design-tokens/src/color.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const THRESHOLD = 14;
const OUT = join(root, "packages/design-tokens/src/illustration.ts");
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets", "generated"]);
const EXEMPT = new Set(["apps/mobile/lib/theme.ts", "apps/mobile/lib/nativewind-theme-vars.ts"]);
const ROOTS = ["apps/web/src", "apps/mobile/app", "apps/mobile/components", "apps/mobile/lib"];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const files = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => !EXEMPT.has(relative(root, f)));

const HEX = /#[0-9a-fA-F]{6}(?![0-9a-fA-F\w])|#[0-9a-fA-F]{3}(?![0-9a-fA-F\w-])/g;
const norm = (h: string) => {
  h = h.toLowerCase();
  return h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h;
};
const rgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const dist = (a: string, b: string) => {
  const x = rgb(a), y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

// ── Existing tokens: hex → "ns.key" ──────────────────────────────────────────
const existing = new Map<string, string>();
for (const [ns, obj] of Object.entries({ brand, midnight, neutral, wheel }))
  for (const [k, v] of Object.entries(obj)) if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) && !existing.has(v.toLowerCase())) existing.set(v.toLowerCase(), `${ns}.${k}`);

// ── Count every hex in the sources ───────────────────────────────────────────
const freq = new Map<string, number>();
for (const f of files) for (const m of readFileSync(f, "utf8").match(HEX) ?? []) freq.set(norm(m), (freq.get(norm(m)) ?? 0) + 1);

// ── Cluster ──────────────────────────────────────────────────────────────────
function hsl([r, g, b]: [number, number, number]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function family(hex: string) {
  const { h, s, l } = hsl(rgb(hex));
  if (l > 0.97) return "white";
  if (l < 0.03) return "black";
  if (s < 0.1) return "gray";
  if (h < 15 || h >= 345) return "red";
  if (h < 40) return "orange";
  if (h < 65) return "amber";
  if (h < 95) return "lime";
  if (h < 160) return "green";
  if (h < 200) return "teal";
  if (h < 225) return "sky";
  if (h < 255) return "blue";
  if (h < 290) return "violet";
  return "pink";
}

const centroids: string[] = [...existing.keys()];
const target = new Map<string, string>(); // member hex → centroid hex
for (const [hex] of [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  const c = centroids.find((c) => dist(c, hex) <= THRESHOLD);
  if (c) target.set(hex, c);
  else {
    centroids.push(hex);
    target.set(hex, hex);
  }
}

// Names for the new centroids.
const names = new Map<string, string>();
const taken = new Set<string>();
for (const c of centroids) {
  if (existing.has(c)) continue;
  const base = `${family(c)}${Math.round(hsl(rgb(c)).l * 100)}`;
  let name = base;
  for (let i = 0; taken.has(name); i++) name = base + String.fromCharCode(98 + i);
  taken.add(name);
  names.set(c, name);
}
/** TS expression for a hex. */
const expr = (hex: string) => {
  const c = target.get(norm(hex))!;
  return existing.get(c) ?? `illustration.${names.get(c)}`;
};
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
/** Tailwind colour name (without the bg-/text- prefix) for a hex. */
const className = (hex: string) => {
  const c = target.get(norm(hex))!;
  const e = existing.get(c);
  return "ill-" + (e ? kebab(e.replace(".", "-")) : names.get(c)!);
};

const mode = process.argv[2];
if (mode === "--report" || mode === "--plan") {
  const members = new Map<string, string[]>();
  for (const [hex, c] of target) (members.get(c) ?? members.set(c, []).get(c)!).push(hex);
  const rows = centroids.map((c) => `${existing.get(c) ?? names.get(c)}\t${c}\t${(members.get(c) ?? []).length} members\t${(members.get(c) ?? []).reduce((n, h) => n + freq.get(h)!, 0)} uses`);
  console.log(`${freq.size} distinct colours → ${centroids.length - existing.size} new tokens + ${[...existing.keys()].filter((k) => members.has(k)).length} existing tokens reused`);
  console.log(rows.join("\n"));
}
if (mode === "--plan") {
  const entries = [...names].map(([hex, name]) => ({ name, hex }));
  entries.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  const out = `/**
 * Illustration palette: the colours used by diagrams, wheels, the sky scene and
 * other artwork, shared by the website and the app. Generated once by
 * scripts/monorepo-tools/palette.mts from the colours both apps had typed in
 * by hand (near-identical ones merged); edit freely afterwards, then run
 * \`npm run tokens\`.
 *
 * Names are <hue family><lightness %>. Colours that match a brand, midnight,
 * neutral or wheel token are not repeated here.
 */
export const illustration = {
${entries.map((e) => `  ${e.name}: "${e.hex}",`).join("\n")}
} as const;

export type IllustrationColor = keyof typeof illustration;
`;
  writeFileSync(OUT, out);
  console.log(`\nwrote ${relative(root, OUT)} (${entries.length} colours)`);
}

// ── Apply ────────────────────────────────────────────────────────────────────
if (mode === "--apply") {
  let changedFiles = 0, replaced = 0;
  const left: string[] = [];
  for (const f of files) {
    let src = readFileSync(f, "utf8");
    const orig = src;
    const used = new Set<string>();
    const useExpr = (hex: string) => {
      const e = expr(hex);
      used.add(e.split(".")[0]);
      replaced++;
      return e;
    };
    // 1. Tailwind arbitrary colours: bg-[#hex] / bg-[#hex]/40 → bg-ill-name
    src = src.replace(/([a-z][a-z0-9-]*)-\[(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\]/g, (_m, prefix, hex) => {
      replaced++;
      return `${prefix}-${className(hex)}`;
    });
    // 2. Whole string literals. JSX attribute: attr="#x" → attr={expr}
    src = src.replace(/=(["'])(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\1/g, (_m, _q, hex) => `={${useExpr(hex)}}`);
    //    plain literal: "#x" / '#x' / `#x`, not an object key
    src = src.replace(/(["'`])(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\1(?!\s*:)/g, (_m, _q, hex) => useExpr(hex));
    // 3. Hex inside a longer one-line string → template literal
    src = src.replace(/(["'])((?:(?!\1)[^\\\n`$])*?(?:#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})(?![0-9a-fA-F\w-])(?:(?!\1)[^\\\n`$])*)\1/g, (_m, _q, body: string) =>
      "`" + body.replace(HEX, (h) => `\${${useExpr(h)}}`) + "`");
    //    already a template literal
    src = src.replace(/`([^`\n]*#[0-9a-fA-F]{3,6}[^`\n]*)`/g, (_m, body: string) =>
      "`" + body.replace(HEX, (h) => `\${${useExpr(h)}}`) + "`");
    if (src === orig) {
      if (HEX.test(src)) left.push(relative(root, f));
      continue;
    }
    // Import what the file now uses.
    if (used.size) {
      const names = [...used].sort();
      const re = /import\s*\{([^}]*)\}\s*from\s*["']@vedic-patro\/design-tokens["'];?/;
      const m = src.match(re);
      if (m) {
        const have = new Set(m[1].split(",").map((s) => s.trim()).filter(Boolean));
        for (const n of names) have.add(n);
        src = src.replace(re, `import { ${[...have].sort().join(", ")} } from "@vedic-patro/design-tokens";`);
      } else {
        const line = `import { ${names.join(", ")} } from "@vedic-patro/design-tokens";\n`;
        const imports = [...src.matchAll(/^import[\s\S]*?;\s*$/gm)];
        const last = imports.at(-1);
        if (last) {
          const at = last.index! + last[0].length;
          src = src.slice(0, at) + "\n" + line.trimEnd() + src.slice(at);
        } else src = line + src;
      }
    }
    writeFileSync(f, src);
    changedFiles++;
    HEX.lastIndex = 0;
    if ((src.match(HEX) ?? []).length) left.push(relative(root, f));
  }
  console.log(`rewrote ${changedFiles} files, ${replaced} colours replaced`);
  if (left.length) console.log(`still contain a hex literal:\n${left.join("\n")}`);
}

// ── Lookup: --lookup #hex ... prints the token each colour maps to ───────────
if (mode === "--lookup") {
  for (const h of process.argv.slice(3)) console.log(h, "→", target.has(norm(h)) ? expr(h) : "(not in the source colours)");
}
