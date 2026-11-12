import { useEffect, useState } from "react";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";

/**
 * Where a platform keeps the open page of a `paged` article. The website keeps it in the URL hash
 * (`#page-3`), so a reader can stop and come back to the same sum, and scrolls the page back to the
 * article's top on a turn (see web/article-page-address.ts). The app has no URL; without an address
 * the index simply stays in the screen until the reader leaves it.
 */
export type ArticlePageAddress = {
  /** The page to open on, or null for the first. */
  read: (count: number) => number | null;
  write: (index: number) => void;
  /** After a page turn: bring the article's top into view. */
  reveal?: () => void;
};

/** Which page of a `paged` article is on screen. Shared: no platform code lives here. */
export function useArticlePages(count: number, enabled: boolean, address?: ArticlePageAddress) {
  const [index, setIndex] = useState(() => (enabled && address ? (address.read(count) ?? 0) : 0));
  const safe = count <= 0 ? 0 : Math.min(Math.max(0, index), count - 1);

  useEffect(() => {
    if (enabled) address?.write(safe);
  }, [address, enabled, safe]);

  function go(next: number) {
    setIndex(Math.max(0, Math.min(count - 1, next)));
    address?.reveal?.();
  }

  return {
    index: safe,
    go,
    back: () => go(safe - 1),
    forward: () => go(safe + 1),
  };
}

/** Page numbers in the script the reader is using. */
export function articlePageDigits(lang: string, n: number): string {
  return lang === "en" ? String(n) : toNepaliDigits(String(n));
}
