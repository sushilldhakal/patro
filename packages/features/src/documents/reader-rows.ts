/**
 * A document's verses as a flat list of rows — chapter headings (documents
 * that keep every chapter on one page), sukta headings (Rigveda: Mandala →
 * Sukta → rik) and verses. Both apps draw exactly these rows.
 */
import type { DocumentChapter, Shloka } from "@vedic-patro/api-client";
import { suktaAttribution } from "@vedic-patro/domain/learn/sukta-attribution";
import type { TFunction } from "@vedic-patro/i18n/react";

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

/** Verses with a sukta heading inserted wherever the sukta changes. */
export function versesToRows(shlokas: readonly Shloka[], text: RowText, keyPrefix = ""): ReaderRow[] {
  const { t, lang } = text;
  const rows: ReaderRow[] = [];
  let current: number | null | undefined;
  shlokas.forEach((shloka, at) => {
    const sukta = shloka.sukta_number ?? null;
    if (sukta != null && sukta !== current) {
      // A verse with its own details line (वेद.com) needs no sukta-wide attribution above it.
      const ownDetails = Boolean(shloka.devata || shloka.rishi || shloka.chhanda || shloka.svara);
      const meta = ownDetails ? [] : [
        shloka.sukta_rishi ? `${t("documents.sukta_rishi")}: ${suktaAttribution(lang, shloka.sukta_rishi)}` : null,
        shloka.sukta_devata ? `${t("documents.sukta_devata")}: ${suktaAttribution(lang, shloka.sukta_devata)}` : null,
        shloka.sukta_chhanda ? `${t("documents.sukta_chhanda")}: ${suktaAttribution(lang, shloka.sukta_chhanda)}` : null,
      ].filter(Boolean);
      rows.push({
        kind: "sukta",
        key: `${keyPrefix}sukta-${sukta}-${shloka.id}`,
        heading: groupHeading(shlokas, at, sukta, text),
        sukta,
        meta: meta.length ? meta.join(" · ") : undefined,
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
