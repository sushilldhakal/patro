// The sky the apps carry: where a position comes from, for each system, and every boundary
// (tithi, karana, yoga, nakshatra, pada, rashi, sankranti, phase) found from those positions.
//
// Both systems (Surya Siddhanta and Drik) are stored the same way, in a file of their own:
//   - `<system>.cheb`: Chebyshev coefficients for the eight grahas, and nothing else
// There is no stored list of boundaries: the app solves each one from positions, for the place and
// the ayanamsha the reader chose. The apps ship a window of years in the app itself (BS 1950 to
// 2150) and never need the server for them. For a date outside the window the app asks the server
// for a batch (about nine years of positions, a lookup on the server, not a calculation), keeps it,
// and reads it like the bundled file. When there is neither a stored window nor a reachable server,
// the built-in fallback answers: the Surya Siddhanta's own formulas (exact, any date) or our own
// approximate Drik series (about a minute on tithis, eight on sankrantis).
//
// The Drik file holds no ayanamsha of its own (it stores longitude less a placeholder written in its
// header, so the tropical place is exact). The reader's ayanamsha is applied here, as the Swiss
// Ephemeris applies a sidereal mode: `sky.withAyanamsha("kp")`. The Surya Siddhanta's longitudes are
// already sidereal and take none.
//
// The `lean` view loads no file at all and uses the fallback only (for phones with little memory).
//
// Kundali, dashas, muhurta and festivals are separate products and not part of this module.
//
// The module does no input or output of its own. The app passes in a `SkyIo` (bundled files,
// a cache, and a way to fetch), so the same logic runs on the web and on a phone.
import { ayanamshaFor, type DrikAyanamsha } from "./ayanamsha-modes";
import { chebLastJd, chebPositionsAt, chebScalars, parseChebTable, type ChebScalars, type ChebTable } from "./chebyshev";
import { drikAnalyticSource } from "./drik-analytic";
import { drikFrame } from "./drik-source";
import type { PositionSource, SiddhantaPositions } from "./siddhanta-offline";
import { suryaFormulaSource } from "./surya-formulas";

/** The angles that count in equal spans of the Sun's and the Moon's longitudes. */
export type SkyKind =
  | "tithi"
  | "karana"
  | "nakshatra"
  | "pada"
  | "yoga"
  | "moonRashi"
  | "sunNakshatra"
  | "sankranti"
  | "sunDegree"
  | "phase";

/** One boundary: when, and which span begins (0-based). */
export interface SkyCrossing {
  jd: number;
  multiple: number;
}

export type SkySystem = "surya" | "drik";

/** Where an answer came from, so a screen can say so when it is approximate. */
export type SkyOrigin = "bundled" | "server" | "formulas" | "approximate";

/** What the app provides: its bundled files, a cache, and the network. */
export interface SkyIo {
  /** Bytes of a file shipped inside the app, or null when there is none. */
  bundled(name: string): Promise<Uint8Array | null>;
  /** Bytes kept from an earlier session, or null. */
  readCache(name: string): Promise<Uint8Array | null>;
  /** Keeps bytes for later sessions. May fail silently. */
  writeCache(name: string, bytes: Uint8Array): Promise<void>;
  /** Bytes from the server at `path` (with its query). Rejects when it cannot be reached. */
  fetchBytes(path: string, signal?: AbortSignal): Promise<Uint8Array>;
}

/** Bump when the files change shape, so an older cache is ignored. */
export const SKY_DATA_VERSION = "v2";

/** Days of a batch the app asks the server for. */
export const TILE_DAYS = 3200;
/** Extra days either side of a batch, so boundaries near its edge have their neighbours. */
const TILE_MARGIN_DAYS = 64;
/** A boundary is solved from positions this far inside a window's ends (no span is longer). */
const EVENT_MARGIN_DAYS = 35;
/** Boundaries closer than this (about 17 ms) to a time that was itself solved are the same boundary. */
const SAME_INSTANT_DAYS = 2e-7;
/**
 * A time that was solved as a boundary is good to about 2e-9 days, so the angle there may read a hair
 * short of the boundary. A span is read this far later (under a millisecond), which puts a solved
 * boundary instant inside the span that begins there, as an exact stored boundary would be.
 */
