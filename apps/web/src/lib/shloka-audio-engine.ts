/**
 * Sample-accurate gapless playback across a document's verses.
 *
 * HTML5 `<audio>` elements — even fully preloaded — pay a small but audible
 * handoff cost (tens to hundreds of ms) whenever playback switches from one
 * element to another; that's a browser-level limitation of the element, not
 * something preloading can remove. The only way to get an actually seamless
 * transition is to decode both clips to raw PCM ahead of time and schedule
 * the next one to start on the Web Audio hardware clock at the exact sample
 * where the current one ends — scheduling that the audio rendering thread
 * honors regardless of any jitter on the JS main thread.
 *
 * Requires the audio host to allow cross-origin `fetch()` (CORS) — decoding
 * needs the raw bytes, unlike `<audio src>` playback which doesn't.
 */

export interface ShlokaAudioTrack {
  id: number;
  audioUrl: string | null;
  /** Lock-screen title (verse label) — used by the `<audio>` engine only. */
  title?: string;
}

export interface ShlokaEngineCallbacks {
  onActiveChange: (id: number | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onTime: (currentTime: number, duration: number) => void;
  /** True if the given verse's meaning panel is open — holds instead of auto-advancing. */
  shouldHoldAtEnd: (id: number) => boolean;
  onError?: (id: number, error: unknown) => void;
}

interface PlayingEntry {
  id: number;
  buffer: AudioBuffer;
  /** null while paused — a stopped AudioBufferSourceNode can never be restarted. */
  node: AudioBufferSourceNode | null;
  /** AudioContext time at which this buffer's t=0 played (only meaningful while `node` is live). */
  startedAt: number;
  /** Valid while `node` is null. */
  pausedOffset: number;
}

interface ScheduledEntry {
  id: number;
  buffer: AudioBuffer;
  node: AudioBufferSourceNode;
  startedAt: number;
}

export class ShlokaAudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, Promise<AudioBuffer>>();
  private tracks: ShlokaAudioTrack[] = [];
  private current: PlayingEntry | null = null;
  private upcoming: ScheduledEntry | null = null;
  /** Bumped on every deliberate stop/seek/jump so stale onended callbacks are ignored. */
  private generation = 0;
  private rafId: number | null = null;
  private callbacks: ShlokaEngineCallbacks;

