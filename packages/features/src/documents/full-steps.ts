/**
 * Previous / next on the player while a full recording plays, shared by the website and the app.
 *
 * - Several files (Rigveda sukta files): next goes to the next sukta; previous goes back to the
 *   start of this one, or to the previous sukta when this one has only just begun.
 * - One file with each verse's start inside it (an Atharvaveda kanda, Rudrashtadhyayi): the same,
 *   verse by verse, by seeking.
 * - One file with no verse times: previous goes back to the start; there is no next.
 */
export type FullStep = { kind: "track"; index: number } | { kind: "seek"; time: number } | null;

/** Seconds into a track or verse after which "previous" restarts it rather than going back one. */
const RESTART_AFTER = 3;

export function fullRecordingSteps({
  trackCount,
  trackIndex,
  verseStarts,
  currentTime,
}: {
  trackCount: number;
  trackIndex: number;
  /** Each verse's start within the one recording, in seconds (ignored for several files). */
  verseStarts: readonly (number | null | undefined)[];
  currentTime: number;
}): { prev: FullStep; next: FullStep } {
  const restart: FullStep = currentTime > 0.5 ? { kind: "seek", time: 0 } : null;
  if (trackCount > 1) {
    const next: FullStep = trackIndex < trackCount - 1 ? { kind: "track", index: trackIndex + 1 } : null;
    const prev: FullStep =
      currentTime > RESTART_AFTER || trackIndex <= 0 ? restart : { kind: "track", index: trackIndex - 1 };
    return { prev, next };
  }
  const starts = verseStarts.filter((s): s is number => typeof s === "number").sort((a, b) => a - b);
  if (starts.length === 0) return { prev: restart, next: null };
  const upcoming = starts.find((s) => s > currentTime + 0.25);
  const next: FullStep = upcoming != null ? { kind: "seek", time: upcoming } : null;
  let at = -1;
  for (let i = 0; i < starts.length; i++) if (starts[i]! <= currentTime + 0.25) at = i;
  let prev: FullStep;
  if (at >= 0 && currentTime - starts[at]! > RESTART_AFTER) prev = { kind: "seek", time: starts[at]! };
  else if (at > 0) prev = { kind: "seek", time: starts[at - 1]! };
  else prev = restart;
  return { prev, next };
}
