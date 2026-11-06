import { useEffect } from "react";
import { Asset } from "expo-asset";
import { setAudioModeAsync } from "expo-audio";
import { ensureNotificationPermission } from "@/lib/notifications/permissions";

/**
 * One session for the whole app. Recitation has to stay audible with the
 * silent switch on, and keep going after the app is minimised. `doNotMix` is
 * what lets iOS and Android attach the lock-screen / notification player.
 * Anything else that calls `setAudioModeAsync` must not turn
 * `shouldPlayInBackground` back off, or minimising pauses every player.
 */
export function ensurePlaybackSession(): Promise<void> {
  return setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    allowsRecording: false,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
  });
}

let artworkUrl: string | undefined;
let artworkTask: Promise<string | undefined> | null = null;

/** App icon for the system player, the same role as a video thumbnail. */
export function playbackArtworkUrl(): Promise<string | undefined> {
  if (artworkUrl) return Promise.resolve(artworkUrl);
  artworkTask ??= Asset.fromModule(require("../assets/icon.png"))
    .downloadAsync()
    .then((asset) => {
      artworkUrl = asset.localUri ?? asset.uri;
      return artworkUrl;
    })
    .catch(() => undefined);
  return artworkTask;
}

/** Ask for the notification permission the Android media player needs to stay on screen. */
export function armBackgroundPlayback(): void {
  void ensurePlaybackSession().catch(() => {});
  void playbackArtworkUrl();
  void ensureNotificationPermission();
}

/** Sets the session as soon as the app is up, before a screen can play. */
export function PlaybackSession() {
  useEffect(() => {
    armBackgroundPlayback();
  }, []);
  return null;
}
