// The sky the apps carry: where a position or a boundary comes from, for each system.
//
// Both systems (Surya Siddhanta and Drik) are stored the same way, in files of their own:
//   - `<system>.index`: every boundary (tithi, karana, nakshatra, pada, yoga, sankranti, ...)
//   - `<system>.cheb`: Chebyshev coefficients for the eight grahas
// The apps ship a window of years in the app itself (BS 1950 to 2150) and never need the server
// for them. For a date outside the window the app asks the server for a batch (about nine years,
// a lookup on the server, not a calculation), keeps it, and reads it like the bundled file.
// When there is neither a stored window nor a reachable server, the built-in fallback answers:
// the Surya Siddhanta's own formulas (exact, any date) or our own approximate Drik series.
//
// Kundali, dashas, muhurta and festivals are separate products and not part of this module.
//
// The module does no input or output of its own. The app passes in a `SkyIo` (bundled files,
// a cache, and a way to fetch), so the same logic runs on the web and on a phone.
import { chebLastJd, chebPositionsAt, chebScalars, parseChebTable, type ChebScalars, type ChebTable } from "./chebyshev";
import { drikAnalyticSource } from "./drik-analytic";
import { drikFrame } from "./drik-source";
import {
  nextNakshatraBoundary,
  nextTithiBoundary,
  type PositionSource,
  type SiddhantaPositions,
} from "./siddhanta-offline";
import { suryaFormulaSource } from "./surya-formulas";
import { parseVidx, type VidxCrossing, type VidxIndex, type VidxKind } from "./vidx";

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
export const SKY_DATA_VERSION = "v1";

/** Days of a batch the app asks the server for (a multiple of 32, the index's block). */
export const TILE_DAYS = 3200;
/** Extra days either side of a batch, so boundaries near its edge have their neighbours. */
const TILE_MARGIN_DAYS = 64;
/** A window answers boundary queries this far inside its ends (no boundary is further apart). */
const EVENT_MARGIN_DAYS = 35;
/** After a failed fetch, do not try the same batch again for this long. */
const RETRY_AFTER_MS = 60_000;

interface Window {
  origin: SkyOrigin;
  index: VidxIndex;
  cheb: ChebTable;
  scalars: ChebScalars;
  firstJd: number;
  lastJd: number;
}

function makeWindow(origin: SkyOrigin, indexBytes: Uint8Array, chebBytes: Uint8Array): Window {
  const index = parseVidx(indexBytes);
  const cheb = parseChebTable(chebBytes);
  return {
    origin,
    index,
    cheb,
    scalars: chebScalars(cheb),
    firstJd: Math.max(index.firstJd, cheb.firstJd),
    lastJd: Math.min(index.lastJd, chebLastJd(cheb)),
  };
}

const SERVER_PATH: Record<SkySystem, string> = { surya: "/v1/siddhanta", drik: "/v1/drik" };

/** One system's sky. */
export class Sky {
  readonly system: SkySystem;
  private readonly io: SkyIo;
  private readonly options: { timeoutMs?: number };
  private readonly windows: Window[] = [];
  private readonly loading = new Map<number, Promise<void>>();
  private readonly failedUntil = new Map<number, number>();

  constructor(system: SkySystem, io: SkyIo, options: { timeoutMs?: number } = {}) {
    this.system = system;
    this.io = io;
    this.options = options;
  }

