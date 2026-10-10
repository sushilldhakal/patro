import { strings } from "/home/user/patro/packages/i18n/src/strings.ts";
import ts from "/home/user/patro/apps/web/node_modules/typescript/lib/typescript.js";
import fs from "node:fs";
const file = "/home/user/patro/apps/web/src/components/learn/HowWeCalculateStudy.tsx"; const outDir = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const NE = "०१२३४५६७८९";
const mkN = (ne: boolean) => (v: number | string) => {
  const s = String(v);
  return ne ? s.replace(/\d/g, (d) => NE[+d]) : s;
};
const DIAG: Record<string, string> = {
  HeliocentricOrbitStudy: "earth-orbit", ElongationStudy: "tithi-elongation", EarthRotationDiagram: "earth-rotation",
  MoonPhasesStrip: "moon-phases", RashiReferenceTable: "table-rashi", GrahaReferenceTable: "table-graha",
  NakshatraReferenceTable: "table-nakshatra", TithiReferenceTable: "table-tithi", YogaReferenceTable: "table-yoga",
  KaranaReferenceTable: "table-karana", EclipseStudy: "lunar-eclipse", MoonOrbitTiltStudy: "moon-orbit-tilt",
  SolarEclipseStudy: "solar-eclipse", AyanamshaWheel: "ayanamsha-wheel", PrecessionCone: "precession-cone",
  EquinoxPrecession: "equinox-precession", PrecessionSkyStudy: "precession-sky", EclipticBeltStudy: "ecliptic-belt",
  ServerPipelineDiagram: "server-pipeline", ComputationReferenceTables: "computation-reference", HoraRing: "hora-live",
};

function evalExpr(e: ts.Expression, ne: boolean): any {
  const code = e.getText();
  const tt = tFor(ne); const nn = mkN(ne);
  const fn = new Function("N", "Math", "t", "num", "K", "PANCHANGA_STEPS", "GOCHAR_ROWS", "ECLIPSE_ROWS", `return (${code});`);
  const v = fn(nn, Math, tt, nn, K, ARR.PANCHANGA_STEPS, ARR.GOCHAR_ROWS, ARR.ECLIPSE_ROWS);
  return typeof v === "string" ? v.replace(/~/g, "\u223c") : v;
}
function jsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let out = "";
  const last = lines.length - 1;
  let lastNonEmpty = 0;
  lines.forEach((line, i) => { if (/[^ \t]/.test(line)) lastNonEmpty = i; });
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, " ");
    if (i !== 0) l = l.replace(/^[ ]+/, "");
    if (i !== last) l = l.replace(/[ ]+$/, "");
    if (l) { if (i !== lastNonEmpty) l += " "; out += l; }
  });
  return out.replace(/~/g, "\u223c").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
}
function attr(el: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
  return el.attributes.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name);
}
function attrString(el: ts.JsxOpeningLikeElement, name: string, ne: boolean): string | undefined {
  const a = attr(el, name); if (!a?.initializer) return undefined;
  if (ts.isStringLiteral(a.initializer)) return a.initializer.text.replace(/~/g, "\u223c");
  if (ts.isJsxExpression(a.initializer) && a.initializer.expression) return String(evalExpr(a.initializer.expression, ne));
  return undefined;
}
function className(el: ts.JsxOpeningLikeElement): string {
  const a = attr(el, "className"); if (!a?.initializer) return "";
  if (ts.isStringLiteral(a.initializer)) return a.initializer.text;
  return a.initializer.getText();
}
/** Inline children → markup string. */
function inline(children: readonly ts.JsxChild[], ne: boolean): string {
  let out = "";
  for (const c of children) {
    if (ts.isJsxText(c)) out += jsxText(c.text);
    else if (ts.isJsxExpression(c)) { if (c.expression) out += String(evalExpr(c.expression, ne)); }
    else if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) {
      const el = ts.isJsxElement(c) ? c.openingElement : c;
      const tag = el.tagName.getText();
      const inner = ts.isJsxElement(c) ? inline(c.children, ne) : "";
      const cls = className(el);
      if (tag === "b") out += `**${inner}**`;
      else if (tag === "span" && cls === "hl") out += `*${inner}*`;
      else if (tag === "span" && cls === "hl-amber") out += `~${inner}~`;
      else if (tag === "Link") out += `[[${/slug:\s*"([^"]+)"/.exec(attr(el, "params")!.getText())![1]}|${inner}]]`;
      else throw new Error(`inline: unhandled <${tag} ${cls}>`);
    } else throw new Error("inline: " + ts.SyntaxKind[c.kind]);
  }
  return out;
}
function elements(children: readonly ts.JsxChild[]): (ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxExpression)[] {
  return children.filter((c): c is any => !(ts.isJsxText(c) && !c.text.trim()) ).map((c) => c as any);
}
const tagOf = (c: any) => (ts.isJsxElement(c) ? c.openingElement.tagName.getText() : ts.isJsxSelfClosingElement(c) ? c.tagName.getText() : "{}");
const openOf = (c: any): ts.JsxOpeningLikeElement => (ts.isJsxElement(c) ? c.openingElement : c);
const kidsOf = (c: any): readonly ts.JsxChild[] => (ts.isJsxElement(c) ? c.children : []);

