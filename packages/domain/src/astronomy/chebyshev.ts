// The Surya Siddhanta fallback: the same motion as Chebyshev coefficients
// (CHEB0001, see apps/rust/crates/siddhanta-table/src/cheb.rs), evaluated
// on the client with Clenshaw's recurrence. No server is involved — that is
// the point. The file is small enough to ship inside the app, so the phone
// can still show a panchanga when the server is slow or unreachable.
//
// The format is body-agnostic: a Drik coefficient file (CHEB0002) has the
// same shape with different data and a fitted ayanamsha in its header, so
// the reader takes both scalars from the file instead of the text's
// formula. Pass those as `scalars` to override; the default reads them
// from the table itself. What the client derives from the positions —
// tithi, nakshatra, lagna, sunrise — is the same code as for the STAB
// table.
import { ayanamshaAt, wrap360, type SiddhantaPositions } from "./siddhanta-offline";

const HEADER_BYTES = 56;
const HEADER_BYTES_V2 = 72;
const MAGIC = "CHEB0001";
const MAGIC_V2 = "CHEB0002";
const BODIES = 8;

/** A parsed CHEB file. Coefficients are f32, segment by segment, body by body. */
export interface ChebTable {
  firstJd: number;
  segmentDays: number;
  /** Chebyshev degree per body, in body order. */
  degrees: number[];
  /** Mean Sun (nirayana), degrees, at `firstJd`. */
  meanSun0: number;
  /** Mean Sun's exact rate, degrees per day. */
  meanSunRate: number;
  /**
   * Ayanamsha fitted from the kernel (anchor at `firstJd`, rate °/day):
   * present in a CHEB0002 (Drik) file, absent in a CHEB0001 (Surya
   * Siddhanta) file, where the text's formula is used instead.
   */
  ayanamsha?: { anchor: number; rate: number };
  coefficients: Float32Array;
}

/**
 * The two scalars a coefficient file does not carry as series: the
 * ayanamsha, and the nirayana mean Sun. For a Surya file they come from the
 * text's formula and the header anchor; a Drik file needs its own.
 */
export interface ChebScalars {
  ayanamshaAt(jdUt: number): number;
  meanSunNirayanaAt(jdUt: number): number;
}

/** Bytes of one segment: (degree + 1) f32 coefficients per body. */
export function chebSegmentBytes(degrees: readonly number[]): number {
  return degrees.reduce((sum, d) => sum + (d + 1) * 4, 0);
}

/** Parses CHEB bytes (a whole file): version 1 or version 2. */
export function parseChebTable(bytes: Uint8Array): ChebTable {
  if (bytes.length < HEADER_BYTES) {
    throw new Error("chebyshev table is too short for a header");
  }
  const magic = String.fromCharCode(...bytes.subarray(0, 8));
  const isV2 = magic === MAGIC_V2;
  if (!isV2 && magic !== MAGIC) {
    throw new Error("not a chebyshev table (bad magic)");
  }
  const headerBytes = isV2 ? HEADER_BYTES_V2 : HEADER_BYTES;
  if (bytes.length < headerBytes) {
    throw new Error("chebyshev table is too short for a version-2 header");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bodies = view.getUint32(8, true);
  if (bodies !== BODIES) {
    throw new Error(`chebyshev table has ${bodies} bodies, this reader knows 8`);
  }
  const segmentCount = view.getUint32(12, true);
  const firstJd = view.getFloat64(16, true);
  const segmentDays = view.getFloat64(24, true);
  if (!Number.isFinite(segmentDays) || segmentDays <= 0) {
    throw new Error(`chebyshev table segment ${segmentDays} is not a positive number of days`);
  }
  const meanSun0 = view.getFloat64(32, true);
  const meanSunRate = view.getFloat64(40, true);
  if (!Number.isFinite(meanSunRate)) {
    throw new Error(`chebyshev table mean Sun rate ${meanSunRate} is not a finite number`);
  }
  const ayanamsha = isV2
    ? {
        anchor: view.getFloat64(56, true),
        rate: view.getFloat64(64, true),
      }
    : undefined;
  if (ayanamsha && !Number.isFinite(ayanamsha.rate)) {
    throw new Error(`chebyshev table ayanamsha rate ${ayanamsha.rate} is not a finite number`);
  }
  const degrees = Array.from({ length: BODIES }, (_, b) => view.getUint8(48 + b));
  if (bytes.length !== headerBytes + segmentCount * chebSegmentBytes(degrees)) {
    throw new Error("chebyshev table length does not match its segment count");
  }
  const count = (bytes.length - headerBytes) / 4;
  const coefficients = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    coefficients[i] = view.getFloat32(headerBytes + i * 4, true);
  }
  return { firstJd, segmentDays, degrees, meanSun0, meanSunRate, ayanamsha, coefficients };
}

