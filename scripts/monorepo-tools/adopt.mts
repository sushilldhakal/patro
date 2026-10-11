/**
 * Replace local copies of helpers that already live in packages/domain with an
 * import — only where the local copy is the same text as the domain one.
 *
 *   npx tsx scripts/monorepo-tools/adopt.mts <app file> <domain module> name[,name...]
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ts: typeof import("typescript") = createRequire(import.meta.url)("../../apps/web/node_modules/typescript");
const [file, moduleName, namesArg] = process.argv.slice(2);
const repo = resolve(new URL(".", import.meta.url).pathname, "../..");
const domainFile = resolve(repo, "packages/domain/src", `${moduleName}.ts`);

const norm = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/^\s*export\s+/, "").replace(/\s+/g, " ").trim();

function decls(path: string) {
  const text = readFileSync(path, "utf8");
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = new Map<string, { node: import("typescript").Statement; text: string; isType: boolean; exported: boolean }>();
  for (const st of sf.statements) {
    let name: string | undefined;
    if ((ts.isFunctionDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) && st.name) name = st.name.text;
    else if (ts.isVariableStatement(st) && st.declarationList.declarations.length === 1 && ts.isIdentifier(st.declarationList.declarations[0].name))
      name = st.declarationList.declarations[0].name.text;
    if (!name) continue;
    const exported = !!ts.getModifiers(st as import("typescript").HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    out.set(name, { node: st, text: st.getText(sf), isType: ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st), exported });
  }
  return { text, sf, out };
}

const app = decls(resolve(file));
const dom = decls(domainFile);
const names = namesArg.split(",").map((s) => s.trim());
const problems: string[] = [];
for (const n of names) {
  const a = app.out.get(n);
  const d = dom.out.get(n);
  if (!a) problems.push(`${n}: not in ${file}`);
  else if (!d) problems.push(`${n}: not in domain/${moduleName}`);
  else if (norm(a.text) !== norm(d.text)) problems.push(`${n}: differs from domain/${moduleName}`);
}
// The domain copies read the domain's own constants and helpers; a local
// declaration of the same name that differs would silently stop being used.
{
  const domNames = new Set(dom.out.keys());
  const queue = [...names];
  const seen = new Set<string>();
  while (queue.length) {
    const n = queue.shift()!;
    if (seen.has(n)) continue;
    seen.add(n);
    const d = dom.out.get(n);
    if (!d) continue;
    const refs = new Set<string>();
    const visit = (node: import("typescript").Node) => {
      if (ts.isIdentifier(node)) refs.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(d.node);
    for (const r of refs) {
      if (r === n || !domNames.has(r)) continue;
      const local = app.out.get(r);
      if (local && !names.includes(r) && norm(local.text) !== norm(dom.out.get(r)!.text))
        problems.push(`${n} uses ${r}, which ${file} declares differently`);
      queue.push(r);
    }
  }
}
if (problems.length) {
  console.error(`adopt refused:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
let text = app.text;
const nodes = names.map((n) => app.out.get(n)!).sort((x, y) => y.node.pos - x.node.pos);
for (const d of nodes) text = text.slice(0, d.node.getFullStart()) + text.slice(d.node.getEnd());
const spell = (ns: string[]) => ns.map((n) => (app.out.get(n)!.isType ? `type ${n}` : n)).join(", ");
const exported = names.filter((n) => app.out.get(n)!.exported);
const lines = [`import { ${spell(names)} } from "@vedic-patro/domain/${moduleName}";`];
if (exported.length) lines.push(`export { ${spell(exported)} } from "@vedic-patro/domain/${moduleName}";`);
const lastImport = [...app.sf.statements].filter(ts.isImportDeclaration).pop();
const at = lastImport ? text.indexOf("\n", lastImport.getEnd()) + 1 : 0;
text = (text.slice(0, at) + lines.join("\n") + "\n" + text.slice(at)).replace(/\n{3,}/g, "\n\n");
writeFileSync(resolve(file), text);
console.log(`adopted ${names.join(", ")} from domain/${moduleName} in ${file}`);
