/** Shared by apps/web/src/hooks/use-chapter-track.ts and apps/mobile/lib/learn/use-chapter-track.ts (moved here from both, unchanged). */
import type { ChapterSimState, Chapter } from "./chapter-kit";
import { parseTime } from "./chapter-player";

/**
 * Did anything *step* between two samples?
 *
 * Numbers ease every frame and are written straight to the scene's refs by the
 * frame callback, so they must not force a React render — at sixty a second
 * that was resetting focus and layers under the reader's hand. Everything else
 * — layer flags, camera target, the overlay id, the highlight — changes rarely
 * and has to reach React the moment it does.
 *
 * Testing "is not a number" rather than listing the keys is what keeps this
 * correct as chapters gain state: a new flag is covered the day it is added.
 */
export function stepped(next: ChapterSimState, prev: ChapterSimState): boolean {
  for (const key of Object.keys(next) as (keyof ChapterSimState)[]) {
    const v = next[key];
    if (typeof v === "number") continue;
    if (v !== prev[key]) return true;
  }
  return false;
}

export function chapterDurationMs(chapter: Chapter): number {
  let max = 0;
  for (const frame of chapter.frames) {
    const at = parseTime(frame.meta.at);
    if (at > max) max = at;
  }
  return max;
}
