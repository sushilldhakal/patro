import type { DocumentChapter, Shloka } from "@/lib/documents/api";

export type ReaderRow =
  | { kind: "chapter"; key: string; chapter: DocumentChapter }
  | {
      kind: "sukta";
      key: string;
      number: number;
      rishi: string | null;
      devata: string | null;
      chhanda: string | null;
    }
  | { kind: "verse"; key: string; shloka: Shloka };

/** Flatten shlokas into list rows, inserting a header whenever the sukta changes (Rigveda: Mandala → Sukta → rik). */
export function versesToRows(shlokas: Shloka[], keyPrefix = ""): ReaderRow[] {
  const rows: ReaderRow[] = [];
  let currentSukta: number | null | undefined;
  for (const shloka of shlokas) {
    const sukta = shloka.sukta_number ?? null;
    if (sukta != null && sukta !== currentSukta) {
      rows.push({
        kind: "sukta",
        key: `${keyPrefix}sukta-${sukta}-${shloka.id}`,
        number: sukta,
        rishi: shloka.sukta_rishi ?? null,
        devata: shloka.sukta_devata ?? null,
        chhanda: shloka.sukta_chhanda ?? null,
      });
    }
    currentSukta = sukta;
    rows.push({ kind: "verse", key: `${keyPrefix}v-${shloka.id}`, shloka });
  }
  return rows;
}

/** Rows for a document that embeds every chapter on one page. */
export function inlineChapterRows(chapters: DocumentChapter[]): ReaderRow[] {
  return chapters.flatMap((chapter) => [
    ...(chapter.number != null
      ? [{ kind: "chapter" as const, key: `chapter-${chapter.number}`, chapter }]
      : []),
    ...versesToRows(chapter.shlokas ?? [], `c${chapter.number ?? 0}-`),
  ]);
}

export function findVerseRow(rows: ReaderRow[], verseLabel: string): number {
  const wanted = verseLabel.trim();
  return rows.findIndex((r) => r.kind === "verse" && r.shloka.verse_label.trim() === wanted);
}
