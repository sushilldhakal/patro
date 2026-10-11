// Documents (शोत्र/स्तोत्र) — the website's URL state for the library pages.
// The requests themselves are shared with the app (re-exported below).
// Configures the shared client's transport before any documents request.
import "@/lib/api";
import type { DocumentCategory } from "@vedic-patro/api-client";
import {
  isDocumentCategoryId,
  isTopicOf,
} from "@vedic-patro/domain/document-categories";

export type DocumentCategoryTab = "all" | DocumentCategory;

/** Older list URLs, from before the library was split into the ten groups. */
const LEGACY_CATEGORY_TABS: Record<string, DocumentCategoryTab> = {
  shruti: "veda",
  scripture: "all",
  itihasa: "purana",
};

function toCategoryTab(value: unknown): DocumentCategoryTab | undefined {
  if (value === "all") return "all";
  if (typeof value !== "string") return undefined;
  if (isDocumentCategoryId(value)) return value;
  return LEGACY_CATEGORY_TABS[value];
}

function toTopic(category: DocumentCategoryTab, value: unknown): string | undefined {
  if (category === "all" || typeof value !== "string") return undefined;
  return isTopicOf(category, value) ? value : undefined;
}

export interface DocumentsListSearch {
  category: DocumentCategoryTab;
  /** Topic inside `category`. Absent on "all" and when the whole group is open. */
  topic?: string;
}

/** The list page's active category — kept in the URL so it survives a reload/share and so leaving a document can return to the same place. */
export function validateDocumentsListSearch(search: Record<string, unknown>): DocumentsListSearch {
  const category = toCategoryTab(search.category) ?? "all";
  const topic = toTopic(category, search.topic);
  return topic ? { category, topic } : { category };
}

export interface DocumentDetailSearch {
  /** Which list-page group this document was opened from, so its "back" link can return there. Absent for a direct/deep link. */
  category?: DocumentCategoryTab;
  topic?: string;
}

export function validateDocumentDetailSearch(search: Record<string, unknown>): DocumentDetailSearch {
  const category = toCategoryTab(search.category);
  if (!category || category === "all") return {};
  const topic = toTopic(category, search.topic);
  return topic ? { category, topic } : { category };
}

/** Search object for a link back to the library, dropping a topic that doesn't belong to the group. */
export function documentsListSearch(
  category: DocumentCategoryTab = "all",
  topic?: string,
): DocumentsListSearch {
  if (category === "all" || !topic || !isTopicOf(category, topic)) return { category };
  return { category, topic };
}

// Requests, response types and query keys are shared with the app — see
// packages/api-client/src/documents.ts.
export {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocuments,
  fetchDocumentDetail,
  fetchDocumentChapter,
  flattenShlokas,
  vedaDailyKeys,
  fetchVedaDaily,
  isNotFound,
} from "@vedic-patro/api-client";
export type {
  DocumentCategory,
  DocumentSummary,
  Shloka,
  DocumentChapter,
  DocumentDetail,
  DocumentChapterDetail,
  VedaDaily,
} from "@vedic-patro/api-client";
export { formatVedaCite } from "@vedic-patro/domain/veda-cite";