  constructor(callbacks: ShlokaEngineCallbacks) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: ShlokaEngineCallbacks) {
    this.callbacks = callbacks;
  }

  setTracks(tracks: ShlokaAudioTrack[]) {
    this.tracks = tracks;
  }

  private getContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private decode(url: string): Promise<AudioBuffer> {
    let promise = this.bufferCache.get(url);
    if (!promise) {
      const ctx = this.getContext();
      promise = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`audio fetch failed: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((bytes) => ctx.decodeAudioData(bytes));
      // Don't poison the cache forever on a transient failure.
      promise.catch(() => this.bufferCache.delete(url));
      this.bufferCache.set(url, promise);
    }
    return promise;
  }

  private indexOf(id: number): number {
    return this.tracks.findIndex((t) => t.id === id);
  }

  private stopNode(node: AudioBufferSourceNode | null | undefined) {
    if (!node) return;
    node.onended = null;
    try {
      node.stop();
    } catch {
      /* already stopped, or never started */
    }
  }

  private stopProgressLoop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private startProgressLoop() {
    this.stopProgressLoop();
    const tick = () => {
      if (!this.ctx || !this.current?.node) return;
      const elapsed = Math.max(
        0,
        Math.min(this.current.buffer.duration, this.ctx.currentTime - this.current.startedAt),
      );
      this.callbacks.onTime(elapsed, this.current.buffer.duration);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private armEnded(id: number, node: AudioBufferSourceNode, generation: number) {
    node.onended = () => {
      if (generation !== this.generation) return;
      this.handleEnded(id);
    };
  }

  private handleEnded(id: number) {
    this.stopProgressLoop();

    if (this.callbacks.shouldHoldAtEnd(id)) {
      // Studying this verse's meaning, not listening straight through — hold
      // at the end rather than auto-advance. Drop the scheduled upcoming
      // clip too; it'll be rescheduled fresh whenever playback resumes.
      this.stopNode(this.upcoming?.node);
      this.upcoming = null;
      this.current = this.current
        ? { ...this.current, node: null, pausedOffset: this.current.buffer.duration }
        : null;
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      return;
    }

    const promoted = this.upcoming;
    this.upcoming = null;
    if (!promoted) {
      this.current = null;
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      return;
    }

    // The promoted node was already scheduled on the audio clock and is
    // already sounding by the time this callback runs — this is bookkeeping,
    // not a new playback start.
    this.current = {
      id: promoted.id,
      buffer: promoted.buffer,
      node: promoted.node,
      startedAt: promoted.startedAt,
      pausedOffset: 0,
    };
    this.callbacks.onActiveChange(promoted.id);
    this.callbacks.onPlayingChange(true);
    this.callbacks.onTime(0, promoted.buffer.duration);
    this.startProgressLoop();
    this.scheduleUpcoming(promoted.id, promoted.startedAt + promoted.buffer.duration);
  }

  private scheduleUpcoming(afterId: number, startAt: number) {
    if (this.upcoming) return;
    const idx = this.indexOf(afterId);
    const next = idx >= 0 ? this.tracks[idx + 1] : undefined;
    if (!next?.audioUrl) return;
    const generation = this.generation;
    this.decode(next.audioUrl)
      .then((buffer) => {
        if (generation !== this.generation || this.upcoming) return;
        const ctx = this.getContext();
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(ctx.destination);
        this.armEnded(next.id, node, generation);
        node.start(startAt);
        this.upcoming = { id: next.id, buffer, node, startedAt: startAt };
      })
      .catch((err: unknown) => this.callbacks.onError?.(next.id, err));
  }

  private startBuffer(id: number, buffer: AudioBuffer, offset: number) {
    const ctx = this.getContext();
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    const generation = this.generation;
    this.armEnded(id, node, generation);
    node.start(0, offset);
    const startedAt = ctx.currentTime - offset;
    this.current = { id, buffer, node, startedAt, pausedOffset: 0 };
    this.callbacks.onActiveChange(id);
    this.callbacks.onPlayingChange(true);
    this.callbacks.onTime(offset, buffer.duration);
    this.startProgressLoop();
    this.scheduleUpcoming(id, startedAt + buffer.duration);
  }

  /** Stop everything — used when the selected verse has no audio at all. */
  private stop() {
    this.generation += 1;
    this.stopNode(this.current?.node);
    this.stopNode(this.upcoming?.node);
    this.upcoming = null;
    this.current = null;
    this.stopProgressLoop();
  }

  play(id: number) {
    const track = this.tracks.find((t) => t.id === id);
    if (!track) return;

    if (!track.audioUrl) {
      this.stop();
      this.callbacks.onActiveChange(id);
      this.callbacks.onPlayingChange(false);
      this.callbacks.onTime(0, 0);
      return;
    }

    if (this.current?.id === id) {
      if (!this.current.node) this.resume();
      return; // already the live/active track
    }

    // Already decoded and scheduled as "upcoming" — start it immediately
    // instead of waiting on its scheduled future time.
    if (this.upcoming?.id === id) {
      const { buffer } = this.upcoming;
      this.generation += 1;
      this.stopNode(this.current?.node);
      this.stopNode(this.upcoming.node);
      this.upcoming = null;
      this.startBuffer(id, buffer, 0);
      return;
    }

    // Cold start or a non-sequential jump — decode fresh.
    this.generation += 1;
    this.stopNode(this.current?.node);
    this.stopNode(this.upcoming?.node);
    this.upcoming = null;
    const generation = this.generation;
    this.decode(track.audioUrl)
      .then((buffer) => {
        if (generation !== this.generation) return;
        this.startBuffer(id, buffer, 0);
      })
      .catch((err: unknown) => this.callbacks.onError?.(id, err));
  }

  pause() {
    if (!this.current?.node || !this.ctx) return;
    const elapsed = this.ctx.currentTime - this.current.startedAt;
    this.generation += 1; // invalidate the live node's onended + any scheduled upcoming
    this.stopNode(this.current.node);
    this.stopNode(this.upcoming?.node);
    this.upcoming = null;
    this.stopProgressLoop();
    this.current = { ...this.current, node: null, pausedOffset: Math.max(0, elapsed) };
    this.callbacks.onPlayingChange(false);
  }

  resume() {
    if (!this.current || this.current.node) return;
    this.startBuffer(this.current.id, this.current.buffer, this.current.pausedOffset);
  }

  seek(time: number) {
    if (!this.current) return;
    const { id, buffer, node } = this.current;
    const wasPlaying = Boolean(node);
    this.generation += 1;
    this.stopNode(node);
    this.stopNode(this.upcoming?.node);
    this.upcoming = null;
    this.stopProgressLoop();
    const clamped = Math.max(0, Math.min(buffer.duration, time));
    if (wasPlaying) {
      this.startBuffer(id, buffer, clamped);
    } else {
      this.current = { id, buffer, node: null, startedAt: 0, pausedOffset: clamped };
      this.callbacks.onTime(clamped, buffer.duration);
    }
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.bufferCache.clear();
  }
}
