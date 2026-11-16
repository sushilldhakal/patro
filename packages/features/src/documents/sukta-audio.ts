import type { Shloka } from "@vedic-patro/api-client";

/** One continuous sukta recording, in reading order. */
export type SuktaTrack = {
  sukta: number;
  url: string;
  /** Mandala and sukta as the verse labels write them ("1.1" for verse 1.1.1), for "ऋग्वेद १.१". */
  label: string;
};

/**
 * Rigveda verse clips are `…/rigveda_MM_SS_VV.mp3`. The sukta file uploaded
 * beside them is `…/rigveda_MM_sukta_SSS.mp3` (sukta padded to 3 digits).
 * Other documents do not match, so their playback stays verse-by-verse.
 *
 * The API sends the sukta link itself (`sukta_audio_url`): links are signed per
 * file, so rewriting a verse link gives one R2 refuses. Rewriting is kept only
 * for an unsigned verse link from an older server.
 */
const VERSE_FILE = /^(.*\/)rigveda_(\d{2})_\d+_\d+\.mp3$/;

function suktaUrlOf(shloka: Pick<Shloka, "audio_url" | "sukta_audio_url">, sukta: number, match: RegExpMatchArray): string | null {
  if (shloka.sukta_audio_url) return shloka.sukta_audio_url;
  if (shloka.audio_url?.includes("?")) return null;
  return `${match[1]}rigveda_${match[2]}_sukta_${String(sukta).padStart(3, "0")}.mp3`;
}

export function suktaTracksFrom(
  shlokas: readonly Pick<Shloka, "sukta_number" | "audio_url" | "sukta_audio_url">[],
): SuktaTrack[] {
  const tracks: SuktaTrack[] = [];
  const seen = new Set<number>();
  for (const shloka of shlokas) {
    const sukta = shloka.sukta_number;
    const audio = shloka.audio_url;
    if (sukta == null || !audio || seen.has(sukta)) continue;
    // The path alone: a signed link carries its signature in the query.
    const match = audio.split("?", 1)[0]!.match(VERSE_FILE);
    if (!match) continue;
    const url = suktaUrlOf(shloka, sukta, match);
    if (!url) continue;
    seen.add(sukta);
    tracks.push({ sukta, url, label: `${Number(match[2])}.${sukta}` });
  }
  return tracks;
}
