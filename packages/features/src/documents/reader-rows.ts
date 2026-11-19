/**
 * A document's verses as a flat list of rows — chapter headings (documents
 * that keep every chapter on one page), sukta headings (Rigveda: Mandala →
 * Sukta → rik) and verses. Both apps draw exactly these rows.
 */
import type { DocumentChapter, Shloka } from "@vedic-patro/api-client";
import { suktaAttribution } from "@vedic-patro/domain/learn/sukta-attribution";
import type { TFunction } from "@vedic-patro/i18n/react";
import { suryaFiguresFor, type FigureKey } from "@vedic-patro/drawing/learn/surya-figures";
import { suryaTablesFor, type TableKey } from "@vedic-patro/drawing/learn/surya-tables";

export type ReaderRow =
  | {
      kind: "chapter";
      key: string;
      /** Anchor id (`chapter-<n>`) — the chapter pills jump here. */
      anchor: string;
      number: number;
      numberLabel: string;
      heading: string;
      title?: string;
    }
  | {
      kind: "sukta";
      key: string;
      heading: string;
      meta?: string;
      /** The sukta (or group) number — a Rigveda sukta's continuous file plays from this heading. */
      sukta: number;
    }
  | { kind: "images"; key: string; urls: string[] }
  | { kind: "surya-figure"; key: string; figure: FigureKey }
  | { kind: "surya-table"; key: string; table: TableKey }
  | { kind: "verse"; key: string; shloka: Shloka };

export type RowText = { t: TFunction; lang: string; digits: (n: number) => string };

export const chapterAnchor = (n: number) => `chapter-${n}`;

const DEVANAGARI_ZERO = 0x0966;

/** "६.१२.३" and "6.12.3" compare equal. Every other character is kept. */
export function canonVerseLabel(label: string): string {
  let out = "";
  for (const ch of label.trim()) {
    const code = ch.codePointAt(0)!;
    if (code >= DEVANAGARI_ZERO && code < DEVANAGARI_ZERO + 10) out += String(code - DEVANAGARI_ZERO);
    else out += ch;
  }
  return out;
}

/** Prefer the reader's language, fall back to the other. */
export const bilingual = (lang: string, ne?: string | null, en?: string | null) =>
  (lang === "en" ? en || ne : ne || en) ?? "";

/** The last part of a verse label: its mantra number ("1.1.3" or "3.12" → 3 / 12). */
const mantraOf = (label: string) => Number(label.trim().split(".").pop());

/**
 * A group's heading. Labels with three parts (Rigveda Mandala.Sukta.Mantra, Atharvaveda
 * Kanda.Sukta.Mantra) group by sukta: "सूक्त 7". The Shukla Yajurveda has no suktas — its labels
 * are Adhyaya.Mantra, and a group is a run of mantras sharing a Rishi / Devata — so it is
 * headed by the mantras it spans: "मन्त्र 1–3".
 */
function groupHeading(shlokas: readonly Shloka[], at: number, sukta: number, { t, digits }: RowText): string {
  if (shlokas[at]!.verse_label.split(".").length >= 3) return t("documents.sukta_label", { number: digits(sukta) });
  let end = at;
  while (end + 1 < shlokas.length && shlokas[end + 1]!.sukta_number === sukta) end += 1;
  const from = mantraOf(shlokas[at]!.verse_label);
  const to = mantraOf(shlokas[end]!.verse_label);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return t("documents.sukta_label", { number: digits(sukta) });
  return from === to
    ? t("documents.mantra_label", { number: digits(from) })
    : t("documents.mantra_range", { from: digits(from), to: digits(to) });
}

/**
 * The `group_title` the source data gives a numbered adhyaya with no name of its own ("adhyaya" in
 * Devanagari). Built from code points because it is a data value to match, not copy to show,
 * and the inline-copy checks rightly reject Devanagari literals in shared code.
 */
const NUMBERED_SECTION = String.fromCodePoint(0x0905, 0x0927, 0x094d, 0x092f, 0x093e, 0x092f);

/** The heading and note for one group of verses. */
function sectionHeading(
  shloka: Shloka,
  shlokas: readonly Shloka[],
  at: number,
  sukta: number,
  text: RowText,
): { heading: string; meta?: string } {
  const { t, lang, digits } = text;
  const named = shloka.group_title?.trim();
  if (named === NUMBERED_SECTION) {
    return { heading: t("documents.chapter_label", { number: digits(sukta) }) };
  }
  if (named) {
    return { heading: named, meta: t("documents.chapter_label", { number: digits(sukta) }) };
  }
  // A verse with its own details line (वेद.com) needs no sukta-wide attribution above it.
  const ownDetails = Boolean(shloka.devata || shloka.rishi || shloka.chhanda || shloka.svara);
  const meta = ownDetails
    ? []
    : [
        shloka.sukta_rishi ? `${t("documents.sukta_rishi")}: ${suktaAttribution(lang, shloka.sukta_rishi)}` : null,
        shloka.sukta_devata ? `${t("documents.sukta_devata")}: ${suktaAttribution(lang, shloka.sukta_devata)}` : null,
        shloka.sukta_chhanda ? `${t("documents.sukta_chhanda")}: ${suktaAttribution(lang, shloka.sukta_chhanda)}` : null,
      ].filter(Boolean);
  return {
    heading: groupHeading(shlokas, at, sukta, text),
    meta: meta.length ? meta.join(" · ") : undefined,
  };
}

