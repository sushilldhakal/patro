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
  canPlayThrough,
  full,
  verse,
  activeShloka,
}: {
  /** `null` until something is engaged, then which recording is playing. */
  mode: "full" | "verse" | null;
  hasFullRecording: boolean;
  /** Verses have their own clips to play one after another. */
  canPlayThrough: boolean;
  full: PlaybackClock;
  verse: PlaybackClock;
  activeShloka: Shloka | null;
}) {
  const { t, lang } = useLocale();

  const copy = {
    playFull: t("documents.play_full_recording"),
    playThrough: t("documents.play_through"),
    seek: t("documents.seek"),
    prevVerse: t("documents.prev_verse"),
    nextVerse: t("documents.next_verse"),
    switchToFull: t("documents.switch_to_full"),
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

  return {
    face,
    copy,
    idle: {
      /** Starting plays the full recording when there is one, else the verses one by one. */
      startsFull: hasFullRecording,
      title: hasFullRecording ? copy.playFull : copy.playThrough,
    },
    full: {
      playing: full.playing,
      toggleLabel: full.playing ? t("documents.pause_verse") : copy.playFull,
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
      title: activeShloka
        ? `${t("documents.now_playing", { label: activeShloka.verse_label })}${meaning ? ` — ${meaning}` : ""}`
        : "",
      /** Hand off to the full recording at this verse's own timestamp. */
      canSwitchToFull: hasFullRecording && activeShloka?.full_audio_start != null,
    },
  };
}
