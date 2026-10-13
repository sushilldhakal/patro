import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bilingualText, useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const num = (n: number) => (lang === "ne" ? toNepaliDigits(String(n)) : String(n));
  const title = bilingualText(lang, doc.title_ne, doc.title_en);
  const subtitle = bilingualText(lang, doc.subtitle_ne, doc.subtitle_en);
  const description = bilingualText(lang, doc.description_ne, doc.description_en);

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
        {doc.has_chapters ? (
          <span>{t("documents.chapters_count", { count: num(doc.chapter_count) })}</span>
        ) : null}
        <span>{t("documents.shlokas_count", { count: num(doc.shloka_count) })}</span>
      </div>
    </Link>
  );
}
