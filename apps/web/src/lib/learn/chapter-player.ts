/**
 * A small keyframe interpolator for the Learn chapter tours.
 *
 * Copilot (what the original "What is a Day" lab used) is a Vue-era timeline:
 * named times (`8s`, `01:11`), a default 3s ease, and `startTime`/`duration`
 * as two ways to name the same interval. This file is that contract, without
 * the library — so a chapter is a list of frames and a `stateAt(ms)` call,
 * and a voiceover can drive the same clock later by seeking this time.
 */

export type TimeStamp = number | string;

export type EaseName = "linear" | "quadInOut" | "sineInOut";

export type FrameMeta = {
  /** End of the interval. A number is milliseconds, matching Copilot. */
  at: TimeStamp;
  /** Start of the interval. Defaults to `at - duration`. */
  from?: TimeStamp;
  /** Length of the interval. Defaults to 3s when `from` is also omitted. */
  duration?: TimeStamp;
  ease?: EaseName;
};

export type Keyframe<S extends object> = {
  state: Partial<S>;
  meta: FrameMeta;
};

const DEFAULT_DURATION_MS = 3000;

const TIME_STD = /^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/;
const TIME_DEC = /^([0-9.]+)s$/;

/** Parse a Copilot time stamp into milliseconds. */
export function parseTime(t: TimeStamp): number {
  if (typeof t === "number") return t;
  const std = t.match(TIME_STD);
  if (std) {
    const h = Number(std[1] ?? 0);
    const m = Number(std[2]);
    const s = Number(std[3]);
    return Math.round((h * 3600 + m * 60 + s) * 1000);
  }
  const dec = t.match(TIME_DEC);
  if (dec) return Math.round(Number(dec[1]) * 1000);
  return 0;
}

function easeFn(name: EaseName, t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  if (name === "quadInOut") return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  if (name === "sineInOut") return -(Math.cos(Math.PI * x) - 1) / 2;
  return x;
}

type Segment<V> = {
  from: number;
  at: number;
  value: V;
  ease: EaseName;
};

/** Exported so callers (e.g. {@link ../learn/chapter-kit}'s `firstActiveAt`) can
 *  find where a keyframe's interval actually starts, matching `stateAt`'s own
 *  reading of it exactly. */
export function interval(meta: FrameMeta): { from: number; at: number } {
  const at = parseTime(meta.at);
  if (meta.from !== undefined) return { from: parseTime(meta.from), at };
  if (meta.duration !== undefined) {
    const d = parseTime(meta.duration);
    return { from: at - d, at };
  }
  return { from: at - DEFAULT_DURATION_MS, at };
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** How long a grab stays put after you let go, then how long it eases back. */
export const MEDDLE_RELAX_DELAY_MS = 1000;
export const MEDDLE_RELAX_DURATION_MS = 1000;

export type Meddle<T> = {
  frozen: boolean;
  releasedAt: number | null;
  value: T;
};

export function cubicInOut(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Mix a user grab back onto the guided value.
 *
 * Frozen (still dragging) keeps the grab. After release: hold for a second,
 * then ease back over a second — the same contract as the original lab.
 */
export function mixMeddle(
  now: number,
  guided: number,
  slot: Meddle<number> | null,
  shortest = false,
): { value: number; done: boolean } {
  if (!slot) return { value: guided, done: true };
  if (slot.frozen || slot.releasedAt === null) return { value: slot.value, done: false };
  const t = (now - slot.releasedAt - MEDDLE_RELAX_DELAY_MS) / MEDDLE_RELAX_DURATION_MS;
  if (t <= 0) return { value: slot.value, done: false };
  if (t >= 1) return { value: guided, done: true };
  const e = cubicInOut(t);
  if (!shortest) return { value: lerpNum(slot.value, guided, e), done: false };
  const tau = Math.PI * 2;
  let d = (guided - slot.value) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return { value: slot.value + d * e, done: false };
}

/**
 * Compile a chapter into a `stateAt(ms)` sampler.
 *
 * Numbers ease. Booleans, strings and everything else step at the start of
 * their interval — a layer that is turning on should appear, not fade through
 * a half-true that the scene cannot draw.
 */
export function compileChapter<S extends object>(defaults: S, frames: Keyframe<S>[]) {
  const tracks = new Map<string, Segment<unknown>[]>();
  let duration = 0;

  for (const frame of frames) {
    const { from, at } = interval(frame.meta);
    if (at > duration) duration = at;
    const ease = frame.meta.ease ?? "linear";
    for (const [key, value] of Object.entries(frame.state) as [string, unknown][]) {
      const list = tracks.get(key) ?? [];
      list.push({ from, at, value, ease });
      tracks.set(key, list);
    }
  }

  for (const list of tracks.values()) list.sort((a, b) => a.from - b.from || a.at - b.at);

  const stateAt = (ms: number): S => {
    const out = { ...defaults };
    for (const [key, segs] of tracks) {
      let active: Segment<unknown> | undefined;
      for (const seg of segs) {
        if (ms >= seg.from) active = seg;
        else break;
      }
      if (!active) continue;
      const prev = previousValue(segs, active, (defaults as Record<string, unknown>)[key]);
      const typedKey = key as keyof S;
      if (!isNumber(active.value) || !isNumber(prev)) {
        (out as Record<string, unknown>)[key] = active.value;
        continue;
      }
      if (ms >= active.at || active.at <= active.from) {
        out[typedKey] = active.value as S[keyof S];
        continue;
      }
      const t = easeFn(active.ease, (ms - active.from) / (active.at - active.from));
      out[typedKey] = lerpNum(prev, active.value, t) as S[keyof S];
    }
    return out;
  };

  return { duration, stateAt };
}

function previousValue(segs: Segment<unknown>[], active: Segment<unknown>, fallback: unknown) {
  let prev = fallback;
  for (const seg of segs) {
    if (seg === active) break;
    prev = seg.value;
  }
  return prev;
}

/** `mm:ss` for the player bar. */
export function formatChapterClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
