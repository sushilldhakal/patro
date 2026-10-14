/**
 * Clock + sampler for a guided chapter track, shared by the website
 * (`apps/web/src/hooks/use-chapter-track.ts`) and the app
 * (`apps/mobile/lib/learn/use-chapter-track.ts`).
 *
 * When a voiceover is present for the chapter it owns the time: the audio
 * player's `currentTime` is the clock, and the keyframes are sampled off it.
 * Until then the same keyframes run off requestAnimationFrame, so the animation
 * a recording will be made against is already the one it will lock to.
 *
 * The hook knows nothing about any particular track, nor about how a platform
 * plays sound: it is handed a track and a {@link ChapterTrackPlatform} (the
 * site's `<audio>` element and `visibilitychange`, the app's expo-audio player
 * and `AppState`) and drives whatever chapters are in it.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { compileChapter } from "@vedic-patro/domain/learn/chapter-player";
import { chapterAudioSources, type Chapter, type ChapterSimState } from "@vedic-patro/domain/learn/chapter-kit";
import type { ChapterTrack } from "@vedic-patro/domain/learn/chapter-tracks";
import { stepped } from "@vedic-patro/domain/learn/chapter-track";

export { chapterDurationMs } from "@vedic-patro/domain/learn/chapter-track";

/** What a platform's audio player has to report back to the hook. */
export type ChapterAudioEvents = {
  /** The loaded recording can play. */
  onReady: () => void;
  /** The loaded recording failed; the chapter falls back to its own timer. */
  onError: () => void;
  /** The recording reached its end. */
  onEnded: () => void;
  /** Position pushed by the player, in seconds — for players that cannot be polled. */
  onTime: (seconds: number) => void;
};

/** One platform audio player, owned by the hook for its lifetime. */
export interface ChapterAudio {
  /** Load a recording (`null` unloads) — report readiness through `onReady`/`onError`. */
  load: (src: string | null) => void;
  /** Start from `fromSeconds`; a rejected promise means the recording cannot play. */
  play: (fromSeconds: number) => Promise<void> | void;
  pause: () => void;
  seek: (seconds: number) => void;
  /** Current position in seconds, read every frame — or `null` when the player pushes it through `onTime`. */
  currentTime: () => number | null;
  setVolume: (volume: number) => void;
  /** Wire the events; returns the unsubscribe. */
  subscribe: (events: ChapterAudioEvents) => () => void;
  dispose: () => void;
}

/** The platform half of the chapter clock. Pass a module-level constant. */
export type ChapterTrackPlatform = {
  createAudio: () => ChapterAudio;
  /** Where the recordings are served from — `${root}/<lang>/<track>/<chapter>.mp3` etc. */
  audioRoot: string;
  /** Calls `onHide` when the page or app leaves the foreground; returns the unsubscribe. */
  onBackground: (onHide: () => void) => () => void;
};

export type DayChapterPlayer = {
  track: ChapterTrack;
  chapters: Chapter[];
  chapter: Chapter;
  index: number;
  time: number;
  duration: number;
  playing: boolean;
  ended: boolean;
  showWelcome: boolean;
  hasAudio: boolean;
  /** Narration volume, 0–1 — the reference lab's speaker-icon slider. */
  volume: number;
  setVolume: (v: number) => void;
  /** Toggles to/from 0, remembering the level to come back to. */
  toggleMute: () => void;
  state: ChapterSimState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  dismissWelcome: () => void;
  setOnFrame: (fn: (s: ChapterSimState) => void) => void;
};

/**
 * Probe one candidate recording. Static hosts serving an SPA (and Vite's dev
 * server) answer an unmatched path with `index.html` at `200 OK`, so `res.ok`
 * alone would report every missing candidate as found — a `text/html`
 * content-type is that fallback page, not an audio file.
 */