  /** Opens the files shipped in the app. Call once; it is cheap when they are missing. */
  async open(): Promise<void> {
    const [indexBytes, chebBytes] = await Promise.all([
      this.io.bundled(`${this.system}.index`),
      this.io.bundled(`${this.system}.cheb`),
    ]);
    if (indexBytes && chebBytes) this.windows.push(makeWindow("bundled", indexBytes, chebBytes));
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
    const names = [`${this.system}.${SKY_DATA_VERSION}.${id}.index`, `${this.system}.${SKY_DATA_VERSION}.${id}.cheb`];
    let [indexBytes, chebBytes] = await Promise.all(names.map((n) => this.io.readCache(n)));
    let origin: SkyOrigin = "server";
    if (!indexBytes || !chebBytes) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12_000);
      try {
        const base = SERVER_PATH[this.system];
        const query = `?from_jd=${from}&to_jd=${to}`;
        [indexBytes, chebBytes] = await Promise.all([
          this.io.fetchBytes(`${base}/index${query}`, controller.signal),
          this.io.fetchBytes(`${base}/cheb${query}`, controller.signal),
        ]);
      } finally {
        clearTimeout(timer);
      }
      origin = "server";
      await Promise.all([this.io.writeCache(names[0], indexBytes), this.io.writeCache(names[1], chebBytes)]).catch(() => {});
    }
    this.windows.push(makeWindow(origin, indexBytes, chebBytes));
  }

  /** Where the answer for `jd` comes from. */
  originAt(jd: number): SkyOrigin {
    return this.windowFor(jd, 0)?.origin ?? (this.system === "surya" ? "formulas" : "approximate");
  }

  /** Positions at a Julian Day (UT): stored data when there is some, else the fallback. */
  positionsAt(jd: number): SiddhantaPositions | null {
    const w = this.windowFor(jd, 0);
    if (w) {
      const stored = chebPositionsAt(w.cheb, jd, w.scalars);
      if (stored) return stored;
    }
    return this.fallback.positionsAt(jd);
  }

  private get fallback(): PositionSource {
    return this.system === "surya" ? suryaFormulaSource : drikAnalyticSource;
  }

  /** The system as a position source, for the derivations in `siddhanta-offline`. */
  get source(): PositionSource {
    return {
      positionsAt: (jd) => this.positionsAt(jd),
      frame: this.system === "drik" ? drikFrame : undefined,
    };
  }

  /** The boundary index covering `jd`, if stored data covers it. */
  indexAt(jd: number): VidxIndex | null {
    return this.windowFor(jd, EVENT_MARGIN_DAYS)?.index ?? null;
  }

  /** The first boundary of `kind` after `jd`: stored when it can be, else found from positions. */
  nextBoundary(kind: VidxKind, jd: number): VidxCrossing | null {
    const stored = this.indexAt(jd)?.nextEvent(kind, jd);
    if (stored) return stored;
    // Without stored data, tithi and nakshatra can still be found from positions.
    if (kind === "tithi" || kind === "nakshatra") {
      const found = kind === "tithi" ? nextTithiBoundary(this.source, jd) : nextNakshatraBoundary(this.source, jd);
      return found === null ? null : { jd: found, multiple: -1 };
    }
    return null;
  }

  /** The last boundary of `kind` at or before `jd`, from stored data. */
  prevBoundary(kind: VidxKind, jd: number): VidxCrossing | null {
    return this.indexAt(jd)?.prevEvent(kind, jd) ?? null;
  }

  /** The first boundary after `jd` at which `kind` enters span `multiple`, from stored data. */
  nextEntry(kind: VidxKind, multiple: number, jd: number): VidxCrossing | null {
    return this.indexAt(jd)?.nextEntry(kind, multiple, jd) ?? null;
  }

  /** The span of `kind` holding `jd` (tithi 0-29, nakshatra 0-26, ...), from stored data. */
  spanAt(kind: VidxKind, jd: number): number | null {
    return this.indexAt(jd)?.spanAt(kind, jd) ?? null;
  }

  /** Every boundary of `kind` with `from < jd <= to`, reading across stored windows. */
  eventsBetween(kind: VidxKind, from: number, to: number): VidxCrossing[] {
    const out: VidxCrossing[] = [];
    let cursor = from;
    for (let guard = 0; guard < 64 && cursor < to; guard += 1) {
      const w = this.windowFor(cursor, EVENT_MARGIN_DAYS);
      if (!w) break;
      const end = Math.min(to, w.lastJd - EVENT_MARGIN_DAYS);
      out.push(...w.index.eventsBetween(kind, cursor, end));
      if (end <= cursor) break;
      cursor = end;
    }
    return out;
  }
}
