// Documents (स्तोत्र / शास्त्र) — Sanskrit scripture text, meanings and
// per-verse audio. Mirrors dhakal-patro/src/lib/documents-api.ts.
import { offlineAwareGet } from "@/lib/offline/offline-http";
import { DATA_BASE } from "@/lib/api";
import type { DocumentCategoryId } from "@/lib/documents/categories";

/** Scripture text rarely changes; keep it fresh for an hour once fetched. */
export const DOCUMENTS_STALE_TIME = 60 * 60 * 1000;

export type DocumentCategory = DocumentCategoryId;

export interface DocumentSummary {
  slug: string;
  order_index: number;
  category: DocumentCategory;
  subcategory?: string | null;
  title_sa: string;
  title_ne: string;
  title_en: string;
  subtitle_ne?: string | null;
  subtitle_en?: string | null;
  description_ne?: string | null;
  description_en?: string | null;
  cover_image_url?: string | null;
  has_chapters: boolean;
  inline_chapters?: boolean;
  chapter_count: number;
  shloka_count: number;
  full_audio_url?: string | null;
}

export interface Shloka {
  id: number;
  global_order: number;
  verse_number: number;
  verse_label: string;
  sukta_number?: number | null;
  sukta_rishi?: string | null;
  sukta_devata?: string | null;
  sukta_chhanda?: string | null;
  sanskrit: string;
  transliteration?: string | null;
  meaning_ne?: string | null;
  meaning_en?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  full_audio_start?: number | null;
  full_audio_end?: number | null;
}

export interface DocumentChapter {
  number: number | null;
  title_ne?: string | null;
  title_en?: string | null;
  shlokas?: Shloka[];
  shloka_count?: number;
}

export interface DocumentDetail extends DocumentSummary {
  source_ne?: string | null;
  source_en?: string | null;
  chapters: DocumentChapter[];
}

export interface DocumentChapterDetail extends DocumentSummary {
  source_ne?: string | null;
  source_en?: string | null;
  chapter: {
    number: number | null;
    title_ne?: string | null;
    title_en?: string | null;
    shlokas: Shloka[];
  };
}

export class DocumentsApiError extends Error {
  constructor(
    public status: number,
    public path: string,
  ) {
    super(`API ${status}: ${path}`);
  }
}

async function get<T>(path: string): Promise<T> {
  return offlineAwareGet<T>(
    path,
    () => fetch(`${DATA_BASE}${path}`),
    (res) => new DocumentsApiError(res.status, path),
  );
}

// Keep in step with DOCUMENTS_LIST_CACHE_VERSION in the web client.
const DOCUMENTS_LIST_CACHE_VERSION = "6";

export const documentsKeys = {
  list: () => ["documents", "list", DOCUMENTS_LIST_CACHE_VERSION] as const,
  detail: (slug: string) => ["documents", "detail", slug] as const,
  chapter: (slug: string, chapterNumber: number) =>
    ["documents", "detail", slug, "chapter", chapterNumber, DOCUMENTS_LIST_CACHE_VERSION] as const,
};

export const fetchDocuments = () =>
  get<{ count: number; documents: DocumentSummary[] }>(
    `/documents?v=${DOCUMENTS_LIST_CACHE_VERSION}`,
  );

export const fetchDocumentDetail = (slug: string) =>
  get<DocumentDetail>(`/documents/${encodeURIComponent(slug)}`);

export const fetchDocumentChapter = (slug: string, chapterNumber: number) =>
  get<DocumentChapterDetail>(
    `/documents/${encodeURIComponent(slug)}/chapters/${chapterNumber}`,
  );

export function flattenShlokas(doc: DocumentDetail): Shloka[] {
  return doc.chapters.flatMap((c) => c.shlokas ?? []);
}

export function isNotFound(error: unknown): boolean {
  return error instanceof DocumentsApiError && error.status === 404;
}
