import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioPlaylist,
  useAudioPlaylistStatus,
  type AudioMetadata,
  type AudioPlaylist,
} from "expo-audio";
import type { Shloka } from "@/lib/documents/api";
import { isAudioAvailable } from "@vedic-patro/api-client";

export type AudioMode = "full" | "verse" | null;

/** A track change this soon after the listener picked a verse is theirs, not a clip ending. */
const USER_SKIP_WINDOW_MS = 1500;

/**
 * Two audio sources a reading view can have — per-verse clips and the single
 * whole-document recording — driven from one place so a verse list and the
 * floating transport bar stay in step. Mirrors the web `useDocumentPlayback`.
 *
 * The verse clips play as one native playlist: the OS queue moves from one verse
 * to the next by itself, so a play-through keeps going with the screen locked or
 * the app in the background (no JavaScript has to run between clips), and the
 * lock screen / notification gets next and previous buttons. Needs the
 * `enableBackgroundPlayback` flag on the expo-audio plugin in app.json.
 */
export function useDocumentAudio(
  shlokas: Shloka[],
  fullAudioUrl: string | null | undefined,
  documentTitle?: string,
) {
  /** Verses that have a clip of their own, in reading order — the playlist's tracks. */
  const playable = useMemo(() => shlokas.filter((s) => s.audio_url), [shlokas]);
  const sources = useMemo(() => playable.map((s) => ({ uri: s.audio_url! })), [playable]);
  const playlist = useAudioPlaylist({ sources, updateInterval: 100 });
  const verseStatus = useAudioPlaylistStatus(playlist);

  /* Verse id at each playlist index. Kept in step by hand as missing recordings are
     taken out, and started afresh whenever the playlist itself is rebuilt. */
  const tracks = useRef<{ playlist: AudioPlaylist; ids: number[] } | null>(null);
  if (tracks.current?.playlist !== playlist) {
    tracks.current = { playlist, ids: playable.map((s) => s.id) };
  }
  const trackIds = () => tracks.current!.ids;

  const fullPlayer = useAudioPlayer(fullAudioUrl ? { uri: fullAudioUrl } : null, {
    updateInterval: 250,
  });
  const fullStatus = useAudioPlayerStatus(fullPlayer);

  const [mode, setMode] = useState<AudioMode>(null);
  const [openMeaningIds, setOpenMeaningIds] = useState<ReadonlySet<number>>(() => new Set());
  const openMeaningRef = useRef(openMeaningIds);
  openMeaningRef.current = openMeaningIds;
  const userSkipAt = useRef(0);

  useEffect(() => {
    // Recitation should be audible with the iPhone's silent switch on, and keep going
    // when the phone locks or the listener switches apps. `doNotMix` is what lets the
    // OS hand this app the lock-screen controls.
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  /** Verses whose recording turned out not to be in storage; skipped from then on. */
  const [missingIds, setMissingIds] = useState<ReadonlySet<number>>(() => new Set());

  const byId = useMemo(() => new Map(shlokas.map((s) => [s.id, s])), [shlokas]);

  const metadataFor = useCallback(
    (id: number | undefined): AudioMetadata => {
      const label = id != null ? byId.get(id)?.verse_label : undefined;
      return label
        ? { title: label, artist: documentTitle, albumTitle: documentTitle }
        : { title: documentTitle, albumTitle: documentTitle };
    },
    [byId, documentTitle],
  );

  /* A recording that was never uploaded would stop the queue dead (or play
     nothing), so each verse is checked as it comes up — the one sounding and the
     one after it — and a missing one is taken out of the playlist before the
     queue reaches it. */
  const verify = useCallback(
    (index: number) => {
      const id = trackIds()[index];
      const url = id != null ? byId.get(id)?.audio_url : null;
      if (id == null || !url) return;
      void isAudioAvailable(url).then((ok) => {
        if (ok) return;
        const t = tracks.current;
        if (!t || t.playlist !== playlist) return;
        const at = t.ids.indexOf(id);
        if (at < 0) return;
        const wasCurrent = playlist.currentIndex === at;
        t.ids.splice(at, 1);
        setMissingIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
        try {
          playlist.remove(at);
          if (wasCurrent && at < t.ids.length) {
            // The queue moved on to the verse after the missing one; keep it going.
            playlist.play();
            verify(at);
            verify(at + 1);
          }
        } catch {
          /* playlist already released */
        }
      });
    },
    [byId, playlist],
  );

  const claimLockScreen = useCallback(
    (target: "verse" | "full", id?: number) => {
      try {
        if (target === "verse") {
          playlist.setActiveForLockScreen(true, metadataFor(id), {
            showNextTrack: true,
            showPreviousTrack: true,
          });
        } else {
          fullPlayer.setActiveForLockScreen(true, metadataFor(undefined), {
            showSeekForward: true,
            showSeekBackward: true,
          });
        }
      } catch {
        /* lock-screen controls are a nicety; playback goes on without them */
      }
    },
    [playlist, fullPlayer, metadataFor],
  );

  const playVerse = useCallback(
    (id: number) => {
      const index = trackIds().indexOf(id);
      if (index < 0) return;
      fullPlayer.pause();
      setMode("verse");
      userSkipAt.current = Date.now();
      if (playlist.currentIndex !== index) playlist.skipTo(index);
      playlist.play();
      claimLockScreen("verse", id);
      verify(index);
      verify(index + 1);
    },
    [fullPlayer, playlist, claimLockScreen, verify],
  );

  const currentIndex = verseStatus.currentIndex;
  const activeVerseId = mode === "verse" ? (trackIds()[currentIndex] ?? null) : null;

  // Every verse change — a clip ending (also while the app is in the background)
  // or a skip from the lock screen — refreshes the lock-screen title and checks the
  // verse after it. When a clip ends on its own and the listener has that verse's
  // meaning open, they are reading rather than listening straight through: stop at
  // the start of the next verse.
  useEffect(() => {
    const sub = playlist.addListener("trackChanged", ({ previousIndex, currentIndex: index }) => {
      const ids = trackIds();
      const id = ids[index];
      if (id == null) return;
      const userSkip = Date.now() - userSkipAt.current < USER_SKIP_WINDOW_MS;
      const prevId = ids[previousIndex];
      if (!userSkip && index === previousIndex + 1 && prevId != null && openMeaningRef.current.has(prevId)) {
        playlist.pause();
      }
      try {
        playlist.updateLockScreenMetadata(metadataFor(id));
      } catch {
        /* not the lock-screen player right now */
      }
      verify(index + 1);
    });
    return () => sub.remove();
  }, [playlist, metadataFor, verify]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVerse = useCallback(
    (id: number) => {
      if (mode === "verse" && activeVerseId === id) {
        if (verseStatus.playing) playlist.pause();
        else {
          playlist.play();
          claimLockScreen("verse", id);
        }
        return;
      }
      playVerse(id);
    },
    [mode, activeVerseId, verseStatus.playing, playlist, claimLockScreen, playVerse],
  );

  const stepVerse = useCallback(
    (delta: 1 | -1) => {
      const ids = trackIds();
      const target = ids[(activeVerseId == null ? -1 : ids.indexOf(activeVerseId)) + delta];
      if (target != null) playVerse(target);
    },
    [activeVerseId, playVerse],
  );

  const startFull = useCallback(() => {
    playlist.pause();
    setMode("full");
    fullPlayer.play();
    claimLockScreen("full");
  }, [playlist, fullPlayer, claimLockScreen]);

  const startPlayThrough = useCallback(() => {
    const first = trackIds()[0];
    if (first != null) playVerse(first);
  }, [playVerse]);

  const toggleFull = useCallback(() => {
    if (fullStatus.playing) fullPlayer.pause();
    else {
      fullPlayer.play();
      claimLockScreen("full");
    }
  }, [fullStatus.playing, fullPlayer, claimLockScreen]);

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
      playlist.pause();
      setMode("full");
      void fullPlayer.seekTo(shloka.full_audio_start);
      fullPlayer.play();
      claimLockScreen("full");
    },
    [byId, mode, fullStatus.playing, fullStatus.currentTime, shlokas, playlist, fullPlayer, claimLockScreen],
  );

  const switchToFull = useCallback(() => {
    if (activeVerseId == null) return;
    const shloka = byId.get(activeVerseId);
    if (shloka?.full_audio_start == null) return;
    playlist.pause();
    setMode("full");
    void fullPlayer.seekTo(shloka.full_audio_start);
    fullPlayer.play();
    claimLockScreen("full");
  }, [activeVerseId, byId, playlist, fullPlayer, claimLockScreen]);

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

  // Pause everything and give up the lock screen when the reader leaves the screen.
  // Going to the home screen or locking the phone does not unmount it, so that
  // keeps playing.
  useEffect(
    () => () => {
      for (const p of [playlist, fullPlayer]) {
        try {
          p.pause();
          p.clearLockScreenControls();
        } catch {
          /* player already released */
        }
      }
    },
    [playlist, fullPlayer],
  );

  const verseIndex = activeVerseId == null ? -1 : trackIds().indexOf(activeVerseId);

  return {
    missingIds,
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
    hasNext: verseIndex >= 0 && verseIndex < trackIds().length - 1,
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
