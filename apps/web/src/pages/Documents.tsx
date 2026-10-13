import { getRouteApi } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useDocumentsPage } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { PageHeader, PageShell } from "@/components/PageShell";
import { DocumentCategorySection, DocumentCategoryTabs } from "@/components/documents/DocumentCategoryTabs";
import type { DocumentCategoryTab } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/documents");

/** Documents library — the website's drawing of `useDocumentsPage` (@vedic-patro/features). */
export function Documents() {
  const { category: activeCategory } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const setFilter = (category: DocumentCategoryTab) => navigate({ search: { category }, replace: true });
  const page = useDocumentsPage(activeCategory);
  useRouteLoading(page.status === "loading");

  return (
    <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <PageHeader icon={<BookOpen className="size-6 text-secondary" />} title={page.copy.title} subtitle={page.copy.subtitle} />

      {page.status === "error" ? (
        <p className={documentsClasses.errorText}>{page.copy.loadError}</p>
      ) : page.status === "ready" && page.documents.length === 0 ? (
        <p className={documentsClasses.mutedText}>{page.copy.empty}</p>
      ) : (
        <>
          <DocumentCategoryTabs activeId={activeCategory} counts={page.counts} onSelect={setFilter} />
          <div className="space-y-10">
            {page.sections.map((section) => (
              <DocumentCategorySection
                key={section.group.id}
                group={section.group}
                index={section.index}
                documents={section.documents}
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
