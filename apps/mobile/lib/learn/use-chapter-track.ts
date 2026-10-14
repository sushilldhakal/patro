/**
 * The app's half of the guided-chapter clock: an expo-audio player for the
 * narration and `AppState` for "the app was backgrounded". The clock itself is
 * shared with the website — see `@vedic-patro/features/learn` `useChapterTrack`.
 *
 * No recording exists yet for any chapter on either platform (see web's
 * `public/learn/audio/README.md`), so today every chapter takes the timer
 * path — but the audio path is real and wired up for the day one is dropped in.
 */

import { AppState } from "react-native";
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from "expo-audio";
import { LEGAL_SITE } from "@vedic-patro/domain/legal-copy";
import type { ChapterTrack } from "@vedic-patro/domain/learn/chapter-tracks";
import {
  useChapterTrack as useSharedChapterTrack,
  type ChapterAudio,
  type ChapterTrackPlatform,
  type DayChapterPlayer,
} from "@vedic-patro/features/learn";

export { chapterDurationMs, type DayChapterPlayer } from "@vedic-patro/features/learn";

/*
 * Under plain `tsc` this project's `moduleSuffixes` (".web" first) resolves
 * expo-audio's *web* AudioPlayer type even for this native-only file, and that
 * variant doesn't reflect the EventEmitter surface (`addListener`) the real
 * native player has. Casting here is the same narrow, contained workaround
 * D1Chart.tsx uses for the equivalent react-native-svg issue.
 */
function audioPlayerEvents(player: AudioPlayer): {
  addListener: (event: "playbackStatusUpdate", listener: (status: AudioStatus) => void) => { remove: () => void };
} {
  return player as unknown as ReturnType<typeof audioPlayerEvents>;
}

function createAudio(): ChapterAudio {
  const player = createAudioPlayer(null, { updateInterval: 100 });
  let onReady: (() => void) | null = null;
  return {
    load: (src) => {
      if (!src) return;
      player.replace(src);
      onReady?.();
    },
    play: async (from) => {
      await player.seekTo(from);
      player.play();
    },
    pause: () => player.pause(),
    seek: (s) => {
      void player.seekTo(s);
    },
    /* Pushed through `playbackStatusUpdate` instead of polled. */
    currentTime: () => null,
    setVolume: (v) => {
      player.volume = v;
    },
    subscribe: (events) => {
      onReady = events.onReady;
      const sub = audioPlayerEvents(player).addListener("playbackStatusUpdate", (status: AudioStatus) => {
        events.onTime(status.currentTime);
        if (status.didJustFinish) events.onEnded();
      });
      return () => {
        onReady = null;
        sub.remove();
      };
    },
    dispose: () => player.remove(),
  };
}

const APP_PLATFORM: ChapterTrackPlatform = {
  createAudio,
  audioRoot: `${LEGAL_SITE}/learn/audio`,
  onBackground: (onHide) => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") onHide();
    });
    return () => sub.remove();
  },
};

export function useChapterTrack(track: ChapterTrack | null): DayChapterPlayer | null {
  return useSharedChapterTrack(track, APP_PLATFORM);
}
