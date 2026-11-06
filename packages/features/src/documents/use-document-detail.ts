/**
 * Document pages logic, shared by the website (`DocumentDetail.tsx`,
 * `DocumentChapterDetail.tsx`) and the app (`documents/[slug]/index.tsx`,
 * `documents/[slug]/[chapter].tsx`): the requests, which layout a document
 * takes, its header, chapter list, verse rows, chapter paging and copy.
 * Playback stays with each app's audio engine.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  CHAPTER_PAGE_SIZE,
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocumentChapterPage,
  fetchDocumentDetail,
  flattenShlokas,
  isNotFound,
  type DocumentChapterPage as ChapterSlice,
  type DocumentDetail,
  type Shloka,
} from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingual, canonVerseLabel, chapterAnchor, inlineChapterRows, versesToRows, type ReaderRow } from "./reader-rows";

export * from "./reader-rows";

export type DocStatus = "loading" | "not-found" | "error" | "ready";

export type DocumentChapterCard = {
  number: number;
  numberLabel: string;
  heading: string;
  title?: string;
  count?: string;
};

const retry = (count: number, error: unknown) => !isNotFound(error) && count < 2;

/** Kandas 1–19. Kanda 20 has no recording yet. The API sends the same key once it is deployed. */
const ATHARVAVEDA_KHANDA_AUDIO =
  "https://pub-34db505dd7474db98d79fb75e870ff22.r2.dev/documents/atharvaveda";

function chapterRecordingUrl(
  slug: string | undefined,
  chapter: number,
  fromApi: string | null | undefined,
): string | undefined {
  if (fromApi) return fromApi;
  if (slug !== "atharvaveda" || chapter < 1 || chapter > 19) return undefined;
  const folder = String(chapter).padStart(2, "0");
  return `${ATHARVAVEDA_KHANDA_AUDIO}/${folder}/atharvaveda_khanda_${chapter}.mp3`;
}

/**
 * Verses on one infinite-query page. A server that has not been deployed with
 * keyset paging still returns the whole chapter as `chapter.shlokas`.
 */
function versesOf(page: { verses?: Shloka[] | null; chapter?: { shlokas?: Shloka[] | null } | null }): Shloka[] {
  if (Array.isArray(page.verses)) return page.verses;
  const legacy = page.chapter?.shlokas;
  return Array.isArray(legacy) ? legacy : [];
}

function useDocText() {
  const { t, lang, digits } = useLocale();
  return useMemo(() => ({ t, lang, digits: (n: number) => digits(n) }), [t, lang, digits]);
}

function chapterNumbersOf(doc: DocumentDetail | undefined): number[] {
  return (doc?.chapters ?? [])
    .map((c) => c.number)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
}

/** Chapters whose verse labels start with more than the chapter number (Samaveda's "2.5"). */
function chapterPrefixesOf(doc: DocumentDetail | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of doc?.chapters ?? []) if (c.number != null && c.verse_prefix) out[c.verse_prefix] = c.number;
  return out;
}

function statusFrom(q: { isLoading: boolean; isError: boolean; error: unknown; data?: unknown }, valid = true): DocStatus {
  if (!valid) return "not-found";
  if (q.data !== undefined) return "ready";
  if (q.isError) return isNotFound(q.error) ? "not-found" : "error";
  return "loading";
}

