/**
 * The lettered construction on page 244 of Pandey's Surya Siddhanta,
 * उदयास्ताधिकार. Earth is held fixed at भू. The planet rides the circle
 * अ व स द य, and the ray from earth meets the nakshatra arc ज … छ.
 * Near the sun र the planet sets. When that ray turns back, the motion is retrograde.
 */
export type Pt = { x: number; y: number };

const E: Pt = { x: 180, y: 198 };
const C: Pt = { x: 180, y: 116 };
const ORBIT = 46;
const ARC = 170;
const SUN: Pt = { x: 202, y: 120 };

function orbitPoint(deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + ORBIT * Math.sin(a), y: C.y - ORBIT * Math.cos(a) };
}

function rayEnd(through: Pt, radius = ARC): Pt {
  const dx = through.x - E.x;
  const dy = through.y - E.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: E.x + (dx / len) * radius, y: E.y + (dy / len) * radius };
}

function sightAngle(through: Pt): number {
  return Math.atan2(through.x - E.x, E.y - through.y);
}

/** Inner letters, and the outer letter the same ray meets. */
const MARKS: { deg: number; near: string; far: string }[] = [
  { deg: -128, near: "अ", far: "ख" },
  { deg: -86, near: "व", far: "क" },
  { deg: -42, near: "स", far: "ग" },
  { deg: 8, near: "द", far: "घ" },
  { deg: 52, near: "य", far: "च" },
];

export type UdayastaRay = { a: Pt; b: Pt; near: string; far: string; at: Pt; seen: Pt };

export type UdayastaFrame = {
  earth: Pt;
  sun: Pt;
  center: Pt;
  orbit: number;
  arc: string;
  tangents: [Pt, Pt];
  rays: UdayastaRay[];
  extras: { at: Pt; label: string }[];
  planet: Pt;
  sight: Pt;
  setting: boolean;
  retrograde: boolean;
};

function arcPath(): string {
  const left = rayEnd(orbitPoint(-148), ARC);
  const right = rayEnd(orbitPoint(148), ARC);
  return `M ${left.x.toFixed(1)} ${left.y.toFixed(1)} A ${ARC} ${ARC} 0 0 0 ${right.x.toFixed(1)} ${right.y.toFixed(1)}`;
}

let cachedArc = "";
let cachedRays: UdayastaRay[] | null = null;
let cachedTangents: [Pt, Pt] | null = null;
let cachedExtras: { at: Pt; label: string }[] | null = null;

function tangents(): [Pt, Pt] {
  if (cachedTangents) return cachedTangents;
  const ux = (C.x - E.x);
  const uy = (C.y - E.y);
  const d = Math.hypot(ux, uy);
  const uxv = ux / d;
  const uyv = uy / d;
  const beta = Math.asin(ORBIT / d);
  const len = Math.sqrt(d * d - ORBIT * ORBIT);
  const touch = (sign: number): Pt => {
    const cos = Math.cos(sign * beta);
    const sin = Math.sin(sign * beta);
    const dx = uxv * cos - uyv * sin;
    const dy = uxv * sin + uyv * cos;
    return { x: E.x + dx * len, y: E.y + dy * len };
  };
  cachedTangents = [touch(-1), touch(1)];
  return cachedTangents;
}

function rays(): UdayastaRay[] {
  if (cachedRays) return cachedRays;
  cachedRays = MARKS.map((mark) => {
    const at = orbitPoint(mark.deg);
    const seen = rayEnd(at);
    return { a: E, b: seen, near: mark.near, far: mark.far, at, seen };
  });
  return cachedRays;
}

function extras(): { at: Pt; label: string }[] {
  if (cachedExtras) return cachedExtras;
  cachedExtras = [
    { at: rayEnd(orbitPoint(30)), label: "ङ" },
    { at: rayEnd(orbitPoint(118)), label: "छ" },
  ];
  return cachedExtras;
}

export function udayasta(t: number): UdayastaFrame {
  const turn = ((t % 1) + 1) % 1;
  const deg = turn * 360;
  const planet = orbitPoint(deg);
  const prev = orbitPoint(deg - 6);
  const next = orbitPoint(deg + 6);
  const retro = sightAngle(next) < sightAngle(prev);
  const sun = SUN;
  const gap = Math.hypot(planet.x - sun.x, planet.y - sun.y);
  if (!cachedArc) cachedArc = arcPath();
  return {
    earth: E,
    sun,
    center: C,
    orbit: ORBIT,
    arc: cachedArc,
    tangents: tangents(),
    rays: rays(),
    extras: extras(),
    planet,
    sight: rayEnd(planet),
    setting: gap < 34,
    retrograde: retro && gap >= 34,
  };
}

export function udayastaSamples(n = 48): {
  still: UdayastaFrame;
  cx: string;
  cy: string;
  x2: string;
  y2: string;
  opacity: string;
  vakra: string;
} {
  const frames = Array.from({ length: n + 1 }, (_, i) => udayasta(i / n));
  const num = (pick: (f: UdayastaFrame) => number) => frames.map((f) => pick(f).toFixed(1)).join(";");
  return {
    still: frames[0]!,
    cx: num((f) => f.planet.x),
    cy: num((f) => f.planet.y),
    x2: num((f) => f.sight.x),
    y2: num((f) => f.sight.y),
    opacity: frames.map((f) => (f.setting ? "0.2" : "1")).join(";"),
    vakra: frames.map((f) => (f.retrograde ? "1" : "0")).join(";"),
  };
}
