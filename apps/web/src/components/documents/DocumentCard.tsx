import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight } from "lucide-react";
import { useDocumentCard } from "@vedic-patro/features/documents";
import { documentsListSearch, type DocumentCategoryTab, type DocumentSummary } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

interface Props {
  doc: DocumentSummary;
  /** The list page's active group — carried into the link so its "back" navigation returns here. */
  category?: DocumentCategoryTab;
  /** Topic filter that was open when this card was clicked. */
  topic?: string;
}

export function DocumentCard({ doc, category, topic }: Props) {
  const { title, subtitle, description, meta } = useDocumentCard(doc);

  return (
    <Link
      to="/documents/$slug"
      params={{ slug: doc.slug }}
      search={category && category !== "all" ? documentsListSearch(category, topic) : undefined}
      className={cn(documentsClasses.card, "group transition-colors hover:border-secondary/60")}
    >
      <div className={documentsClasses.cardTop}>
        <div className={cn(documentsClasses.cardIcon, "text-secondary")}>
          <BookOpen className="size-5" />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <h2 className={documentsClasses.cardTitle}>{title}</h2>
        {subtitle ? <p className={documentsClasses.cardSubtitle}>{subtitle}</p> : null}
      </div>
      {description ? (
        <p className={cn(documentsClasses.cardDescription, "line-clamp-2")}>{description}</p>
      ) : null}
      <div className={cn(documentsClasses.cardMeta, documentsClasses.cardMetaText, "mt-auto")}>
        {meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </Link>
  );
}
