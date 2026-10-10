/**
 * Clock + sampler for a guided chapter track.
 *
 * When a voiceover is present for the chapter it owns the time: the
 * `AudioPlayer`'s `currentTime` is the clock, and the keyframes are sampled
 * off it. Until then the same keyframes run off `requestAnimationFrame`, so
 * the animation a recording is made against is already the one it will lock
 * to. No recording exists yet for any chapter on either platform (see web's
 * `public/learn/audio/README.md`), so today every chapter always takes the
 * timer path — but the audio path is real and wired up for the day one gets
 * dropped in.
 *
 * The hook knows nothing about any particular track — see
 * {@link @/lib/learn/chapter-tracks} — and drives whatever chapters are in it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from "expo-audio";

import { useLocale } from "@/lib/i18n";
import { compileChapter, parseTime } from "./chapter-player";
import { chapterAudioSources, type Chapter, type ChapterSimState } from "./chapter-kit";
import type { ChapterTrack } from "./chapter-tracks";

/** See the cast's own comment at the call site. */
function audioPlayerEvents(player: AudioPlayer): {
  addListener: (event: "playbackStatusUpdate", listener: (status: AudioStatus) => void) => { remove: () => void };
} {
  return player as unknown as ReturnType<typeof audioPlayerEvents>;
}

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
 * Did anything *step* between two samples?
 *
 * Numbers ease every frame and are written straight to the scene's refs by the
 * frame callback, so they must not force a React render. Everything else —
 * layer flags, camera target, the overlay id, the highlight — changes rarely
 * and has to reach React the moment it does.
 */
function stepped(next: ChapterSimState, prev: ChapterSimState): boolean {
  for (const key of Object.keys(next) as (keyof ChapterSimState)[]) {
    const v = next[key];
    if (typeof v === "number") continue;
    if (v !== prev[key]) return true;
  }
  return false;
}

export function useChapterTrack(track: ChapterTrack | null): DayChapterPlayer | null {
  const { lang } = useLocale();
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);

  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const audioRef = useRef<AudioPlayer | null>(null);
  const lastUi = useRef(0);
  const onFrameRef = useRef<(s: ChapterSimState) => void>(() => {});

  useEffect(() => {
    const player = createAudioPlayer(null, { updateInterval: 100 });
    audioRef.current = player;
    return () => {
      player.pause();
      player.remove();
      audioRef.current = null;
    };
  }, []);

  /* A null track still has to run the hooks below, so it falls back to an
     empty chapter rather than returning early — the value is thrown away at
     the bottom. */
  const chapters = track?.chapters ?? EMPTY;
  const chapter = chapters[index] ?? chapters[0] ?? BLANK;
  const compiled = useMemo(() => compileChapter(chapter.defaults, chapter.frames), [chapter]);

  const [state, setState] = useState<ChapterSimState>(() => compiled.stateAt(0));
  const stateRef = useRef(state);
  stateRef.current = state;

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

  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
    setEnded(false);
    playingRef.current = false;
    setPlaying(false);
    apply(0, true);
  }, [index, apply]);

  /**
   * Probe this chapter's candidate recordings, in order, and hand the winner
   * to the player. A missing file is the normal case today — nothing here is
   * an error, it just means this chapter keeps running on its own timer.
   */
  const trackId = track?.id;
  useEffect(() => {
    if (!trackId) return;
    const player = audioRef.current;
    setHasAudio(false);
    if (!player) return;
    const sources = chapterAudioSources(trackId, chapter, lang);
    let cancelled = false;
    void (async () => {
      for (const src of sources) {
        try {
          const res = await fetch(src, { method: "HEAD" });
          if (cancelled) return;
          if (!res.ok) continue;
          player.replace(src);
          setHasAudio(true);
          return;
        } catch {
          /* Network error on one candidate is not fatal; try the next. */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId, chapter, lang]);

  /* Once a recording is loaded, its own clock drives the keyframes — see the
     `playbackStatusUpdate` listener below — instead of requestAnimationFrame
     advancing `timeRef` on its own. */
  useEffect(() => {
    const player = audioRef.current;
    if (!hasAudio || !player) return;
    /* Under plain `tsc` this project's `moduleSuffixes` (".web" first)
       resolves expo-audio's *web* AudioPlayer type even for this native-only
       file, and that variant doesn't reflect the EventEmitter surface
       (`addListener`) the real native player has. Casting here is the same
       narrow, contained workaround D1Chart.tsx uses for the equivalent
       react-native-svg issue. */
    const sub = audioPlayerEvents(player).addListener("playbackStatusUpdate", (status: AudioStatus) => {
      if (!playingRef.current) return;
      apply(status.currentTime * 1000);
      if (status.didJustFinish) {
        playingRef.current = false;
        setPlaying(false);
        setEnded(true);
        apply(compiled.duration, true);
      }
    });
    return () => sub.remove();
  }, [hasAudio, apply, compiled.duration]);

  const enabled = Boolean(track);
  const isFree = Boolean(chapter.free);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      /* Always sample — even when paused — so a drag/zoom can ease back. Once
         audio owns the clock this loop stops advancing it (the listener
         above does that) and only resamples the current position. */
      if (isFree || !playingRef.current || hasAudio) {
        last = now;
        apply(timeRef.current);
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
   * Backgrounding the app pauses the chapter.
   *
   * Narration playing on into a backgrounded app is the obvious half. The
   * other half is that the animation is the narration's other track: come
   * back after two minutes away and the camera is mid-move for a beat that
   * already finished. Pausing keeps the two together.
   */
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" || !playingRef.current) return;
      playingRef.current = false;
      setPlaying(false);
      audioRef.current?.pause();
    });
    return () => sub.remove();
  }, [enabled]);

  const play = useCallback(() => {
    if (isFree) return;
    setShowWelcome(false);
    setEnded(false);
    playingRef.current = true;
    setPlaying(true);
    const player = audioRef.current;
    if (hasAudio && player) {
      void player.seekTo(timeRef.current / 1000).then(() => player.play());
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
      if (hasAudio) void audioRef.current?.seekTo(clamped / 1000);
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

export function chapterDurationMs(chapter: Chapter): number {
  let max = 0;
  for (const frame of chapter.frames) {
    const at = parseTime(frame.meta.at);
    if (at > max) max = at;
  }
  return max;
}