const AT_BOUNDARY_DAYS = 1e-8;
/** After a failed fetch, do not try the same batch again for this long. */
const RETRY_AFTER_MS = 60_000;

interface Window {
  origin: SkyOrigin;
  cheb: ChebTable;
  scalars: ChebScalars;
  firstJd: number;
  lastJd: number;
}

function makeWindow(origin: SkyOrigin, chebBytes: Uint8Array): Window {
  const cheb = parseChebTable(chebBytes);
  return { origin, cheb, scalars: chebScalars(cheb), firstJd: cheb.firstJd, lastJd: chebLastJd(cheb) };
}

const SERVER_PATH: Record<SkySystem, string> = { surya: "/v1/siddhanta", drik: "/v1/drik" };

/**
 * How a kind is read from positions: the angle is `sun * a + moon * b` (degrees, sidereal in the
 * reader's ayanamsha), cut into `count` equal spans; `minSpeed` keeps a Newton step finite.
 */
interface Spec {
  sun: number;
  moon: number;
  count: number;
  minSpeed: number;
}
const MOON: Omit<Spec, "count"> = { sun: 0, moon: 1, minSpeed: 10 };
const SUN: Omit<Spec, "count"> = { sun: 1, moon: 0, minSpeed: 0.9 };
const ELONGATION: Omit<Spec, "count"> = { sun: -1, moon: 1, minSpeed: 10 };
const SPECS: Record<SkyKind, Spec> = {
  tithi: { ...ELONGATION, count: 30 },
  karana: { ...ELONGATION, count: 60 },
  phase: { ...ELONGATION, count: 4 },
  yoga: { sun: 1, moon: 1, count: 27, minSpeed: 11 },
  nakshatra: { ...MOON, count: 27 },
  pada: { ...MOON, count: 108 },
  moonRashi: { ...MOON, count: 12 },
  sunNakshatra: { ...SUN, count: 27 },
  sankranti: { ...SUN, count: 12 },
  sunDegree: { ...SUN, count: 360 },
};

const wrap = (deg: number) => ((deg % 360) + 360) % 360;
const signed = (deg: number) => wrap(deg + 180) - 180;

const angleOf = (spec: Spec, p: SiddhantaPositions) => wrap(spec.sun * p.longitude[0] + spec.moon * p.longitude[1]);
const speedOf = (spec: Spec, p: SiddhantaPositions) =>
  Math.max(spec.sun * p.speed[0] + spec.moon * p.speed[1], spec.minSpeed);

export class Sky {
  readonly system: SkySystem;
  /** The Drik ayanamsha this view reads in (Lahiri unless `withAyanamsha` says otherwise). */
  readonly ayanamsha: DrikAyanamsha = "lahiri";
  private views?: Map<DrikAyanamsha, Sky>;
  private readonly io: SkyIo;
  private readonly options: { timeoutMs?: number; lean?: boolean };
  private readonly windows: Window[] = [];
  private readonly loading = new Map<number, Promise<void>>();
  private readonly failedUntil = new Map<number, number>();

  /**
   * `lean`: load no files and ask no server; every answer comes from the formulas (Surya) or the
   * built-in series (Drik) and every boundary is solved from positions. For low-memory phones.
   */
  constructor(system: SkySystem, io: SkyIo, options: { timeoutMs?: number; lean?: boolean } = {}) {
    this.system = system;
    this.io = io;
    this.options = options;
  }

  /**
   * This sky read in another Drik ayanamsha: the same loaded data, a view of its own (so caches keyed
   * by the sky stay per mode). The Surya Siddhanta has its own ayanamsha and ignores the choice.
   */
  withAyanamsha(mode: DrikAyanamsha): Sky {
    if (this.system !== "drik" || mode === this.ayanamsha) return this;
    const base = (Object.getPrototypeOf(this) instanceof Sky ? Object.getPrototypeOf(this) : this) as Sky;
    if (mode === "lahiri") return base;
    base.views ??= new Map();
    let view = base.views.get(mode);
    if (!view) {
      view = Object.create(base, { ayanamsha: { value: mode, enumerable: true } }) as Sky;
      base.views.set(mode, view);
    }
    return view;
  }

