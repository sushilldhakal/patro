/**
 * Jump controls for a scripture page: pick any library document, then jump to
 * a verse (by its printed `verse_label`) inside the open document. Shared by
 * the website and the app's `DocumentJumpForm`.
 */
import { useEffect, useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { digitsToLatin } from "../patro-date/calendar-header-model";

/** Same id convention every verse's section gets, for scrolling to it. */
export function shlokaAnchor(verseLabel: string) {
  return `shloka-${verseLabel.trim().replace(/\s+/g, "-")}`;
}

export type DocumentLibraryOption = {
  slug: string;
  title: string;
};

/** Devanagari or Latin digits ("12") → 12; anything that is not all digits is NaN. */
function parseAsciiInt(raw: string): number {
  const digits = digitsToLatin(raw);
  return digits && digits.length === [...raw].length ? Number(digits) : NaN;
}

export function useDocumentJumpForm({
  chapterNumbers,
  currentChapter,
  documents,
  currentSlug,
  onJump,
  onSelectDocument,
}: {
  /** Every valid chapter number in the open document (empty when the doc has none). */
  chapterNumbers: number[];
  /** On a chapter page, verse jumps stay inside this chapter unless the label names another. */
  currentChapter?: number;
  /** Full library list for the document picker. */
  documents?: DocumentLibraryOption[];
  currentSlug?: string;
  /**
   * Go to the chapter (and verse, when typed). `chapter` is 0 when the open
   * document has no chapters — the host then scrolls by verse label alone.
   * Return false when the target couldn't be found.
   */
  onJump: (chapter: number, verse: string) => boolean;
  /** Open another library document. */
  onSelectDocument?: (slug: string) => void;
}) {
  const { t } = useLocale();
  const [chapterInput, setChapterInput] = useState(currentChapter != null ? String(currentChapter) : "");
  const [verseInput, setVerseInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setChapterInput(currentChapter != null ? String(currentChapter) : "");
  }, [currentChapter]);

  const hasDocuments = (documents?.length ?? 0) > 0;
  const hasChapters = chapterNumbers.length > 0;

  const selectDocument = (slug: string) => {
    setNotFound(false);
    if (!slug || slug === currentSlug) return;
    onSelectDocument?.(slug);
  };

  const resolveChapter = (verse: string): number | null => {
    // Flat document (no chapters): verse-only jump — host uses chapter 0.
    if (!hasChapters) return 0;
    if (currentChapter != null) return currentChapter;
    if (chapterInput.trim()) {
      const n = parseAsciiInt(chapterInput.trim());
      return chapterNumbers.includes(n) ? n : null;
    }
    // "5.2" (in either script) → chapter 5
    const head = verse.match(/^([0-9\u0966-\u096F]+)/);
    if (!head) return null;
    const n = parseAsciiInt(head[1]!);
    return chapterNumbers.includes(n) ? n : null;
  };

  const submit = () => {
    setNotFound(false);
    const verse = verseInput.trim();
    const chapter = resolveChapter(verse);
    if (chapter == null) {
      setNotFound(true);
      return;
    }
    // Nothing typed — stay put.
    if (!verse && (currentChapter != null ? chapter === currentChapter : chapter === 0)) return;
    if (!verse && chapter === 0) return;
    setNotFound(!onJump(chapter, verse));
  };

  return {
    hasDocuments,
    documents: documents ?? [],
    currentSlug: currentSlug ?? "",
    selectDocument,
    showChapterField: currentChapter == null && hasChapters && !hasDocuments,
    chapterInput,
    setChapterInput: (value: string) => {
      setChapterInput(value);
      setNotFound(false);
    },
    verseInput,
    setVerseInput: (value: string) => {
      setVerseInput(value);
      setNotFound(false);
    },
    notFound,
    submit,
    copy: {
      documentLabel: t("documents.jump_document_label"),
      chapterLabel: t("documents.jump_chapter_label"),
      verseLabel: t("documents.jump_verse_label"),
      versePlaceholder: t("documents.jump_verse_placeholder"),
      button: t("documents.jump_button"),
      notFound: t("documents.jump_not_found"),
    },
  };
}
