import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { DocumentChapterCard } from "@vedic-patro/features/documents";
import { documentsListSearch, type DocumentCategoryTab } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

interface Props {
  slug: string;
  card: DocumentChapterCard;
  category?: DocumentCategoryTab;
  topic?: string;
}

/** One row in a chaptered document's chapter picker — links into that chapter's verses. */
export function ChapterCard({ slug, card, category, topic }: Props) {
  return (
    <Link
      to="/documents/$slug/$chapter"
      params={{ slug, chapter: String(card.number) }}
      search={category ? documentsListSearch(category, topic) : undefined}
      className={cn(documentsClasses.chapterRow, "group transition-colors hover:border-secondary/60 hover:bg-secondary/5")}
    >
      <div className={cn(documentsClasses.chapterRowNumber, documentsClasses.chapterRowNumberText)}>{card.numberLabel}</div>
      <div className={documentsClasses.fill}>
        <p className={cn(documentsClasses.chapterRowTitle, "truncate")}>{card.heading}</p>
        {card.title ? <p className={cn(documentsClasses.chapterRowSub, "truncate")}>{card.title}</p> : null}
        {card.count ? <p className={documentsClasses.chapterRowCount}>{card.count}</p> : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
    </Link>
  );
}
