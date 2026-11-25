/**
 * Moon phase for the weather page, from the app's own sky model (the one the
 * 3D sky runs) — no server data. Elongation is Moon minus Sun, so the ayanamsha
 * cancels. Checked against Nov–Dec 2026 phases: within an hour.
 */
import { geocentricPointAt } from "@vedic-patro/domain/astronomy/sky3d/orbital-model";

export type MoonPhaseKey =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

const PRINCIPAL: { key: MoonPhaseKey; at: number }[] = [
  { key: "new", at: 0 },
  { key: "first_quarter", at: 90 },
  { key: "full", at: 180 },
  { key: "last_quarter", at: 270 },
];
const BETWEEN: MoonPhaseKey[] = [
  "waxing_crescent",
  "waxing_gibbous",
  "waning_gibbous",
  "waning_crescent",
];
/** About a day of Moon–Sun motion: a principal phase names the whole day around it. */
const NEAR = 12.2;

const dtOf = (ms: number) => ms / 86_400_000 + 2440587.5 - 2451545;
export function elongationAt(ms: number): number {
  const dt = dtOf(ms);
  return (
    (((geocentricPointAt("moon", dt).longitude -
      geocentricPointAt("sun", dt).longitude) %
      360) +
      360) %
    360
  );
}

export function moonPhaseAt(ms: number): MoonPhaseKey {
  const e = elongationAt(ms);
  for (const p of PRINCIPAL) {
    const off = Math.abs(((e - p.at + 540) % 360) - 180);
    if (off <= NEAR) return p.key;
  }
  return BETWEEN[Math.floor(e / 90)]!;
}

/** The next new / first quarter / full / last quarter after `ms`, to the minute. */
export function nextPrincipalPhase(ms: number): {
  key: MoonPhaseKey;
  ms: number;
} {
  const e0 = elongationAt(ms);
  const next = PRINCIPAL.find((p) => p.at > e0 + 0.5) ?? PRINCIPAL[0]!;
  const ahead = (t: number) => (elongationAt(t) - next.at + 360) % 360; // small just after crossing
  // Step 6 hours until the target angle is passed, then bisect.
  let lo = ms;
  let hi = ms;
  for (let i = 0; i < 160; i++) {
    hi = lo + 6 * 3_600_000;
    if (ahead(hi) < 90) break;
    lo = hi;
  }
  while (hi - lo > 60_000) {
    const mid = (lo + hi) / 2;
    if (ahead(mid) < 90) hi = mid;
    else lo = mid;
  }
  return { key: next.key, ms: hi };
}