  /**
   * The instant after (dir 1) or before (dir -1) `jd` at which the angle of `spec` reaches `target`
   * degrees. A boundary within `SAME_INSTANT_DAYS` after `jd` is the one `jd` itself came from (a
   * solved time is good to about 1e-8 days, not exact), so it is not "after": the next one is given.
   */
  private reach(spec: Spec, target: number, jd: number, dir: 1 | -1, sameIsNext = false): number | null {
    let p = this.positionsAt(jd, 2);
    if (!p) return null;
    let gap = dir === 1 ? wrap(target - angleOf(spec, p)) : -wrap(angleOf(spec, p) - target);
    if (dir === 1 && gap === 0) gap = 360;
    let t = jd + gap / speedOf(spec, p);
    for (let i = 0; i < 12; i += 1) {
      p = this.positionsAt(t, 2);
      if (!p) return null;
      const step = signed(target - angleOf(spec, p)) / speedOf(spec, p);
      // A step is never more than a day: a bad speed must not throw the solve across the year.
      t += Math.max(-1, Math.min(1, step));
      if (Math.abs(step) < 2e-9) break;
    }
    if (dir === 1 && !sameIsNext && t <= jd + SAME_INSTANT_DAYS) return this.reach(spec, target, t + 1e-6, 1);
    return t;
  }

  private solvedNext(spec: Spec, jd: number): SkyCrossing | null {
    const p = this.positionsAt(jd, 2);
    if (!p) return null;
    const size = 360 / spec.count;
    let next = (Math.floor(angleOf(spec, p) / size) + 1) % spec.count;
    let at = this.reach(spec, next * size, jd, 1, true);
    if (at !== null && at <= jd + SAME_INSTANT_DAYS) {
      // `jd` sits on the boundary into `next` (to the precision of a solve): the following one is wanted.
      next = (next + 1) % spec.count;
      at = this.reach(spec, next * size, jd, 1, true);
    }
    return at === null ? null : { jd: at, multiple: next };
  }

  /** Opens the files shipped in the app. Call once; it is cheap when they are missing. */
  async open(): Promise<void> {
    if (this.options.lean) return;
    const chebBytes = await this.io.bundled(`${this.system}.cheb`);
    if (chebBytes) this.windows.push(makeWindow("bundled", chebBytes));
  }

  /** The first and last Julian Day the bundled window answers for, or null without one. */
  get bundledSpan(): [number, number] | null {
    const w = this.windows.find((x) => x.origin === "bundled");
    return w ? [w.firstJd, w.lastJd] : null;
  }

  private windowFor(jd: number, margin: number): Window | null {
    for (const w of this.windows) {
      if (jd >= w.firstJd + margin && jd <= w.lastJd - margin) return w;
    }
    return null;
  }

  /**
   * Makes sure the stored data for `[fromJd, toJd]` is here: a batch from the cache, else from
   * the server. Resolves without throwing; whatever is still missing is answered by the
   * built-in fallback.
   */
  async ensure(fromJd: number, toJd: number): Promise<void> {
    if (this.options.lean) return;
    const first = Math.floor((fromJd - EVENT_MARGIN_DAYS) / TILE_DAYS);
    const last = Math.floor((toJd + EVENT_MARGIN_DAYS) / TILE_DAYS);
    const jobs: Promise<void>[] = [];
    for (let id = first; id <= last; id += 1) {
      const start = id * TILE_DAYS;
      if (this.windowFor(Math.max(fromJd, start), EVENT_MARGIN_DAYS) && this.windowFor(Math.min(toJd, start + TILE_DAYS), EVENT_MARGIN_DAYS)) {
        continue;
      }
      jobs.push(this.loadTile(id));
    }
    await Promise.all(jobs);
  }

  private loadTile(id: number): Promise<void> {
    const running = this.loading.get(id);
    if (running) return running;
    if ((this.failedUntil.get(id) ?? 0) > Date.now()) return Promise.resolve();
    const job = this.fetchTile(id)
      .catch(() => {
        this.failedUntil.set(id, Date.now() + RETRY_AFTER_MS);
      })
      .finally(() => this.loading.delete(id));
    this.loading.set(id, job);
    return job;
  }

