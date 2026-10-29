/**
 * One verse of a document, shared by the website's and the app's
 * `components/documents/ShlokaCard.tsx`: whether it can play (its own clip or
 * a timestamp within the full recording), its kind (verse, closing line or
 * procedure note), citation, meaning, the word sounding now, and copy. Each
 * app draws the card and wires its own player.
 */
import { useMemo } from "react";
import type { Shloka } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatVedaCite } from "@vedic-patro/domain/learn/veda-cite";
import { activeTokenAt, buildWordTrack } from "@vedic-patro/domain/learn/word-tracking";
import { useLocale } from "@vedic-patro/i18n/react";

/** Closing lines ("iti ...", "dhyanam") are set apart from the verses. */
const CLOSING_PREFIX = "\u0907\u0924\u093f"; // copy-ok
const CLOSING_LABEL = "\u0927\u094d\u092f\u093e\u0928\u092e\u094d"; // copy-ok
/** Procedure text (tika / samagri lists) is instructions, not a mantra. */
const NOTE_LABEL = /^(\u091f\u0940\u0915\u093e|\u0938\u093e\u092e\u0917\u094d\u0930\u0940)/; // copy-ok
/** Strip trailing numbers from note labels — "टीका 1.1" → "टीका". */
const NOTE_NUMBER_SUFFIX = /\s*[\d\u0966-\u096F]+(?:[.\-][\d\u0966-\u096F]+)*\s*$/;

/** A verse with no clip of its own plays from its timestamp in the document's full recording. */
export function playsFromFullRecording(shloka: Shloka, hasFullRecording: boolean): boolean {
  return !shloka.audio_url && hasFullRecording && shloka.full_audio_start != null;
}

export function useShlokaCard({
  shloka,
  isActive,
  isPlaying,
  playsFromFull,
  progress,
  clip,
}: {
  shloka: Shloka;
  isActive: boolean;
  /** Whether sound is actually coming from this verse right now. */
  isPlaying: boolean;
  playsFromFull: boolean;
  /** 0..1 position inside the sounding verse. */
  progress: number;
  /** The verse's own clip position, when the app's player reports it separately. */
  clip?: { currentTime: number; duration: number };
}) {
  const { t, lang } = useLocale();
  const rawLabel = shloka.verse_label;
  const isNote = NOTE_LABEL.test(rawLabel);
  // Notes are "what to do" cards — never show a verse number on them.
  const label = isNote ? rawLabel.replace(NOTE_NUMBER_SUFFIX, "").trim() || rawLabel : rawLabel;

  // Estimated word timing; see domain/word-tracking.
  const wordTrack = useMemo(() => buildWordTrack(shloka.sanskrit), [shloka.sanskrit]);
  // From the full recording there is no per-clip time, only the verse's
  // progress between its start and end timestamps.
  const fraction = playsFromFull || !clip ? progress : clip.duration > 0 ? clip.currentTime / clip.duration : -1;

  return {
    canPlay: Boolean(shloka.audio_url) || playsFromFull,
    label,
    /** Anchor id — notes share the bare label, so pin uniqueness on the row id. */
    domId: isNote ? `shloka-note-${shloka.id}` : `shloka-${label.replace(/\s+/g, "-")}`,
    isClosing: rawLabel.startsWith(CLOSING_PREFIX) || rawLabel === CLOSING_LABEL,
    isNote,
    vedaCite: formatVedaCite(shloka.veda_cite, lang),
    tokens: wordTrack.tokens,
    activeTokenIndex: isPlaying ? activeTokenAt(wordTrack, fraction) : -1,
    /** Transliteration is shown only in the English interface. */
    transliteration: lang !== "ne" && shloka.transliteration ? shloka.transliteration : null,
    progressPct: isActive ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : 0,
    meaning: bilingualText(lang, shloka.meaning_ne, shloka.meaning_en, ""),
    meaningIsNepali: lang === "ne",
    copy: {
      play: isPlaying ? t("documents.pause_verse") : t("documents.play_verse"),
      meaning: t("documents.meaning"),
    },
  };
}
