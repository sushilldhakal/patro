/**
 * One-off codemod: "rgba(r, g, b, a)" string literals → withAlpha(<token>, a).
 *
 *   node --import tsx scripts/monorepo-tools/rgba.mts          rewrite the sources
 *   node --import tsx scripts/monorepo-tools/rgba.mts --dry    print what would change
 *
 * The base colour snaps to an existing token within SNAP RGB distance, else a
 * new colour is added to packages/design-tokens/src/illustration.ts.
 * Only whole-string literals are rewritten ("rgba(...)" or 'rgba(...)');
 * rgba() inside gradients, shadows or class strings is left for hand edits.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { brand, midnight, neutral, wheel } from "../../packages/design-tokens/src/color.ts";
import { illustration } from "../../packages/design-tokens/src/illustration.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SNAP = 6;
const dry = process.argv.includes("--dry");
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-web", "android", "ios", ".expo", "public", "assets", "generated"]);
const EXEMPT = new Set(["apps/mobile/lib/theme.ts", "apps/mobile/lib/nativewind-theme-vars.ts"]);

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
const files = ["apps/web/src", "apps/mobile/app", "apps/mobile/components", "apps/mobile/lib"]
  .flatMap((r) => walk(join(root, r)))
  .filter((f) => !EXEMPT.has(relative(root, f)));

const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
const rgbOf = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a: string, b: string) => {
  const x = rgbOf(a), y = rgbOf(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

const tokens = new Map<string, string>(); // hex → expression
for (const [ns, obj] of Object.entries({ brand, midnight, neutral, wheel }))
  for (const [k, v] of Object.entries(obj)) if (/^#[0-9a-f]{6}$/i.test(v as string) && !tokens.has((v as string).toLowerCase())) tokens.set((v as string).toLowerCase(), `${ns}.${k}`);
for (const [k, v] of Object.entries(illustration)) if (!tokens.has(v)) tokens.set(v, `illustration.${k}`);

function hsl([r, g, b]: number[]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function family(hex: string) {
  const { h, s, l } = hsl(rgbOf(hex));
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

const added = new Map<string, string>(); // name → hex
function exprFor(hex: string): string {
  const exact = tokens.get(hex);
  if (exact) return exact;
  let best: string | undefined;
  for (const h of tokens.keys()) if (dist(h, hex) <= SNAP && (!best || dist(h, hex) < dist(best, hex))) best = h;
  if (best) return tokens.get(best)!;
  const base = `${family(hex)}${Math.round(hsl(rgbOf(hex)).l * 100)}`;
  let name = base;
  for (let i = 0; Object.hasOwn(illustration, name) || (added.has(name) && added.get(name) !== hex); i++) name = base + String.fromCharCode(98 + i);
  added.set(name, hex);
  tokens.set(hex, `illustration.${name}`);
  return `illustration.${name}`;
}

const RGBA = /(["'])rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)\1/g;
let changed = 0, count = 0;
for (const f of files) {
  let src = readFileSync(f, "utf8");
  const used = new Set<string>();
  const next = src.replace(RGBA, (_m, _q, r, g, b, a) => {
    const e = exprFor(toHex(+r, +g, +b));
    used.add(e.split(".")[0]);
    used.add("withAlpha");
    count++;
    return `withAlpha(${e}, ${a ?? 1})`;
  });
  if (next === src) continue;
  src = next;
  const re = /import\s*\{([^}]*)\}\s*from\s*["']@vedic-patro\/design-tokens["'];?/;
  const m = src.match(re);
  if (m) {
    const have = new Set(m[1].split(",").map((s) => s.trim()).filter(Boolean));
    for (const n of used) have.add(n);
    src = src.replace(re, `import { ${[...have].sort().join(", ")} } from "@vedic-patro/design-tokens";`);
  } else {
    const line = `import { ${[...used].sort().join(", ")} } from "@vedic-patro/design-tokens";`;
    const last = [...src.matchAll(/^import[\s\S]*?;\s*$/gm)].at(-1);
    src = last ? src.slice(0, last.index! + last[0].length) + "\n" + line + src.slice(last.index! + last[0].length) : line + "\n" + src;
  }
  changed++;
  if (!dry) writeFileSync(f, src);
}
console.log(`${dry ? "would rewrite" : "rewrote"} ${changed} files, ${count} rgba() literals`);

if (added.size && !dry) {
  const p = join(root, "packages/design-tokens/src/illustration.ts");
  const text = readFileSync(p, "utf8");
  const entries = [...text.matchAll(/^ {2}(\w+): "(#[0-9a-f]{6})",$/gm)].map((m) => [m[1], m[2]] as [string, string]);
  for (const [n, h] of added) entries.push([n, h]);
  const key = (e: [string, string]) => {
    const m = e[0].match(/^([a-z]+)(\d+)([a-z]*)$/)!;
    return [m[1], +m[2], m[3]] as const;
  };
  entries.sort((a, b) => {
    const x = key(a), y = key(b);
    return x[0].localeCompare(y[0]) || x[1] - y[1] || x[2].localeCompare(y[2]);
  });
  const head = text.slice(0, text.indexOf("export const illustration = {"));
  writeFileSync(
    p,
    head + "export const illustration = {\n" + entries.map(([n, h]) => `  ${n}: "${h}",`).join("\n") + "\n} as const;\n\nexport type IllustrationColor = keyof typeof illustration;\n",
  );
}
if (added.size) console.log(`new palette colours: ${[...added].map(([n, h]) => `${n} ${h}`).join(", ")}`);
