/**
 * News page — the parts that need no React: relative times and the card view of a story.
 */
import type { NewsCategorySlug, NewsStory } from "@vedic-patro/api-client";

export const NEWS_CATEGORIES: readonly NewsCategorySlug[] = [
  "news",
  "politics",
  "economy",
  "world",
  "sports",
  "entertainment",
  "technology",
  "health",
];

type Text = {
  t: (key: string, values?: Record<string, unknown>) => string;
  digits: (value: string | number) => string;
};

/** "5 min ago" / "3 घण्टाअघि" for a Unix-seconds time. */
export function agoLabel(atSec: number, nowMs: number, { t, digits }: Text): string {
  const minutes = Math.max(0, Math.floor((nowMs / 1000 - atSec) / 60));
  if (minutes < 1) return t("news.ago.now");
  if (minutes < 60) return t("news.ago.minutes", { count: digits(minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("news.ago.hours", { count: digits(hours) });
  return t("news.ago.days", { count: digits(Math.floor(hours / 24)) });
}

export type NewsCardView = {
  id: string;
  title: string;
  summary: string | null;
  /** `ne` titles get the Nepali text style in the app. */
  language: "ne" | "en";
  category: string;
  ago: string;
  /** "In 4 outlets" when more than one outlet reported it. */
  sourcesCount: string | null;
  sources: { name: string; url: string; label: string }[];
};

export function newsCardView(story: NewsStory, nowMs: number, text: Text): NewsCardView {
  return {
    id: story.id,
    title: story.title,
    summary: story.summary,
    language: story.language,
    category: text.t(`news.category.${story.category}`),
    ago: agoLabel(story.updated_at, nowMs, text),
    sourcesCount:
      story.sources.length > 1 ? text.t("news.sources_count", { count: text.digits(story.sources.length) }) : null,
    sources: story.sources.map((s) => ({
      name: s.name,
      url: s.url,
      label: text.t("news.open_source", { name: s.name }),
    })),
  };
}
