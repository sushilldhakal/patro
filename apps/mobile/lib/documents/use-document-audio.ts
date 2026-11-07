import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioPlaylist,
  useAudioPlaylistStatus,
  type AudioMetadata,
  type AudioPlaylist,
} from "expo-audio";
import type { Shloka } from "@/lib/documents/api";
import { armBackgroundPlayback, ensurePlaybackSession, playbackArtworkUrl } from "@/lib/audio-session";
import { isAudioAvailable } from "@vedic-patro/api-client";
import { audioCoversAll, isNextSukta, isNextVerse, suktaTracksFrom } from "@vedic-patro/features/documents";

export type AudioMode = "full" | "verse" | null;

/** A track change this soon after the listener picked a verse is theirs, not a clip ending. */
const USER_SKIP_WINDOW_MS = 1500;

/** `next` keeps `prev` as one contiguous run of ids (pages appended or prepended). */
function extendsIds(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  if (prev === next) return true;
  const old = prev.split(",");
  const ids = next.split(",");
  const at = ids.indexOf(old[0]!);
  if (at < 0) return false;
  return old.every((id, i) => ids[at + i] === id);
}

/**
 * Two audio sources a reading view can have — per-verse clips and the single
 * whole-document recording — driven from one place so a verse list and the
 * floating transport bar stay in step. Mirrors the web `useDocumentPlayback`.
 *
 * The verse clips play as one native playlist: the OS queue moves from one verse
 * to the next by itself, so a play-through keeps going with the screen locked or
 * the app in the background (no JavaScript has to run between clips), and the
 * lock screen / notification gets next and previous buttons. Needs the
 * `enableBackgroundPlayback` flag on the expo-audio plugin in app.json, which
 * only takes effect in a dev or store build, not from a Metro reload alone.
 */