type Pair = { ne: any; en: any };
type Bi = { ne: string; en: string };

function keysItems(el: any, ne: boolean): { h: string; p: string }[] {
  const a = attr(openOf(el), "items")!;
  const arr = (a.initializer as ts.JsxExpression).expression as ts.ArrayLiteralExpression;
  return arr.elements.map((o) => {
    const obj = o as ts.ObjectLiteralExpression;
    const get = (n: string) => {
      const p = obj.properties.find((q) => q.name?.getText() === n) as ts.PropertyAssignment;
      let v: ts.Expression = p.initializer;
      while (ts.isParenthesizedExpression(v)) v = v.expression;
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) return v.text.replace(/~/g, "\u223c");
      if (ts.isTemplateExpression(v) || ts.isCallExpression(v)) return evalExpr(v, ne);
      if (ts.isJsxElement(v) || ts.isJsxFragment(v)) return inline(ts.isJsxElement(v) ? v.children : v.children, ne);
      throw new Error("keys value " + ts.SyntaxKind[v.kind]);
    };
    return { h: get("h"), p: get("p") };
  });
}
function formulaCards(div: any, neFlag: boolean): any[] {
  return elements(kidsOf(div)).map((card) => {
    const parts = elements(kidsOf(card));
    const cardObj: any = {};
    for (const p of parts) {
      const cls = className(openOf(p));
      if (cls === "big") {
        const kids = kidsOf(p);
        let big = ""; let unit: string | undefined;
        for (const k of kids) {
          if (ts.isJsxText(k)) big += jsxText(k.text);
          else if (ts.isJsxExpression(k)) { if (k.expression) big += evalExpr(k.expression, neFlag); }
          else if (ts.isJsxElement(k) && className(k.openingElement) === "u") unit = inline(k.children, neFlag);
          else throw new Error("formula big child");
        }
        cardObj.big = big.trim(); if (unit !== undefined) cardObj.unit = unit;
      } else if (cls === "lbl") cardObj.label = inline(kidsOf(p), neFlag);
      else if (cls === "desc") cardObj.desc = inline(kidsOf(p), neFlag);
      else throw new Error("formula part " + cls);
    }
    return cardObj;
  });
}

