import { useMemo } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { BookOpen } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageShell";
import {
  DocumentCategorySection,
  DocumentCategoryTabs,
} from "@/components/documents/DocumentCategoryTabs";
import { documentsInGroup } from "@/components/documents/documents-in-group";
import { DOCUMENT_CATEGORY_GROUPS, type DocumentCategoryId } from "@vedic-patro/domain/document-categories";
import {
  documentsKeys,
  fetchDocuments,
  type DocumentCategoryTab,
} from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

const routeApi = getRouteApi("/documents");

export function Documents() {
  const { t } = useTranslation();
  const { category: activeCategory } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const setFilter = (category: DocumentCategoryTab) =>
    navigate({ search: { category }, replace: true });

  const docsQ = useQuery({
    queryKey: documentsKeys.list(),
    queryFn: fetchDocuments,
    // The list is what changes when a document is added, so unlike a document's
    // own text it is re-checked on every visit (the server answers 'no-cache').
    staleTime: 0,
  });

  useRouteLoading(docsQ.isLoading);

  const loadedDocuments = docsQ.data?.documents;
  const documents = useMemo(() => loadedDocuments ?? [], [loadedDocuments]);
  const counts = useMemo(() => {
    const next = {} as Record<DocumentCategoryId, number>;
    for (const group of DOCUMENT_CATEGORY_GROUPS) {
      next[group.id] = documentsInGroup(documents, group.id).length;
    }
    return next;
  }, [documents]);

  const groups =
    activeCategory === "all"
      ? DOCUMENT_CATEGORY_GROUPS.filter((group) => (counts[group.id] ?? 0) > 0)
      : DOCUMENT_CATEGORY_GROUPS.filter((group) => group.id === activeCategory);

  return (
    <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <PageHeader
        icon={<BookOpen className="size-6 text-secondary" />}
        title={t("documents.page_title")}
        subtitle={t("documents.page_subtitle")}
      />

      {docsQ.isError ? (
        <p className={documentsClasses.errorText}>{t("documents.load_error")}</p>
      ) : !docsQ.isLoading && documents.length === 0 ? (
        <p className={documentsClasses.mutedText}>{t("documents.empty")}</p>
      ) : (
        <>
          <DocumentCategoryTabs activeId={activeCategory} counts={counts} onSelect={setFilter} />
          <div className="space-y-10">
            {groups.map((group) => (
              <DocumentCategorySection
                key={group.id}
                group={group}
                index={
                  DOCUMENT_CATEGORY_GROUPS.filter((item) => (counts[item.id] ?? 0) > 0).findIndex(
                    (item) => item.id === group.id,
                  ) + 1
                }
                documents={documentsInGroup(documents, group.id)}
                onSelectGroup={(id) => setFilter(id)}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

export default Documents;
