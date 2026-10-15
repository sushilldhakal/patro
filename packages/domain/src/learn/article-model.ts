/**
 * One contract for Learn article markup, shared by the website and the app.
 *
 * Inline marks, in the order the parser tries them:
 *   **strong**  *teal*  ~amber~  `num`  [[slug|label]]
 * Unmatched markers stay as literal text.
 *
 * `resolveArticle` turns bilingual blocks into the strings and marks a
 * renderer draws. It does not draw anything.
 */

import type { ArticleData, Bi, Block, Cell } from "./article-schema";
import { sectionKicker } from "./article-schema";
import { buildLearnViews, LEARN_LIBRARY, LEARN_SECTIONS, type LibraryTopic } from "./learn-library";

export type LearnLang = "ne" | "en";

export type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "teal"; text: string }
  | { kind: "amber"; text: string }
  | { kind: "num"; text: string }
  | { kind: "link"; slug: string; label: string };

/** `**` is tried before `*` so a bold run is not read as teal. */
const INLINE_MARKUP =
  /\*\*([^*]+)\*\*|\*([^*]+)\*|~([^~]+)~|`([^`]+)`|\[\[([\w-]+)\|([^\]]+)\]\]/g;

const DEVANAGARI = /[\u0900-\u097F]/;

/** Units that sit against the value with no space: 12°, 5%, 3′. */
const UNIT_FLUSH = /^[°′″%]/;

export function parseInlineMarkup(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_MARKUP)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ kind: "text", text: text.slice(last, at) });
    const [, strong, teal, amber, num, slug, label] = match;
    if (strong !== undefined) parts.push({ kind: "strong", text: strong });
    else if (teal !== undefined) parts.push({ kind: "teal", text: teal });
    else if (amber !== undefined) parts.push({ kind: "amber", text: amber });
    else if (num !== undefined) parts.push({ kind: "num", text: num });
    else if (slug !== undefined && label !== undefined) parts.push({ kind: "link", slug, label });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

export function pickBi(lang: LearnLang, value: Bi): string {
  return lang === "en" ? value.en || value.ne : value.ne || value.en;
}

export function cellText(lang: LearnLang, cell: Cell): string {
  return typeof cell === "string" ? cell : pickBi(lang, cell);
}

/**
 * Section gloss. English-only strings stay in English and drop out of Nepali.
 * Mixed "Devanagari · English" labels keep only the Devanagari side.
 */
export function eyebrowLabel(lang: LearnLang, eyebrow: Bi | string | undefined): string | null {
  if (!eyebrow) return null;
  if (typeof eyebrow !== "string") {
    const text = pickBi(lang, eyebrow).trim();
    return text || null;
  }
  if (lang === "en") return eyebrow;
  if (!DEVANAGARI.test(eyebrow)) return null;
  if (!eyebrow.includes(" · ")) return eyebrow;
  return eyebrow.split(" · ").map((part) => part.trim()).find((part) => DEVANAGARI.test(part)) ?? eyebrow;
}

/** The text inside a formula card's unit span, including a leading space when the unit is a word. */
export function formulaUnit(unit: string): string {
  return UNIT_FLUSH.test(unit) ? unit : ` ${unit}`;
}

export type ResolvedInline = InlinePart[];

export type ResolvedBlock =
  | { kind: "lede" | "para" | "note"; text: ResolvedInline }
  | { kind: "keys"; items: { key: string; title: ResolvedInline; body: ResolvedInline }[] }
  | {
      kind: "formula";
      cards: { key: string; big: string; unit?: string; label: ResolvedInline; desc: ResolvedInline }[];
    }
  | { kind: "list"; ordered: boolean; items: { key: string; marker: string; text: ResolvedInline }[] }
  | {
      kind: "table";
      caption?: string;
      headers: { key: string; text: string }[];
      rows: { key: string; highlight: boolean; cells: ResolvedInline[] }[];
    }
  | { kind: "figure"; art: string; caption?: string }
  | {
      kind: "calc";
      rule: ResolvedInline[];
      where?: { sym: string; text: ResolvedInline }[];
      example?: { key: string; label: ResolvedInline; value: string }[];
      result?: ResolvedInline;
      caption?: string;
    }
  | { kind: "diagram"; id: string; heading?: string; caption?: string };

export type ResolvedSection = {
  key: string;
  kicker: string;
  title: string;
  gloss: string | null;
  blocks: ResolvedBlock[];
};

export type ResolvedSeeAlso = { slug: string; title: string };

function inline(lang: LearnLang, value: Bi): ResolvedInline {
  return parseInlineMarkup(pickBi(lang, value));
}

function biKey(value: Bi, index: number): string {
  return value.en || value.ne || String(index);
}

function resolveBlock(block: Block, lang: LearnLang): ResolvedBlock {
  switch (block.kind) {
    case "lede":
    case "para":
    case "note":
      return { kind: block.kind, text: inline(lang, block.text) };
    case "keys":
      return {
        kind: "keys",
        items: block.items.map((item, index) => ({
          key: biKey(item.h, index),
          title: inline(lang, item.h),
          body: inline(lang, item.p),
        })),
      };
    case "formula":
      return {
        kind: "formula",
        cards: block.cards.map((card, index) => ({
          key: biKey(card.label, index),
          big: cellText(lang, card.big),
          unit: card.unit ? formulaUnit(pickBi(lang, card.unit)) : undefined,
          label: inline(lang, card.label),
          desc: inline(lang, card.desc),
        })),
      };
    case "list":
      return {
        kind: "list",
        ordered: Boolean(block.ordered),
        items: block.items.map((item, index) => ({
          key: biKey(item, index),
          marker: block.ordered ? `${index + 1}.` : "·",
          text: inline(lang, item),
        })),
      };
    case "table":
      return {
        kind: "table",
        caption: block.caption ? pickBi(lang, block.caption) : undefined,
        headers: block.headers.map((header, index) => ({ key: biKey(header, index), text: pickBi(lang, header) })),
        rows: block.rows.map((row, index) => ({
          key: String(index),
          highlight: block.highlightRow === index,
          cells: row.map((cell) => parseInlineMarkup(cellText(lang, cell))),
        })),
      };
    case "figure":
      return { kind: "figure", art: block.art, caption: block.caption ? pickBi(lang, block.caption) : undefined };
    case "calc":
      return {
        kind: "calc",
        rule: block.rule.map((line) => inline(lang, line)),
        where: block.where?.map((row) => ({ sym: row.sym, text: inline(lang, row.is) })),
        example: block.example?.map((row, index) => ({
          key: biKey(row.k, index),
          label: inline(lang, row.k),
          value: row.v,
        })),
        result: block.result ? inline(lang, block.result) : undefined,
        caption: block.caption ? pickBi(lang, block.caption) : undefined,
      };
    case "diagram":
      return {
        kind: "diagram",
        id: block.id,
        heading: block.heading ? pickBi(lang, block.heading) : undefined,
        caption: block.caption ? pickBi(lang, block.caption) : undefined,
      };
  }
}

export function resolveArticle(article: ArticleData, lang: LearnLang, sectionOffset = 0): ResolvedSection[] {
  return article.sections.map((section, index) => ({
    key: biKey(section.title, index),
    kicker: pickBi(lang, sectionKicker(index + sectionOffset)),
    title: pickBi(lang, section.title),
    gloss: eyebrowLabel(lang, section.eyebrow),
    blocks: section.blocks.map((block) => resolveBlock(block, lang)),
  }));
}

let libraryBySlug: Record<string, LibraryTopic | undefined> | undefined;

function topicsBySlug(): Record<string, LibraryTopic | undefined> {
  libraryBySlug ??= buildLearnViews(LEARN_SECTIONS, LEARN_LIBRARY).bySlug;
  return libraryBySlug;
}

/** Published see-also topics, in the order the article lists them. */
export function resolveSeeAlso(slugs: readonly string[] | undefined, lang: LearnLang): ResolvedSeeAlso[] {
  if (!slugs?.length) return [];
  const bySlug = topicsBySlug();
  const out: ResolvedSeeAlso[] = [];
  for (const slug of slugs) {
    const topic = bySlug[slug];
    if (topic?.status === "published") out.push({ slug: topic.slug, title: pickBi(lang, topic.title) });
  }
  return out;
}