/** Verses with a sukta heading inserted wherever the sukta changes. */
export function versesToRows(shlokas: readonly Shloka[], text: RowText, keyPrefix = ""): ReaderRow[] {
  const rows: ReaderRow[] = [];
  let current: number | null | undefined;
  shlokas.forEach((shloka, at) => {
    const sukta = shloka.sukta_number ?? null;
    if (sukta != null && sukta !== current) {
      const section = sectionHeading(shloka, shlokas, at, sukta, text);
      rows.push({
        kind: "sukta",
        key: `${keyPrefix}sukta-${sukta}-${shloka.id}`,
        heading: section.heading,
        sukta,
        meta: section.meta,
      });
    }
    current = sukta;
    rows.push({ kind: "verse", key: `${keyPrefix}v-${shloka.id}`, shloka });
  });
  return rows;
}

/** Rows for a document that keeps every chapter on one page. */
export function inlineChapterRows(chapters: readonly DocumentChapter[], text: RowText): ReaderRow[] {
  const { t, lang, digits } = text;
  return chapters.flatMap((chapter) => [
    ...(chapter.number != null
      ? [
          {
            kind: "chapter" as const,
            key: chapterAnchor(chapter.number),
            anchor: chapterAnchor(chapter.number),
            number: chapter.number,
            numberLabel: digits(chapter.number),
            heading: t("documents.chapter_label", { number: digits(chapter.number) }),
            title: bilingual(lang, chapter.title_ne, chapter.title_en) || undefined,
          },
        ]
      : []),
    ...((chapter.image_urls?.length ?? 0) > 0
      ? [{ kind: "images" as const, key: `images-c${chapter.number ?? 0}`, urls: chapter.image_urls! }]
      : []),
    ...versesToRows(chapter.shlokas ?? [], text, `c${chapter.number ?? 0}-`),
  ]);
}

/**
 * The Surya Siddhanta's diagrams, each placed before the verse card that holds the verse it
 * explains. A card may carry several verses ("२९–३२"); its `verse_number` is the first. A
 * figure waits until the card after its verse is loaded, so it never lands one card early.
 */
export function withSuryaFigures(rows: ReaderRow[], chapter: number, atStart: boolean, atEnd: boolean): ReaderRow[] {
  type Place = { verse: number; row: ReaderRow };
  const places: Place[] = [
    ...suryaFiguresFor(chapter).map((p) => ({ verse: p.verse, row: { kind: "surya-figure" as const, key: `surya-figure-${chapter}-${p.key}`, figure: p.key } })),
    ...suryaTablesFor(chapter).map((p) => ({ verse: p.verse, row: { kind: "surya-table" as const, key: `surya-table-${chapter}-${p.key}`, table: p.key } })),
  ];
  if (!places.length) return rows;
  const verseIdx = rows.flatMap((row, i) => (row.kind === "verse" ? [i] : []));
  // The chapter page leaves out `verse_number`; the label's first number is the card's first verse.
  const first = (j: number) => {
    const shloka = (rows[verseIdx[j]!] as { shloka: Shloka }).shloka;
    return shloka.verse_number ?? (Number.parseInt(canonVerseLabel(shloka.verse_label), 10) || 0);
  };
  const before = new Map<number, ReaderRow[]>();
  for (const place of places) {
    let host = -1;
    for (let j = 0; j < verseIdx.length; j += 1) {
      if (first(j) <= place.verse) host = j;
      else break;
    }
    if (host < 0) {
      // the first loaded card is past this verse: only right at the chapter's start
      if (!atStart || !verseIdx.length) continue;
      host = 0;
    } else if (host === verseIdx.length - 1 && !atEnd) {
      if (first(host) !== place.verse) continue;
    } else if (host === 0 && !atStart) {
      if (first(0) !== place.verse) continue;
    }
    const at = verseIdx[host]!;
    before.set(at, [...(before.get(at) ?? []), place.row]);
  }
  if (!before.size) return rows;
  const out: ReaderRow[] = [];
  rows.forEach((row, i) => {
    for (const extra of before.get(i) ?? []) out.push(extra);
    out.push(row);
  });
  return out;
}
