import ts from "/home/user/patro/apps/web/node_modules/typescript/lib/typescript.js";
import fs from "node:fs";
import path from "node:path";
const [,, file, fn, dataPath, dataExport] = process.argv;
const src = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const norm = (s: string) => s.replace(/[*~`]/g, " ").replace(/[०-९0-9]+/g, " ").split(/[\s,.;:!?()"'“”‘’\[\]{}<>\/|—–\-·•→←↔≈×÷=+°′″%&_]+/u).filter((w) => w.length > 0);
function collect(node: ts.Node, out: string[]) {
  if (ts.isJsxText(node)) out.push(...norm(node.getText()));
  else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    // skip className strings and import specifiers
    const p = node.parent;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return;
    if (ts.isJsxAttribute(p) && ["className", "key", "href", "to", "id", "type", "target", "rel", "viewBox", "d", "stroke", "fill", "role"].includes(p.name.getText())) return;
    out.push(...norm(node.text));
  } else if (ts.isTemplateExpression(node)) {
    out.push(...norm(node.head.text)); node.templateSpans.forEach((s) => out.push(...norm(s.literal.text)));
  }
  ts.forEachChild(node, (c) => collect(c, out));
}
let target: ts.Node | undefined;
sf.forEachChild((n) => {
  if (ts.isFunctionDeclaration(n) && n.name?.text === fn) target = n;
});
if (!target) { console.error("no fn", fn); process.exit(1); }
const jsxWords: string[] = []; collect(target, jsxWords);
const mod = await import(dataPath);
const data = mod[dataExport];
const dataWords: string[] = [];
(function walk(v: any, key?: string) {
  if (typeof v === "string") { if (!["kind","slug","id","art"].includes(key ?? "")) dataWords.push(...norm(v)); return; }
  if (Array.isArray(v)) v.forEach((x) => walk(x, key));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
})(data);
const count = (a: string[]) => { const m = new Map<string, number>(); a.forEach((w) => m.set(w, (m.get(w) ?? 0) + 1)); return m; };
const J = count(jsxWords), D = count(dataWords);
const miss: string[] = [], extra: string[] = [];
for (const [w, n] of J) { const d = D.get(w) ?? 0; if (d < n) miss.push(`${w}×${n - d}`); }
for (const [w, n] of D) { const j = J.get(w) ?? 0; if (j < n) extra.push(`${w}×${n - j}`); }
console.log(`${fn}: jsx=${jsxWords.length} data=${dataWords.length}`);
console.log("IN WEB, NOT IN DATA:", miss.join(" ") || "-");
console.log("IN DATA, NOT IN WEB:", extra.join(" ") || "-");
