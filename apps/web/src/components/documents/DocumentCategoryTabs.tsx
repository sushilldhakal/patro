import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import { bilingualText, useLocale } from "@/i18n/locale";
import {
  DOCUMENT_CATEGORY_GROUPS,
  type DocumentCategoryGroup,
  type DocumentCategoryId,
} from "@vedic-patro/domain/document-categories";
import { documentsListSearch, type DocumentCategoryTab, type DocumentSummary } from "@/lib/documents-api";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/design-tokens/cn";
import { DocumentCard } from "@vedic-patro/ui/kit/jyotish";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

export type { DocumentCategoryTab };

function formatCount(lang: string, count: number) {
  const text = String(count);
  return lang === "ne" ? toNepaliDigits(text) : text;
}

export function DocumentCategoryTabs({
  activeId,
  counts,
  onSelect,
}: {
  activeId: DocumentCategoryTab;
  counts: Record<DocumentCategoryId, number>;
  onSelect: (id: DocumentCategoryTab) => void;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  return (
    <div
      className={documentsClasses.tabsBar}
      role="tablist"
      aria-label={t("documents.category_tabs_label")}
    >
      <CategoryTab
        selected={activeId === "all"}
        onSelect={() => onSelect("all")}
        label={t("documents.category.all")}
      />
      {DOCUMENT_CATEGORY_GROUPS.filter((group) => (counts[group.id] ?? 0) > 0).map((group) => {
        const count = counts[group.id] ?? 0;
        return (
          <CategoryTab
            key={group.id}
            selected={activeId === group.id}
            onSelect={() => onSelect(group.id)}
            label={`${group.emoji} ${bilingualText(lang, group.ne, group.en)}`}
            count={count > 0 ? formatCount(lang, count) : undefined}
          />
        );
      })}
    </div>
  );
}

function CategoryTab({
  selected,
  onSelect,
  label,
  count,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  count?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        documentsClasses.tab,
        documentsClasses.tabLabel,
        "transition-colors",
        selected
          ? cn(documentsClasses.tabSelected, documentsClasses.tabLabelSelected, "ring-1 ring-border/60")
          : cn(documentsClasses.tabLabelIdle, "hover:text-foreground"),
      )}
    >
      {label}
      {count ? <span className={documentsClasses.tabCount}>{count}</span> : null}
    </button>
  );
}

export function DocumentCategorySection({
  group,
  index,
  documents,
  onSelectGroup,
}: {
  group: DocumentCategoryGroup;
  /** 1-based position in the library outline. */
  index: number;
  documents: DocumentSummary[];
  onSelectGroup: (id: DocumentCategoryId) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lang } = useLocale();
  const name = bilingualText(lang, group.ne, group.en);
  const indexLabel = formatCount(lang, index);

  return (
    <section className="space-y-3" aria-labelledby={`documents-cat-${group.id}`}>
      <div className={documentsClasses.sectionHeader}>
        <h2 id={`documents-cat-${group.id}`} className={documentsClasses.sectionTitle}>
          <button
            type="button"
            onClick={() => onSelectGroup(group.id)}
            className="text-left transition-colors hover:text-secondary"
          >
            <span className={cn(documentsClasses.sectionIndex, "mr-2")}>{indexLabel}.</span>
            <span className="mr-1.5" aria-hidden="true">
              {group.emoji}
            </span>
            {name}
          </button>
        </h2>
        {documents.length > 0 ? (
          <span className={documentsClasses.sectionCount}>
            {formatCount(lang, documents.length)}
          </span>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <p className={documentsClasses.mutedText}>{t("documents.empty_category")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.slug}
              doc={doc}
              category={group.id}
              onPress={() =>
                navigate({
                  to: "/documents/$slug",
                  params: { slug: doc.slug },
                  search: documentsListSearch(group.id),
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