async function recordingExists(src: string): Promise<boolean> {
  const res = await fetch(src, { method: "HEAD" });
  if (!res.ok) return false;
  const type = res.headers.get("content-type") ?? "";
  return !type.startsWith("text/html");
}

export function useChapterTrack(track: ChapterTrack | null, platform: ChapterTrackPlatform): DayChapterPlayer | null {
  const { lang } = useLocale();
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);
  const [volume, setVolumeState] = useState(1);

  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const audioRef = useRef<ChapterAudio | null>(null);
  const lastUi = useRef(0);
  const onFrameRef = useRef<(s: ChapterSimState) => void>(() => {});
  /** Level `toggleMute` restores to — the reference player's own behaviour. */
  const prevVolumeRef = useRef(1);
  const volumeRef = useRef(volume);

  useEffect(() => {
    const audio = platform.createAudio();
    audio.setVolume(volumeRef.current);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.dispose();
      audioRef.current = null;
    };
  }, [platform]);

  useEffect(() => {
    volumeRef.current = volume;
    audioRef.current?.setVolume(volume);
    if (volume > 0) prevVolumeRef.current = volume;
  }, [volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);
  const toggleMute = useCallback(() => {
    setVolumeState((v) => (v > 0 ? 0 : prevVolumeRef.current || 1));
  }, []);

  /* A null track still has to run the hooks below, so it falls back to an
     empty chapter rather than returning early — the value is thrown away at
     the bottom. */
  const chapters = track?.chapters ?? EMPTY;
  const chapter = chapters[index] ?? chapters[0] ?? BLANK;
  const compiled = useMemo(() => compileChapter(chapter.defaults, chapter.frames), [chapter]);

  const [state, setState] = useState<ChapterSimState>(() => compiled.stateAt(0));
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  const apply = useCallback(
    (ms: number, forceUi = false) => {
      const clamped = Math.max(0, Math.min(compiled.duration, ms));
      timeRef.current = clamped;
      const next = compiled.stateAt(clamped);
      onFrameRef.current(next);
      const now = performance.now();
      /* Time on the scrubber can tick without cloning the whole sim state.
         Pushing a new `state` every 80ms was resetting focus / layers in React
         while the reader was using them — especially once `handsOff` is on
         and the instruments are supposed to belong to them. */
      if (forceUi || stepped(next, stateRef.current)) {
        lastUi.current = now;
        setTime(clamped);
        setState(next);
      } else if (playingRef.current && now - lastUi.current > 80) {
        lastUi.current = now;
        setTime(clamped);
        if (!stateRef.current.handsOff) setState(next);
      }
    },
    [compiled],
  );

  // A different chapter starts from the top, paused. The state half is adjusted
  // while rendering; the refs and the first frame (an external system) in the effect.
  const [seenCompiled, setSeenCompiled] = useState(compiled);
  if (compiled !== seenCompiled) {
    setSeenCompiled(compiled);
    setTime(0);
    setEnded(false);
    setPlaying(false);
  }
  useEffect(() => {
    timeRef.current = 0;
    playingRef.current = false;
    apply(0, true);
  }, [index, apply]);

  const trackId = track?.id;
  useEffect(() => {
    if (!trackId) return;
    const audio = audioRef.current;
    if (!audio) return;
    const sources = chapterAudioSources(trackId, chapter, lang, platform.audioRoot);
    let cancelled = false;
    const unsubscribe = audio.subscribe({
      onReady: () => setHasAudio(true),
      onError: () => setHasAudio(false),
      /* Chapter's end, from the player's own event — the frame loop below
         reads the position but never checks for the end of the file. */
      onEnded: () => {
        playingRef.current = false;
        setPlaying(false);
        setEnded(true);
        apply(compiled.duration, true);
      },
      onTime: (seconds) => {
        if (playingRef.current) apply(seconds * 1000);
      },
    });
    /* Probe first so a missing voiceover is silence, not a red 404 — and probe
       the candidates in order, so a language-specific recording wins over the
       shared one when both exist. */
    void (async () => {
      for (const src of sources) {
        try {
          const found = await recordingExists(src);
          if (cancelled) return;
          if (!found) continue;
          audio.load(src);
          return;
        } catch {
          /* Network error on one candidate is not fatal; try the next. */
        }
      }
    })();
    return () => {
      cancelled = true;
      setHasAudio(false);
      unsubscribe();
      audio.pause();
      audio.load(null);
    };
  }, [trackId, chapter, lang, apply, compiled.duration, platform]);

  const enabled = Boolean(track);
  const isFree = Boolean(chapter.free);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      /* Always sample — even when paused — so a drag/zoom can ease back. */
      if (isFree || !playingRef.current) {
        last = now;
        apply(timeRef.current);
        return;
      }
      if (hasAudio) {
        /* Narrated: the recording owns the clock. Its position is read every
           frame where the player allows it — a `timeupdate`-style event fires
           only a few times a second, which sampled the chapter in visible
           ~4Hz steps — and otherwise arrives through `onTime`, in which case
           this only resamples the current position. */
        last = now;
        const seconds = audioRef.current?.currentTime() ?? null;
        apply(seconds === null ? timeRef.current : seconds * 1000);
        return;
      }
      const dt = last ? now - last : 0;
      last = now;
      const next = timeRef.current + dt;
      if (next >= compiled.duration) {
        playingRef.current = false;
        setPlaying(false);
        setEnded(true);
        apply(compiled.duration, true);
        return;
      }
      apply(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, hasAudio, compiled.duration, apply, isFree]);

  /**
   * Leaving the page (or backgrounding the app) pauses the chapter.
   *
   * Narration playing on into a screen nobody is looking at is the obvious
   * half. The other half is that the animation is the narration's other track:
   * come back after two minutes away and the voice is describing a camera move
   * that happened while it was hidden. Pausing keeps the two together.
   */
  useEffect(() => {
    if (!enabled) return;
    return platform.onBackground(() => {
      if (!playingRef.current) return;
      playingRef.current = false;
      setPlaying(false);
      audioRef.current?.pause();
    });
  }, [enabled, platform]);

  const play = useCallback(() => {
    if (isFree) return;
    setShowWelcome(false);
    setEnded(false);
    playingRef.current = true;
    setPlaying(true);
    const audio = audioRef.current;
    if (hasAudio && audio) {
      void Promise.resolve(audio.play(timeRef.current / 1000)).catch(() => {
        setHasAudio(false);
      });
    }
  }, [hasAudio, isFree]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    audioRef.current?.pause();
  }, []);

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(compiled.duration, ms));
      if (hasAudio) audioRef.current?.seek(clamped / 1000);
      apply(clamped, true);
      if (clamped < compiled.duration) setEnded(false);
    },
    [apply, compiled.duration, hasAudio],
  );

  const count = chapters.length;
  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      audioRef.current?.pause();
      playingRef.current = false;
      setPlaying(false);
      setShowWelcome(next === 0);
      setIndex(next);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const setOnFrame = useCallback((fn: (s: ChapterSimState) => void) => {
    onFrameRef.current = fn;
  }, []);

  if (!track) return null;

  return {
    track,
    chapters,
    chapter,
    index,
    time,
    duration: compiled.duration,
    playing,
    ended,
    showWelcome,
    hasAudio,
    volume,
    setVolume,
    toggleMute,
    state,
    play,
    pause,
    toggle: () => (playingRef.current ? pause() : play()),
    seek,
    goTo,
    next,
    prev,
    dismissWelcome: () => setShowWelcome(false),
    setOnFrame,
  };
}

const EMPTY: Chapter[] = [];

/** Stand-in while no track is mounted — never rendered, only kept type-honest. */
const BLANK: Chapter = {
  id: "",
  titleKey: "",
  free: true,
  defaults: {} as ChapterSimState,
  frames: [],
};