  private async fetchTile(id: number): Promise<void> {
    const from = id * TILE_DAYS - TILE_MARGIN_DAYS;
    const to = (id + 1) * TILE_DAYS + TILE_MARGIN_DAYS;
    const name = `${this.system}.${SKY_DATA_VERSION}.${id}.cheb`;
    let chebBytes = await this.io.readCache(name);
    if (!chebBytes) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12_000);
      try {
        chebBytes = await this.io.fetchBytes(`${SERVER_PATH[this.system]}/cheb?from_jd=${from}&to_jd=${to}`, controller.signal);
      } finally {
        clearTimeout(timer);
      }
      await this.io.writeCache(name, chebBytes).catch(() => {});
    }
    this.windows.push(makeWindow("server", chebBytes));
  }

  /** Where the answer for `jd` comes from. */
  originAt(jd: number): SkyOrigin {
    return this.windowFor(jd, 0)?.origin ?? (this.system === "surya" ? "formulas" : "approximate");
  }

  /** Positions at a Julian Day (UT): stored data when there is some, else the fallback. */
  positionsAt(jd: number, bodies = 8, speeds = true): SiddhantaPositions | null {
    const w = this.windowFor(jd, 0);
    const raw = (w ? chebPositionsAt(w.cheb, jd, w.scalars, bodies, speeds) : null) ?? this.fallback.positionsAt(jd, bodies, speeds);
    if (!raw || this.system !== "drik") return raw;
    // Drik: the tropical place is longitude + the file's placeholder; take off the reader's ayanamsha.
    const ayanamsha = ayanamshaFor(this.ayanamsha, jd);
    const shift = raw.ayanamsha - ayanamsha;
    return { ...raw, longitude: raw.longitude.map((l) => wrap(l + shift)), ayanamsha };
  }

  private get fallback(): PositionSource {
    return this.system === "surya" ? suryaFormulaSource : drikAnalyticSource;
  }

  /** The system as a position source, for the derivations in `siddhanta-offline`. */
  get source(): PositionSource {
    return {
      positionsAt: (jd, bodies, speeds) => this.positionsAt(jd, bodies, speeds),
      frame: this.system === "drik" ? drikFrame : undefined,
    };
  }

  /** The first boundary of `kind` after `jd`. */
  nextBoundary(kind: SkyKind, jd: number): SkyCrossing | null {
    return this.solvedNext(SPECS[kind], jd);
  }

  /** The last boundary of `kind` at or before `jd`. */
  prevBoundary(kind: SkyKind, jd: number): SkyCrossing | null {
    const spec = SPECS[kind];
    const at = jd + AT_BOUNDARY_DAYS;
    const p = this.positionsAt(at, 2);
    if (!p) return null;
    const span = Math.floor(angleOf(spec, p) / (360 / spec.count)) % spec.count;
    const found = this.reach(spec, span * (360 / spec.count), at, -1);
    return found === null ? null : { jd: found, multiple: span };
  }

  /** The first boundary after `jd` at which `kind` enters span `multiple`. */
  nextEntry(kind: SkyKind, multiple: number, jd: number): SkyCrossing | null {
    const spec = SPECS[kind];
    const at = this.reach(spec, (multiple % spec.count) * (360 / spec.count), jd, 1);
    return at === null ? null : { jd: at, multiple: multiple % spec.count };
  }

  /** The span of `kind` holding `jd` (tithi 0-29, nakshatra 0-26, ...). */
  spanAt(kind: SkyKind, jd: number): number | null {
    const spec = SPECS[kind];
    const p = this.positionsAt(jd + AT_BOUNDARY_DAYS, 2);
    return p ? Math.floor(angleOf(spec, p) / (360 / spec.count)) % spec.count : null;
  }

  /** Every boundary of `kind` with `from < jd <= to`. */
  eventsBetween(kind: SkyKind, from: number, to: number): SkyCrossing[] {
    const out: SkyCrossing[] = [];
    const spec = SPECS[kind];
    for (let at = this.solvedNext(spec, from); at && at.jd <= to && out.length < 4000; at = this.solvedNext(spec, at.jd + 1e-7)) {
      out.push(at);
    }
    return out;
  }
}
