import { useEffect, useState } from "react";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";

/**
 * Which page of a `paged` article is on screen.
 *
 * The hash `#page-3` is the address of that page on the website, so a reader
 * can stop and come back to the same sum. The app has no URL hash; the index
 * simply stays in the screen until they leave it.
 */
export function useArticlePages(count: number, enabled: boolean) {
  const [index, setIndex] = useState(() => (enabled ? pageFromHash(count) : 0));
  const safe = count <= 0 ? 0 : Math.min(Math.max(0, index), count - 1);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const next = `#page-${safe + 1}`;
    if (window.location.hash === next) return;
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, "", url);
  }, [enabled, safe]);

  function go(next: number) {
    const clamped = Math.max(0, Math.min(count - 1, next));
    setIndex(clamped);
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById("learn-article-page")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return {
    index: safe,
    go,
    back: () => go(safe - 1),
    forward: () => go(safe + 1),
  };
}

function pageFromHash(count: number): number {
  if (typeof window === "undefined" || count <= 0) return 0;
  const match = window.location.hash.match(/^#page-(\d+)$/);
  if (!match) return 0;
  const n = Number(match[1]) - 1;
  return n >= 0 && n < count ? n : 0;
}

/** Page numbers in the script the reader is using. */
export function articlePageDigits(lang: string, n: number): string {
  return lang === "en" ? String(n) : toNepaliDigits(String(n));
}
