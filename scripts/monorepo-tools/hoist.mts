/**
 * Move top-level helpers that are identical in a web file and its mobile twin
 * into packages/domain, with everything they depend on, and import them back.
 *
 *   npx tsx scripts/monorepo-tools/hoist.mts <web file> <mobile file> <domain module> name[,name...]
 *
 * Refuses (and changes nothing) unless every declaration in the closure is the
 * same text in both files (comments and whitespace aside), contains no JSX or
 * hooks, and every import it needs is portable (domain, three, clsx,
 * tailwind-merge, healpix-ts, or `import type` from the api-client).
 */
import { createRequire } from "node:module";
// TypeScript is installed per app (no root copy); borrow the website's.
const ts: typeof import("typescript") = createRequire(import.meta.url)("../../apps/web/node_modules/typescript");
import type tsTypes from "typescript";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const [webPath, mobilePath, moduleName, namesArg] = process.argv.slice(2);
if (!namesArg) {
  console.error("usage: hoist.mts <web file> <mobile file> <domain module> name[,name...]");
  process.exit(2);
}
const repo = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const domainSrc = resolve(repo, "packages/domain/src");
const target = resolve(domainSrc, `${moduleName}.ts`);

interface Decl {
  names: string[];
  node: tsTypes.Statement;
  text: string;
  exported: boolean;
}
interface ImportRef {
  spec: string;
  name: string; // local name
  imported: string; // name in the module ("default" for default import)
  isType: boolean;
}
interface Parsed {
  path: string;
  sf: tsTypes.SourceFile;
  text: string;
  decls: Map<string, Decl>;
  imports: Map<string, ImportRef>;
}

function parse(path: string): Parsed {
  const text = readFileSync(path, "utf8");
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const decls = new Map<string, Decl>();
  const imports = new Map<string, ImportRef>();
  for (const st of sf.statements) {
    const exported = !!ts.getModifiers(st as tsTypes.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const add = (names: string[]) => {
      const d: Decl = { names, node: st, text: st.getFullText(sf), exported };
      for (const n of names) decls.set(n, d);
    };
    if (ts.isFunctionDeclaration(st) && st.name) add([st.name.text]);
    else if (ts.isClassDeclaration(st) && st.name) add([st.name.text]);
    else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) add([st.name.text]);
    else if (ts.isVariableStatement(st)) {
      const names: string[] = [];
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
      add(names);
    } else if (ts.isImportDeclaration(st) && st.importClause) {
      const spec = (st.moduleSpecifier as tsTypes.StringLiteral).text;
      const clause = st.importClause;
      if (clause.name) imports.set(clause.name.text, { spec, name: clause.name.text, imported: "default", isType: clause.isTypeOnly });
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          imports.set(el.name.text, {
            spec,
            name: el.name.text,
            imported: (el.propertyName ?? el.name).text,
            isType: clause.isTypeOnly || el.isTypeOnly,
          });
        }
      } else if (nb && ts.isNamespaceImport(nb)) {
        imports.set(nb.name.text, { spec, name: nb.name.text, imported: "*", isType: clause.isTypeOnly });
      }
    }
  }
  return { path, sf, text, decls, imports };
}

const norm = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/** Identifiers a statement refers to (minus property names after a dot and object keys). */
function referenced(node: tsTypes.Node): Set<string> {
  const out = new Set<string>();
  const visit = (n: tsTypes.Node) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isPropName =
        (p && ts.isPropertyAccessExpression(p) && p.name === n) ||
        (p && ts.isPropertyAssignment(p) && p.name === n) ||
        (p && ts.isPropertySignature(p) && p.name === n) ||
        (p && ts.isPropertyDeclaration(p) && p.name === n) ||
        (p && ts.isMethodDeclaration(p) && p.name === n) ||
        (p && ts.isQualifiedName(p) && p.right === n);
      if (!isPropName) out.add(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

function hasJsxOrHooks(node: tsTypes.Node, sf: tsTypes.SourceFile): boolean {
  let bad = false;
  const visit = (n: tsTypes.Node) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) bad = true;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^use[A-Z]/.test(n.expression.text)) bad = true;
    if (!bad) ts.forEachChild(n, visit);
  };
  visit(node);
  return bad;
}

