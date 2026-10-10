/**
 * Verse-by-verse playback on a single `<audio>` element.
 *
 * Web Audio (see shloka-audio-engine.ts) is gapless but phones stop it the
 * moment the screen locks or the user switches apps. An `<audio>` element with
 * Media Session metadata is treated as a media player instead, so it keeps going
 * in the background and shows lock-screen controls. On touch devices this engine
 * is used so a verse list behaves like the whole-document recording does.
 *
 * One element is reused for every clip (the next verse is loaded on `ended`):
 * mobile browsers only let background code start audio on an element the
 * user already started, so creating a new element per verse would stop at the
 * first handoff.
 */
import {
  clearMediaSession,
  setMediaHandlers,
  setMediaMetadata,
  setMediaPlaybackState,
  setMediaPosition,
} from "@/lib/media-session";
import type { ShlokaAudioTrack, ShlokaEngineCallbacks } from "@/lib/shloka-audio-engine";

export class ShlokaElementEngine {
  private audio: HTMLAudioElement;
  private tracks: ShlokaAudioTrack[] = [];
  private currentId: number | null = null;
  private callbacks: ShlokaEngineCallbacks;

  constructor(callbacks: ShlokaEngineCallbacks) {
    this.callbacks = callbacks;
    const audio = new Audio();
    audio.preload = "auto";
    this.audio = audio;
    audio.addEventListener("play", this.onPlay);
    audio.addEventListener("pause", this.onPause);
    audio.addEventListener("timeupdate", this.onTime);
    audio.addEventListener("loadedmetadata", this.onTime);
    audio.addEventListener("ended", this.onEnded);
    audio.addEventListener("error", this.onError);
  }

  setCallbacks(callbacks: ShlokaEngineCallbacks) {
    this.callbacks = callbacks;
  }

  setTracks(tracks: ShlokaAudioTrack[]) {
    this.tracks = tracks;
  }

  private indexOf(id: number | null): number {
    return id == null ? -1 : this.tracks.findIndex((t) => t.id === id);
  }

  private nextPlayable(id: number | null): ShlokaAudioTrack | null {
    const next = this.tracks[this.indexOf(id) + 1];
    return next?.audioUrl ? next : null;
  }

  private prevPlayable(id: number | null): ShlokaAudioTrack | null {
    const prev = this.tracks[this.indexOf(id) - 1];
    return prev?.audioUrl ? prev : null;
  }

  private onPlay = () => {
    this.callbacks.onPlayingChange(true);
    setMediaPlaybackState("playing");
  };

  private onPause = () => {
    // A clip finishing also fires `pause`; the handoff to the next verse must
    // not read as the user pausing.
    if (this.audio.ended) return;
    this.callbacks.onPlayingChange(false);
    setMediaPlaybackState("paused");
  };

  private onTime = () => {
    const { currentTime, duration } = this.audio;
    const d = Number.isFinite(duration) ? duration : 0;
    this.callbacks.onTime(currentTime, d);
    setMediaPosition(currentTime, d);
  };

  private onEnded = () => {
    const id = this.currentId;
    if (id == null) return;
    if (this.callbacks.shouldHoldAtEnd(id)) {
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      setMediaPlaybackState("paused");
      return;
    }
    const next = this.nextPlayable(id);
    if (!next) {
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      setMediaPlaybackState("paused");
      return;
    }
    this.play(next.id);
  };

  private onError = () => {
    if (this.currentId != null && this.audio.getAttribute("src")) {
      this.callbacks.onError?.(this.currentId, this.audio.error);
      this.callbacks.onPlayingChange(false);
    }
  };

  private publishMediaSession(track: ShlokaAudioTrack) {
    const docTitle = typeof document !== "undefined" ? document.title : "";
    setMediaMetadata(track.title ? `${track.title}` : docTitle, docTitle);
    setMediaHandlers({
      play: () => this.resumeOrPlay(),
      pause: () => this.pause(),
      previoustrack: this.prevPlayable(track.id) ? () => this.step(-1) : null,
      nexttrack: this.nextPlayable(track.id) ? () => this.step(1) : null,
      seekto: (t) => this.seek(t),
    });
  }

  private step(delta: 1 | -1) {
    const target = delta === 1 ? this.nextPlayable(this.currentId) : this.prevPlayable(this.currentId);
    if (target) this.play(target.id);
  }

  private resumeOrPlay() {
    if (this.currentId == null) return;
    if (this.audio.paused) void this.audio.play().catch((e: unknown) => this.callbacks.onError?.(this.currentId!, e));
  }

  play(id: number) {
    const track = this.tracks.find((t) => t.id === id);
    if (!track) return;

    if (!track.audioUrl) {
      this.audio.pause();
      this.currentId = id;
      this.callbacks.onActiveChange(id);
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      return;
    }

    if (this.currentId === id && this.audio.getAttribute("src") === track.audioUrl) {
      if (this.audio.paused) this.resume();
      return;
    }

    this.currentId = id;
    this.audio.src = track.audioUrl;
    this.audio.currentTime = 0;
    this.callbacks.onActiveChange(id);
    this.callbacks.onTime(0, 0);
    this.publishMediaSession(track);
    void this.audio.play().catch((e: unknown) => {
      this.callbacks.onError?.(id, e);
      this.callbacks.onPlayingChange(false);
    });
  }

  pause() {
    this.audio.pause();
  }

  resume() {
    if (this.currentId == null) return;
    const track = this.tracks.find((t) => t.id === this.currentId);
    if (track) this.publishMediaSession(track);
    void this.audio.play().catch((e: unknown) => {
      this.callbacks.onError?.(this.currentId!, e);
      this.callbacks.onPlayingChange(false);
    });
  }

  seek(time: number) {
    if (this.currentId == null) return;
    const d = Number.isFinite(this.audio.duration) ? this.audio.duration : time;
    this.audio.currentTime = Math.max(0, Math.min(d, time));
  }

  /**
   * Stops and releases the clip. The engine stays usable afterwards (React
   * StrictMode runs an effect's cleanup and then re-runs it on the same
   * instance), so the element and its listeners are kept.
   */
  dispose() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.currentId = null;
    clearMediaSession();
  }
}
