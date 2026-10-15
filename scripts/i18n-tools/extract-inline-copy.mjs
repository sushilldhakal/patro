#!/usr/bin/env node
/**
 * Moves inline bilingual copy out of the apps and into the shared catalogue
 * (packages/i18n/src/strings.ts).
 *
 *   node scripts/i18n-tools/extract-inline-copy.mjs            dry run: print what would move
 *   node scripts/i18n-tools/extract-inline-copy.mjs --write    rewrite the files and the catalogue
 *
 * What it converts (Nepali text first, English second, same `${values}` in both):
 *  - `pick("नेपाली", "English")` where `pick` is the one from `useLocale()`
 *    (resolved with the type checker) → `t("key")`, adding `t` to the same
 *    destructuring when it is not there yet;
 *  - `bilingualText(lang, "ने", "en")`, `pickLocale(lang, …)`, a language
 *    ternary (`lang === "en" ? "en" : "ने"`), and calls to a local two-argument
 *    helper built from one of those → `tFor(lang, "key")`, which reads the
 *    catalogue in exactly the language the old code picked.
 *
 * Keys: a pair already in the catalogue keeps its existing key. A new pair is
 * `ui.<area>.<slug>`, where the area is the page or component folder; a pair
 * used in more than one area (or in both apps) gets one `ui.common.<slug>` key.
 *
 * Anything else (ternaries, `{ ne, en }` data tables, plain Devanagari
 * literals) is reported by `npm run check:copy` and moved by hand.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(import.meta.url)(join(root, "apps/mobile/node_modules/typescript"));
const WRITE = process.argv.includes("--write");
const CATALOGUE = join(root, "packages/i18n/src/strings.ts");

// ─── Existing catalogue ──────────────────────────────────────────────────────

const ne = JSON.parse(readFileSync(join(root, "packages/i18n/src/ne.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "packages/i18n/src/en.json"), "utf8"));
const existingKeys = new Set();
const keyForPair = new Map();
(function flatten(nodeNe, nodeEn, prefix) {
  for (const [k, v] of Object.entries(nodeNe)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      existingKeys.add(key);
      const e = nodeEn?.[k];
      if (typeof e === "string" && !keyForPair.has(`${v}\u0000${e}`)) keyForPair.set(`${v}\u0000${e}`, key);
    } else if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, nodeEn?.[k], key);
    else existingKeys.add(key);
  }
})(ne, en, "");

// ─── Areas ───────────────────────────────────────────────────────────────────

const snake = (s) =>
  s
    .replace(/\.(web|native)$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

/** `apps/mobile/components/kundali/X.tsx` → kundali; `apps/web/src/pages/Holidays.tsx` → holidays. */
function areaOf(file) {
  const parts = relative(root, file).split(sep);
  const stem = parts.at(-1).replace(/\.(tsx?|jsx?)$/, "");
  const inner = parts[1] === "web" ? parts.slice(3) : parts.slice(2); // drop apps/<app>[/src]
  const dirs = inner.slice(0, -1).filter((d) => !/^\(.*\)$/.test(d) && !/^\[.*\]$/.test(d));
  // pages/X, app/X → the page; components/<dir>/X or lib/<dir>/X → the folder.
  if (dirs[0] === "pages" || dirs[0] === "app") return snake(dirs[1] ?? (stem === "index" || stem === "_layout" ? "home" : stem));
  if (dirs.length >= 2) return snake(dirs[1]);
  return snake(stem);
}

// ─── Scan ────────────────────────────────────────────────────────────────────

const PROJECTS = [
  { app: "mobile", tsconfig: "apps/mobile/tsconfig.json", dirs: ["apps/mobile/app", "apps/mobile/components", "apps/mobile/lib"] },
  { app: "web", tsconfig: "apps/web/tsconfig.app.json", dirs: ["apps/web/src"] },
];

const isText = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
const isPickCall = (n) =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "pick" && n.arguments.length === 2;

/** The `const { … } = useLocale()` pattern a binding comes from, or null. */
function useLocalePattern(decl) {
  if (!decl || !ts.isBindingElement(decl)) return null;
  const pattern = decl.parent;
  const v = pattern.parent;
  if (!ts.isObjectBindingPattern(pattern) || !ts.isVariableDeclaration(v) || !v.initializer) return null;
  const init = v.initializer;
  if (!ts.isCallExpression(init) || !ts.isIdentifier(init.expression)) return null;
  return ["useLocale", "useTranslation"].includes(init.expression.text) ? pattern : null;
}