const PORTABLE = (spec: string, isType: boolean) =>
  spec.startsWith("@vedic-patro/domain/") ||
  spec === "three" ||
  spec.startsWith("three/") ||
  spec === "clsx" ||
  spec === "tailwind-merge" ||
  spec === "healpix-ts" ||
  (isType && spec === "@vedic-patro/api-client");

const API_TYPES = new Set(
  [...readFileSync(resolve(repo, "packages/api-client/src/types.ts"), "utf8").matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]),
);

const web = parse(resolve(webPath));
const mobile = parse(resolve(mobilePath));

const wanted = namesArg.split(",").map((s) => s.trim()).filter(Boolean);
const closure: Decl[] = [];
const seenDecl = new Set<Decl>();
const needImports = new Map<string, ImportRef>();
const problems: string[] = [];
const queue = [...wanted];
const visited = new Set<string>();

while (queue.length) {
  const name = queue.shift()!;
  if (visited.has(name)) continue;
  visited.add(name);
  const wd = web.decls.get(name);
  const md = mobile.decls.get(name);
  if (wd) {
    if (!md) {
      problems.push(`${name}: declared in web only`);
      continue;
    }
    if (norm(wd.text) !== norm(md.text)) {
      problems.push(`${name}: differs between web and mobile`);
      continue;
    }
    if (hasJsxOrHooks(wd.node, web.sf)) {
      problems.push(`${name}: uses JSX or hooks`);
      continue;
    }
    if (!seenDecl.has(wd)) {
      seenDecl.add(wd);
      closure.push(wd);
      for (const ref of referenced(wd.node)) if (!wd.names.includes(ref)) queue.push(ref);
    }
    continue;
  }
  let wi = web.imports.get(name);
  let mi = mobile.imports.get(name);
  // Both apps' `@/lib/api` re-export the api-client's response types.
  const asApiType = (r?: ImportRef) =>
    r && r.spec === "@/lib/api" && API_TYPES.has(r.imported) ? { ...r, spec: "@vedic-patro/api-client", isType: true } : r;
  wi = asApiType(wi);
  mi = asApiType(mi);
  if (wi) {
    if (!mi || mi.spec !== wi.spec || mi.imported !== wi.imported) {
      problems.push(`${name}: imported differently (${wi.spec} vs ${mi?.spec ?? "—"})`);
      continue;
    }
    if (!PORTABLE(wi.spec, wi.isType && mi.isType)) {
      problems.push(`${name}: import from ${wi.spec} is not portable`);
      continue;
    }
    needImports.set(name, { ...wi, isType: wi.isType && mi.isType });
    continue;
  }
  if (wanted.includes(name)) problems.push(`${name}: not a top-level declaration in ${webPath}`);
  // Otherwise a global (Math, Number, …) or a local name — nothing to carry.
}

