/**
 * Documents library page logic, shared by the website (`apps/web/src/pages/Documents.tsx`)
 * and the app (`apps/mobile/app/(tabs)/documents/index.tsx`): the list, the
 * category tabs with their counts, and the sections shown for the chosen tab.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsKeys, fetchDocuments, type DocumentSummary } from "@vedic-patro/api-client";
import { DOCUMENT_CATEGORY_GROUPS, type DocumentCategoryGroup, type DocumentCategoryId } from "@vedic-patro/domain/document-categories";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";

export type DocumentsTab = "all" | DocumentCategoryId;

export function documentsInGroup(documents: readonly DocumentSummary[], groupId: DocumentCategoryId): DocumentSummary[] {
  return documents.filter((doc) => doc.category === groupId);
}

export type DocumentsSection = {
  group: DocumentCategoryGroup;
  /** 1-based position among the groups that have documents. */
  index: number;
  indexLabel: string;
  title: string;
  countLabel: string;
  documents: DocumentSummary[];
};

export function useDocumentsPage(active: DocumentsTab) {
  const { t, lang, digits } = useLocale();
  const query = useQuery({
    queryKey: documentsKeys.list(),
    queryFn: fetchDocuments,
    // The list is what changes when a document is added, so unlike a document's
    // own text it is re-checked on every visit (the server answers 'no-cache').
    staleTime: 0,
  });
  const loaded = query.data?.documents;
  const documents = useMemo(() => loaded ?? [], [loaded]);
  const nonEmpty = useMemo(
    () =>
      DOCUMENT_CATEGORY_GROUPS.map((group) => ({ group, docs: documentsInGroup(documents, group.id) })).filter((e) => e.docs.length > 0),
    [documents],
  );
  const counts = useMemo(() => Object.fromEntries(nonEmpty.map((e) => [e.group.id, e.docs.length])) as Record<DocumentCategoryId, number>, [nonEmpty]);
  const name = (g: DocumentCategoryGroup) => (lang === "en" ? g.en : g.ne);

  const sections: DocumentsSection[] = nonEmpty
    .map((e, i) => ({
      group: e.group,
      index: i + 1,
      indexLabel: digits(i + 1),
      title: `${e.group.emoji} ${name(e.group)}`,
      countLabel: digits(e.docs.length),
      documents: e.docs,
    }))
    .filter((s) => active === "all" || s.group.id === active);

  return {
    copy: {
      title: t("documents.page_title"),
      subtitle: t("documents.page_subtitle"),
      loadError: t("documents.load_error"),
      empty: t("documents.empty"),
      tabsLabel: t("documents.category_tabs_label"),
    },
    status: statusOf(query) as PageStatus,
    retry: () => void query.refetch(),
    documents,
    counts,
    tabs: [
      { id: "all" as DocumentsTab, label: t("documents.category.all"), active: active === "all" },
      ...nonEmpty.map((e) => ({
        id: e.group.id as DocumentsTab,
        /* Words only on the chips: an emoji beside a short name ("📖 उपनिषद्") left
           some chips showing just the emoji, and the rest of the app uses line icons. */
        label: name(e.group),
        count: e.docs.length,
        countLabel: digits(e.docs.length),
        active: active === e.group.id,
      })),
    ],
    sections,
  };
}
