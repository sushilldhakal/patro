import { Link } from "@tanstack/react-router";
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

/** One title card in a chaptered document's multi-column section picker. */
export function ChapterCard({ slug, card, category, topic }: Props) {
  const title = card.title || card.heading;
  return (
    <Link
      to="/documents/$slug/$chapter"
      params={{ slug, chapter: String(card.number) }}
      search={category ? documentsListSearch(category, topic) : undefined}
      className={cn(documentsClasses.sectionCard, "transition-colors hover:border-secondary/60 hover:bg-secondary/5")}
    >
      <p className={documentsClasses.sectionCardTitle}>{title}</p>
      {card.count ? <p className={documentsClasses.sectionCardCount}>{card.count}</p> : null}
    </Link>
  );
}
