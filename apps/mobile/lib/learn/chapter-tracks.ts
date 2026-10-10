/**
 * The guided tracks, and which Learn topic opens which one.
 *
 * A *track* is an ordered list of chapters that share one scene and one
 * transport. There are two tracks:
 *
 *   - **`calendar`** — the long syllabus: the day, then वार, महिना, वर्ष, the
 *     two belts and ध्रुव तारा, ending in free explore.
 *   - **`day`** — the ported lab on its own, ending at the original's
 *     `/playground`.
 */

import { CALENDAR_CHAPTERS, FREE_PLAYGROUND } from "./calendar-chapters";
import { DAY_CHAPTERS, DAY_PLAYGROUND } from "./day-chapters";
import type { Chapter } from "./chapter-kit";

export type TrackId = "calendar" | "day";

export type ChapterTrack = {
  id: TrackId;
  /** Chapter-label key for the opening overlay's heading. */
  titleKey: string;
  /** Chapter-label key for the line under it. */
  subtitleKey: string;
  chapters: Chapter[];
};

export const CHAPTER_TRACKS: Record<TrackId, ChapterTrack> = {
  calendar: {
    id: "calendar",
    titleKey: "welcome_title",
    subtitleKey: "welcome_subtitle",
    chapters: [...DAY_CHAPTERS, ...CALENDAR_CHAPTERS, FREE_PLAYGROUND],
  },
  day: {
    id: "day",
    titleKey: "welcome_title",
    subtitleKey: "day_only_subtitle",
    chapters: [...DAY_CHAPTERS, DAY_PLAYGROUND],
  },
};

export function trackFor(id: TrackId | undefined): ChapterTrack | null {
  if (!id) return null;
  return CHAPTER_TRACKS[id] ?? null;
}

/**
 * The chapter list grouped into its parts, for the table of contents.
 *
 * Consecutive chapters sharing a `partKey` become one group; a chapter without
 * one stands alone under no heading.
 */
export function chapterParts(chapters: Chapter[]): {
  partKey?: string;
  items: { chapter: Chapter; index: number }[];
}[] {
  const out: { partKey?: string; items: { chapter: Chapter; index: number }[] }[] = [];
  chapters.forEach((chapter, index) => {
    const last = out[out.length - 1];
    if (last && last.partKey === chapter.partKey) last.items.push({ chapter, index });
    else out.push({ partKey: chapter.partKey, items: [{ chapter, index }] });
  });
  return out;
}
