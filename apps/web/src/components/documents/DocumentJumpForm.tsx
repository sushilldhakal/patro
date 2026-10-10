import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@vedic-patro/domain/utils";
import { documentsListSearch, type DocumentCategoryTab } from "@/lib/documents-api";

/** Same id convention ShlokaCard gives every verse's <section>. */
function shlokaAnchor(verseLabel: string) {
  return `shloka-${verseLabel.trim().replace(/\s+/g, "-")}`;
}

interface Props {
  slug: string;
  /** List-page group this document was opened from — carried into the navigation. */
  category?: DocumentCategoryTab;
  topic?: string;
  /** Every valid chapter number for this document, for validating the input. */
  chapterNumbers: number[];
  /**
   * Present on a single-chapter page — the chapter field is hidden and fixed
   * to this value, so only a verse reference needs typing. Jumping within
   * the same chapter scrolls in place instead of navigating.
   */
  currentChapter?: number;
}

/**
 * A small "go to chapter & verse" form for a chaptered scripture (Rigveda,
 * Yajurveda, the Gita, …) — lets a reader jump straight to a verse instead of
 * paging through chapters. The verse field matches a shloka's `verse_label`
 * exactly (e.g. "5.2" for a Rigveda rik, "12" for a Yajurveda mantra), the
 * same reference already printed next to each verse.
 */
export function DocumentJumpForm({ slug, category, topic, chapterNumbers, currentChapter }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [chapterInput, setChapterInput] = useState(
    currentChapter != null ? String(currentChapter) : "",
  );
  const [verseInput, setVerseInput] = useState("");
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotFound(false);

    const chapterNum = currentChapter ?? Number(chapterInput);
    // currentChapter is already known-valid (we're rendering it) — only a
    // typed chapter number needs checking against the document's real list.
    if (currentChapter == null && !chapterNumbers.includes(chapterNum)) {
      setNotFound(true);
      return;
    }

    const verse = verseInput.trim();
    const hash = verse ? shlokaAnchor(verse) : undefined;

    if (currentChapter != null && chapterNum === currentChapter) {
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) {
        setNotFound(true);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    navigate({
      to: "/documents/$slug/$chapter",
      params: { slug, chapter: String(chapterNum) },
      search: category ? documentsListSearch(category, topic) : undefined,
      hash,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      {currentChapter == null ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("documents.jump_chapter_label")}
          </span>
          <Input
            inputMode="numeric"
            value={chapterInput}
            onChange={(e) => {
              setChapterInput(e.target.value);
              setNotFound(false);
            }}
            className="w-20"
            aria-label={t("documents.jump_chapter_label")}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("documents.jump_verse_label")}
        </span>
        <Input
          value={verseInput}
          onChange={(e) => {
            setVerseInput(e.target.value);
            setNotFound(false);
          }}
          placeholder={t("documents.jump_verse_placeholder")}
          className="w-28"
          aria-label={t("documents.jump_verse_label")}
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" className="gap-1.5">
        <Search className="size-3.5" />
        {t("documents.jump_button")}
      </Button>
      {notFound ? (
        <p className={cn("basis-full text-xs text-destructive")}>
          {t("documents.jump_not_found")}
        </p>
      ) : null}
    </form>
  );
}
