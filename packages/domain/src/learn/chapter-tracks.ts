/**
 * The guided tracks, and which Learn topic opens which one.
 *
 * A *track* is an ordered list of chapters that share one scene and one
 * transport — the thing a reader presses play on. Until now there was exactly
 * one, hard-wired into the player; this file is what lets a second exist, and
 * what lets the first grow past the six chapters it was ported with.
 *
 * There are two tracks today:
 *
 *   - **`calendar`** — the long syllabus. It opens with the Minute Labs day
 *     chapters unchanged and carries on through वार, महिना, वर्ष, the two
 *     belts and ध्रुव तारा, ending in free explore. This is the tour the
 *     पञ्चाङ्ग engine's own units are introduced in, in the order they are
 *     built on each other — not yet wired to a page, kept ready for one that
 *     wants the full syllabus.
 *   - **`day`** — the ported lab on its own, six narrated chapters ending at
 *     the original's `/playground`. This is what `/learn/earth-rotation-day`
 *     runs: that page is a day explainer, not the full calendar.
 *
 * Adding a track is an entry in {@link CHAPTER_TRACKS} and a `guided` on the
 * topic in {@link ./playground-config}. Adding a chapter to one is an entry in
 * its list. Neither touches the player.
 */

import { CALENDAR_CHAPTERS, FREE_PLAYGROUND } from "./calendar-chapters";
import { DAY_CHAPTERS, DAY_PLAYGROUND } from "./day-chapters";
import type { Chapter } from "./chapter-kit";

export type TrackId = "calendar" | "day";

export type ChapterTrack = {
  id: TrackId;
  /** Heading on the opening overlay — i18n key. */
  titleKey: string;
  /** One line under it — i18n key. */
  subtitleKey: string;
  chapters: Chapter[];
};

export const CHAPTER_TRACKS: Record<TrackId, ChapterTrack> = {
  calendar: {
    id: "calendar",
    titleKey: "learn.chapters.welcome_title",
    subtitleKey: "learn.chapters.welcome_subtitle",
    chapters: [...DAY_CHAPTERS, ...CALENDAR_CHAPTERS, FREE_PLAYGROUND],
  },
  day: {
    id: "day",
    titleKey: "learn.chapters.welcome_title",
    subtitleKey: "learn.chapters.day_only_subtitle",
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
 * one stands alone under no heading. Grouping by *runs* rather than by key is
 * deliberate — it means the syllabus order in the track file is the order the
 * contents shows, and a part cannot be silently reassembled out of sequence.
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
