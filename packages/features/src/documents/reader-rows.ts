/**
 * A document's verses as a flat list of rows — chapter headings (documents
 * that keep every chapter on one page), sukta headings (Rigveda: Mandala →
 * Sukta → rik) and verses. Both apps draw exactly these rows.
 */
import type { DocumentChapter, Shloka } from "@vedic-patro/api-client";
import { suktaAttribution } from "@vedic-patro/domain/sukta-attribution";
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
  | { kind: "sukta"; key: string; heading: string; meta?: string }
  | { kind: "verse"; key: string; shloka: Shloka };

export type RowText = { t: TFunction; lang: string; digits: (n: number) => string };

export const chapterAnchor = (n: number) => `chapter-${n}`;

/** Prefer the reader's language, fall back to the other. */
export const bilingual = (lang: string, ne?: string | null, en?: string | null) =>
  (lang === "en" ? en || ne : ne || en) ?? "";

/** Verses with a sukta heading inserted wherever the sukta changes. */
export function versesToRows(shlokas: readonly Shloka[], text: RowText, keyPrefix = ""): ReaderRow[] {
  const { t, lang, digits } = text;
  const rows: ReaderRow[] = [];
  let current: number | null | undefined;
  for (const shloka of shlokas) {
    const sukta = shloka.sukta_number ?? null;
    if (sukta != null && sukta !== current) {
      const meta = [
        shloka.sukta_rishi ? `${t("documents.sukta_rishi")}: ${suktaAttribution(lang, shloka.sukta_rishi)}` : null,
        shloka.sukta_devata ? `${t("documents.sukta_devata")}: ${suktaAttribution(lang, shloka.sukta_devata)}` : null,
        shloka.sukta_chhanda ? `${t("documents.sukta_chhanda")}: ${suktaAttribution(lang, shloka.sukta_chhanda)}` : null,
      ].filter(Boolean);
      rows.push({
        kind: "sukta",
        key: `${keyPrefix}sukta-${sukta}-${shloka.id}`,
        heading: t("documents.sukta_label", { number: digits(sukta) }),
        meta: meta.length ? meta.join(" · ") : undefined,
      });
    }
    current = sukta;
    rows.push({ kind: "verse", key: `${keyPrefix}v-${shloka.id}`, shloka });
  }
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
    ...versesToRows(chapter.shlokas ?? [], text, `c${chapter.number ?? 0}-`),
  ]);
}