/** A document's own page: its chapter list (paginated books) or all its verses. */
export function useDocumentDetail(slug: string | undefined) {
  const text = useDocText();
  const { t, lang, digits } = text;
  const query = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
    retry,
  });
  const doc = query.data;
  const shlokas = useMemo(() => (doc ? flattenShlokas(doc) : []), [doc]);
  const inlineChapters = useMemo(
    () => (doc?.inline_chapters ? doc.chapters.filter((c) => (c.shlokas?.length ?? 0) > 0) : []),
    [doc],
  );
  const rows = useMemo((): ReaderRow[] => {
    if (!doc) return [];
    return inlineChapters.length > 1 ? inlineChapterRows(inlineChapters, text) : versesToRows(shlokas, text);
  }, [doc, inlineChapters, shlokas, text]);

  /** Paginated books (Gita, Ashtavakra): chapter cards here, verses on the chapter page. */
  const paginated = Boolean(doc?.has_chapters && !doc.inline_chapters);

  return {
    status: statusFrom(query, Boolean(slug)),
    retry: () => void query.refetch(),
    doc,
    layout: paginated ? ("chapters" as const) : ("reader" as const),
    title: doc ? bilingual(lang, doc.title_ne, doc.title_en) : "",
    header: doc
      ? {
          sanskrit: doc.title_sa,
          title: bilingual(lang, doc.title_ne, doc.title_en),
          subtitle: bilingual(lang, doc.subtitle_ne, doc.subtitle_en) || undefined,
          description: bilingual(lang, doc.description_ne, doc.description_en) || undefined,
          source: (() => {
            const source = bilingual(lang, doc.source_ne, doc.source_en);
            return source ? `${t("documents.source")}: ${source}` : undefined;
          })(),
        }
      : undefined,
    /** "18 chapters", "700 shlokas" — for chaptered documents. */
    stats: doc?.has_chapters
      ? [t("documents.chapters_count", { count: digits(doc.chapter_count) }), t("documents.shlokas_count", { count: digits(doc.shloka_count) })]
      : undefined,
    chapterNumbers: chapterNumbersOf(doc),
    chapterPrefixes: chapterPrefixesOf(doc),
    chapters: (doc?.chapters ?? []).flatMap((c): DocumentChapterCard[] =>
      c.number == null
        ? []
        : [
            {
              number: c.number,
              numberLabel: digits(c.number),
              heading: t("documents.chapter_label", { number: digits(c.number) }),
              // Source titles carry ASCII numerals ("मण्डल 1"); show them in the reader's digits.
              title: bilingual(lang, c.title_ne, c.title_en).replace(/\d/g, (d) => digits(Number(d))) || undefined,
              count: c.shloka_count != null ? t("documents.shlokas_count", { count: digits(c.shloka_count) }) : undefined,
            },
          ],
    ),
    /** Jump pills for documents that keep several chapters on one page. */
    chapterPills:
      inlineChapters.length > 1
        ? inlineChapters.flatMap((c) => (c.number == null ? [] : [{ number: c.number, label: digits(c.number), anchor: chapterAnchor(c.number) }]))
        : [],
    rows,
    shlokas,
    fullAudioUrl: doc?.full_audio_url ?? undefined,
    copy: {
      backToList: t("documents.back_to_list"),
      notFound: t("documents.not_found"),
      loadError: t("documents.load_error"),
      chapterNav: t("documents.chapter_nav"),
    },
  };
}

type ChapterPageParam = {
  cursor?: number;
  direction?: "next" | "prev";
  verse?: string;
  limit: number;
};

export type DocumentChapterOptions = {
  /** Centre the first page on this verse_label (a hash, a jump, or a restored scroll). */
  verse?: string | null;
  /**
   * False until the caller knows which verse to open on. The website reads the
   * hash after mount so the server render and the first client paint agree.
   */
  enabled?: boolean;
};

