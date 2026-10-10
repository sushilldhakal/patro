/**
 * Estimated word-by-word position inside a verse's audio. There is no
 * forced-alignment data, so each word's start is weighted by its character
 * count (Sanskrit compounds vary hugely in length and take proportionally
 * longer to chant). Whitespace stays as its own token so the text renders back
 * exactly as written.
 */
export interface WordTrack {
  tokens: string[];
  /** Index in `tokens` of each real word. */
  wordTokenIndices: number[];
  /** Fraction (0..1) of the clip at which each word starts. */
  wordStartFractions: number[];
}

export function buildWordTrack(text: string): WordTrack {
  const tokens = text.split(/(\s+)/);
  const wordTokenIndices = tokens.map((tok, i) => (tok.trim() ? i : -1)).filter((i) => i >= 0);
  const lengths = wordTokenIndices.map((idx) => tokens[idx]!.length);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const wordStartFractions: number[] = [];
  lengths.reduce((cumulative, len) => {
    wordStartFractions.push(cumulative / total);
    return cumulative + len;
  }, 0);
  return { tokens, wordTokenIndices, wordStartFractions };
}

/** Token index of the word sounding at `fraction` of the clip, or -1 when there is none. */
export function activeTokenAt(track: WordTrack, fraction: number): number {
  if (fraction < 0) return -1;
  const pos = track.wordStartFractions.reduce((best, start, i) => (start <= fraction ? i : best), -1);
  return pos >= 0 ? track.wordTokenIndices[pos]! : -1;
}