/** Template → `{{name}}` text plus the values, or null when it cannot be expressed. */
function templateParts(node, sf) {
  if (isText(node)) return { text: node.text, values: [] };
  if (!ts.isTemplateExpression(node)) return null;
  let text = node.head.text;
  const values = [];
  for (const span of node.templateSpans) {
    const expr = span.expression.getText(sf);
    values.push(expr);
    text += `\u0001${values.length - 1}\u0001` + span.literal.text;
  }
  return { text, values };
}

function placeholderName(expr, used) {
  const tail = expr.match(/([A-Za-z_$][\w$]*)\s*(?:\)|\])*\s*$/)?.[1] ?? "value";
  let name = /^[a-z_][\w]*$/i.test(tail) && !["t", "digits", "String", "toFixed", "join"].includes(tail) ? tail : "value";
  let candidate = name;
  for (let i = 2; used.has(candidate); i++) candidate = `${name}${i}`;
  used.add(candidate);
  return candidate;
}

const sites = []; // { file, start, end, ne, en, values, area, app, lang: null (useLocale t) | expression text (tFor) }
const patternEdits = new Map(); // file → Set(pos) where `t, ` must be added
const skipped = { otherPick: 0, tShadowed: 0, mismatched: 0, scope: 0 };
const DEV = /[ऀ-ॿ]/;
const LATIN = /[A-Za-z]/;

/** A Nepali/English pair of text nodes as catalogue text, or null when it is not copy. */
function pairFrom(neNode, enNode, sf) {
  const pa = templateParts(neNode, sf);
  const pb = templateParts(enNode, sf);
  if (!pa || !pb) return null; // data, not copy
  if (!DEV.test(pa.text) || DEV.test(pb.text)) return null; // Nepali first, English second
  if ((pa.text + pb.text).includes("{{")) return null;
  if ([...pa.values].sort().join("\u0002") !== [...pb.values].sort().join("\u0002")) {
    skipped.mismatched++;
    return null;
  }
  const used = new Set();
  const names = pa.values.map((expr) => placeholderName(expr, used));
  const nameOf = (expr, taken) => {
    const i = pa.values.findIndex((e, k) => e === expr && !taken.has(k));
    taken.add(i);
    return names[i];
  };
  const render = (p) => {
    const taken = new Set();
    return p.text.replace(/\u0001(\d+)\u0001/g, (_, i) => `{{${nameOf(p.values[Number(i)], taken)}}}`);
  };
  return { ne: render(pa), en: render(pb), values: names.map((name, i) => [name, pa.values[i]]) };
}

/** `lang === "en"` → { id: "lang", en: true }; `lang !== "ne"` likewise; `isEnglish` → { expr }. */
function languageTest(cond, sf) {
  let c = cond;
  while (ts.isParenthesizedExpression(c)) c = c.expression;
  if (ts.isBinaryExpression(c) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(c.operatorToken.kind)) {
    const [side, lit] = ts.isStringLiteral(c.right) ? [c.left, c.right] : ts.isStringLiteral(c.left) ? [c.right, c.left] : [];
    if (!lit || !["en", "ne"].includes(lit.text)) return null;
    const eq = c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken;
    return { trueIsEnglish: (lit.text === "en") === eq, langExpr: side.getText(sf) };
  }
  return { generic: true };
}

