// Documents (शोत्र/स्तोत्र) — Sanskrit scripture text, meanings, and R2-hosted
// per-verse audio. Kept out of src/lib/api.ts (a panchanga-only catalogue at
// this point) as its own small, self-contained client.
import { API_DATA_BASE, ApiError } from "@/lib/api";
import {
  isDocumentCategoryId,
  isTopicOf,
  type DocumentCategoryId,
} from "@vedic-patro/domain/document-categories";

/**
 * Scripture text and meanings don't change under a reader's feet — the backend
 * only ever re-seeds on a content edit + redeploy. A long staleTime (plus the
 * default `refetchOnMount`, not "always") means clicking through chapters or
 * using back/forward serves cached data instantly instead of re-hitting the
 * API on every mount.
 */
export const DOCUMENTS_STALE_TIME = 60 * 60 * 1000;

export type DocumentCategory = DocumentCategoryId;
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

export interface DocumentSummary {
  slug: string;
  order_index: number;
  category: DocumentCategory;
  /** Topic id inside `category` — see `DOCUMENT_CATEGORY_GROUPS`. Null until a text is filed. */
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
  /**
   * When true with `has_chapters`, every chapter's verses are embedded on the
   * document detail response and the UI renders them as sections of one page
   * instead of linking out to `/documents/$slug/$chapter`.
   */
  inline_chapters?: boolean;
  chapter_count: number;
  shloka_count: number;
  /** One continuous recording of the whole document, separate from the per-verse clips. */
  full_audio_url?: string | null;
}

export interface Shloka {
  id: number;
  global_order: number;
  verse_number: number;
  /** Human-facing verse reference, e.g. "1.1" or "12" — matches the audio filenames. */
  verse_label: string;
  /**
   * Groups a chapter's shlokas one level below "chapter" — e.g. the Rigveda,
   * where a chapter is a Mandala and this is the Sukta a rik belongs to.
   * null for documents with no such sub-grouping (most of them).
   */
  sukta_number?: number | null;
  /** Traditional Anukramani attribution for this Sukta — null until sourced. */
  sukta_rishi?: string | null;
  sukta_devata?: string | null;
  sukta_chhanda?: string | null;
  /**
   * Samhita verse this shloka quotes, `rigveda:1.1.3`. Null when the line is
   * not from the four Vedas. The card shows it as a small source caption.
   */
  veda_cite?: string | null;
  sanskrit: string;
  transliteration?: string | null;
  meaning_ne?: string | null;
  meaning_en?: string | null;
  /** null until the matching file is uploaded to R2. */
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  /**
   * Where this verse sits inside the document's `full_audio_url`, seconds —
   * measured by cross-correlating this verse's own clip against the full
   * recording's waveform. null until that's been run for this document.
   */
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
  /** null for a document with no chapters (has_chapters: false). */
  number: number | null;
  title_ne?: string | null;
  title_en?: string | null;
  /**
   * Present when verses are small enough to embed on the document page —
   * either a document with no chapter routes, or one with `inline_chapters`.
   * A paginated chaptered document's chapters carry `shloka_count` instead,
   * and its verses are fetched per chapter via `fetchDocumentChapter`.
   */
  shlokas?: Shloka[];
  /** Present only for a chaptered document's chapter entries (see above). */
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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_DATA_BASE}${path}`);
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail, path);
  }
  return res.json();
}

// `?v=` is a one-off cache-buster: the list URL never changes when a document is
// added, so copies cached by browsers/Cloudflare under the old headers would
// hide a newly filed text. Bump the value to force every client to refetch.
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

/**
 * Every shloka in a document, in reading order, across chapter boundaries.
 * Empty for a paginated chaptered document (those chapters carry no inline
 * `shlokas`); read a chapter's verses via `fetchDocumentChapter` instead.
 */
export function flattenShlokas(doc: DocumentDetail): Shloka[] {
  return doc.chapters.flatMap((c) => c.shlokas ?? []);
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
