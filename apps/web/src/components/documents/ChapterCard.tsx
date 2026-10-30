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

/** One card in a chaptered document's chapter grid: number, title, verse count. */
export function ChapterCard({ slug, card, category, topic }: Props) {
  const title = card.title || card.heading;
  return (
    <Link
      to="/documents/$slug/$chapter"
      params={{ slug, chapter: String(card.number) }}
      search={category ? documentsListSearch(category, topic) : undefined}
      className={cn(documentsClasses.sectionCard, "group transition-colors hover:border-secondary/60 hover:bg-secondary/5")}
    >
      <span className={documentsClasses.sectionCardTop}>
        <span className={documentsClasses.sectionCardNumber} aria-hidden="true">
          {card.numberLabel}
        </span>
        <ChevronRight className={documentsClasses.rowChevron} aria-hidden="true" />
      </span>
      <p className={documentsClasses.sectionCardTitle}>{title}</p>
      {card.count ? <p className={documentsClasses.sectionCardCount}>{card.count}</p> : null}
    </Link>
  );
}
