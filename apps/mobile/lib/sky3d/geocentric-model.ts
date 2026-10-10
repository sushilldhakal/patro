/**
 * Geocentric sky model — the numbers behind the 3D view.
 *
 * Everything here is pure math on data the API already returns, so the 3D
 * scene and the existing 2D wheel read from exactly the same source of truth
 * (sidereal ecliptic longitude, Lahiri). No ephemeris work happens on device.
 *
 * Frame: right-handed, ecliptic plane = XZ, celestial north = +Y.
 * Sidereal longitude 0° (start of Mesha) points down +X and increases
 * anticlockwise viewed from north — matching how the 2D wheel is drawn, and
 * how the sky itself runs. Every camera that shows the belt is therefore kept
 * north of the ecliptic; from the south side the same ring reads backwards.
 */

import { GRAHA_DETAIL_ORDER, type GrahaKey } from "@/lib/graha-details";

export const DEG = Math.PI / 180;

/** 27 nakshatras × 13°20′. */
export const NAKSHATRA_ARC = 360 / 27;
/** 12 rashis × 30°. */
export const RASHI_ARC = 30;

export type Vec3 = [number, number, number];

/**
 * ecliptic (longitude, latitude) → cartesian on a sphere of `radius`.
 * Latitude is the graha's shara; passing 0 keeps a body exactly on the ecliptic.
 */
export function eclipticToVec3(lonDeg: number, latDeg: number, radius: number): Vec3 {
  const lon = lonDeg * DEG;
  const lat = latDeg * DEG;
  const cosLat = Math.cos(lat);
  return [
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  ];
}

/**
 * Schematic orbital radii, in scene units.
 *
 * These are *ordering* radii, not true distances — a to-scale geocentric model
 * would put Saturn ~40× further out than the Moon and render as a dot beside an
 * empty screen. The classical Vedic ordering (Moon → Saturn, by increasing
 * period) is what the chart teaches, so that is what the shells encode.
 */
export const GRAHA_SHELL: Record<GrahaKey, number> = {
  moon: 2.0,
  mercury: 2.7,
  venus: 3.4,
  sun: 4.1,
  mars: 4.8,
  jupiter: 5.5,
  saturn: 6.2,
  // Rahu/Ketu are the lunar nodes — no body, so they ride the Moon's shell.
  rahu: 2.0,
  ketu: 2.0,
};

/** Render colours per graha, matching the 2D palette used across the app. */
export const GRAHA_COLOR: Record<GrahaKey, string> = {
  sun: "#f59e0b",
  moon: "#cbd5e1",
  mars: "#ef4444",
  mercury: "#10b981",
  jupiter: "#f97316",
  venus: "#0ea5e9",
  saturn: "#6366f1",
  rahu: "#8b5cf6",
  ketu: "#e11d48",
};

/** Relative body sizes — again schematic, tuned so every graha stays legible. */
export const GRAHA_RADIUS: Record<GrahaKey, number> = {
  sun: 0.26,
  moon: 0.17,
  mars: 0.13,
  mercury: 0.11,
  jupiter: 0.22,
  venus: 0.15,
  saturn: 0.2,
  rahu: 0.1,
  ketu: 0.1,
};

export type SkyGraha = {
  key: GrahaKey;
  /** Sidereal ecliptic longitude in degrees. */
  longitude: number;
  /** ecliptic latitude (shara) in degrees; 0 when the API does not supply it. */
  latitude: number;
  retrograde: boolean;
  position: Vec3;
  shell: number;
  color: string;
  size: number;
};

/** Anything carrying a sidereal longitude — gochar rows, varga points, sthiti rows. */
export type LongitudeSource = {
  longitude?: number;
  latitude?: number;
  shara_deg?: number;
  is_retrograde?: boolean;
  retrograde?: boolean;
};

/**
 * Build the placed grahas for the scene from any longitude-bearing payload.
 * Bodies without a longitude are skipped rather than parked at 0°.
 */
export function buildSkyGrahas(
  source: Partial<Record<string, LongitudeSource>>,
): SkyGraha[] {
  return GRAHA_DETAIL_ORDER.flatMap((key) => {
    const row = source[key];
    if (!row || row.longitude == null) return [];
    const latitude = row.latitude ?? row.shara_deg ?? 0;
    const shell = GRAHA_SHELL[key];
    return [
      {
        key,
        longitude: normalizeDeg(row.longitude),
        latitude,
        retrograde: Boolean(row.is_retrograde ?? row.retrograde),
        position: eclipticToVec3(row.longitude, latitude, shell),
        shell,
        color: GRAHA_COLOR[key],
        size: GRAHA_RADIUS[key],
      },
    ];
  });
}

export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Rashi index 1–12 for a sidereal longitude. */
export function rashiOfLongitude(lonDeg: number): number {
  return Math.floor(normalizeDeg(lonDeg) / RASHI_ARC) + 1;
}

/** Nakshatra index 1–27 for a sidereal longitude. */
export function nakshatraOfLongitude(lonDeg: number): number {
  return Math.floor(normalizeDeg(lonDeg) / NAKSHATRA_ARC) + 1;
}

/** Pada 1–4 within the nakshatra. */
export function padaOfLongitude(lonDeg: number): number {
  const within = normalizeDeg(lonDeg) % NAKSHATRA_ARC;
  return Math.floor(within / (NAKSHATRA_ARC / 4)) + 1;
}

/** Evenly spaced ring segment boundaries, for drawing belt divisions. */
export function beltDivisions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (360 / count) * i);
}

/** Mid-angle of segment `i` (0-based) in a belt of `count` equal segments. */
export function segmentMidAngle(i: number, count: number): number {
  return (360 / count) * (i + 0.5);
}
