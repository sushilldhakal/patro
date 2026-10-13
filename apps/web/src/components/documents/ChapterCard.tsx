import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { bilingualText, useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { documentsListSearch, type DocumentCategoryTab, type DocumentChapter } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

interface Props {
  slug: string;
  chapter: DocumentChapter;
  category?: DocumentCategoryTab;
  topic?: string;
}

/** One row in a chaptered document's chapter picker — links into that chapter's verses. */
export function ChapterCard({ slug, chapter, category, topic }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const num = (n: number) => (lang === "ne" ? toNepaliDigits(String(n)) : String(n));
  const title = bilingualText(lang, chapter.title_ne, chapter.title_en);

  if (chapter.number == null) return null;

  return (
    <Link
      to="/documents/$slug/$chapter"
      params={{ slug, chapter: String(chapter.number) }}
      search={category ? documentsListSearch(category, topic) : undefined}
      className={cn(documentsClasses.chapterRow, "group transition-colors hover:border-secondary/60 hover:bg-secondary/5")}
    >
      <div className={cn(documentsClasses.chapterRowNumber, documentsClasses.chapterRowNumberText)}>
        {num(chapter.number)}
      </div>
      <div className={documentsClasses.fill}>
        <p className={cn(documentsClasses.chapterRowTitle, "truncate")}>
          {t("documents.chapter_label", { number: num(chapter.number) })}
        </p>
        {title ? <p className={cn(documentsClasses.chapterRowSub, "truncate")}>{title}</p> : null}
        {chapter.shloka_count != null ? (
          <p className={documentsClasses.chapterRowCount}>
            {t("documents.shlokas_count", { count: num(chapter.shloka_count) })}
          </p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
    </Link>
  );
}
