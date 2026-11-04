import type { Shloka } from "@vedic-patro/api-client";
import { isNoteLabel } from "./use-shloka-card";

type Verse = Pick<Shloka, "id" | "verse_label" | "audio_url">;

/**
 * Whether every verse on the page has a recording of its own (note cards don't count).
 * Only then does the reader offer a "play through" / "play sukta" start button: with
 * recordings for a few verses only, it would jump (and scroll) far ahead to the first one.
 * Those verses keep their own play buttons.
 */
export function audioCoversAll(shlokas: readonly Verse[]): boolean {
  let any = false;
  for (const s of shlokas) {
    if (isNoteLabel(s.verse_label)) continue;
    if (!s.audio_url) return false;
    any = true;
  }
  return any;
}

/**
 * Whether playback may run on from verse `fromId` to verse `toId` by itself: `toId` is the very
 * next verse in reading order (note cards skipped). Across a verse with no recording it stops,
 * rather than jumping (and scrolling) ahead to wherever the next recording is.
 */
export function isNextVerse(shlokas: readonly Verse[], fromId: number, toId: number): boolean {
  const at = shlokas.findIndex((s) => s.id === fromId);
  if (at < 0) return false;
  for (let i = at + 1; i < shlokas.length; i++) {
    const s = shlokas[i]!;
    if (isNoteLabel(s.verse_label)) continue;
    return s.id === toId;
  }
  return false;
}

/** The same for sukta files: the next track is the very next sukta. */
export function isNextSukta(from: number | null | undefined, to: number | null | undefined): boolean {
  return from != null && to != null && to === from + 1;
}
