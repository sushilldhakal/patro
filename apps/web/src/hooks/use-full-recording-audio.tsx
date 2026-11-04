import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { setMediaHandlers, setMediaMetadata, setMediaPlaybackState } from "@/lib/media-session";

export interface FullRecordingAudioState {
  audioElement: ReactElement;
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Index into the source list. A single full recording stays at 0. */
  index: number;
  play: () => void;
  /** Start a later file in the list (the next sukta). */
  playAt: (index: number) => void;
  pause: () => void;
  /** Pause and give up the lock screen so a verse clip can take over. */
  handover: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  /** Seek then play in one call — used when switching over from the per-verse player. */
  playFrom: (time: number) => void;
}

/**
 * One `<audio>` element for a whole-document recording, or for a list of
 * sukta files played one after another with no gap inside each file.
 * A single URL stops at the end. Several URLs advance to the next file.
 */
export function useFullRecordingAudio(
  source: string | readonly string[] | null | undefined,
  /** Whether a file ending moves on to the next one by itself (sukta files with a gap between them don't). */
  canContinue?: (fromIndex: number, toIndex: number) => boolean,
): FullRecordingAudioState {
  const canContinueRef = useRef(canContinue);
  useEffect(() => {
    canContinueRef.current = canContinue;
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const urls = useMemo(() => {
    if (!source) return [] as string[];
    return (Array.isArray(source) ? source : [source]).filter((url): url is string => Boolean(url));
  }, [source]);
  const urlsKey = urls.join("\n");
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  });
  const indexRef = useRef(0);
  const tokenRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const brokenRef = useRef<string | null>(null);

  const load = useCallback(function loadAt(i: number, autoplay: boolean) {
    const audio = audioRef.current;
    const list = urlsRef.current;
    const url = list[i];
    if (!audio || !url) return;
    const token = ++tokenRef.current;
    indexRef.current = i;
    setIndex(i);
    setCurrentTime(0);
    setDuration(0);
    if (audio.getAttribute("src") !== url) audio.src = url;
    else {
      audio.currentTime = 0;
      brokenRef.current = null;
    }
    if (!autoplay) return;
    const skip = () => {
      if (tokenRef.current !== token || brokenRef.current === url) return;
      brokenRef.current = url;
      const next = i + 1;
      if (next < urlsRef.current.length) loadAt(next, true);
      else setPlaying(false);
    };
    void audio.play().catch((err: unknown) => {
      if (tokenRef.current !== token) return;
      const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
      // Pause and a blocked autoplay reject the play promise without meaning the file is missing.
      if (name === "AbortError" || name === "NotAllowedError") {
        setPlaying(false);
        return;
      }
      skip();
    });
  }, []);

  // A new list of files starts over: reset the displayed state during render, the audio element in the effect.
  const [seenKey, setSeenKey] = useState(urlsKey);
  if (seenKey !== urlsKey) {
    setSeenKey(urlsKey);
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  useEffect(() => {
    indexRef.current = 0;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
  }, [urlsKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      setMediaMetadata(document.title);
      setMediaHandlers({
        play: () => void audio.play().catch(() => {}),
        pause: () => audio.pause(),
        seekto: (t) => {
          audio.currentTime = t;
        },
      });
      setMediaPlaybackState("playing");
    };
    const onPause = () => {
      setPlaying(false);
      setMediaPlaybackState("paused");
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const next = indexRef.current + 1;
      const go = canContinueRef.current?.(indexRef.current, next) ?? true;
      if (next < urlsRef.current.length && go) load(next, true);
      else {
        setPlaying(false);
        setCurrentTime(0);
      }
    };
    const onError = () => {
      const src = audio.getAttribute("src");
      if (!src || brokenRef.current === src) return;
      brokenRef.current = src;
      const next = indexRef.current + 1;
      if (next < urlsRef.current.length) load(next, true);
      else setPlaying(false);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [load, urlsKey]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    const list = urlsRef.current;
    if (!audio || list.length === 0) return;
    const at = list[indexRef.current] ? indexRef.current : 0;
    const url = list[at];
    if (!url) return;
    if (audio.getAttribute("src") !== url || audio.error) {
      load(at, true);
      return;
    }
    if (audio.ended) {
      const next = at + 1;
      load(next < list.length ? next : 0, true);
      return;
    }
    void audio.play().catch(() => setPlaying(false));
  }, [load]);

  const playAt = useCallback((at: number) => load(at, true), [load]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  /** Drop lock-screen controls before another player starts, so the browser does not resume this file. */
  const handover = useCallback(() => {
    setMediaHandlers({ play: () => {}, pause: () => audioRef.current?.pause() });
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) pause();
    else play();
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const playFrom = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      const url = urlsRef.current[0];
      if (!audio || !url) return;
      const go = () => {
        audio.currentTime = time;
        setCurrentTime(time);
        void audio.play().catch(() => setPlaying(false));
      };
      if (audio.getAttribute("src") !== url) {
        indexRef.current = 0;
        setIndex(0);
        audio.src = url;
        audio.addEventListener("loadedmetadata", go, { once: true });
        return;
      }
      go();
    },
    [],
  );

  return {
    audioElement: <audio ref={audioRef} preload="none" />,
    playing,
    currentTime,
    duration,
    index,
    play,
    playAt,
    pause,
    handover,
    toggle,
    seek,
    playFrom,
  };
}
