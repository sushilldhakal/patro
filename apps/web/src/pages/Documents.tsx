import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useDocumentsPage } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { PageHeader, PageShell } from "@/components/PageShell";
import {
  DocumentCategoryChips,
  DocumentCategoryGrid,
  DocumentCategoryHero,
  DocumentCategoryHub,
  DocumentLibraryList,
  DocumentRows,
  DocumentTopicPanel,
  DocumentsBreadcrumb,
  DocumentsToolbar,
} from "@/components/documents/DocumentLibraryViews";
import { documentsListSearch, type DocumentsViewMode } from "@/lib/documents-api";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/documents");

/**
 * Documents library — the website's drawing of `useDocumentsPage` (@vedic-patro/features).
 *
 * "All" is a hub: category cards (card view) or the whole library as nested
 * accordions down to each chapter (list view). A category opens on its own page
 * with a breadcrumb back and a chip row to hop to the next one. Search filters
 * titles across the library, or inside the open category.
 */
export function Documents() {
  const { category: activeCategory, topic, view: viewParam } = routeApi.useSearch();
  const view: DocumentsViewMode = viewParam === "list" ? "list" : "grid";
  const navigate = routeApi.useNavigate();
  // A search typed in one category means nothing in the next, so it is kept
  // together with the category it was typed in and dropped when that changes.
  const [typed, setTyped] = useState({ category: activeCategory, text: "" });
  const search = typed.category === activeCategory ? typed.text : "";
  const setSearch = (text: string) => setTyped({ category: activeCategory, text });
  const page = useDocumentsPage(activeCategory, search, topic);
  useRouteLoading(page.status === "loading");

  const setView = (next: DocumentsViewMode) =>
    navigate({ search: documentsListSearch(activeCategory, topic, next), replace: true });

  const section = page.activeSection;

  return (
    <PageShell showRelatedLinks={false} className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <PageHeader icon={<BookOpen className="size-6 text-secondary" />} title={page.copy.title} subtitle={page.copy.subtitle} />

      {page.status === "error" ? (
        <p className={documentsClasses.errorText}>{page.copy.loadError}</p>
      ) : page.status === "ready" && page.documents.length === 0 ? (
        <p className={documentsClasses.mutedText}>{page.copy.empty}</p>
      ) : (
        <div className="space-y-5">
          {section ? (
            <div className="space-y-4">
              <DocumentsBreadcrumb
                crumbs={[
                  { label: page.copy.library, category: "all" },
                  ...(page.activeTopic ? [{ label: section.name, category: section.group.id }] : []),
                ]}
                current={page.activeTopic?.label ?? section.name}
                view={view}
              />
              <DocumentCategoryHero section={section} countLabel={page.copy.docsInCategory(page.counts[section.group.id] ?? section.count)} />
              <DocumentCategoryChips tabs={page.tabs} label={page.copy.tabsLabel} view={view} />
              <DocumentTopicPanel
                sets={page.topicSets}
                category={section.group.id}
                view={view}
                resetLabel={page.copy.allTopics}
                showReset={Boolean(page.activeTopic)}
              />
            </div>
          ) : null}

          <DocumentsToolbar
            search={search}
            onSearch={setSearch}
            placeholder={page.copy.searchPlaceholder}
            clearLabel={page.copy.searchClear}
            view={view}
            onView={setView}
            gridLabel={page.copy.viewGrid}
            listLabel={page.copy.viewList}
            viewLabel={page.copy.viewLabel}
          />

          {page.searching ? (
            <section className="space-y-3" aria-live="polite">
              <p className={documentsClasses.totals}>{page.copy.resultsLabel}</p>
              {page.results.length === 0 ? (
                <p className={documentsClasses.mutedText}>{page.copy.noResults}</p>
              ) : view === "grid" ? (
                <DocumentCategoryGrid documents={page.results} category={activeCategory} view={view} />
              ) : (
                <DocumentRows documents={page.results} category={activeCategory} view={view} showCategory={page.isHub} />
              )}
            </section>
          ) : section ? (
            view === "list" ? (
              <DocumentRows documents={section.documents} category={section.group.id} view={view} />
            ) : (
              <DocumentCategoryGrid documents={section.documents} category={section.group.id} view={view} />
            )
          ) : page.status !== "ready" ? null : !page.isHub ? (
            <p className={documentsClasses.mutedText}>{page.copy.emptyCategory}</p>
          ) : (
            <section className="space-y-4">
              <div className={documentsClasses.hubHead}>
                <div>
                  <h2 className={documentsClasses.sectionTitle}>{page.copy.hubTitle}</h2>
                  <p className={documentsClasses.mutedText}>{page.copy.hubSubtitle}</p>
                </div>
                <p className={documentsClasses.totals}>{page.copy.totals}</p>
              </div>
              {view === "list" ? (
                <DocumentLibraryList sections={page.sections} view={view} countLabel={page.copy.docsInCategory} />
              ) : (
                <DocumentCategoryHub sections={page.sections} view={view} countLabel={page.copy.docsInCategory} openLabel={page.copy.openCategory} />
              )}
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}

export default Documents;
