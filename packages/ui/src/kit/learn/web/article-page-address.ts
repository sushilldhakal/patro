import type { ArticlePageAddress } from "../use-article-pages";

/**
 * The website keeps a paged article's open page in the URL hash, `#page-3`, so a reader can stop and
 * come back to the same sum, and a page turn scrolls back to the article's top.
 */
export const webArticlePageAddress: ArticlePageAddress = {
  read(count) {
    if (typeof window === "undefined" || count <= 0) return null;
    const match = window.location.hash.match(/^#page-(\d+)$/);
    if (!match) return null;
    const n = Number(match[1]) - 1;
    return n >= 0 && n < count ? n : null;
  },
  write(index) {
    if (typeof window === "undefined") return;
    const next = `#page-${index + 1}`;
    if (window.location.hash === next) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  },
  reveal() {
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById("learn-article-page")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  },
};
