/**
 * Expands the single bilingual catalogue (src/strings.ts) into the per-language
 * bundles the website and the mobile app load.
 *
 * One authoring file means a string can never exist in one language and be
 * missing in the other, but i18next wants a separate resource tree per
 * language — and keeping them separate is what lets English stay out of the
 * first-paint bundle. So the split happens here instead of by hand.
 *
 * The app ships the full bundles (src/ne.json, src/en.json). The website loads
 * src/web/*.json: the same, minus `ui.*` copy that no website code reads, so
 * screens that exist only in the app do not weigh on the website's first paint.
 *
 *   npm run i18n          write the bundles
 *   npm run i18n -- --check   fail if they are stale or hand-edited
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

import { strings, type Translatable } from "../src/strings";

type Lang = "ne" | "en";
const LANGS: Lang[] = ["ne", "en"];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The full bundles (the app ships both in its binary). */
const fullTarget = (lang: Lang): string => resolve(root, `src/${lang}.json`);
/** The website's bundles: the same minus `ui.*` copy no website code reads (keeps first paint small). */
const webTarget = (lang: Lang): string => resolve(root, `src/web/${lang}.json`);

/**
 * `ui.*` keys hold copy moved out of a screen; each is read as a literal
 * `t("ui.…")`, so a scan of the website's source (and the shared packages it
 * bundles) says exactly which ones it needs. Every other key ships to both.
 */
const WEB_SOURCES = ["apps/web/src", "packages/features/src", "packages/ui/src", "packages/domain/src", "packages/api-client/src"];
function uiKeysTheWebsiteReads(): Set<string> {
  const used = new Set<string>();
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const path = resolve(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) for (const m of readFileSync(path, "utf8").matchAll(/["'`](ui\.[\w.]+)["'`]/g)) used.add(m[1]!);
    }
  };
  for (const dir of WEB_SOURCES) walk(resolve(root, "../..", dir));
  return used;
}

type Tree = { [key: string]: Tree | string | string[] | object[] };

/**
 * Turn dotted keys into the nested tree i18next resolves against.
 *
 * A key that is also a prefix of another ("a.b" alongside "a.b.c") cannot be
 * represented, and silently dropping one would lose copy — so it is an error.
 */
function expand(lang: Lang, keep: (key: string) => boolean = () => true): Tree {
  const tree: Tree = {};
  for (const [key, value] of Object.entries(strings as Record<string, Translatable>)) {
    if (!keep(key)) continue;
    const segments = key.split(".");
    const leaf = segments.pop()!;
    let node = tree;
    for (const segment of segments) {
      const next = node[segment];
      if (next === undefined) {
        node[segment] = {};
      } else if (typeof next !== "object" || Array.isArray(next)) {
        throw new Error(
          `Key "${key}" collides with "${segments.join(".")}", which is already a value. ` +
            `Rename one of them — a key cannot be both a string and a group.`,
        );
      }
      node = node[segment] as Tree;
    }
    if (leaf in node) {
      throw new Error(`Key "${key}" is defined more than once.`);
    }
    node[leaf] = value[lang];
  }
  return tree;
}

/**
 * Structural problems only.
 *
 * An empty string is a deliberate choice in places — `seo.routes.account.keywords`
 * has no keywords on purpose, and `dainik.text` is the Nepali-only " गते" suffix —
 * so emptiness is reported by `--report`, not treated as a failure here.
 */
function validate(): void {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(strings as Record<string, Translatable>)) {
    const { ne, en } = value;
    if (ne === undefined || en === undefined) {
      problems.push(`${key}: needs both "ne" and "en".`);
      continue;
    }
    if (Array.isArray(ne) !== Array.isArray(en)) {
      problems.push(`${key}: "ne" and "en" must be the same shape.`);
      continue;
    }
    if (Array.isArray(ne) && Array.isArray(en) && ne.length !== en.length) {
      problems.push(`${key}: "ne" has ${ne.length} items, "en" has ${en.length}.`);
    }
  }
  if (problems.length) {
    throw new Error(`packages/i18n/src/strings.ts has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  }
}

const DEVANAGARI = /[\u0900-\u097F]/;

/** Strings that would show Nepali to an English reader, or are one-sided. */
function report(): void {
  const untranslated: string[] = [];
  const oneSidedEmpty: string[] = [];

  const scan = (key: string, ne: unknown, en: unknown): void => {
    if (typeof ne === "string" && typeof en === "string") {
      const neSet = ne.trim().length > 0;
      const enSet = en.trim().length > 0;
      if (neSet !== enSet) oneSidedEmpty.push(`${key}  (${neSet ? "en" : "ne"} is empty)`);
      else if (neSet && DEVANAGARI.test(en)) untranslated.push(`${key}  ${JSON.stringify(en)}`);
      return;
    }
    if (Array.isArray(ne) && Array.isArray(en)) {
      ne.forEach((item, i) => {
        const other = en[i];
        if (typeof item === "string") scan(`${key}[${i}]`, item, other);
        else if (item && typeof item === "object" && other && typeof other === "object") {
          for (const field of Object.keys(item)) {
            scan(`${key}[${i}].${field}`, (item as never)[field], (other as never)[field]);
          }
        }
      });
    }
  };

  for (const [key, value] of Object.entries(strings as Record<string, Translatable>)) {
    scan(key, value.ne, value.en);
  }

  console.log(`\nEnglish values still containing Devanagari: ${untranslated.length}`);
  for (const line of untranslated) console.log(`  ${line}`);
  console.log(`\nPresent in one language only: ${oneSidedEmpty.length}`);
  for (const line of oneSidedEmpty) console.log(`  ${line}`);
  console.log("");
}

const check = process.argv.includes("--check");

validate();

if (process.argv.includes("--report")) {
  report();
}

let stale = 0;
const webUi = uiKeysTheWebsiteReads();
const forWebsite = (key: string): boolean => !key.startsWith("ui.") || webUi.has(key);
for (const lang of LANGS) {
  for (const [path, tree] of [
    [fullTarget(lang), expand(lang)],
    [webTarget(lang), expand(lang, forWebsite)],
  ] as const) {
    const contents = `${JSON.stringify(tree, null, 2)}\n`;
    const shown = relative(process.cwd(), path);
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === contents) continue;
    if (check) {
      console.error(`stale: ${shown}`);
      stale++;
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents, "utf8");
    console.log(`wrote ${shown}`);
  }
}

if (check && stale) {
  console.error(
    `\n${stale} bundle(s) out of date. Run \`npm run i18n\` and commit the result. ` +
      `Never edit ne.json/en.json directly — they are generated from packages/i18n/src/strings.ts.`,
  );
  process.exit(1);
}

const count = Object.keys(strings).length;
console.log(check ? `i18n bundles up to date (${count} keys).` : `${count} keys in both languages.`);
