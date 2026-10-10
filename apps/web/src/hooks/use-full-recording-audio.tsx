import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { setMediaHandlers, setMediaMetadata, setMediaPlaybackState } from "@/lib/media-session";

export interface FullRecordingAudioState {
  audioElement: ReactElement;
  playing: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  /** Seek then play in one call — used when switching over from the per-verse player. */
  playFrom: (time: number) => void;
}

/**
 * The whole-document recording is a single file, so unlike the per-verse
 * player this needs none of the gapless-scheduling machinery — a plain
 * `<audio>` element is the whole implementation.
 */
export function useFullRecordingAudio(url: string | null | undefined): FullRecordingAudioState {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      // Lock-screen controls for the whole-document recording.
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
      setPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
    // Re-bind on url change too — a new <audio src> is effectively a new element.
  }, [url]);

  const play = useCallback(() => {
    void audioRef.current?.play().catch(() => setPlaying(false));
  }, []);

  const pause = useCallback(() => {
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
      seek(time);
      play();
    },
    [seek, play],
  );

  return {
    audioElement: <audio ref={audioRef} src={url ?? undefined} preload="none" />,
    playing,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    seek,
    playFrom,
  };
}