if (problems.length) {
  console.error(`hoist refused (${moduleName}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

// ── Write the domain module ────────────────────────────────────────────────
const order = [...closure].sort((a, b) => a.node.pos - b.node.pos);
const bySpec = new Map<string, ImportRef[]>();
for (const ref of needImports.values()) {
  const spec = ref.spec.startsWith("@vedic-patro/domain/")
    ? (() => {
        const rel = relative(dirname(target), resolve(domainSrc, ref.spec.slice("@vedic-patro/domain/".length)));
        return rel.startsWith(".") ? rel : `./${rel}`;
      })()
    : ref.spec;
  if (!bySpec.has(spec)) bySpec.set(spec, []);
  bySpec.get(spec)!.push(ref);
}
const importLines: string[] = [];
for (const [spec, refs] of bySpec) {
  const ns = refs.find((r) => r.imported === "*");
  if (ns) {
    importLines.push(`import ${ns.isType ? "type " : ""}* as ${ns.name} from "${spec}";`);
    continue;
  }
  const def = refs.find((r) => r.imported === "default");
  const namedRefs = refs.filter((r) => r.imported !== "default");
  const allTypes = !def && namedRefs.every((r) => r.isType);
  const named = namedRefs.map(
    (r) => `${r.isType && !allTypes ? "type " : ""}${r.imported === r.name ? r.name : `${r.imported} as ${r.name}`}`,
  );
  const parts = [def ? def.name : "", named.length ? `{ ${named.join(", ")} }` : ""].filter(Boolean).join(", ");
  importLines.push(`import ${allTypes ? "type " : ""}${parts} from "${spec}";`);
}

const exportText = (d: Decl) => {
  const t = d.text.replace(/^\s*\n/, "");
  if (d.exported) return t;
  // Put `export` in front of the declaration keyword, after any leading comment.
  const start = d.node.getStart(web.sf) - d.node.getFullStart();
  const lead = d.text.slice(0, start).replace(/^\s*\n/, "");
  return `${lead}export ${d.text.slice(start)}`;
};

const header = existsSync(target) ? readFileSync(target, "utf8").replace(/\s*$/, "\n\n") : "";
const body = order.map(exportText).join("\n\n");
let moduleText: string;
if (header) {
  // Append to an existing module: merge new import lines that are not there yet.
  const missing = importLines.filter((l) => !header.includes(l));
  moduleText = `${missing.length ? `${missing.join("\n")}\n` : ""}${header}${body}\n`;
} else {
  const relWeb = relative(repo, web.path);
  const relMobile = relative(repo, mobile.path);
  moduleText = `/** Shared by ${relWeb} and ${relMobile} (moved here from both, unchanged). */\n${importLines.join("\n")}${importLines.length ? "\n\n" : ""}${body}\n`;
}
writeFileSync(target, moduleText);

// ── Rewrite both app files ────────────────────────────────────────────────
const moved = order.flatMap((d) => d.names);
function rewrite(p: Parsed) {
  let text = p.text;
  const nodes = order.map((d) => p.decls.get(d.names[0])!).sort((a, b) => b.node.pos - a.node.pos);
  for (const d of nodes) text = text.slice(0, d.node.getFullStart()) + text.slice(d.node.getEnd());
  // Names still used in the remaining file, or exported for other modules.
  const still = moved.filter((n) => new RegExp(`\\b${n}\\b`).test(text));
  const reexport = order.filter((d) => p.decls.get(d.names[0])!.exported).flatMap((d) => d.names);
  const lines: string[] = [];
  const isTypeName = (n: string) => {
    const node = p.decls.get(n)!.node;
    return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
  };
  const spell = (names: string[]) => names.map((n) => (isTypeName(n) ? `type ${n}` : n)).join(", ");
  const importNames = [...new Set([...still])];
  if (importNames.length) lines.push(`import { ${spell(importNames)} } from "@vedic-patro/domain/${moduleName}";`);
  if (reexport.length) lines.push(`export { ${spell(reexport)} } from "@vedic-patro/domain/${moduleName}";`);
  if (lines.length) {
    const lastImport = [...p.sf.statements].filter(ts.isImportDeclaration).pop();
    // Declarations are removed below the imports, so the last import's end is still valid.
    const at = lastImport ? text.indexOf("\n", lastImport.getEnd()) + 1 : 0;
    text = text.slice(0, at) + lines.join("\n") + "\n" + text.slice(at);
  }
  text = text.replace(/\n{3,}/g, "\n\n");
  writeFileSync(p.path, text);
}
rewrite(web);
rewrite(mobile);
console.log(`hoisted ${moved.length} declaration(s) into packages/domain/src/${moduleName}.ts: ${moved.join(", ")}`);
