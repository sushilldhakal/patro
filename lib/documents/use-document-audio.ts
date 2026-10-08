import { useCallback, useEffect, useMemo, useState } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { Shloka } from "@/lib/documents/api";

export type AudioMode = "full" | "verse" | null;

/**
 * Two audio sources a reading view can have — per-verse clips and the single
 * whole-document recording — driven from one place so a verse list and the
 * floating transport bar stay in step. Mirrors the web `useDocumentPlayback`.
 */
export function useDocumentAudio(shlokas: Shloka[], fullAudioUrl: string | null | undefined) {
  const versePlayer = useAudioPlayer(null, { updateInterval: 250 });
  const verseStatus = useAudioPlayerStatus(versePlayer);
  const fullPlayer = useAudioPlayer(fullAudioUrl ? { uri: fullAudioUrl } : null, {
    updateInterval: 250,
  });
  const fullStatus = useAudioPlayerStatus(fullPlayer);

  const [mode, setMode] = useState<AudioMode>(null);
  const [activeVerseId, setActiveVerseId] = useState<number | null>(null);
  const [openMeaningIds, setOpenMeaningIds] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    // Recitation should be audible with the iPhone's silent switch on.
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  const order = useMemo(() => shlokas.map((s) => s.id), [shlokas]);
  const byId = useMemo(() => new Map(shlokas.map((s) => [s.id, s])), [shlokas]);

  const playVerse = useCallback(
    (id: number) => {
      const shloka = byId.get(id);
      if (!shloka?.audio_url) return;
      fullPlayer.pause();
      setMode("verse");
      setActiveVerseId(id);
      versePlayer.replace({ uri: shloka.audio_url });
      versePlayer.play();
    },
    [byId, fullPlayer, versePlayer],
  );

  const toggleVerse = useCallback(
    (id: number) => {
      if (mode === "verse" && activeVerseId === id && verseStatus.playing) {
        versePlayer.pause();
        return;
      }
      if (mode === "verse" && activeVerseId === id && !verseStatus.playing && verseStatus.isLoaded) {
        versePlayer.play();
        return;
      }
      playVerse(id);
    },
    [mode, activeVerseId, verseStatus.playing, verseStatus.isLoaded, versePlayer, playVerse],
  );

  const stepVerse = useCallback(
    (delta: 1 | -1) => {
      const i = activeVerseId == null ? -1 : order.indexOf(activeVerseId);
      for (let j = i + delta; j >= 0 && j < order.length; j += delta) {
        const candidate = byId.get(order[j]!);
        if (candidate?.audio_url) {
          playVerse(candidate.id);
          return;
        }
      }
    },
    [activeVerseId, order, byId, playVerse],
  );

  // When a clip ends, roll on to the next verse — unless that verse's
  // meaning is open (the listener is reading, not listening straight through).
  useEffect(() => {
    if (mode !== "verse" || !verseStatus.didJustFinish || activeVerseId == null) return;
    if (openMeaningIds.has(activeVerseId)) return;
    stepVerse(1);
  }, [verseStatus.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const startFull = useCallback(() => {
    versePlayer.pause();
    setMode("full");
    fullPlayer.play();
  }, [versePlayer, fullPlayer]);

  const startPlayThrough = useCallback(() => {
    const first = shlokas.find((s) => s.audio_url);
    if (first) playVerse(first.id);
  }, [shlokas, playVerse]);

  const toggleFull = useCallback(() => {
    if (fullStatus.playing) fullPlayer.pause();
    else fullPlayer.play();
  }, [fullStatus.playing, fullPlayer]);

  const seekFull = useCallback(
    (seconds: number) => {
      void fullPlayer.seekTo(seconds);
    },
    [fullPlayer],
  );

  /** Play the full recording from a verse's measured timestamp. */
  const playFullAt = useCallback(
    (id: number) => {
      const shloka = byId.get(id);
      if (shloka?.full_audio_start == null) return;
      if (mode === "full" && fullStatus.playing && fullActiveId(shlokas, fullStatus.currentTime) === id) {
        fullPlayer.pause();
        return;
      }
      versePlayer.pause();
      setMode("full");
      void fullPlayer.seekTo(shloka.full_audio_start);
      fullPlayer.play();
    },
    [byId, mode, fullStatus.playing, fullStatus.currentTime, shlokas, versePlayer, fullPlayer],
  );

  const switchToFull = useCallback(() => {
    if (activeVerseId == null) return;
    const shloka = byId.get(activeVerseId);
    if (shloka?.full_audio_start == null) return;
    versePlayer.pause();
    setMode("full");
    void fullPlayer.seekTo(shloka.full_audio_start);
    fullPlayer.play();
  }, [activeVerseId, byId, versePlayer, fullPlayer]);

  const toggleMeaning = useCallback((id: number) => {
    setOpenMeaningIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // While the full recording plays, derive the sounding verse from each
  // verse's measured start/end inside it.
  const fullHighlight = useMemo(() => {
    if (mode !== "full") return null;
    let active: { id: number; progress: number } | null = null;
    for (const s of shlokas) {
      if (s.full_audio_start == null || s.full_audio_end == null) continue;
      if (s.full_audio_start > fullStatus.currentTime) break;
      const dur = s.full_audio_end - s.full_audio_start;
      active = {
        id: s.id,
        progress: dur > 0 ? Math.min(1, Math.max(0, (fullStatus.currentTime - s.full_audio_start) / dur)) : 0,
      };
    }
    return active;
  }, [mode, shlokas, fullStatus.currentTime]);

  const verseProgress = verseStatus.duration > 0 ? verseStatus.currentTime / verseStatus.duration : 0;
  const activeId = mode === "full" ? (fullHighlight?.id ?? null) : mode === "verse" ? activeVerseId : null;
  const activeProgress = mode === "full" ? (fullHighlight?.progress ?? 0) : verseProgress;
  const activePlaying = mode === "full" ? fullStatus.playing : mode === "verse" ? verseStatus.playing : false;

  // Pause everything when the reader leaves the screen.
  useEffect(
    () => () => {
      try {
        versePlayer.pause();
        fullPlayer.pause();
      } catch {
        /* player already released */
      }
    },
    [versePlayer, fullPlayer],
  );

  const verseIndex = activeVerseId == null ? -1 : order.indexOf(activeVerseId);

  return {
    mode,
    activeId,
    activeProgress,
    activePlaying,
    activeShloka: activeVerseId != null ? (byId.get(activeVerseId) ?? null) : null,
    openMeaningIds,
    toggleMeaning,
    toggleVerse,
    playVerse,
    nextVerse: () => stepVerse(1),
    prevVerse: () => stepVerse(-1),
    hasNext: verseIndex >= 0 && verseIndex < order.length - 1,
    hasPrev: verseIndex > 0,
    verse: {
      playing: verseStatus.playing,
      currentTime: verseStatus.currentTime,
      duration: verseStatus.duration,
    },
    full: {
      playing: fullStatus.playing,
      currentTime: fullStatus.currentTime,
      duration: fullStatus.duration,
      available: Boolean(fullAudioUrl),
    },
    startFull,
    startPlayThrough,
    toggleFull,
    seekFull,
    playFullAt,
    switchToFull,
    /** Whether any verse here has a clip of its own. */
    hasVerseClips: shlokas.some((s) => Boolean(s.audio_url)),
  };
}

function fullActiveId(shlokas: Shloka[], time: number): number | null {
  let id: number | null = null;
  for (const s of shlokas) {
    if (s.full_audio_start == null) continue;
    if (s.full_audio_start > time) break;
    id = s.id;
  }
  return id;
}

export type DocumentAudio = ReturnType<typeof useDocumentAudio>;
