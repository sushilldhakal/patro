// Documents (स्तोत्र / शास्त्र) — requests, response types and query keys are
// shared with the website (packages/api-client/src/documents.ts); they go
// through this app's transport, so the offline download answers them too.
import "@/lib/api";

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
export { formatVedaCite } from "@vedic-patro/domain/learn/veda-cite";
