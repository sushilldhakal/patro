import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bilingualText, useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { documentsListSearch, type DocumentCategoryTab, type DocumentSummary } from "@/lib/documents-api";

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
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-secondary/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/10 text-secondary">
          <BookOpen className="size-5" />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-auto flex items-center gap-3 pt-1 text-xs font-semibold text-muted-foreground">
        {doc.has_chapters ? (
          <span>{t("documents.chapters_count", { count: num(doc.chapter_count) })}</span>
        ) : null}
        <span>{t("documents.shlokas_count", { count: num(doc.shloka_count) })}</span>
      </div>
    </Link>
  );
}
