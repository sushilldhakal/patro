/**
 * The "go to chapter & verse" form of a chaptered scripture, shared by the
 * website's and the app's `components/documents/DocumentJumpForm.tsx`: the two
 * fields, validating the chapter against the document's real list, the
 * not-found state, and copy. The verse matches a shloka's printed
 * `verse_label` exactly. Each app does the jump itself (navigate, or scroll
 * within the open chapter) and says whether the target was found.
 */
import { useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";

/** Same id convention every verse's section gets, for scrolling to it. */
export function shlokaAnchor(verseLabel: string) {
  return `shloka-${verseLabel.trim().replace(/\s+/g, "-")}`;
}

export function useDocumentJumpForm({
  chapterNumbers,
  currentChapter,
  onJump,
}: {
  /** Every valid chapter number, for validating the typed chapter. */
  chapterNumbers: number[];
  /** On a chapter page the chapter field is hidden and fixed to this. */
  currentChapter?: number;
  /** Go to the chapter (and verse, when typed); false when the target couldn't be found. */
  onJump: (chapter: number, verse: string) => boolean;
}) {
  const { t } = useLocale();
  const [chapterInput, setChapterInput] = useState(currentChapter != null ? String(currentChapter) : "");
  const [verseInput, setVerseInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  const submit = () => {
    setNotFound(false);
    const chapter = currentChapter ?? Number(chapterInput);
    // currentChapter is already known-valid (the page is showing it) — only a
    // typed chapter number needs checking against the document's real list.
    if (currentChapter == null && !chapterNumbers.includes(chapter)) {
      setNotFound(true);
      return;
    }
    const verse = verseInput.trim();
    if (currentChapter != null && !verse) return;
    setNotFound(!onJump(chapter, verse));
  };

  return {
    showChapter: currentChapter == null,
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
      chapterLabel: t("documents.jump_chapter_label"),
      verseLabel: t("documents.jump_verse_label"),
      versePlaceholder: t("documents.jump_verse_placeholder"),
      button: t("documents.jump_button"),
      notFound: t("documents.jump_not_found"),
    },
  };
}
