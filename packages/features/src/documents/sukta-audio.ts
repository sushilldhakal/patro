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
 */
const VERSE_FILE = /^(.*\/)rigveda_(\d{2})_\d+_\d+\.mp3$/;

export function suktaTracksFrom(shlokas: readonly Pick<Shloka, "sukta_number" | "audio_url">[]): SuktaTrack[] {
  const tracks: SuktaTrack[] = [];
  const seen = new Set<number>();
  for (const shloka of shlokas) {
    const sukta = shloka.sukta_number;
    const audio = shloka.audio_url;
    if (sukta == null || !audio || seen.has(sukta)) continue;
    const match = audio.match(VERSE_FILE);
    if (!match) continue;
    seen.add(sukta);
    tracks.push({
      sukta,
      url: `${match[1]}rigveda_${match[2]}_sukta_${String(sukta).padStart(3, "0")}.mp3`,
      label: `${Number(match[2])}.${sukta}`,
    });
  }
  return tracks;
}