for (const project of PROJECTS) {
  const cfgPath = join(root, project.tsconfig);
  const cfg = ts.getParsedCommandLineOfConfigFile(cfgPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  const program = ts.createProgram({ rootNames: cfg.fileNames, options: { ...cfg.options, noEmit: true } });
  const checker = program.getTypeChecker();
  const inScope = (file) => project.dirs.some((d) => file.startsWith(join(root, d) + sep));

  /** Identifiers in `expr` mean the same thing at `site` (so the expression can move there). */
  const sameAtSite = (expr, site) => {
    let ok = true;
    const visitId = (n) => {
      if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
        const here = checker.getSymbolAtLocation(n);
        const there = checker.getSymbolsInScope(site, ts.SymbolFlags.Value | ts.SymbolFlags.Alias).find((s) => s.name === n.text);
        if (!here || here !== there) ok = false;
      }
      ts.forEachChild(n, visitId);
    };
    visitId(expr);
    return ok;
  };

  const push = (sf, node, pair, lang) =>
    sites.push({ file: sf.fileName, start: node.getStart(sf), end: node.getEnd(), ...pair, lang, area: areaOf(sf.fileName), app: project.app });

  for (const sf of program.getSourceFiles()) {
    if (!inScope(sf.fileName) || sf.fileName.includes("node_modules")) continue;
    if (/\btFor\b/.test(sf.text) && !/import \{[^}]*\btFor\b[^}]*\} from "@vedic-patro\/i18n\/runtime"/.test(sf.text)) continue;
    const visit = (n) => {
      if (isPickCall(n)) handlePick(n, sf);
      else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["bilingualText", "pickLocale"].includes(n.expression.text) && n.arguments.length === 3) {
        // bilingualText(lang, "ने", "en") / pickLocale(lang, …): the same pick, from the catalogue.
        const pair = pairFrom(n.arguments[1], n.arguments[2], sf);
        if (pair) push(sf, n, pair, n.arguments[0].getText(sf));
      } else if (ts.isConditionalExpression(n)) {
        handleTernary(n, sf);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  function handleTernary(n, sf) {
    const test = languageTest(n.condition, sf);
    if (!test) return;
    // Which branch is Nepali decides how the language is written.
    let pair = pairFrom(n.whenTrue, n.whenFalse, sf);
    let trueIsNepali = true;
    if (!pair) {
      pair = pairFrom(n.whenFalse, n.whenTrue, sf);
      trueIsNepali = false;
    }
    if (!pair) return;
    let lang;
    if (!test.generic && test.trueIsEnglish === !trueIsNepali) lang = test.langExpr;
    else {
      const cond = n.condition.getText(sf);
      lang = `(${cond}) ? "${trueIsNepali ? "ne" : "en"}" : "${trueIsNepali ? "en" : "ne"}"`;
    }
    push(sf, n, pair, lang);
  }

  function handlePick(call, sf) {
    const pair = pairFrom(call.arguments[0], call.arguments[1], sf);
    if (!pair) return;
    const sym = checker.getSymbolAtLocation(call.expression);
    const decl = sym?.declarations?.[0];
    const pattern = useLocalePattern(decl);
    if (!pattern) {
      // A local helper: `const pick = (ne, en) => bilingualText(lang, ne, en)` (or pickLocale, or a lang ternary).
      const lang = localPickLanguage(decl, call, sf);
      if (lang) push(sf, call, pair, lang);
      else skipped.otherPick++;
      return;
    }
    // `t` at the call site must be the useLocale/useTranslation one, or free to add.
    const tSym = checker.getSymbolsInScope(call, ts.SymbolFlags.Value).find((s) => s.name === "t");
    if (tSym && !useLocalePattern(tSym.declarations?.[0])) {
      skipped.tShadowed++;
      return;
    }
    push(sf, call, pair, null);
    if (!tSym) {
      const set = patternEdits.get(sf.fileName) ?? new Set();
      set.add(pattern.elements[0].getStart(sf));
      patternEdits.set(sf.fileName, set);
    }
  }

  /** The language expression a local two-argument pick helper uses, if it can be read off its body. */
  function localPickLanguage(decl, call, sf) {
    if (!decl) return null;
    let fn = null;
    if (ts.isVariableDeclaration(decl) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) fn = decl.initializer;
    else if (ts.isFunctionDeclaration(decl)) fn = decl;
    if (!fn || fn.parameters.length !== 2) return null;
    const [pNe, pEn] = fn.parameters.map((p) => p.name.getText(sf));
    let body = fn.body;
    if (ts.isBlock(body)) {
      if (body.statements.length !== 1 || !ts.isReturnStatement(body.statements[0])) return null;
      body = body.statements[0].expression;
    }
    while (body && ts.isParenthesizedExpression(body)) body = body.expression;
    if (!body) return null;
    let langNode = null;
    if (ts.isCallExpression(body) && ts.isIdentifier(body.expression) && ["bilingualText", "pickLocale"].includes(body.expression.text) && body.arguments.length === 3) {
      if (body.arguments[1].getText(sf) !== pNe || body.arguments[2].getText(sf) !== pEn) return null;
      langNode = body.arguments[0];
      if (!sameAtSite(langNode, call)) {
        skipped.scope++;
        return null;
      }
      return langNode.getText(sf);
    }
    if (ts.isConditionalExpression(body)) {
      const t = body.whenTrue.getText(sf);
      const f = body.whenFalse.getText(sf);
      const test = languageTest(body.condition, sf);
      if (!test || ![pNe, pEn].includes(t) || ![pNe, pEn].includes(f) || t === f) return null;
      if (!sameAtSite(body.condition, call)) {
        skipped.scope++;
        return null;
      }
      const trueIsEnglish = t === pEn;
      if (!test.generic && test.trueIsEnglish === trueIsEnglish) return test.langExpr;
      return `(${body.condition.getText(sf)}) ? "${trueIsEnglish ? "en" : "ne"}" : "${trueIsEnglish ? "ne" : "en"}"`;
    }
    return null;
  }
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const pairKey = (s) => `${s.ne}\u0000${s.en}`;
const areasOfPair = new Map();
for (const s of sites) (areasOfPair.get(pairKey(s)) ?? areasOfPair.set(pairKey(s), new Set()).get(pairKey(s))).add(`${s.area}`);

const slugOf = (enText) => {
  const words = enText
    .replace(/\{\{(\w+)\}\}/g, " $1 ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  const slug = words.join("_");
  return slug ? (/^\d/.test(slug) ? `n${slug}` : slug) : "text";
};

const taken = new Set(existingKeys);
const isFree = (key) => {
  if (taken.has(key)) return false;
  for (const k of taken) if (k.startsWith(`${key}.`) || key.startsWith(`${k}.`)) return false;
  return true;
};
const newEntries = new Map(); // key → { ne, en, area }
const assigned = new Map(); // pair → key
for (const s of sites) {
  const pk = pairKey(s);
  if (assigned.has(pk)) continue;
  const existing = keyForPair.get(pk);
  if (existing) {
    assigned.set(pk, existing);
    continue;
  }
  const area = areasOfPair.get(pk).size > 1 ? "common" : s.area;
  const base = `ui.${area}.${slugOf(s.en || s.ne)}`;
  let key = base;
  for (let i = 2; !isFree(key); i++) key = `${base}_${i}`;
  taken.add(key);
  assigned.set(pk, key);
  newEntries.set(key, { ne: s.ne, en: s.en, area });
}

// ─── Report / write ──────────────────────────────────────────────────────────

const reused = sites.filter((s) => !newEntries.has(assigned.get(pairKey(s)))).length;
const files = new Set(sites.map((s) => s.file));
console.log(
  `${sites.length} pick() calls in ${files.size} files → ${newEntries.size} new keys, ${reused} calls reuse an existing key` +
    ` (skipped: ${skipped.otherPick} other pick, ${skipped.tShadowed} \`t\` shadowed, ${skipped.mismatched} different values)`,
);
const byApp = {};
for (const s of sites) byApp[s.app] = (byApp[s.app] ?? 0) + 1;
console.log("calls per app:", byApp);
const shared = [...newEntries.values()].filter((e) => e.area === "common").length;
console.log(`keys shared across areas/apps: ${shared}`);

if (!WRITE) process.exit(0);

const lit = (s) => JSON.stringify(s);
const bySite = new Map();
for (const s of sites) (bySite.get(s.file) ?? bySite.set(s.file, []).get(s.file)).push(s);
for (const file of new Set([...bySite.keys(), ...patternEdits.keys()])) {
  let src = readFileSync(file, "utf8");
  const edits = [];
  for (const s of bySite.get(file) ?? []) {
    const key = assigned.get(pairKey(s));
    const vars = s.values.length
      ? `, { ${s.values.map(([name, expr]) => (name === expr ? name : `${name}: ${expr}`)).join(", ")} }`
      : "";
    edits.push([s.start, s.end, s.lang === null ? `t(${lit(key)}${vars})` : `tFor(${s.lang}, ${lit(key)}${vars})`]);
  }
  for (const pos of patternEdits.get(file) ?? []) edits.push([pos, pos, "t, "]);
  edits.sort((x, y) => y[0] - x[0]);
  for (const [start, end, text] of edits) src = src.slice(0, start) + text + src.slice(end);
  if ((bySite.get(file) ?? []).some((s) => s.lang !== null) && !/import \{[^}]*\btFor\b/.test(src)) {
    // After the last import statement.
    const imports = [...src.matchAll(/^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm)];
    const at = imports.length ? imports.at(-1).index + imports.at(-1)[0].length : 0;
    src = src.slice(0, at) + `\nimport { tFor } from "@vedic-patro/i18n/runtime";` + src.slice(at);
  }
  writeFileSync(file, src);
}

// New catalogue entries, grouped by area, before the closing `} satisfies`.
const byArea = new Map();
for (const [key, e] of newEntries) (byArea.get(e.area) ?? byArea.set(e.area, []).get(e.area)).push([key, e]);
let block = "";
for (const area of [...byArea.keys()].sort()) {
  block += `\n  /* ── ui.${area} ${"─".repeat(Math.max(4, 66 - area.length))} */\n`;
  for (const [key, e] of byArea.get(area).sort((x, y) => x[0].localeCompare(y[0]))) {
    const one = `  ${lit(key)}: { ne: ${lit(e.ne)}, en: ${lit(e.en)} },`;
    block += one.length <= 120 ? `${one}\n` : `  ${lit(key)}: {\n    ne: ${lit(e.ne)},\n    en: ${lit(e.en)},\n  },\n`;
  }
}
const cat = readFileSync(CATALOGUE, "utf8");
const marker = "} satisfies Record<string, Translatable>;";
if (!cat.includes(marker)) throw new Error("catalogue end marker not found");
writeFileSync(CATALOGUE, cat.replace(marker, `${block}${marker}`));
console.log(`wrote ${files.size} files and ${newEntries.size} catalogue entries`);
