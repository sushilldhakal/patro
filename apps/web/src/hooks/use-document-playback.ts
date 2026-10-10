import { useCallback, useEffect, useMemo, useState } from "react";
import type { Shloka } from "@/lib/documents-api";
import { useFullRecordingAudio } from "@/hooks/use-full-recording-audio";
import { useShlokaPlayer } from "@/hooks/use-shloka-player";

/**
 * Orchestrates the two audio sources a document reading view can have — the
 * per-verse clips and the whole-document recording — so both
 * `DocumentDetail` (a non-chaptered document's single verse list) and
 * `DocumentChapterDetail` (one chapter of a chaptered document) can drive the
 * same `PlaybackBar` from the same logic instead of duplicating it.
 */
export function useDocumentPlayback(shlokas: Shloka[], fullAudioUrl: string | null | undefined) {
  const player = useShlokaPlayer(shlokas);
  const fullAudio = useFullRecordingAudio(fullAudioUrl);

  // Which player currently owns the floating bar / actual sound — null until
  // the listener has engaged either one this visit.
  const [mode, setMode] = useState<"full" | "verse" | null>(null);

  const startFull = useCallback(() => {
    setMode("full");
    fullAudio.play();
  }, [fullAudio]);

  // A click on any individual verse always hands control to the per-verse
  // engine and stops the full recording outright — `player.playing` alone
  // isn't a reliable signal here (see the comment on `versePlayer` below),
  // so both sides pause/switch explicitly on every call rather than reacting
  // to a state transition that might not actually change value.
  const versePlayer = useMemo(
    () => ({
      ...player,
      play: (id: number) => {
        setMode("verse");
        fullAudio.pause();
        player.play(id);
      },
      toggle: (id: number) => {
        setMode("verse");
        fullAudio.pause();
        player.toggle(id);
      },
    }),
    [player, fullAudio],
  );

  const activeShloka = shlokas.find((s) => s.id === player.activeId) ?? null;

  const switchToFull = useCallback(() => {
    if (activeShloka?.full_audio_start == null) return;
    player.pause();
    setMode("full");
    fullAudio.playFrom(activeShloka.full_audio_start);
  }, [activeShloka, player, fullAudio]);

  // Per-verse play button for documents that have only the full recording
  // (no per-verse clips) but carry each verse's timestamp within it — e.g.
  // Rudrashtadhyayi. Starts the full recording at that verse; a second press
  // on the verse that is currently sounding pauses it instead.
  const toggleFullAt = useCallback(
    (id: number) => {
      const shloka = shlokas.find((s) => s.id === id);
      if (shloka?.full_audio_start == null) return;
      if (mode === "full" && fullAudio.playing && player.activeId === id) {
        fullAudio.pause();
        return;
      }
      player.pause();
      setMode("full");
      // Claim the highlight right away so the card lights up before the
      // first timeupdate arrives from the seek.
      player.setDisplayOverride({ id, progress: 0 });
      fullAudio.playFrom(shloka.full_audio_start);
    },
    [shlokas, mode, player, fullAudio],
  );

  // What each verse card needs to drive the full recording: whether it is
  // actually sounding (the display override alone reports "playing" even
  // while the full recording is paused) and the toggle above.
  const fullRecordingControls = useMemo(
    () =>
      fullAudioUrl
        ? { playing: mode === "full" && fullAudio.playing, toggleAt: toggleFullAt }
        : undefined,
    [fullAudioUrl, mode, fullAudio.playing, toggleFullAt],
  );

  // While the full recording plays, estimate which verse is currently
  // sounding from each verse's *real* measured start/end within it (from
  // cross-correlating its own clip against the full recording — see
  // data/documents_source/README.md) and drive the same highlight/auto-scroll
  // the per-verse player uses.
  useEffect(() => {
    if (mode !== "full" || !fullAudio.playing) return;
    let active: { id: number; progress: number } | null = null;
    for (const s of shlokas) {
      if (s.full_audio_start == null || s.full_audio_end == null) continue;
      if (s.full_audio_start > fullAudio.currentTime) break;
      const dur = s.full_audio_end - s.full_audio_start;
      active = {
        id: s.id,
        progress: dur > 0 ? Math.min(1, Math.max(0, (fullAudio.currentTime - s.full_audio_start) / dur)) : 0,
      };
    }
    if (active) player.setDisplayOverride(active);
    // `player.setDisplayOverride`, not `player` itself: useShlokaPlayer
    // returns a fresh object every render, so depending on the whole object
    // re-ran this effect on every render — including the one this effect's
    // own setState just caused — an infinite render loop. setDisplayOverride
    // is a plain useState setter, stable for the component's lifetime.
  }, [mode, fullAudio.playing, fullAudio.currentTime, shlokas, player.setDisplayOverride]);

  return {
    player,
    versePlayer,
    fullAudio,
    mode,
    startFull,
    switchToFull,
    activeShloka,
    fullRecordingControls,
  };
}