/** One chapter of a paginated document — a window of verses, plus prev/next chapter. */
export function useDocumentChapter(
  slug: string | undefined,
  chapterNumber: number,
  options?: DocumentChapterOptions,
) {
  const text = useDocText();
  const { t, lang, digits } = text;
  const queryClient = useQueryClient();
  const valid = Boolean(slug) && Number.isFinite(chapterNumber);
  const enabled = options?.enabled !== false;
  const propVerse = options?.verse ? canonVerseLabel(options.verse) : null;
  // A jump to a verse that is not loaded yet replaces the window. Undefined follows `propVerse`.
  const [override, setOverride] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setOverride(undefined);
  }, [slug, chapterNumber, propVerse]);
  const entry = override === undefined ? propVerse : override;

  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const chapterQ = useInfiniteQuery({
    queryKey: documentsKeys.chapterPages(slug ?? "", chapterNumber, entry),
    queryFn: ({ pageParam }) => fetchDocumentChapterPage(slug!, chapterNumber, pageParam),
    initialPageParam: (entry
      ? { verse: entry, limit: CHAPTER_PAGE_SIZE }
      : { direction: "next" as const, limit: CHAPTER_PAGE_SIZE }) as ChapterPageParam,
    getNextPageParam: (last): ChapterPageParam | undefined =>
      last.next_cursor == null ? undefined : { cursor: last.next_cursor, direction: "next", limit: CHAPTER_PAGE_SIZE },
    getPreviousPageParam: (first): ChapterPageParam | undefined =>
      first.prev_cursor == null ? undefined : { cursor: first.prev_cursor, direction: "prev", limit: CHAPTER_PAGE_SIZE },
    enabled: valid && enabled && !docQ.data?.inline_chapters,
    staleTime: DOCUMENTS_STALE_TIME,
    retry,
  });
  const data = chapterQ.data?.pages[0];
  const shlokas: Shloka[] = useMemo(() => {
    const seen = new Set<number>();
    const out: Shloka[] = [];
    for (const page of chapterQ.data?.pages ?? []) {
      for (const verse of versesOf(page)) {
        if (seen.has(verse.id)) continue;
        seen.add(verse.id);
        out.push(verse);
      }
    }
    return out;
  }, [chapterQ.data]);
  const atStart = chapterQ.data != null && !chapterQ.hasPreviousPage;
  const imageUrls = data?.chapter.image_urls;
  const rows = useMemo(() => {
    const verseRows = versesToRows(shlokas, text);
    if (!atStart || !imageUrls?.length) return verseRows;
    return [{ kind: "images" as const, key: `images-c${chapterNumber}`, urls: imageUrls }, ...verseRows];
  }, [shlokas, text, atStart, imageUrls, chapterNumber]);
  // Sibling chapters come from the (cached) document summary; a deep link
  // opened straight to this chapter has none until it loads.
  const numbers = chapterNumbersOf(docQ.data);
  const idx = numbers.indexOf(chapterNumber);
  const docTitle = data
    ? bilingual(lang, data.title_ne, data.title_en)
    : docQ.data
      ? bilingual(lang, docQ.data.title_ne, docQ.data.title_en)
      : "";
  const chapterTitle = data ? bilingual(lang, data.chapter.title_ne, data.chapter.title_en) || undefined : undefined;
  const sections = (docQ.data?.chapters ?? []).flatMap((c) => {
    if (c.number == null) return [];
    const title = bilingual(lang, c.title_ne, c.title_en) || t("documents.chapter_label", { number: digits(c.number) });
    return [{ number: c.number, title }];
  });
  const total = data?.total;
  /** The live API still answers with the whole chapter until the paged route is deployed. */
  const legacyWhole = data != null && !Array.isArray(data.verses) && Array.isArray(data.chapter?.shlokas);
  const hasNextPage = Boolean(chapterQ.hasNextPage);
  const hasPreviousPage = Boolean(chapterQ.hasPreviousPage);
  const focusVerse = useCallback(
    async (label: string): Promise<boolean> => {
      const canon = canonVerseLabel(label);
      if (!canon || !slug) return false;
      if (shlokas.some((s) => canonVerseLabel(s.verse_label) === canon)) return true;
      try {
        const result = await fetchDocumentChapterPage(slug, chapterNumber, { verse: label, limit: CHAPTER_PAGE_SIZE });
        const param: ChapterPageParam = { verse: label, limit: CHAPTER_PAGE_SIZE };
        queryClient.setQueryData<InfiniteData<ChapterSlice, ChapterPageParam>>(
          documentsKeys.chapterPages(slug, chapterNumber, canon),
          { pages: [result], pageParams: [param] },
        );
        setOverride(canon);
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
    [shlokas, slug, chapterNumber, queryClient],
  );

  return {
    status: statusFrom(chapterQ, valid),
    retry: () => void chapterQ.refetch(),
    /** The document keeps its chapters on one page: show that page at this chapter's anchor. */
    redirectToDocument: Boolean(docQ.data?.inline_chapters && valid) ? { anchor: chapterAnchor(chapterNumber) } : undefined,
    valid,
    loading: !enabled || docQ.isLoading || (valid && !docQ.data?.inline_chapters && chapterQ.isPending),
    docTitle,
    numberLabel: digits(chapterNumber),
    heading: t("documents.chapter_label", { number: digits(chapterNumber) }),
    chapterTitle,
    /** Prefer the section's own title; fall back to "Chapter N". */
    displayTitle: chapterTitle || t("documents.chapter_label", { number: digits(chapterNumber) }),
    progress: numbers.length > 0 ? t("documents.chapter_progress", { current: digits(chapterNumber), total: digits(numbers.length) }) : undefined,
    chapterNumbers: numbers,
    chapterPrefixes: chapterPrefixesOf(docQ.data),
    sections,
    prev: idx > 0 ? numbers[idx - 1]! : null,
    next: idx >= 0 && idx < numbers.length - 1 ? numbers[idx + 1]! : null,
    rows,
    shlokas,
    /** Every verse of the chapter is loaded. Playback may treat the list as the whole chapter. */
    complete: legacyWhole || (total != null && shlokas.length >= total && !hasNextPage && !hasPreviousPage),
    total,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage: chapterQ.fetchNextPage,
    fetchPreviousPage: chapterQ.fetchPreviousPage,
    isFetching: chapterQ.isFetching,
    isFetchingNextPage: chapterQ.isFetchingNextPage,
    isFetchingPreviousPage: chapterQ.isFetchingPreviousPage,
    /** Load the page that contains `label` when it is not on screen yet. False when no such verse. */
    focusVerse,
    fullAudioUrl: chapterRecordingUrl(slug, chapterNumber, data?.full_audio_url),
    copy: {
      backToChapters: t("documents.back_to_chapters"),
      backToList: t("documents.back_to_list"),
      notFound: t("documents.not_found"),
      loadError: t("documents.load_error"),
      prevChapter: t("documents.prev_chapter"),
      nextChapter: t("documents.next_chapter"),
      loadingMore: t("documents.loading_more"),
    },
  };
}

export type DocumentDetailPage = ReturnType<typeof useDocumentDetail>;
export type DocumentChapterPage = ReturnType<typeof useDocumentChapter>;
