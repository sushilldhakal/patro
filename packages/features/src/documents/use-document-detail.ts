/**
 * Document pages logic, shared by the website (`DocumentDetail.tsx`,
 * `DocumentChapterDetail.tsx`) and the app (`documents/[slug]/index.tsx`,
 * `documents/[slug]/[chapter].tsx`): the requests, which layout a document
 * takes, its header, chapter list, verse rows, chapter paging and copy.
 * Playback stays with each app's audio engine.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocumentChapter,
  fetchDocumentDetail,
  flattenShlokas,
  isNotFound,
  type DocumentDetail,
  type Shloka,
} from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingual, chapterAnchor, inlineChapterRows, versesToRows, type ReaderRow } from "./reader-rows";

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
    chapters: (doc?.chapters ?? []).flatMap((c): DocumentChapterCard[] =>
      c.number == null
        ? []
        : [
            {
              number: c.number,
              numberLabel: digits(c.number),
              heading: t("documents.chapter_label", { number: digits(c.number) }),
              title: bilingual(lang, c.title_ne, c.title_en) || undefined,
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

/** One chapter of a paginated document — its verses only, plus prev/next. */
export function useDocumentChapter(slug: string | undefined, chapterNumber: number) {
  const text = useDocText();
  const { t, lang, digits } = text;
  const valid = Boolean(slug) && Number.isFinite(chapterNumber);
  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const chapterQ = useQuery({
    queryKey: documentsKeys.chapter(slug ?? "", chapterNumber),
    queryFn: () => fetchDocumentChapter(slug!, chapterNumber),
    enabled: valid && !docQ.data?.inline_chapters,
    staleTime: DOCUMENTS_STALE_TIME,
    retry,
  });
  const data = chapterQ.data;
  const shlokas: Shloka[] = useMemo(() => data?.chapter.shlokas ?? [], [data]);
  const rows = useMemo(() => {
    const verseRows = versesToRows(shlokas, text);
    const urls = data?.chapter.image_urls ?? [];
    if (urls.length === 0) return verseRows;
    return [{ kind: "images" as const, key: `images-c${chapterNumber}`, urls }, ...verseRows];
  }, [shlokas, text, data?.chapter.image_urls, chapterNumber]);
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

  return {
    status: statusFrom(chapterQ, valid),
    retry: () => void chapterQ.refetch(),
    /** The document keeps its chapters on one page: show that page at this chapter's anchor. */
    redirectToDocument: Boolean(docQ.data?.inline_chapters && valid) ? { anchor: chapterAnchor(chapterNumber) } : undefined,
    valid,
    loading: docQ.isLoading || chapterQ.isLoading,
    docTitle,
    numberLabel: digits(chapterNumber),
    heading: t("documents.chapter_label", { number: digits(chapterNumber) }),
    chapterTitle,
    /** Prefer the section's own title; fall back to "Chapter N". */
    displayTitle: chapterTitle || t("documents.chapter_label", { number: digits(chapterNumber) }),
    progress: numbers.length > 0 ? t("documents.chapter_progress", { current: digits(chapterNumber), total: digits(numbers.length) }) : undefined,
    chapterNumbers: numbers,
    sections,
    prev: idx > 0 ? numbers[idx - 1]! : null,
    next: idx >= 0 && idx < numbers.length - 1 ? numbers[idx + 1]! : null,
    rows,
    shlokas,
    fullAudioUrl: data?.full_audio_url ?? undefined,
    copy: {
      backToChapters: t("documents.back_to_chapters"),
      backToList: t("documents.back_to_list"),
      notFound: t("documents.not_found"),
      loadError: t("documents.load_error"),
      prevChapter: t("documents.prev_chapter"),
      nextChapter: t("documents.next_chapter"),
    },
  };
}

export type DocumentDetailPage = ReturnType<typeof useDocumentDetail>;
export type DocumentChapterPage = ReturnType<typeof useDocumentChapter>;
