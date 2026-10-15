import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { shlokaAnchor, useDocumentJumpForm } from "@vedic-patro/features/documents";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@vedic-patro/domain/utils";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { documentsListSearch, type DocumentCategoryTab } from "@/lib/documents-api";

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
  const navigate = useNavigate();
  const form = useDocumentJumpForm({
    chapterNumbers,
    currentChapter,
    onJump: (chapter, verse) => {
      const hash = verse ? shlokaAnchor(verse) : undefined;
      // Within the open chapter: scroll in place.
      if (currentChapter != null && chapter === currentChapter) {
        const el = hash ? document.getElementById(hash) : null;
        if (!el) return false;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      navigate({
        to: "/documents/$slug/$chapter",
        params: { slug, chapter: String(chapter) },
        search: category ? documentsListSearch(category, topic) : undefined,
        hash,
      });
      return true;
    },
  });
  const { copy } = form;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <form onSubmit={handleSubmit} className={documentsClasses.jumpForm}>
      {form.showChapter ? (
        <label className={documentsClasses.jumpField}>
          <span className={documentsClasses.jumpLabel}>{copy.chapterLabel}</span>
          <Input
            inputMode="numeric"
            value={form.chapterInput}
            onChange={(e) => form.setChapterInput(e.target.value)}
            className={documentsClasses.jumpChapterInput}
            aria-label={copy.chapterLabel}
          />
        </label>
      ) : null}
      <label className={documentsClasses.jumpField}>
        <span className={documentsClasses.jumpLabel}>{copy.verseLabel}</span>
        <Input
          value={form.verseInput}
          onChange={(e) => form.setVerseInput(e.target.value)}
          placeholder={copy.versePlaceholder}
          className={documentsClasses.jumpVerseInput}
          aria-label={copy.verseLabel}
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" className="gap-1.5">
        <Search className="size-3.5" />
        {copy.button}
      </Button>
      {form.notFound ? (
        <p className={cn("basis-full", documentsClasses.jumpError)}>{copy.notFound}</p>
      ) : null}
    </form>
  );
}
