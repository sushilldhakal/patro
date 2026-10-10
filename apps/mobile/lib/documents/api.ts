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
  /** Samhita verse this shloka quotes, `rigveda:1.1.3`. */
  veda_cite?: string | null;
  sanskrit: string;
  transliteration?: string | null;
  meaning_ne?: string | null;
  meaning_en?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  full_audio_start?: number | null;
  full_audio_end?: number | null;
}

const VEDA_CITE_NAMES: Record<string, { ne: string; en: string }> = {
  rigveda: { ne: "ऋग्वेद", en: "Rigveda" },
  yajurveda: { ne: "यजुर्वेद", en: "Yajurveda" },
  samaveda: { ne: "सामवेद", en: "Samaveda" },
  atharvaveda: { ne: "अथर्ववेद", en: "Atharvaveda" },
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** "rigveda:1.1.3" → "ऋग्वेद १.१.३" or "Rigveda 1.1.3". */
export function formatVedaCite(cite: string | null | undefined, lang: string): string | null {
  if (!cite) return null;
  const split = cite.indexOf(":");
  if (split <= 0) return null;
  const name = VEDA_CITE_NAMES[cite.slice(0, split)];
  const loc = cite.slice(split + 1);
  if (!name || !loc) return null;
  const shown =
    lang === "ne" ? loc.replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)] ?? digit) : loc;
  return `${name[lang === "ne" ? "ne" : "en"]} ${shown}`;
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

// ─── Veda mantra of the day ──────────────────────────────────────────────────

export interface VedaDaily {
  date: string;
  veda: { slug: string; name_ne: string; name_en: string };
  source_ne?: string | null;
  source_en?: string | null;
  /** Citation trail, e.g. मण्डल 3 » सूक्त 27 » मन्त्र 1 — the first part has no value (its label is the chapter). */
  source_parts: { label_ne: string | null; label_en: string | null; value: string | number | null }[];
  read_slug: string;
  read_chapter: number;
  read_verse: string;
  shloka: Shloka;
}

export const vedaDailyKeys = {
  day: (dateAd: string) => ["veda", "daily", dateAd] as const,
};

export const fetchVedaDaily = (dateAd: string) =>
  get<VedaDaily>(`/veda/daily?date=${encodeURIComponent(dateAd)}`);