/** Convert the block list of one Section (or fragment) for one language into a neutral list. */
function sectionItems(children: readonly ts.JsxChild[], ne: boolean): any[] {
  const out: any[] = [];
  for (const c of elements(children)) {
    const tag = tagOf(c);
    const cls = tag === "{}" ? "" : className(openOf(c));
    if (tag === "Lede") out.push({ kind: "lede", text: inline(kidsOf(c), ne) });
    else if (tag === "Note") out.push({ kind: "note", text: inline(kidsOf(c), ne) });
    else if (tag === "Keys") out.push({ kind: "keys", items: keysItems(c, ne) });
    else if (tag === "p") out.push({ kind: "para", text: inline(kidsOf(c), ne) });
    else if (DIAG[tag] || tag === "SunriseTimeline") {
      const id = tag === "SunriseTimeline" ? `sunrise-${attrString(openOf(c), "mode", ne)}` : DIAG[tag];
      out.push({ kind: "diagram", id });
    } else if (tag === "div" && cls.includes("tmFormula")) out.push({ kind: "formula", cards: formulaCards(c, ne) });
    else if (tag === "div" && (cls.includes("tmCardPadLg") || cls === "\"mt-5\"" || cls === "mt-5")) {
      // card wrapper: optional heading <p>, one diagram, optional caption div
      let id: string | undefined; let caption: string | undefined; let heading: string | undefined;
      for (const k of elements(kidsOf(c))) {
        const kt = tagOf(k);
        if (DIAG[kt] || kt === "SunriseTimeline") id = kt === "SunriseTimeline" ? `sunrise-${attrString(openOf(k), "mode", ne)}` : DIAG[kt];
        else if (kt === "div" && className(openOf(k)).includes("tmCardCap")) caption = inline(kidsOf(k), ne);
        else if (kt === "p") heading = inline(kidsOf(k), ne);
        else throw new Error("card child " + kt);
      }
      if (!id) throw new Error("card without diagram");
      out.push({ kind: "diagram", id, ...(caption ? { caption } : {}), ...(heading ? { heading } : {}) });
    } else if (tag === "{}") {
      // conditional (e.g. {p ? <HoraRing/> : <Loading/>}) — treat as live diagram
      const txt = (c as any).getText();
      if (txt.includes("HoraRing")) out.push({ kind: "diagram", id: "hora-live" });
      else throw new Error("expression child: " + txt.slice(0, 60));
    } else throw new Error(`section child <${tag} ${cls}>`);
  }
  return out;
}
function fragmentItems(frag: ts.JsxFragment, ne: boolean) {
  const secs: { title: string; en?: string; items: any[]; kicker?: string }[] = [];
  const trailing: any[] = [];
  for (const c of elements(frag.children)) {
    const tag = tagOf(c);
    if (tag === "Section") {
      const o = openOf(c);
      secs.push({ title: attrString(o, "title", ne)!, en: attrString(o, "en", ne), kicker: attrString(o, "kicker", ne), items: sectionItems(kidsOf(c), ne) });
    } else if (tag === "Note") {
      if (!secs.length) throw new Error("note before section");
      secs[secs.length - 1].items.push({ kind: "note", text: inline(kidsOf(c), ne) });
    } else throw new Error("fragment child " + tag);
  }
  return secs;
}
function findBilingual(fn: ts.FunctionDeclaration): [ts.JsxFragment, ts.JsxFragment] {
  let found: [ts.JsxFragment, ts.JsxFragment] | undefined;
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText() === "bilingualNode" && n.arguments.length >= 3) {
      found = [n.arguments[1] as ts.JsxFragment, n.arguments[2] as ts.JsxFragment];
    }
    ts.forEachChild(n, visit);
  };
  visit(fn);
  if (!found) throw new Error("no bilingualNode");
  return found;
}


import { strings } from "/home/user/patro/packages/i18n/src/strings.ts";
const K = "learn.study.calc.";
const tFor = (ne: boolean) => (key: string) => { const v = (strings as any)[key]; if (!v) throw new Error("missing key " + key); return (ne ? v.ne : v.en).replace(/~/g, "\u223c"); };
// constants from the file
function constArray(name: string): any {
  let node: ts.Expression | undefined;
  sf.forEachChild((n) => { if (ts.isVariableStatement(n)) n.declarationList.declarations.forEach((d) => { if (d.name.getText() === name) node = d.initializer; }); });
  return new Function("K", `return (${node!.getText().replace(/ as const/g, "")});`)(K);
}
const ARR: Record<string, any> = { PANCHANGA_STEPS: constArray("PANCHANGA_STEPS"), GOCHAR_ROWS: constArray("GOCHAR_ROWS"), ECLIPSE_ROWS: constArray("ECLIPSE_ROWS") };
let CUR_NE = true;
const origEval = evalExpr;

