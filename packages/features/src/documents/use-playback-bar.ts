/**
 * The document reader's floating transport bar, shared by the website's and
 * the app's `components/documents/PlaybackBar.tsx`. Each app owns its audio
 * engine and passes the playback state in; the hook says which face the bar
 * shows (a start button, the full-recording transport, or one verse's
 * transport), with times, progress and copy.
 */
import type { Shloka } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type PlaybackClock = { playing: boolean; currentTime: number; duration: number };

/** "m:ss" for a playback position in seconds. */
export function formatPlaybackTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  return `${m}:${String(total - m * 60).padStart(2, "0")}`;
}

function percent(clock: PlaybackClock): number {
  return clock.duration > 0 ? Math.min(100, (clock.currentTime / clock.duration) * 100) : 0;
}

export function usePlaybackBar({
  mode,
  hasFullRecording,
  hasSuktaAudio,
  suktaNumber,
  suktaLabel,
  documentTitle,
  chapterTitle,
  canPlayThrough,
  full,
  verse,
  activeShloka,
}: {
  /** `null` until something is engaged, then which recording is playing. */
  mode: "full" | "verse" | null;
  hasFullRecording: boolean;
  /** Continuous per-sukta files (Rigveda). The bar plays those; a verse button still plays that verse. */
  hasSuktaAudio?: boolean;
  /** Sukta sounding now, when the bar is on a sukta file. */
  suktaNumber?: number | null;
  /** That sukta as "mandala.sukta" ("1.1"): the bar reads "ऋग्वेद १.१". */
  suktaLabel?: string | null;
  /** The document's name, so the bar says what is playing ("ऋग्वेद १.१.१"). */
  documentTitle?: string;
  /** The chapter a full recording belongs to (an Atharvaveda kanda). */
  chapterTitle?: string;
  /** Verses have their own clips to play one after another. */
  canPlayThrough: boolean;
  full: PlaybackClock;
  verse: PlaybackClock;
  activeShloka: Shloka | null;
}) {
  const { t, lang, digits } = useLocale();

  const copy = {
    playFull: t("documents.play_full_recording"),
    playThrough: t("documents.play_through"),
    playSukta: t("documents.play_sukta"),
    seek: t("documents.seek"),
    prevVerse: t("documents.prev_verse"),
    nextVerse: t("documents.next_verse"),
    switchToFull: hasSuktaAudio ? t("documents.play_sukta") : t("documents.switch_to_full"),
  };

  const face: "hidden" | "idle" | "full" | "verse" =
    mode == null
      ? hasFullRecording || canPlayThrough
        ? "idle"
        : "hidden"
      : mode === "full"
        ? "full"
        : activeShloka
          ? "verse"
          : "hidden";

  const meaning = activeShloka ? bilingualText(lang, activeShloka.meaning_ne, activeShloka.meaning_en, "") : "";
  /** Labels are stored with ASCII numerals ("1.1.1"); show them in the reader's digits. */
  const localLabel = (label: string) => label.replace(/\d/g, (d) => digits(Number(d)));
  const named = (what: string) => (documentTitle ? `${documentTitle} ${what}` : what);
  const verseLabel = activeShloka ? localLabel(activeShloka.verse_label ?? String(activeShloka.verse_number)) : "";

  return {
    face,
    copy,
    idle: {
      /** Starting plays the full recording when there is one, else the verses one by one. */
      startsFull: hasFullRecording,
      title: hasSuktaAudio ? copy.playSukta : hasFullRecording ? copy.playFull : copy.playThrough,
    },
    full: {
      playing: full.playing,
      /** What is playing: "ऋग्वेद १.१" for a sukta file, "अथर्ववेद · काण्ड १" for a chapter recording. */
      title:
        hasSuktaAudio && suktaNumber != null
          ? suktaLabel
            ? named(localLabel(suktaLabel))
            : named(t("documents.sukta_label", { number: digits(suktaNumber) }))
          : documentTitle
            ? chapterTitle
              ? `${documentTitle} · ${chapterTitle}`
              : documentTitle
            : copy.playFull,
      toggleLabel: full.playing ? t("documents.pause_verse") : hasSuktaAudio ? copy.playSukta : copy.playFull,
      current: formatPlaybackTime(full.currentTime),
      total: formatPlaybackTime(full.duration),
      fillPct: percent(full),
    },
    verse: {
      playing: verse.playing,
      hasClip: Boolean(activeShloka?.audio_url),
      toggleLabel: verse.playing ? t("documents.pause_verse") : t("documents.play_verse"),
      current: formatPlaybackTime(verse.currentTime),
      total: formatPlaybackTime(verse.duration),
      fillPct: percent(verse),
      /** The verse playing, named in full: "ऋग्वेद १.१.१". */
      kicker: activeShloka ? named(verseLabel) : (documentTitle ?? ""),
      title: activeShloka ? meaning || t("documents.now_playing", { label: verseLabel }) : "",
      /** Hand off to the full recording at this verse's timestamp, or to this verse's sukta file. */
      canSwitchToFull:
        (hasFullRecording && activeShloka?.full_audio_start != null) ||
        Boolean(hasSuktaAudio && activeShloka?.sukta_number != null),
    },
  };
}