/** Julian Day (UT) of the last instant covered. */
export function chebLastJd(table: ChebTable): number {
  const segmentCount = table.coefficients.length * 4 / chebSegmentBytes(table.degrees);
  return table.firstJd + segmentCount * table.segmentDays;
}

/** The Surya scalars for a Surya file: the text's ayanamsha, and the mean Sun from the header. */
export function suryaScalars(table: ChebTable): ChebScalars {
  return {
    ayanamshaAt,
    meanSunNirayanaAt: (jdUt) =>
      wrap360(table.meanSun0 + table.meanSunRate * (jdUt - table.firstJd)),
  };
}

/**
 * The scalars for a file, read from the file itself: a version-2 (Drik)
 * file carries its fitted ayanamsha in the header, so both scalars are
 * the header's straight lines; a version-1 (Surya) file has no ayanamsha
 * in its header, so the text's formula is used for that one. This is the
 * default for `chebPositionsAt`.
 */
export function chebScalars(table: ChebTable): ChebScalars {
  if (!table.ayanamsha) {
    return suryaScalars(table);
  }
  const { anchor, rate } = table.ayanamsha;
  return {
    ayanamshaAt: (jdUt) => wrap360(anchor + rate * (jdUt - table.firstJd)),
    meanSunNirayanaAt: (jdUt) =>
      wrap360(table.meanSun0 + table.meanSunRate * (jdUt - table.firstJd)),
  };
}

/**
 * Evaluates a Chebyshev series at `x` in [-1, 1], by Clenshaw's recurrence.
 * `coefficients` holds the series from `start`, `count` terms, first one halved.
 */
export function clenshaw(
  coefficients: Float32Array,
  start: number,
  count: number,
  x: number,
): number {
  let b1 = 0;
  let b2 = 0;
  for (let j = start + count - 1; j > start; j--) {
    const b0 = 2 * x * b1 - b2 + coefficients[j];
    b2 = b1;
    b1 = b0;
  }
  return x * b1 - b2 + coefficients[start];
}

/** A body's unwrapped longitude at `jdUt`, or null outside the range. */
export function chebLongitudeAt(
  table: ChebTable,
  jdUt: number,
  body: number,
): number | null {
  if (!Number.isFinite(jdUt) || jdUt < table.firstJd || jdUt > chebLastJd(table)) {
    return null;
  }
  const segmentCount = table.coefficients.length * 4 / chebSegmentBytes(table.degrees);
  const at = (jdUt - table.firstJd) / table.segmentDays;
  const segment = Math.min(Math.floor(at), segmentCount - 1);
  const segmentStart = table.firstJd + segment * table.segmentDays;
  const x = Math.max(-1, Math.min(1, (2 * (jdUt - segmentStart)) / table.segmentDays - 1));
  const segmentCoeffs = chebSegmentBytes(table.degrees) / 4;
  let offset = segment * segmentCoeffs;
  for (let b = 0; b < body; b++) {
    offset += table.degrees[b] + 1;
  }
  return clenshaw(table.coefficients, offset, table.degrees[body] + 1, x);
}

/**
 * Positions at `jdUt`, in the same shape as the STAB reader's, so the same
 * derivation code runs on either source. The speed is the derivative of the
 * fitted polynomial, as a ±0.05-day central difference of the evaluation
 * itself — the polynomial is smooth, so that difference is accurate.
 */
export function chebPositionsAt(
  table: ChebTable,
  jdUt: number,
  scalars?: ChebScalars,
  bodies = BODIES,
  speeds = true,
): SiddhantaPositions | null {
  if (!Number.isFinite(jdUt) || jdUt < table.firstJd || jdUt > chebLastJd(table)) {
    return null;
  }
  const resolved = scalars ?? chebScalars(table);
  const longitude: number[] = [];
  const speed: number[] = [];
  const delta = 0.05;
  const lastJd = chebLastJd(table);
  for (let b = 0; b < bodies; b++) {
    const lon = chebLongitudeAt(table, jdUt, b);
    if (lon === null) {
      return null;
    }
    longitude.push(wrap360(lon));
    if (!speeds) {
      speed.push(0);
      continue;
    }
    const lo = Math.max(jdUt - delta, table.firstJd);
    const hi = Math.min(jdUt + delta, lastJd);
    if (hi > lo) {
      const diff =
        (chebLongitudeAt(table, hi, b) ?? lon) - (chebLongitudeAt(table, lo, b) ?? lon);
      // The fitted value is a longitude, so it may wrap 360 inside the window: take the short way round.
      speed.push((((diff + 180) % 360 + 360) % 360 - 180) / (hi - lo));
    } else {
      speed.push(0);
    }
  }
  const aya = resolved.ayanamshaAt(jdUt);
  return {
    longitude,
    speed,
    ayanamsha: aya,
    meanSunSayana: wrap360(resolved.meanSunNirayanaAt(jdUt) + aya),
  };
}
