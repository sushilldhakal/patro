import type { ArticleData } from "@vedic-patro/domain/learn/article-schema";
import { SHARED_ARTICLES } from "@vedic-patro/domain/learn/articles/index";
import { buildHistoryArticle } from "@vedic-patro/domain/learn/history-article";

/**
 * Every data-driven article body, keyed by slug: the chapters shared with the
 * website, plus the history chapter, which the website lays out itself and the
 * app renders from the same history data.
 *
 * Built on first use so the history copy can read the catalogue once it is set up.
 */
let cache: Record<string, ArticleData | undefined> | null = null;

function all(): Record<string, ArticleData | undefined> {
  cache ??= Object.fromEntries(
    [...SHARED_ARTICLES, buildHistoryArticle()].map((article) => [article.slug, article]),
  );
  return cache;
}

export const DATA_ARTICLES: Record<string, ArticleData | undefined> = new Proxy(
  {} as Record<string, ArticleData | undefined>,
  {
    get: (_target, slug: string) => all()[slug],
    has: (_target, slug: string) => slug in all(),
    ownKeys: () => Reflect.ownKeys(all()),
    getOwnPropertyDescriptor: (_target, slug: string) =>
      slug in all() ? { enumerable: true, configurable: true, value: all()[slug] } : undefined,
  },
);
