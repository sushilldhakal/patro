/**
 * The site's half of the guided-chapter clock: an `<audio>` element for the
 * narration and `visibilitychange` for "the reader left". The clock itself is
 * shared with the app — see `@vedic-patro/features/learn` `useChapterTrack`.
 */

import {
  useChapterTrack as useSharedChapterTrack,
  type ChapterAudio,
  type ChapterTrackPlatform,
  type DayChapterPlayer,
} from "@vedic-patro/features/learn";
import type { ChapterTrack } from "@vedic-patro/domain/learn/chapter-tracks";

export { chapterDurationMs, type DayChapterPlayer } from "@vedic-patro/features/learn";

function createAudio(): ChapterAudio {
  const el = new Audio();
  el.preload = "auto";
  return {
    load: (src) => {
      if (src) {
        el.src = src;
        el.load();
      } else {
        el.removeAttribute("src");
      }
    },
    play: (from) => {
      el.currentTime = from;
      return el.play();
    },
    pause: () => el.pause(),
    seek: (s) => {
      el.currentTime = s;
    },
    /* Polled every frame: `timeupdate` is throttled to ~4Hz, the property is not. */
    currentTime: () => el.currentTime,
    setVolume: (v) => {
      el.volume = v;
    },
    subscribe: ({ onReady, onError, onEnded }) => {
      el.addEventListener("canplaythrough", onReady);
      el.addEventListener("error", onError);
      el.addEventListener("ended", onEnded);
      return () => {
        el.removeEventListener("canplaythrough", onReady);
        el.removeEventListener("error", onError);
        el.removeEventListener("ended", onEnded);
      };
    },
    dispose: () => {
      el.pause();
      el.removeAttribute("src");
    },
  };
}

const WEB_PLATFORM: ChapterTrackPlatform = {
  createAudio,
  audioRoot: `${import.meta.env.BASE_URL}learn/audio`,
  onBackground: (onHide) => {
    const listener = () => {
      if (document.hidden) onHide();
    };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
};

export function useChapterTrack(track: ChapterTrack | null): DayChapterPlayer | null {
  return useSharedChapterTrack(track, WEB_PLATFORM);
}
