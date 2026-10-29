/**
 * Documents library page logic, shared by the website (`apps/web/src/pages/Documents.tsx`)
 * and the app (`apps/mobile/app/(tabs)/documents/index.tsx`): the list, the
 * category tabs with their counts, the sections shown for the chosen tab, and
 * the title search.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsKeys, fetchDocuments, type DocumentSummary } from "@vedic-patro/api-client";
import { DOCUMENT_CATEGORY_GROUPS, categoryGroup, type DocumentCategoryGroup, type DocumentCategoryId } from "@vedic-patro/domain/learn/document-categories";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { bilingual } from "./reader-rows";
import type { DocumentLibraryOption } from "./use-document-jump-form";

export type DocumentsTab = "all" | DocumentCategoryId;
export type DocumentsViewMode = "grid" | "list";

/** Titles a hub card lists before "+N more". */
const PREVIEW_TITLES = 3;

export function documentsInGroup(documents: readonly DocumentSummary[], groupId: DocumentCategoryId): DocumentSummary[] {
  return documents.filter((doc) => doc.category === groupId);
}

/** Lower-case, accent-free text for matching typed queries ("ramayana" finds "Rāmāyaṇa"). */
function fold(text: string | null | undefined): string {
  return (text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Documents whose titles or subtitles contain every word of `query`, in library order. */
export function searchDocuments(documents: readonly DocumentSummary[], query: string): DocumentSummary[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return documents.filter((doc) => {
    const hay = fold([doc.title_sa, doc.title_ne, doc.title_en, doc.subtitle_ne, doc.subtitle_en, doc.slug].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** Library titles for the in-reader document picker (same order as `/documents`). */
export function useDocumentLibraryOptions(): DocumentLibraryOption[] {
  const { lang } = useLocale();
  const query = useQuery({
    queryKey: documentsKeys.list(),
    queryFn: fetchDocuments,
    staleTime: 0,
  });
  return useMemo(
    () =>
      (query.data?.documents ?? []).map((doc) => ({
        slug: doc.slug,
        title: bilingual(lang, doc.title_ne, doc.title_en),
      })),
    [query.data?.documents, lang],
  );
}

/** Other documents in a document's own group — the reader's "More in …" shelf. */
export function useDocumentSiblings(slug: string | undefined, category: DocumentCategoryId | undefined) {
  const { t, lang } = useLocale();
  const query = useQuery({
    queryKey: documentsKeys.list(),
    queryFn: fetchDocuments,
    staleTime: 0,
  });
  const group = category ? categoryGroup(category) : undefined;
  const documents = useMemo(
    () => (category ? documentsInGroup(query.data?.documents ?? [], category).filter((doc) => doc.slug !== slug) : []),
    [query.data?.documents, category, slug],
  );
  return {
    group,
    groupName: group ? bilingual(lang, group.ne, group.en) : "",
    title: group ? t("documents.more_in_category", { category: bilingual(lang, group.ne, group.en) }) : "",
    documents,
  };
}

export type DocumentsTopicTile = {
  id: string;
  label: string;
  /** "१" … "१८" on a numbered (canonical) list, else "". */
  numberLabel: string;
  count: number;
  /** "3 texts", or "Coming soon" when nothing is filed under it yet. */
  countLabel: string;
  active: boolean;
  /** A cross-link to another group (Veda → Upanishad) rather than a filter. */
  opens?: DocumentCategoryId;
};

export type DocumentsTopicSet = { id: string; title: string; numbered: boolean; topics: DocumentsTopicTile[] };

export type DocumentsSection = {
  group: DocumentCategoryGroup;
  /** 1-based position among the groups that have documents. */
  index: number;
  indexLabel: string;
  /** Emoji + name, for headings that draw no separate emoji tile. */
  title: string;
  /** Name alone. */
  name: string;
  blurb: string;
  countLabel: string;
  count: number;
  documents: DocumentSummary[];
  /** First few titles, for the hub card. */
  preview: string[];
  /** "+N more" under the preview, or "" when every title is shown. */
  moreLabel: string;
};

export function useDocumentsPage(active: DocumentsTab, search = "", topic?: string) {
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
  const blurbOf = (g: DocumentCategoryGroup) => (g.blurb ? (lang === "en" ? g.blurb.en : g.blurb.ne) : "");

  const sections: DocumentsSection[] = nonEmpty
    .map((e, i) => ({
      group: e.group,
      index: i + 1,
      indexLabel: digits(i + 1),
      title: `${e.group.emoji} ${name(e.group)}`,
      name: name(e.group),
      blurb: blurbOf(e.group),
      countLabel: digits(e.docs.length),
      count: e.docs.length,
      documents: e.docs,
      preview: e.docs.slice(0, PREVIEW_TITLES).map((doc) => bilingual(lang, doc.title_ne, doc.title_en)),
      moreLabel: e.docs.length > PREVIEW_TITLES ? t("documents.more_count", { count: digits(e.docs.length - PREVIEW_TITLES) }) : "",
    }))
    .filter((s) => active === "all" || s.group.id === active);

  const isHub = active === "all";
  const openSection = isHub ? undefined : sections[0];
  const group = openSection?.group;
  const topicOk = group && topic && group.topics.some((x) => x.id === topic && !x.opens) ? topic : undefined;

  /* The open group's topics, in its sets: each tile counts the texts filed
     under it, so an unfiled entry of a canonical list still shows its place. */
  const topicSets: DocumentsTopicSet[] = [];
  if (group && openSection) {
    const sets = group.sets ?? [{ id: "", ne: group.lead?.ne ?? "", en: group.lead?.en ?? "", numbered: false }];
    for (const set of sets) {
      const tiles = group.topics
        .filter((x) => (x.set ?? sets[0]!.id) === set.id)
        .map((x, i): DocumentsTopicTile => {
          const count = x.opens ? (counts[x.opens] ?? 0) : openSection.documents.filter((doc) => doc.subcategory === x.id).length;
          return {
            id: x.id,
            label: lang === "en" ? x.en : x.ne,
            numberLabel: set.numbered ? digits(i + 1) : "",
            count,
            countLabel: count > 0 ? t("documents.docs_in_category", { count: digits(count) }) : t("documents.coming_soon"),
            active: x.id === topicOk,
            opens: x.opens,
          };
        });
      // A canonical list keeps its order; any other puts what is filed first.
      if (!set.numbered) tiles.sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
      if (tiles.length > 0) {
        topicSets.push({ id: set.id, title: (lang === "en" ? set.en : set.ne) || t("documents.topics"), numbered: Boolean(set.numbered), topics: tiles });
      }
    }
  }

  const activeTopic = topicSets.flatMap((set) => set.topics).find((x) => x.active);
  const activeSection = openSection && topicOk
    ? { ...openSection, documents: openSection.documents.filter((doc) => doc.subcategory === topicOk) }
    : openSection;
  const searching = search.trim().length > 0;
  // Search covers the open group only; on the hub it covers the whole library.
  const results = useMemo(
    () => (searching ? searchDocuments(isHub ? documents : documentsInGroup(documents, active as DocumentCategoryId), search) : []),
    [searching, isHub, documents, active, search],
  );

  return {
    copy: {
      title: t("documents.page_title"),
      subtitle: t("documents.page_subtitle"),
      loadError: t("documents.load_error"),
      empty: t("documents.empty"),
      tabsLabel: t("documents.category_tabs_label"),
      hubTitle: t("documents.hub_title"),
      hubSubtitle: t("documents.hub_subtitle"),
      viewGrid: t("documents.view_grid"),
      viewList: t("documents.view_list"),
      viewLabel: t("documents.view_label"),
      openCategory: t("documents.open_category"),
      docsInCategory: (count: number) => t("documents.docs_in_category", { count: digits(count) }),
      chaptersExpand: t("documents.chapters_expand"),
      openDocument: t("documents.open_document"),
      emptyCategory: t("documents.empty_category"),
      library: t("documents.library"),
      allTopics: t("documents.all_topics"),
      allCategories: t("documents.all_categories"),
      searchPlaceholder: isHub
        ? t("documents.search_placeholder")
        : t("documents.search_in_category", { category: activeSection?.name ?? "" }),
      searchClear: t("documents.search_clear"),
      noResults: t("documents.search_empty", { query: search.trim() }),
      resultsLabel: t("documents.search_results", { count: digits(results.length) }),
      /** "42 texts in 9 categories". */
      totals: t("documents.library_totals", { texts: digits(documents.length), categories: digits(nonEmpty.length) }),
    },
    status: statusOf(query) as PageStatus,
    retry: () => void query.refetch(),
    documents,
    counts,
    isHub,
    activeSection,
    topicSets,
    activeTopic,
    searching,
    results,
    tabs: [
      { id: "all" as DocumentsTab, label: t("documents.category.all"), active: active === "all" },
      ...nonEmpty.map((e) => ({
        id: e.group.id as DocumentsTab,
        /* Words only on the chips: an emoji beside a short name ("📖 उपनिषद्") left
           some chips showing just the emoji, and the rest of the app uses line icons. */
        label: name(e.group),
        count: e.docs.length,
        countLabel: digits(e.docs.length),
        active: e.group.id === active,
      })),
    ],
    sections,
  };
}
