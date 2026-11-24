// The event index: every anga boundary, sankranti, lunar phase, graha ingress and station of a
// stretch of years, solved once on the server and stored (`VIDX0002`, see
// apps/rust/crates/ephdata/src/index.rs). A client reads an answer instead of solving for it.
//
// This is a reader for the same bytes the Rust server reads: the Surya Siddhanta file
// (`surya.vidx`) and the Drik file (`drik.vidx`) have one format, so one reader serves both.
// Boundaries are the same at every place on Earth, so they are stored once; what depends on
// the place (sunrise, lagna) is computed from positions and the user's latitude and longitude.

/** The angles that count in equal spans of the Sun's and the Moon's longitudes, in table order. */
export const VIDX_KINDS = [
  "tithi",
  "karana",
  "nakshatra",
  "pada",
  "yoga",
  "moonRashi",
  "sunNakshatra",
  "sankranti",
  "sunDegree",
  "phase",
] as const;

export type VidxKind = (typeof VIDX_KINDS)[number];

/** The grahas with their own event series, in table order. */
export const VIDX_GRAHAS = ["mercury", "venus", "mars", "jupiter", "saturn", "rahu"] as const;

export type VidxGraha = (typeof VIDX_GRAHAS)[number];

const MAGIC = "VIDX0002";
const HEADER = 48;
const ENTRY = 40;
const BLOCK_DAYS = 32;
const MS_PER_DAY = 86_400_000;
const TABLES = 22;

/** One boundary: when, and which span begins (0-based). */
export interface VidxCrossing {
  jd: number;
  multiple: number;
}

interface Table {
  firstMultiple: number;
  events: number;
  blocksOff: number;
  timesOff: number;
  payloadOff: number;
}

/** A table as it is read: the stored one, or every `stride`-th boundary of it. */
interface View {
  table: Table;
  stride: number;
  first: number;
  firstMultiple: number;
  count: number;
  events: number;
}

/** Spans in the circle for each kind. */
const COUNT: Record<VidxKind, number> = {
  tithi: 30,
  karana: 60,
  nakshatra: 27,
  pada: 108,
  yoga: 27,
  moonRashi: 12,
  sunNakshatra: 27,
  sankranti: 12,
  sunDegree: 360,
  phase: 4,
};

/** The stored kind a kind is read from, and how many of its boundaries make one of this kind's. */
const BASE: Record<VidxKind, [VidxKind, number]> = {
  tithi: ["karana", 2],
  karana: ["karana", 1],
  nakshatra: ["pada", 4],
  pada: ["pada", 1],
  yoga: ["yoga", 1],
  moonRashi: ["pada", 9],
  sunNakshatra: ["sunNakshatra", 1],
  sankranti: ["sunDegree", 30],
  sunDegree: ["sunDegree", 1],
  phase: ["karana", 15],
};

function viewOf(base: Table, stride: number, baseCount: number): View {
  const r = Math.max(stride, 1);
  const first = (r - (base.firstMultiple % r)) % r;
  const stored = base.events;
  return {
    table: base,
    stride: r,
    first,
    firstMultiple: Math.floor(((base.firstMultiple + first) % Math.max(baseCount, 1)) / r),
    count: Math.floor(baseCount / r),
    events: stored > first ? Math.ceil((stored - first) / r) : 0,
  };
}

/** A parsed event index. */
export class VidxIndex {
  /** First and last Julian Day (UT) whose events are complete. */
  readonly firstJd: number;
  readonly lastJd: number;
  private readonly origin: number;
  private readonly blocks: number;
  private readonly view: DataView;
  private readonly tables: Table[] = [];
  private readonly views: View[] = [];
  readonly byteLength: number;

  constructor(bytes: Uint8Array) {
    if (bytes.length < HEADER || new TextDecoder().decode(bytes.subarray(0, 8)) !== MAGIC) {
      throw new Error("event index: wrong magic");
    }
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.byteLength = bytes.byteLength;
    const v = this.view;
    if (v.getUint32(8, true) !== TABLES || v.getUint32(12, true) !== BLOCK_DAYS) {
      throw new Error("event index: unexpected table directory");
    }
    this.firstJd = v.getFloat64(16, true);
    this.lastJd = v.getFloat64(24, true);
    this.origin = v.getFloat64(32, true);
    this.blocks = v.getUint32(40, true);
    if (bytes.length < HEADER + ENTRY * TABLES) throw new Error("event index: truncated directory");
    for (let i = 0; i < TABLES; i += 1) {
      const e = HEADER + ENTRY * i;
      if (v.getUint16(e, true) !== i) throw new Error("event index: tables out of order");
      const table: Table = {
        firstMultiple: v.getUint32(e + 4, true),
        events: v.getUint32(e + 8, true),
        blocksOff: this.u64(e + 16),
        timesOff: this.u64(e + 24),
        payloadOff: this.u64(e + 32),
      };
      const end = table.timesOff + table.events * 4;
      if (bytes.length < end || bytes.length < table.blocksOff + (this.blocks + 1) * 4) {
        throw new Error("event index: truncated table");
      }
      this.tables.push(table);
    }
    VIDX_KINDS.forEach((kind, i) => {
      const [base, stride] = BASE[kind];
      this.views[i] = viewOf(this.tables[VIDX_KINDS.indexOf(base)], stride, COUNT[base]);
    });
    for (let i = 10; i < TABLES; i += 1) this.views[i] = viewOf(this.tables[i], 1, 12);
  }