const K_ = K;
function sectionOf(c: any, ne: boolean) {
  const o = openOf(c);
  const titleKey = attrString(o, "titleKey", ne)!; // evaluated through eval: string literal or template
  return { title: titleKey, items: [] as any[] };
}
function keysBlock(c: any, ne: boolean) {
  const a = attr(openOf(c), "items")!;
  const arr = evalExpr((a.initializer as ts.JsxExpression).expression!, ne);
  const t = tFor(ne);
  return { kind: "keys", items: arr.map((o: any) => ({ h: t(o.h), p: t(o.p) })) };
}
function formulaFromDiv(c: any, ne: boolean) {
  return { kind: "formula", cards: formulaCards(c, ne) };
}
function refTable(c: any, ne: boolean) {
  const o = openOf(c);
  const ex = (n: string) => { const a = attr(o, n); return a ? evalExpr((a.initializer as ts.JsxExpression).expression!, ne) : undefined; };
  const t = tFor(ne);
  const caption = t(ex("captionKey"));
  const headers = ex("headerKeys").map((k: string) => t(k));
  const rows = ex("rows");
  const hl = ex("highlightRow");
  return { kind: "table", caption, headers, rows, ...(hl !== undefined ? { highlightRow: hl } : {}) };
}
function body(frag: readonly ts.JsxChild[], ne: boolean) {
  const secs: any[] = [];
  for (const c of elements(frag)) {
    if (tagOf(c) !== "Section") throw new Error("top " + tagOf(c));
    const s: any = sectionOf(c, ne);
    s.title = tFor(ne)(attrString(openOf(c), "titleKey", ne)!);
    for (const k of elements(kidsOf(c))) {
      const tag = tagOf(k);
      if (tag === "Lede") s.items.push({ kind: "lede", text: inline(kidsOf(k), ne) });
      else if (tag === "Note") s.items.push({ kind: "note", text: inline(kidsOf(k), ne) });
      else if (tag === "KeysBlock") s.items.push(keysBlock(k, ne));
      else if (tag === "RefTable") s.items.push(refTable(k, ne));
      else if (tag === "div") s.items.push(formulaFromDiv(k, ne));
      else if (DIAG[tag]) s.items.push({ kind: "diagram", id: DIAG[tag] });
      else throw new Error("child " + tag);
    }
    secs.push(s);
  }
  return secs;
}
function pairB(a: any[], b: any[], w: string): any[] {
  if (a.length !== b.length) throw new Error("count " + w);
  return a.map((x, i) => {
    const y = b[i];
    if (x.kind !== y.kind) throw new Error("kind " + w);
    if (x.kind === "lede" || x.kind === "note") return { kind: x.kind, text: { ne: x.text, en: y.text } };
    if (x.kind === "keys") return { kind: "keys", items: x.items.map((it: any, j: number) => ({ h: { ne: it.h, en: y.items[j].h }, p: { ne: it.p, en: y.items[j].p } })) };
    if (x.kind === "diagram") return { kind: "diagram", id: x.id };
    if (x.kind === "table") {
      const o: any = { kind: "table", caption: { ne: x.caption, en: y.caption }, headers: x.headers.map((h: string, j: number) => ({ ne: h, en: y.headers[j] })),
        rows: x.rows.map((r: string[], ri: number) => r.map((cell, ci) => (cell === y.rows[ri][ci] ? cell : { ne: cell, en: y.rows[ri][ci] }))) };
      if (x.highlightRow !== undefined) o.highlightRow = x.highlightRow;
      return o;
    }
    if (x.kind === "formula") return { kind: "formula", cards: x.cards.map((cd: any, j: number) => {
      const yc = y.cards[j];
      const big = cd.big === yc.big ? cd.big : { ne: cd.big, en: yc.big };
      const o: any = { big };
      if (cd.unit !== undefined) o.unit = cd.unit === yc.unit ? cd.unit : { ne: cd.unit, en: yc.unit };
      o.label = { ne: cd.label, en: yc.label }; o.desc = { ne: cd.desc, en: yc.desc };
      return o; }) };
    throw new Error("pair " + x.kind);
  });
}
function ser(v: any, ind = 0): string {
  const pad = "  ".repeat(ind), pad1 = "  ".repeat(ind + 1);
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad1 + ser(x, ind + 1)).join(",\n")},\n${pad}]` : "[]";
  const entries = Object.entries(v);
  return `{\n${entries.map(([k, x]) => `${pad1}${/^[A-Za-z_]\w*$/.test(k) ? k : JSON.stringify(k)}: ${ser(x, ind + 1)}`).join(",\n")},\n${pad}}`;
}
let studyFn: ts.FunctionDeclaration | undefined;
sf.forEachChild((n) => { if (ts.isFunctionDeclaration(n) && n.name?.text === "HowWeCalculateStudy") studyFn = n; });
let frag: ts.JsxFragment | undefined;
(function v(n: ts.Node) { if (ts.isJsxFragment(n) && !frag) frag = n; ts.forEachChild(n, v); })(studyFn!);
const A = body(frag!.children, true), B = body(frag!.children, false);
const sections = A.map((s, i) => ({ title: { ne: s.title, en: B[i].title }, blocks: pairB(s.items, B[i].items, "§" + i) }));
fs.writeFileSync(`${outDir}/how-we-calculate.ts`, `import type { ArticleData } from "../../article-schema";\n\n/** Chapter text — written once, read by the website and the app. */\nexport const howWeCalculate: ArticleData = ${ser({ slug: "how-we-calculate", sections })};\n`);
console.log("wrote how-we-calculate", sections.length);
