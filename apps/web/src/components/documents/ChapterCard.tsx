import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bilingualText, useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { documentsListSearch, type DocumentCategoryTab, type DocumentChapter } from "@/lib/documents-api";

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
      className="group flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-secondary/60 hover:bg-secondary/5"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary/10 text-sm font-bold tabular-nums text-secondary">
        {num(chapter.number)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {t("documents.chapter_label", { number: num(chapter.number) })}
        </p>
        {title ? <p className="truncate text-sm text-muted-foreground">{title}</p> : null}
        {chapter.shloka_count != null ? (
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {t("documents.shlokas_count", { count: num(chapter.shloka_count) })}
          </p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
    </Link>
  );
}