  private u64(at: number): number {
    return this.view.getUint32(at, true) + this.view.getUint32(at + 4, true) * 4_294_967_296;
  }

  /** Whether `[from, to]` lies inside what this index covers completely. */
  covers(from: number, to: number = from): boolean {
    return Number.isFinite(from) && Number.isFinite(to) && from >= this.firstJd && to <= this.lastJd;
  }

  /** How many boundaries a kind has. */
  count(kind: VidxKind): number {
    return this.views[VIDX_KINDS.indexOf(kind)].events;
  }

  private blockStart(t: Table, block: number): number {
    return this.view.getUint32(t.blocksOff + block * 4, true);
  }

  private offset(t: Table, i: number): number {
    return this.view.getUint32(t.timesOff + i * 4, true);
  }

  private timeOf(t: Table, i: number): number {
    let lo = 0;
    let hi = this.blocks + 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.blockStart(t, mid) <= i) lo = mid + 1;
      else hi = mid;
    }
    const block = Math.max(lo - 1, 0);
    return this.origin + BLOCK_DAYS * block + this.offset(t, i) / MS_PER_DAY;
  }

  /** The number of stored events at or before `jd`. */
  private after(t: Table, jd: number): number {
    const rel = (jd - this.origin) / BLOCK_DAYS;
    if (rel < 0) return 0;
    const block = Math.floor(rel);
    if (block >= this.blocks) return t.events;
    let lo = this.blockStart(t, block);
    let hi = this.blockStart(t, block + 1);
    const ms = (jd - this.origin - BLOCK_DAYS * block) * MS_PER_DAY;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offset(t, mid) <= ms) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private afterView(v: View, jd: number): number {
    const stored = this.after(v.table, jd);
    return stored <= v.first ? 0 : Math.ceil((stored - v.first) / v.stride);
  }

  private crossing(v: View, k: number): VidxCrossing {
    return {
      jd: this.timeOf(v.table, v.first + k * v.stride),
      multiple: (v.firstMultiple + k) % v.count,
    };
  }

  private kindView(kind: VidxKind): View {
    return this.views[VIDX_KINDS.indexOf(kind)];
  }

  /** The first boundary of `kind` strictly after `jd`, or null past the index. */
  nextEvent(kind: VidxKind, jd: number): VidxCrossing | null {
    const v = this.kindView(kind);
    const k = this.afterView(v, jd);
    return k < v.events ? this.crossing(v, k) : null;
  }

  /** The last boundary of `kind` at or before `jd`, or null before the index. */
  prevEvent(kind: VidxKind, jd: number): VidxCrossing | null {
    const v = this.kindView(kind);
    const k = this.afterView(v, jd);
    return k > 0 ? this.crossing(v, k - 1) : null;
  }

  /** Every boundary of `kind` with `from < jd <= to`, in order. */
  eventsBetween(kind: VidxKind, from: number, to: number): VidxCrossing[] {
    const v = this.kindView(kind);
    const out: VidxCrossing[] = [];
    for (let k = this.afterView(v, from), b = this.afterView(v, to); k < b; k += 1) {
      out.push(this.crossing(v, k));
    }
    return out;
  }

  /** The span of `kind` holding `jd` (the one its last boundary entered). */
  spanAt(kind: VidxKind, jd: number): number | null {
    return this.prevEvent(kind, jd)?.multiple ?? null;
  }

  private seriesView(graha: VidxGraha, station: boolean): View {
    return this.views[(station ? 16 : 10) + VIDX_GRAHAS.indexOf(graha)];
  }

  /** The graha's rashi ingresses (payload: the rashi, 0 = Mesha) with `from < jd <= to`. */
  ingressesBetween(graha: VidxGraha, from: number, to: number): { jd: number; rashi: number }[] {
    return this.seriesBetween(graha, false, from, to).map((e) => ({ jd: e.jd, rashi: e.payload }));
  }

  /** The graha's stations with `from < jd <= to` (`retrograde` when it turns retrograde). */
  stationsBetween(graha: VidxGraha, from: number, to: number): { jd: number; retrograde: boolean }[] {
    return this.seriesBetween(graha, true, from, to).map((e) => ({
      jd: e.jd,
      retrograde: e.payload === 1,
    }));
  }

  private seriesBetween(
    graha: VidxGraha,
    station: boolean,
    from: number,
    to: number,
  ): { jd: number; payload: number }[] {
    const v = this.seriesView(graha, station);
    const out: { jd: number; payload: number }[] = [];
    if (v.table.payloadOff === 0) return out;
    for (let k = this.afterView(v, from), b = this.afterView(v, to); k < b; k += 1) {
      out.push({
        jd: this.timeOf(v.table, k),
        payload: this.view.getUint8(v.table.payloadOff + k),
      });
    }
    return out;
  }
}

/** Parses `.vidx` bytes: a whole file, or a slice the server sent. */
export function parseVidx(bytes: Uint8Array): VidxIndex {
  return new VidxIndex(bytes);
}
