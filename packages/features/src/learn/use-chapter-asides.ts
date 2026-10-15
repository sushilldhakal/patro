/**
 * The asides a running chapter can raise over its scene — a Learn diagram
 * panel, a still picture with its caption, and a one-line tip. Both apps draw
 * them from `@vedic-patro/ui/kit/learn` (`ChapterOverlay`, `ChapterStill`,
 * `ChapterTip`). The app's overlay file only binds the id to its diagram registry.
 */

import { useEffect, useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";

/** How long a chapter tip stays up before it retires itself. */
export const CHAPTER_TIP_MS = 6000;

/** The diagram panel: only its close button carries copy. */
export function useChapterOverlay() {
  const { t } = useLocale();
  return { closeLabel: t("common.close") };
}

/**
 * A still picture. Mount the component with `key={src}`: the "did it load"
 * flag has to start false again for each new picture, and a fresh mount is how
 * that is said without an effect that resets state on a prop change — one
 * missing file would otherwise suppress every still after it.
 */
export function useChapterStill(src: string, captionKey: string | undefined) {
  const { t } = useLocale();
  const [broken, setBroken] = useState(false);
  return {
    /** Missing files draw nothing rather than an alt-text box. */
    visible: Boolean(src) && !broken,
    caption: captionKey ? t(captionKey) : "",
    closeLabel: t("common.close"),
    onError: () => setBroken(true),
  };
}

/**
 * The chapter's own hint. Mount the component with `key={tipKey}`.
 *
 * It retires itself after a few seconds rather than waiting for the next
 * keyframe to clear it: a tip is an aside, and one that sits there for the rest
 * of a chapter reads as a warning instead. The key re-arms the timer.
 */
export function useChapterTip(tipKey: string): string | null {
  const { t } = useLocale();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDone(true), CHAPTER_TIP_MS);
    return () => clearTimeout(id);
  }, []);

  return !tipKey || done ? null : t(tipKey);
}
