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
import { audioCoversAll, isNextSukta, isNextVerse, suktaTracksFrom } from "@vedic-patro/features/documents";

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

  const suktaTracks = useMemo(() => (fullAudioUrl ? [] : suktaTracksFrom(shlokas)), [fullAudioUrl, shlokas]);
  const suktaSources = useMemo(() => suktaTracks.map((track) => ({ uri: track.url })), [suktaTracks]);
  const suktaPlaylist = useAudioPlaylist({ sources: suktaSources, updateInterval: 250 });
  const suktaStatus = useAudioPlaylistStatus(suktaPlaylist);

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

  /* Every verse recorded (or one full recording): the bar offers "play through" and playback runs
     on by itself. With recordings for a few verses only, it stops where the recordings stop instead
     of jumping — and scrolling — far ahead to the next one. */
  /** Verses whose recording turned out not to be in storage; skipped from then on. */
  const [missingIds, setMissingIds] = useState<ReadonlySet<number>>(() => new Set());
  const coversAll = useMemo(
    () =>
      Boolean(fullAudioUrl) ||
      audioCoversAll(missingIds.size ? shlokas.map((s) => (missingIds.has(s.id) ? { ...s, audio_url: null } : s)) : shlokas),
    [fullAudioUrl, shlokas, missingIds],
  );
  const gapRef = useRef({ coversAll, shlokas, suktaTracks });
  gapRef.current = { coversAll, shlokas, suktaTracks };
  const suktaSkipAt = useRef(0);
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

  /** Verses whose recording is confirmed in storage: only these get a play button. The database
   *  names a file for many verses (the Rigveda's above all) that was never uploaded, so every one
   *  is checked up front, a few at a time, instead of finding out when the listener taps play. */
  const [verifiedIds, setVerifiedIds] = useState<ReadonlySet<number>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    const queue = playable.slice();
    const found: number[] = [];
    const missing: number[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      if (cancelled) return;
      const ok = found.splice(0);
      const gone = missing.splice(0);
      if (ok.length) setVerifiedIds((prev) => new Set([...prev, ...ok]));
      if (gone.length) setMissingIds((prev) => new Set([...prev, ...gone]));
    };
    const worker = async () => {
      for (let s = queue.shift(); s && !cancelled; s = queue.shift()) {
        const ok = await isAudioAvailable(s.audio_url!);
        (ok ? found : missing).push(s.id);
        // One state update per batch, not per verse.
        flushTimer ??= setTimeout(flush, 120);
      }
    };
    void Promise.all(Array.from({ length: 6 }, worker)).then(flush);
    return () => {
      cancelled = true;
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [playable]);

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
     queue reaches it. A missing Rigveda verse plays that sukta's file instead. */
  const startSuktaRef = useRef<(index: number) => void>(() => {});
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
        const sukta = byId.get(id)?.sukta_number;
        const suktaAt = sukta == null ? -1 : suktaTracks.findIndex((track) => track.sukta === sukta);
        setMissingIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
        if (wasCurrent && suktaAt >= 0) {
          startSuktaRef.current(suktaAt);
          return;
        }
        t.ids.splice(at, 1);
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
    [byId, playlist, suktaTracks],
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
      suktaPlaylist.pause();
      setMode("verse");
      userSkipAt.current = Date.now();
      if (playlist.currentIndex !== index) playlist.skipTo(index);
      playlist.play();
      claimLockScreen("verse", id);
      verify(index);
      verify(index + 1);
    },
    [fullPlayer, suktaPlaylist, playlist, claimLockScreen, verify],
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
      // The next recording is not the next verse (a gap in the recordings): stop here.
      const gap = gapRef.current;
      if (!userSkip && !gap.coversAll && prevId != null && !isNextVerse(gap.shlokas, prevId, id)) {
        playlist.pause();
        setMode(null);
        return;
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
    suktaPlaylist.pause();
    setMode("full");
    fullPlayer.play();
    claimLockScreen("full");
  }, [playlist, suktaPlaylist, fullPlayer, claimLockScreen]);

  const startSukta = useCallback(
    (index = 0) => {
      if (!suktaTracks.length) return;
      playlist.pause();
      fullPlayer.pause();
      setMode("full");
      const at = index >= 0 && index < suktaTracks.length ? index : 0;
      if (suktaPlaylist.currentIndex !== at) {
        suktaSkipAt.current = Date.now();
        suktaPlaylist.skipTo(at);
      }
      suktaPlaylist.play();
      const sukta = suktaTracks[at]?.sukta;
      try {
        suktaPlaylist.setActiveForLockScreen(
          true,
          {
            title: sukta != null ? `Sukta ${sukta}` : documentTitle,
            artist: documentTitle,
            albumTitle: documentTitle,
          },
          { showNextTrack: true, showPreviousTrack: true },
        );
      } catch {
        /* lock-screen controls are a nicety */
      }
    },
    [suktaTracks, playlist, fullPlayer, suktaPlaylist, documentTitle],
  );
  startSuktaRef.current = startSukta;

  // A sukta file ending moves on to the next one only when it is the very next sukta.
  useEffect(() => {
    const sub = suktaPlaylist.addListener("trackChanged", ({ previousIndex, currentIndex: index }) => {
      if (Date.now() - suktaSkipAt.current < USER_SKIP_WINDOW_MS) return;
      const gap = gapRef.current;
      if (gap.coversAll) return;
      if (!isNextSukta(gap.suktaTracks[previousIndex]?.sukta, gap.suktaTracks[index]?.sukta)) {
        suktaPlaylist.pause();
        setMode(null);
      }
    });
    return () => sub.remove();
  }, [suktaPlaylist]);

  const startPlayThrough = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      startSukta(0);
      return;
    }
    const first = trackIds()[0];
    if (first != null) playVerse(first);
  }, [fullAudioUrl, suktaTracks.length, startSukta, playVerse]);

  const toggleFull = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      if (suktaStatus.playing) suktaPlaylist.pause();
      else startSukta(suktaStatus.currentIndex >= 0 ? suktaStatus.currentIndex : 0);
      return;
    }
    if (fullStatus.playing) fullPlayer.pause();
    else {
      fullPlayer.play();
      claimLockScreen("full");
    }
  }, [fullAudioUrl, suktaTracks.length, suktaStatus.playing, suktaStatus.currentIndex, suktaPlaylist, startSukta, fullStatus.playing, fullPlayer, claimLockScreen]);

  const seekFull = useCallback(
    (seconds: number) => {
      if (!fullAudioUrl && suktaTracks.length) {
        void suktaPlaylist.seekTo(seconds);
        return;
      }
      void fullPlayer.seekTo(seconds);
    },
    [fullAudioUrl, suktaTracks.length, suktaPlaylist, fullPlayer],
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
      suktaPlaylist.pause();
      setMode("full");
      void fullPlayer.seekTo(shloka.full_audio_start);
      fullPlayer.play();
      claimLockScreen("full");
    },
    [byId, mode, fullStatus.playing, fullStatus.currentTime, shlokas, playlist, suktaPlaylist, fullPlayer, claimLockScreen],
  );

  const switchToFull = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      const sukta = activeVerseId == null ? null : byId.get(activeVerseId)?.sukta_number;
      const at = sukta == null ? -1 : suktaTracks.findIndex((track) => track.sukta === sukta);
      if (at >= 0) startSukta(at);
      return;
    }
    if (activeVerseId == null) return;
    const shloka = byId.get(activeVerseId);
    if (shloka?.full_audio_start == null) return;
    playlist.pause();
    suktaPlaylist.pause();
    setMode("full");
    void fullPlayer.seekTo(shloka.full_audio_start);
    fullPlayer.play();
    claimLockScreen("full");
  }, [activeVerseId, byId, playlist, suktaPlaylist, fullPlayer, claimLockScreen, fullAudioUrl, suktaTracks, startSukta]);

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
      for (const p of [playlist, fullPlayer, suktaPlaylist]) {
        try {
          p.pause();
          p.clearLockScreenControls();
        } catch {
          /* player already released */
        }
      }
    },
    [playlist, fullPlayer, suktaPlaylist],
  );

  const verseIndex = activeVerseId == null ? -1 : trackIds().indexOf(activeVerseId);

  return {
    missingIds,
    verifiedIds,
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
    // Next / previous only to a neighbouring verse when the recordings have gaps.
    hasNext:
      verseIndex >= 0 &&
      verseIndex < trackIds().length - 1 &&
      (coversAll || isNextVerse(shlokas, trackIds()[verseIndex]!, trackIds()[verseIndex + 1]!)),
    hasPrev: verseIndex > 0 && (coversAll || isNextVerse(shlokas, trackIds()[verseIndex - 1]!, trackIds()[verseIndex]!)),
    verse: {
      playing: verseStatus.playing,
      currentTime: verseStatus.currentTime,
      duration: verseStatus.duration,
    },
    full: {
      playing: !fullAudioUrl && suktaTracks.length > 0 ? suktaStatus.playing : fullStatus.playing,
      currentTime: !fullAudioUrl && suktaTracks.length > 0 ? suktaStatus.currentTime : fullStatus.currentTime,
      duration: !fullAudioUrl && suktaTracks.length > 0 ? suktaStatus.duration : fullStatus.duration,
      available: Boolean(fullAudioUrl),
    },
    hasSuktaAudio: !fullAudioUrl && suktaTracks.length > 0,
    suktaNumber:
      !fullAudioUrl && mode === "full"
        ? (suktaTracks[suktaStatus.currentIndex >= 0 ? suktaStatus.currentIndex : 0]?.sukta ?? null)
        : null,
    startFull,
    startPlayThrough,
    /** The bar's start button: only when every verse is recorded (or there is a full recording). */
    canPlayThrough: coversAll,
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
