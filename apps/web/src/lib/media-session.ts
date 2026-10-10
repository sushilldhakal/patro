/**
 * Lock-screen / notification-shade controls (the Media Session API). Besides the
 * controls, registering metadata is what lets mobile browsers treat the page as
 * a media player that keeps playing with the screen locked or in another app.
 * Every call is best-effort: unsupported browsers simply skip it.
 */

export interface MediaSessionHandlers {
  play?: () => void;
  pause?: () => void;
  previoustrack?: (() => void) | null;
  nexttrack?: (() => void) | null;
  seekto?: ((time: number) => void) | null;
}

function session(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
}

export function setMediaMetadata(title: string, album?: string): void {
  const ms = session();
  if (!ms || typeof MediaMetadata === "undefined") return;
  try {
    ms.metadata = new MediaMetadata({
      title,
      artist: "Vedic Patro",
      album: album ?? "",
      artwork: [
        { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    });
  } catch {
    /* metadata is optional */
  }
}

export function setMediaHandlers(handlers: MediaSessionHandlers): void {
  const ms = session();
  if (!ms) return;
  const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null | undefined) => {
    try {
      ms.setActionHandler(action, fn ?? null);
    } catch {
      /* action not supported by this browser */
    }
  };
  set("play", handlers.play);
  set("pause", handlers.pause);
  set("previoustrack", handlers.previoustrack);
  set("nexttrack", handlers.nexttrack);
  set("seekto", handlers.seekto ? (d) => d.seekTime != null && handlers.seekto!(d.seekTime) : null);
}

export function setMediaPlaybackState(state: "playing" | "paused" | "none"): void {
  const ms = session();
  if (!ms) return;
  try {
    ms.playbackState = state;
  } catch {
    /* ignore */
  }
}

export function setMediaPosition(position: number, duration: number): void {
  const ms = session();
  if (!ms || !Number.isFinite(duration) || duration <= 0) return;
  try {
    ms.setPositionState({ duration, position: Math.min(Math.max(0, position), duration), playbackRate: 1 });
  } catch {
    /* ignore */
  }
}

export function clearMediaSession(): void {
  const ms = session();
  if (!ms) return;
  try {
    ms.metadata = null;
    ms.playbackState = "none";
  } catch {
    /* ignore */
  }
  setMediaHandlers({});
}
