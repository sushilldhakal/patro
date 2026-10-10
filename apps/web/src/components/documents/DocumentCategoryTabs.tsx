import { useTranslation } from "react-i18next";
import { bilingualText, useLocale } from "@/i18n/locale";
import {
  DOCUMENT_CATEGORY_GROUPS,
  type DocumentCategoryGroup,
  type DocumentCategoryId,
} from "@/lib/document-categories";
import type { DocumentCategoryTab, DocumentSummary } from "@/lib/documents-api";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/domain/utils";
import { DocumentCard } from "@/components/documents/DocumentCard";

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
      className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1"
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
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        selected
          ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count ? <span className="ml-1.5 tabular-nums text-xs font-medium text-muted-foreground">{count}</span> : null}
    </button>
  );
}

export function documentsInGroup(documents: DocumentSummary[], groupId: DocumentCategoryId) {
  return documents.filter((doc) => doc.category === groupId);
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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const name = bilingualText(lang, group.ne, group.en);
  const indexLabel = formatCount(lang, index);

  return (
    <section className="space-y-3" aria-labelledby={`documents-cat-${group.id}`}>
      <div className="flex items-end justify-between gap-3 border-b border-border/70 pb-2">
        <h2 id={`documents-cat-${group.id}`} className="text-lg font-bold">
          <button
            type="button"
            onClick={() => onSelectGroup(group.id)}
            className="text-left transition-colors hover:text-secondary"
          >
            <span className="mr-2 tabular-nums text-muted-foreground">{indexLabel}.</span>
            <span className="mr-1.5" aria-hidden="true">
              {group.emoji}
            </span>
            {name}
          </button>
        </h2>
        {documents.length > 0 ? (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {formatCount(lang, documents.length)}
          </span>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("documents.empty_category")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.slug} doc={doc} category={group.id} />
          ))}
        </div>
      )}
    </section>
  );
}
