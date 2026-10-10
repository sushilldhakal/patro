/**
 * Data-driven Learn article format.
 *
 * An article is a list of numbered sections, each holding presentational
 * blocks. Bodies used to be hand-built React trees (one component per
 * article); as the knowledge library grew past a handful of topics that
 * meant duplicating the same markup 80 times. Here the body is plain data
 * and `article-render.tsx` owns the markup, so a new article is prose plus
 * a diagram id.
 *
 * Every string the reader sees is bilingual — `{ ne, en }`. Nepali is the
 * primary language, so write Nepali with Devanagari digits (१२°, ३६५) to
 * match `toNepaliDigits` output elsewhere.
 */

import type { DiagramId } from "./learn-diagrams";

/** Bilingual string — Nepali first, English second. */
export interface Bi {
  ne: string;
  en: string;
}

/** Table cell: script-neutral text (numbers, degrees) or bilingual copy. */
export type Cell = string | Bi;

/**
 * Inline markup understood inside every `Bi` text field:
 *
 * - `**text**` → strong, ink colour
 * - `*text*`   → teal highlight (the article's key terms)
 * - `~text~`   → amber highlight (astronomical events, warnings)
 * - `` `text` `` → numeric/monospace run
 */
export type Block =
  /** Opening paragraph of a section — slightly larger than `para`. */
  | { kind: "lede"; text: Bi }
  /** Body paragraph. */
  | { kind: "para"; text: Bi }
  /** Amber-ruled definition cards, 1–4 across. */
  | { kind: "keys"; items: { h: Bi; p: Bi }[] }
  /**
   * Big-value cards — a value, a label and a one-line gloss. `big` is usually
   * a numeral and so script-neutral, but takes a bilingual value for the cards
   * whose headline is a word rather than a number.
   */
  | {
      kind: "formula";
      cards: { big: Cell; unit?: Bi; label: Bi; desc: Bi }[];
    }
  /** Reference table. `rows` cells may be plain or bilingual. */
  | { kind: "table"; caption?: Bi; headers: Bi[]; rows: Cell[][] }
  /** Bulleted or numbered list. */
  | { kind: "list"; ordered?: boolean; items: Bi[] }
  /** Monospace ASCII figure (zodiac belts, hierarchy trees). */
  | { kind: "figure"; art: string; caption?: Bi }
  /**
   * A worked calculation: the rule, what its symbols mean, and a numeric
   * example that lands on an answer.
   *
   * Distinct from `formula`, which is three headline *values* on cards. This
   * one is for the पञ्चाङ्ग arithmetic — तिथि, नक्षत्र, योग, करण, सूर्योदय —
   * where the article is showing you how a number is produced. It replaced
   * monospace ASCII, which could not set an equation, could not align a
   * worked example, and forced both languages onto one line.
   */
  | {
      kind: "calc";
      /** The rule itself, one entry per line. */
      rule: Bi[];
      /** Glossary for the symbols used above. */
      where?: { sym: string; is: Bi }[];
      /** Worked example, rendered as aligned label → value rows. */
      example?: { k: Bi; v: string }[];
      /** The line the example arrives at. */
      result?: Bi;
      caption?: Bi;
    }
  /** An interactive/SVG diagram from the diagram registry. */
  | { kind: "diagram"; id: DiagramId; caption?: Bi }
  /** Centred closing aside. */
  | { kind: "note"; text: Bi };

export interface ArticleSection {
  /** Section heading. */
  title: Bi;
  /**
   * Small uppercase gloss beside the heading. English-only strings are shown
   * in English and hidden in Nepali. Mixed or bilingual values keep the
   * Nepali part when the UI is Nepali.
   */
  eyebrow?: Bi | string;
  blocks: Block[];
}

export interface ArticleData {
  /** Slug this body belongs to — checked against the library registry. */
  slug: string;
  sections: ArticleSection[];
  /** Slugs to offer as further reading, in order. */
  seeAlso?: string[];
}

/** Devanagari section numbers (०१, ०२ …) paired with Latin ones. */
const NE_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function sectionKicker(index: number): Bi {
  const n = String(index + 1).padStart(2, "0");
  return {
    ne: n.replace(/\d/g, (d) => NE_DIGITS[Number(d)]!),
    en: n,
  };
}
