/**
 * Every mantra sharing one देवता / ऋषि / छन्द / स्वर — the page each link in a verse's
 * details line opens. Shared by the website's and the app's verse-detail pages: the
 * request (50 at a time, "show more" for the next), the heading, and where each mantra
 * opens in the reader.
 */
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  DOCUMENTS_STALE_TIME,
  VERSE_DETAIL_KINDS,
  fetchVerseDetailPage,
  fetchVerseDetailValues,
  verseDetailValuesKeys,
  verseDetailKeys,
  type VerseDetailKind,
  type VerseWithDocument,
} from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

const PAGE = 50;

export function isVerseDetailKind(kind: string | undefined): kind is VerseDetailKind {
  return (VERSE_DETAIL_KINDS as readonly string[]).includes(kind ?? "");
}

export type VerseDetailRow = {
  key: string;
  verse: VerseWithDocument;
  /** "ऋग्वेद १.१.१" */
  reference: string;
  /** Reader location: the chapter page, opened at this verse. */
  slug: string;
  chapter: number | null;
  label: string;
};

export function useVerseDetailList(kind: VerseDetailKind | null, value: string, slug?: string) {
  const { t, lang, digits } = useLocale();
  const q = useInfiniteQuery({
    queryKey: verseDetailKeys.list(kind ?? "devata", value, slug),
    queryFn: ({ pageParam }) => fetchVerseDetailPage(kind!, value, { slug, offset: pageParam, limit: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.verses.length < last.total ? last.offset + last.verses.length : undefined),
    enabled: kind != null && value.trim().length > 0,
    staleTime: DOCUMENTS_STALE_TIME,
  });

  const rows: VerseDetailRow[] = (q.data?.pages ?? []).flatMap((page) =>
    page.verses.map((verse) => ({
      key: `${verse.document_slug}-${verse.id}`,
      verse,
      reference: `${bilingualText(lang, verse.document_title_ne, verse.document_title_en, verse.document_slug)} ${verse.verse_label.replace(/\d/g, (d) => digits(d))}`,
      slug: verse.document_slug,
      chapter: verse.chapter_number,
      label: verse.verse_label,
    })),
  );
  const total = q.data?.pages[0]?.total ?? 0;
  const label = kind ? t(`documents.detail_${kind}`) : "";

  return {
    status: q.isLoading ? ("loading" as const) : q.isError ? ("error" as const) : ("ready" as const),
    rows,
    total,
    hasMore: Boolean(q.hasNextPage),
    loadingMore: q.isFetchingNextPage,
    loadMore: () => void q.fetchNextPage(),
    copy: {
      kindLabel: label,
      allGranth: t("documents.detail_all_granth"),
      heading: t("documents.detail_heading", { label, value }),
      count: t("documents.detail_count", { count: digits(total) }),
      openVerse: t("documents.detail_open_verse"),
      loadMore: t("documents.detail_load_more"),
      empty: t("documents.detail_empty"),
      back: t("documents.back_to_list"),
      loadError: t("documents.load_error"),
    },
  };
}

/** The dropdown behind a verse-detail page: every value of this detail within the chosen granth. */
export function useVerseDetailValues(kind: VerseDetailKind | null, slug: string | undefined, current: string) {
  const { digits } = useLocale();
  const q = useQuery({
    queryKey: verseDetailValuesKeys.list(kind ?? "devata", slug),
    queryFn: () => fetchVerseDetailValues(kind!, slug),
    enabled: kind != null,
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const values = q.data?.values ?? [];
  const options = values.map((v) => ({ value: v.value, label: `${v.value} (${digits(v.count)})` }));
  // Keep the open value selectable even when the chosen granth has none of it.
  if (current && !values.some((v) => v.value === current)) options.unshift({ value: current, label: `${current} (${digits(0)})` });
  return options;
}
