import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isNextSukta, suktaTracksFrom } from "@vedic-patro/features/documents";
import type { Shloka } from "@/lib/documents-api";
import { useFullRecordingAudio } from "@/hooks/use-full-recording-audio";
import { useShlokaPlayer } from "@/hooks/use-shloka-player";
import { useAudioProbe } from "@/lib/audio-probe";

/**
 * Orchestrates the two audio sources a document reading view can have — the
 * per-verse clips and the whole-document recording — so both
 * `DocumentDetail` (a non-chaptered document's single verse list) and
 * `DocumentChapterDetail` (one chapter of a chaptered document) can drive the
 * same `PlaybackBar` from the same logic instead of duplicating it.
 */
export function useDocumentPlayback(
  shlokas: Shloka[],
  fullAudioUrl: string | null | undefined,
  /** False while the chapter is still paging, so play-through does not assume this list is the whole chapter. */
  complete = true,
) {
  const suktaTracks = useMemo(() => (fullAudioUrl ? [] : suktaTracksFrom(shlokas)), [fullAudioUrl, shlokas]);
  const hasSuktaAudio = suktaTracks.length > 0;
  const queue = useMemo(
    () => (fullAudioUrl ? [fullAudioUrl] : suktaTracks.map((track) => track.url)),
    [fullAudioUrl, suktaTracks],
  );
  const onClipMissingRef = useRef<(id: number) => boolean>(() => false);
  const player = useShlokaPlayer(shlokas, (id) => onClipMissingRef.current(id), complete);
  // With gaps in the recordings a sukta file ending stops, rather than jumping to the next recorded sukta.
  const fullAudio = useFullRecordingAudio(
    queue,
    (from, to) => player.coversAll || isNextSukta(suktaTracks[from]?.sukta, suktaTracks[to]?.sukta),
  );

  // Which player currently owns the floating bar / actual sound — null until
  // the listener has engaged either one this visit.
  const [mode, setMode] = useState<"full" | "verse" | null>(null);

  const startFull = useCallback(() => {
    player.stop();
    setMode("full");
    fullAudio.play();
  }, [player, fullAudio]);

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
        fullAudio.handover();
        player.play(id);
      },
      toggle: (id: number) => {
        setMode("verse");
        fullAudio.handover();
        player.toggle(id);
      },
    }),
    [player, fullAudio],
  );

  const activeShloka = shlokas.find((s) => s.id === player.activeId) ?? null;

  const handledMiss = useRef<number | null>(null);
  useEffect(() => {
    onClipMissingRef.current = (id) => {
      if (!hasSuktaAudio) return false;
      if (handledMiss.current === id) return true;
      const sukta = shlokas.find((s) => s.id === id)?.sukta_number;
      if (sukta == null) return false;
      const at = suktaTracks.findIndex((track) => track.sukta === sukta);
      if (at < 0) return false;
      handledMiss.current = id;
      player.stop();
      setMode("full");
      fullAudio.playAt(at);
      return true;
    };
  });

  const switchToFull = useCallback(() => {
    if (!fullAudioUrl && hasSuktaAudio) {
      const sukta = activeShloka?.sukta_number;
      if (sukta == null) return;
      const at = suktaTracks.findIndex((track) => track.sukta === sukta);
      if (at < 0) return;
      player.stop();
      setMode("full");
      fullAudio.playAt(at);
      return;
    }
    if (activeShloka?.full_audio_start == null) return;
    player.pause();
    setMode("full");
    fullAudio.playFrom(activeShloka.full_audio_start);
  }, [fullAudioUrl, hasSuktaAudio, activeShloka, suktaTracks, player, fullAudio]);

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
  // `player` is a fresh object every render (see below); its setter is stable.
  const { setDisplayOverride } = player;
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
    if (active) setDisplayOverride(active);
    // `player.setDisplayOverride`, not `player` itself: useShlokaPlayer
    // returns a fresh object every render, so depending on the whole object
    // re-ran this effect on every render — including the one this effect's
    // own setState just caused — an infinite render loop. setDisplayOverride
    // is a plain useState setter, stable for the component's lifetime.
  }, [mode, fullAudio.playing, fullAudio.currentTime, shlokas, setDisplayOverride]);

  // Rigveda names a clip for every verse, but many were never uploaded (all of 10.85, say),
  // while the sukta file holds every verse. Each file is checked up front: a verse gets its own
  // play button only once its clip is confirmed, and a sukta heading once its file is.
  const probeUrls = useMemo(
    () =>
      hasSuktaAudio
        ? [...suktaTracks.map((track) => track.url), ...shlokas.flatMap((s) => (s.audio_url ? [s.audio_url] : []))]
        : [],
    [hasSuktaAudio, suktaTracks, shlokas],
  );
  const probed = useAudioProbe(probeUrls);
  const verseClipConfirmed = useCallback(
    (shloka: Shloka) => !hasSuktaAudio || (shloka.audio_url != null && probed.get(shloka.audio_url) === true),
    [hasSuktaAudio, probed],
  );

  const playingSukta = hasSuktaAudio && mode === "full" && fullAudio.playing ? (suktaTracks[fullAudio.index]?.sukta ?? null) : null;
  const toggleSukta = useCallback(
    (sukta: number) => {
      const at = suktaTracks.findIndex((track) => track.sukta === sukta);
      if (at < 0) return;
      if (mode === "full" && fullAudio.index === at) {
        fullAudio.toggle();
        return;
      }
      player.stop();
      setMode("full");
      fullAudio.playAt(at);
    },
    [suktaTracks, mode, fullAudio, player],
  );
  /** What a sukta heading needs: whether its file is there, whether it sounds now, and play / pause. */
  const suktaControls = useMemo(
    () =>
      hasSuktaAudio
        ? {
            has: (sukta: number) => {
              const track = suktaTracks.find((t) => t.sukta === sukta);
              // Every Rigveda sukta has its file: show the button at once, and drop it only when the
              // file is confirmed missing. iPhone Safari often loads no audio before a tap, so waiting
              // for the check there left the heading bare.
              return track != null && probed.get(track.url) !== false;
            },
            playing: playingSukta,
            toggle: toggleSukta,
          }
        : undefined,
    [hasSuktaAudio, suktaTracks, probed, playingSukta, toggleSukta],
  );

  return {
    player,
    verseClipConfirmed,
    suktaControls,
    versePlayer,
    fullAudio,
    mode,
    startFull,
    switchToFull,
    activeShloka,
    fullRecordingControls,
    hasSuktaAudio,
    suktaNumber: hasSuktaAudio ? (suktaTracks[fullAudio.index]?.sukta ?? null) : null,
  };
}