export function useDocumentAudio(
  shlokas: Shloka[],
  fullAudioUrl: string | null | undefined,
  documentTitle?: string,
  /** False while later pages are not loaded, so a partial list is not treated as the whole chapter. */
  complete = true,
  chapterTitle?: string,
) {
  /** Verses that have a clip of their own, in reading order — the playlist's tracks. */
  const playable = useMemo(() => shlokas.filter((s) => s.audio_url), [shlokas]);
  // The playlist is created from the first page and then extended with add/insert.
  // Passing a longer `sources` array would destroy it and stop the verse that is sounding.
  const frozenVerse = useRef<{ key: string; sources: { uri: string }[] }>({ key: "", sources: [] });
  const playableKey = playable.map((s) => s.id).join(",");
  if (!playableKey) {
    if (frozenVerse.current.key) frozenVerse.current = { key: "", sources: [] };
  } else if (!extendsIds(frozenVerse.current.key, playableKey)) {
    frozenVerse.current = { key: playableKey, sources: playable.map((s) => ({ uri: s.audio_url! })) };
  }
  const playlist = useAudioPlaylist({ sources: frozenVerse.current.sources, updateInterval: 100 });
  const verseStatus = useAudioPlaylistStatus(playlist);

  const suktaTracks = useMemo(() => (fullAudioUrl ? [] : suktaTracksFrom(shlokas)), [fullAudioUrl, shlokas]);
  const frozenSukta = useRef<{ key: string; sources: { uri: string }[] }>({ key: "", sources: [] });
  const suktaKey = suktaTracks.map((track) => String(track.sukta)).join(",");
  if (!suktaKey) {
    if (frozenSukta.current.key) frozenSukta.current = { key: "", sources: [] };
  } else if (!extendsIds(frozenSukta.current.key, suktaKey)) {
    frozenSukta.current = { key: suktaKey, sources: suktaTracks.map((track) => ({ uri: track.url })) };
  }
  const suktaPlaylist = useAudioPlaylist({ sources: frozenSukta.current.sources, updateInterval: 250 });
  const suktaStatus = useAudioPlaylistStatus(suktaPlaylist);

  /* Verse id at each playlist index. Kept in step by hand as missing recordings are
     taken out, and started afresh whenever the playlist itself is rebuilt. */
  const tracks = useRef<{ playlist: AudioPlaylist; ids: number[] } | null>(null);
  if (tracks.current?.playlist !== playlist) {
    tracks.current = { playlist, ids: playable.map((s) => s.id) };
  }
  const trackIds = () => tracks.current!.ids;

  // Pages that arrive while a verse is sounding are inserted into the live playlist.
  useEffect(() => {
    const t = tracks.current;
    if (!t || t.playlist !== playlist || playable.length === 0) return;
    const prev = t.ids;
    if (prev.length === playable.length && prev.every((id, i) => id === playable[i]!.id)) return;
    const at = prev.length ? playable.findIndex((s) => s.id === prev[0]) : -1;
    if (at < 0 || !prev.every((id, i) => playable[at + i]?.id === id)) return;
    for (let i = at - 1; i >= 0; i--) playlist.insert({ uri: playable[i]!.audio_url! }, 0);
    for (let i = at + prev.length; i < playable.length; i++) playlist.add({ uri: playable[i]!.audio_url! });
    t.ids = playable.map((s) => s.id);
  }, [playable, playlist]);

  /** Sukta numbers in the native queue's order: its indices, which can trail `suktaTracks` (see extendSukta). */
  const suktaQueue = (): number[] => (frozenSukta.current.key ? frozenSukta.current.key.split(",").map(Number) : []);

  /* Pages that arrive add their suktas to the live queue. Appending is free; putting one in front
     rebuilds the native queue, which restarts the sukta that is loaded (or, while it is still
     buffering, stops it). So suktas from earlier pages wait while a sukta is in use, and go in when
     it is done or when one of them is started. */
  const extendSukta = useCallback(
    (prepend: boolean) => {
      const key = suktaTracks.map((track) => String(track.sukta)).join(",");
      if (!key || !extendsIds(frozenSukta.current.key, key) || frozenSukta.current.key === key) return;
      const old = frozenSukta.current.key.split(",");
      const next = suktaTracks;
      const at = next.findIndex((track) => String(track.sukta) === old[0]);
      if (at < 0) return;
      for (let i = at + old.length; i < next.length; i++) suktaPlaylist.add({ uri: next[i]!.url });
      let first = at;
      if (prepend) {
        for (let i = at - 1; i >= 0; i--) suktaPlaylist.insert({ uri: next[i]!.url }, 0);
        first = 0;
      }
      frozenSukta.current = {
        ...frozenSukta.current,
        key: next
          .slice(first)
          .map((track) => String(track.sukta))
          .join(","),
      };
    },
    [suktaTracks, suktaPlaylist],
  );

  const fullPlayer = useAudioPlayer(fullAudioUrl ? { uri: fullAudioUrl } : null, {
    updateInterval: 250,
    keepAudioSessionActive: true,
  });
  const fullStatus = useAudioPlayerStatus(fullPlayer);

  const [mode, setMode] = useState<AudioMode>(null);
  /* Which source the reader is on, read by the native listeners. Set together with the state: a
     track event can arrive before the render that would update it. */
  const modeRef = useRef<AudioMode>(null);
  const setModeNow = useCallback((next: AudioMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);
  useEffect(() => {
    extendSukta(mode !== "full");
  }, [extendSukta, mode]);

  /* Every verse recorded (or one full recording): the bar offers "play through" and playback runs
     on by itself. With recordings for a few verses only, it stops where the recordings stop instead
     of jumping — and scrolling — far ahead to the next one. */
  /** Verses whose recording turned out not to be in storage; skipped from then on. */
  const [missingIds, setMissingIds] = useState<ReadonlySet<number>>(() => new Set());
  const coversAll = useMemo(
    () =>
      complete &&
      (Boolean(fullAudioUrl) ||
        audioCoversAll(missingIds.size ? shlokas.map((s) => (missingIds.has(s.id) ? { ...s, audio_url: null } : s)) : shlokas)),
    [complete, fullAudioUrl, shlokas, missingIds],
  );
  const gapRef = useRef({ coversAll, shlokas, suktaTracks });
  gapRef.current = { coversAll, shlokas, suktaTracks };
  const suktaSkipAt = useRef(0);
  const [openMeaningIds, setOpenMeaningIds] = useState<ReadonlySet<number>>(() => new Set());
  const openMeaningRef = useRef(openMeaningIds);
  openMeaningRef.current = openMeaningIds;
  const userSkipAt = useRef(0);

  const artworkUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    armBackgroundPlayback();
    let cancelled = false;
    void playbackArtworkUrl().then((url) => {
      if (!cancelled) artworkUrl.current = url;
    });
    return () => {
      cancelled = true;
    };
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
    (id: number | undefined, title?: string): AudioMetadata => {
      const label = id != null ? byId.get(id)?.verse_label : undefined;
      return {
        title: label ?? title ?? chapterTitle ?? documentTitle,
        artist: documentTitle,
        albumTitle: chapterTitle ?? documentTitle,
        artworkUrl: artworkUrl.current,
      };
    },
    [byId, documentTitle, chapterTitle],
  );

  /** Session first, then the system player, then sound. The notification has to be claimed while the app is still open. */
  const arm = useCallback(async () => {
    await ensurePlaybackSession();
    armBackgroundPlayback();
  }, []);

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
        // Only while the verses are what the reader is listening to: the verse queue also moves on
        // by itself past files that fail to load while a sukta plays, and must not take over then.
        const listening = modeRef.current === "verse";
        if (listening && wasCurrent && suktaAt >= 0) {
          startSuktaRef.current(sukta!);
          return;
        }
        t.ids.splice(at, 1);
        try {
          playlist.remove(at);
          if (listening && wasCurrent && at < t.ids.length) {
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
      void (async () => {
        await arm();
        fullPlayer.pause();
        suktaPlaylist.pause();
        setModeNow("verse");
        userSkipAt.current = Date.now();
        claimLockScreen("verse", id);
        if (playlist.currentIndex !== index) playlist.skipTo(index);
        playlist.play();
        verify(index);
        verify(index + 1);
      })();
    },
    [fullPlayer, suktaPlaylist, playlist, claimLockScreen, verify, arm],
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
      // The verse queue moves on by itself past files that fail to load, even paused. Unless the
      // reader is on the verses, that is not the end of a clip: it must not stop or hide the bar.
      if (modeRef.current !== "verse") return;
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
        setModeNow(null);
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
          void arm().then(() => {
            claimLockScreen("verse", id);
            playlist.play();
          });
        }
        return;
      }
      playVerse(id);
    },
    [mode, activeVerseId, verseStatus.playing, playlist, claimLockScreen, playVerse, arm],
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
    void (async () => {
      await arm();
      playlist.pause();
      suktaPlaylist.pause();
      setModeNow("full");
      claimLockScreen("full");
      fullPlayer.play();
    })();
  }, [playlist, suktaPlaylist, fullPlayer, claimLockScreen, arm]);

  const startSukta = useCallback(
    (wanted?: number) => {
      if (!suktaTracks.length) return;
      const sukta = wanted != null && suktaTracks.some((track) => track.sukta === wanted) ? wanted : suktaTracks[0]!.sukta;
      void (async () => {
        await arm();
        playlist.pause();
        fullPlayer.pause();
        // A sukta from a page that arrived while another one played: put the waiting ones in first.
        if (!suktaQueue().includes(sukta)) extendSukta(true);
        const at = suktaQueue().indexOf(sukta);
        if (at < 0) return;
        setModeNow("full");
        try {
          suktaPlaylist.setActiveForLockScreen(true, metadataFor(undefined, sukta != null ? `Sukta ${sukta}` : undefined), {
            showNextTrack: true,
            showPreviousTrack: true,
          });
        } catch {
          /* lock-screen controls are a nicety */
        }
        if (suktaPlaylist.currentIndex !== at) {
          suktaSkipAt.current = Date.now();
          suktaPlaylist.skipTo(at);
        }
        suktaPlaylist.play();
      })();
    },
    [suktaTracks, playlist, fullPlayer, suktaPlaylist, metadataFor, arm, extendSukta, setModeNow],
  );
  startSuktaRef.current = startSukta;

  // A sukta file ending moves on to the next one only when it is the very next sukta.
  useEffect(() => {
    const sub = suktaPlaylist.addListener("trackChanged", ({ previousIndex, currentIndex: index }) => {
      if (modeRef.current !== "full") return;
      if (Date.now() - suktaSkipAt.current < USER_SKIP_WINDOW_MS) return;
      const queue = suktaQueue();
      const sukta = queue[index];
      if (!gapRef.current.coversAll && !isNextSukta(queue[previousIndex], sukta)) {
        suktaPlaylist.pause();
        setModeNow(null);
        return;
      }
      try {
        suktaPlaylist.updateLockScreenMetadata(metadataFor(undefined, sukta != null ? `Sukta ${sukta}` : undefined));
      } catch {
        /* not the lock-screen player right now */
      }
    });
    return () => sub.remove();
  }, [suktaPlaylist, metadataFor]);

  const startPlayThrough = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      startSukta();
      return;
    }
    const first = trackIds()[0];
    if (first != null) playVerse(first);
  }, [fullAudioUrl, suktaTracks.length, startSukta, playVerse]);

  const toggleFull = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      if (suktaStatus.playing) suktaPlaylist.pause();
      else startSukta(suktaQueue()[suktaStatus.currentIndex >= 0 ? suktaStatus.currentIndex : 0]);
      return;
    }
    if (fullStatus.playing) fullPlayer.pause();
    else {
      void arm().then(() => {
        claimLockScreen("full");
        fullPlayer.play();
      });
    }
  }, [fullAudioUrl, suktaTracks.length, suktaStatus.playing, suktaStatus.currentIndex, suktaPlaylist, startSukta, fullStatus.playing, fullPlayer, claimLockScreen, arm]);

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
      const start = byId.get(id)?.full_audio_start;
      if (start == null) return;
      if (mode === "full" && fullStatus.playing && fullActiveId(shlokas, fullStatus.currentTime) === id) {
        fullPlayer.pause();
        return;
      }
      void (async () => {
        await arm();
        playlist.pause();
        suktaPlaylist.pause();
        setModeNow("full");
        claimLockScreen("full");
        void fullPlayer.seekTo(start);
        fullPlayer.play();
      })();
    },
    [byId, mode, fullStatus.playing, fullStatus.currentTime, shlokas, playlist, suktaPlaylist, fullPlayer, claimLockScreen, arm],
  );

  const switchToFull = useCallback(() => {
    if (!fullAudioUrl && suktaTracks.length) {
      const sukta = activeVerseId == null ? null : byId.get(activeVerseId)?.sukta_number;
      if (sukta != null && suktaTracks.some((track) => track.sukta === sukta)) startSukta(sukta);
      return;
    }
    if (activeVerseId == null) return;
    const start = byId.get(activeVerseId)?.full_audio_start;
    if (start == null) return;
    void (async () => {
      await arm();
      playlist.pause();
      suktaPlaylist.pause();
      setModeNow("full");
      claimLockScreen("full");
      void fullPlayer.seekTo(start);
      fullPlayer.play();
    })();
  }, [activeVerseId, byId, playlist, suktaPlaylist, fullPlayer, claimLockScreen, fullAudioUrl, suktaTracks, startSukta, arm]);

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

  // Stop when this player goes away: it runs at the app's root (document-audio-session), so that is
  // when the reader closes the mini player, another document starts playing, or the app quits — not
  // when they leave the page or minimise. Player instances are read from a ref: recreating one (a
  // later page of verses) must not run this cleanup and pause what is sounding.
  const playersRef = useRef({ playlist, fullPlayer, suktaPlaylist });
  playersRef.current = { playlist, fullPlayer, suktaPlaylist };
  useEffect(
    () => () => {
      const current = playersRef.current;
      for (const p of [current.playlist, current.fullPlayer, current.suktaPlaylist]) {
        try {
          p.pause();
          p.clearLockScreenControls();
        } catch {
          /* player already released */
        }
      }
    },
    [],
  );

  const verseIndex = activeVerseId == null ? -1 : trackIds().indexOf(activeVerseId);

  /** Sukta files confirmed missing: those headings lose their play button. The rest show it at once. */
  const [missingSuktas, setMissingSuktas] = useState<ReadonlySet<number>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    for (const track of suktaTracks) {
      void isAudioAvailable(track.url).then((ok) => {
        if (cancelled || ok) return;
        setMissingSuktas((prev) => (prev.has(track.sukta) ? prev : new Set(prev).add(track.sukta)));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [suktaTracks]);
  const suktaNow = suktaQueue()[suktaStatus.currentIndex >= 0 ? suktaStatus.currentIndex : 0] ?? null;
  const toggleSukta = useCallback(
    (sukta: number) => {
      if (!suktaTracks.some((track) => track.sukta === sukta)) return;
      if (mode === "full" && suktaNow === sukta && suktaStatus.playing) {
        suktaPlaylist.pause();
        return;
      }
      startSukta(sukta);
    },
    [suktaTracks, mode, suktaNow, suktaStatus.playing, suktaPlaylist, startSukta],
  );

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
    /** What a sukta heading needs: whether its file is there, the sukta sounding now, and play / pause. */
    sukta: {
      has: (n: number) => suktaTracks.some((track) => track.sukta === n) && !missingSuktas.has(n),
      playing: !fullAudioUrl && mode === "full" && suktaStatus.playing ? suktaNow : null,
      toggle: toggleSukta,
    },
    suktaNumber: !fullAudioUrl && mode === "full" ? suktaNow : null,
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
