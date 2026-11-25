/**
 * News page logic, shared by the website (`apps/web/src/pages/News.tsx`) and the app
 * (`apps/mobile/app/news.tsx`): headlines from publishers' RSS feeds, grouped into
 * stories by the server. Both apps only draw; tapping a source opens the outlet's page.
 */
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchNewsFeed, newsKeys, type NewsCategorySlug } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";
import { NEWS_CATEGORIES, newsCardView, type NewsCardView } from "./model";

export * from "./model";

export type NewsLang = "ne" | "en";

export type NewsPage = {
  copy: {
    title: string;
    subtitle: string;
    topStories: string;
    latest: string;
    loadMore: string;
    loading: string;
    loadError: string;
    retry: string;
    empty: string;
    source: string;
    note: string;
    language: string;
  };
  status: PageStatus;
  /** Language of the stories, starting at the reader's interface language. */
  languages: { id: NewsLang; label: string; active: boolean }[];
  setLanguage: (lang: NewsLang) => void;
  /** "All" first, then every category that has stories. */
  categories: { id: NewsCategorySlug | "all"; label: string; active: boolean }[];
  setCategory: (id: NewsCategorySlug | "all") => void;
  topStories: NewsCardView[];
  latest: NewsCardView[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<unknown>;
};

export function useNewsPage(): NewsPage {
  const { t, lang, digits } = useLocale();
  const [language, setLanguage] = useState<NewsLang>(lang === "en" ? "en" : "ne");
  const [category, setCategory] = useState<NewsCategorySlug | "all">("all");
  const cat = category === "all" ? undefined : category;

  const q = useInfiniteQuery({
    queryKey: newsKeys.feed(language, cat),
    queryFn: ({ pageParam }) => fetchNewsFeed({ lang: language, category: cat, cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 2 * 60_000,
  });

  const nowMs = Date.now();
  const text = { t, digits };
  const pages = q.data?.pages ?? [];
  const first = pages[0];
  const counts = new Map(first?.categories.map((c) => [c.slug, c.count]));
  const shown = NEWS_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0 || c === category);

  return {
    copy: {
      title: t("news.title"),
      subtitle: t("news.subtitle"),
      topStories: t("news.top_stories"),
      latest: t("news.latest"),
      loadMore: t("news.load_more"),
      loading: t("news.loading"),
      loadError: t("news.load_error"),
      retry: t("news.retry"),
      empty: t("news.empty"),
      source: t("news.source"),
      note: t("news.note"),
      language: t("news.language"),
    },
    status: first ? "ready" : q.isError ? "error" : "loading",
    languages: (["ne", "en"] as const).map((id) => ({ id, label: t(`news.lang.${id}`), active: id === language })),
    setLanguage,
    categories: [
      { id: "all" as const, label: t("news.category.all"), active: category === "all" },
      ...shown.map((id) => ({ id, label: t(`news.category.${id}`), active: id === category })),
    ],
    setCategory,
    topStories: (first?.top_stories ?? []).map((s) => newsCardView(s, nowMs, text)),
    latest: pages.flatMap((p) => p.stories).map((s) => newsCardView(s, nowMs, text)),
    hasMore: q.hasNextPage,
    loadingMore: q.isFetchingNextPage,
    loadMore: () => {
      if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
    },
    refresh: () => q.refetch(),
  };
}
