import { tFor } from "@vedic-patro/i18n/runtime";
/** Keplerian heliocentric orbit — sun at focus, CCW in SVG (y-down). */

export const ORBIT = {
  cx: 600,
  cy: 410,
  a: 310,
  e: 0.14,
} as const;

export const ORBIT_B = ORBIT.a * Math.sqrt(1 - ORBIT.e ** 2);

const RAD = Math.PI / 180;

export function eccentricAnomaly(Mrad: number, e = ORBIT.e): number {
  let E = Mrad;
  for (let i = 0; i < 10; i++) E = Mrad + e * Math.sin(E);
  return E;
}

export function trueAnomalyFromE(E: number, e = ORBIT.e): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

export function meanFromTrue(nuDeg: number, e = ORBIT.e): number {
  const nu = nuDeg * RAD;
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  const M = E - e * Math.sin(E);
  return (((M / RAD) % 360) + 360) % 360;
}

export function orbitFromMeanAnomaly(meanDeg: number) {
  const M = meanDeg * RAD;
  const E = eccentricAnomaly(M);
  const nu = trueAnomalyFromE(E);
  const r = (ORBIT.a * (1 - ORBIT.e ** 2)) / (1 + ORBIT.e * Math.cos(nu));
  const ex = ORBIT.cx + r * Math.cos(nu);
  const ey = ORBIT.cy - r * Math.sin(nu);
  return {
    meanDeg: ((meanDeg % 360) + 360) % 360,
    nuDeg: ((nu / RAD) % 360 + 360) % 360,
    r,
    ex,
    ey,
    speed: 1 / Math.sqrt(r),
  };
}

export function meanFromPointer(px: number, py: number): number {
  const dx = px - ORBIT.cx;
  const dy = py - ORBIT.cy;
  const nu = Math.atan2(-dy, dx);
  let bestM = 0;
  let bestDist = Infinity;
  for (let m = 0; m < 360; m += 1) {
    const { ex, ey } = orbitFromMeanAnomaly(m);
    const d = (ex - px) ** 2 + (ey - py) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestM = m;
    }
  }
  const clickNu = ((nu / RAD) % 360 + 360) % 360;
  const clickM = meanFromTrue(clickNu);
  const clickPos = orbitFromMeanAnomaly(clickM);
  const clickDist = (clickPos.ex - px) ** 2 + (clickPos.ey - py) ** 2;
  return clickDist < bestDist ? clickM : bestM;
}

export function ellipsePathPoints(steps = 120): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const { ex, ey } = orbitFromMeanAnomaly((i / steps) * 360);
    pts.push((i === 0 ? "M" : "L") + ex.toFixed(1) + "," + ey.toFixed(1));
  }
  return pts.join(" ");
}

export const ORBIT_MARKERS = [
  {
    nu: 0,
    get ne() { return tFor("ne", "learn.study.orbit.winter_solstice"); },
    get en() { return tFor("en", "learn.study.orbit.winter_solstice"); },
    get detail() { return tFor("ne", "ui.learn.x_6d7ade13"); },
    get tag() { return tFor("ne", "ui.learn.x_c240b06d"); },
  },
  {
    nu: 90,
    get ne() { return tFor("ne", "learn.study.orbit.vernal_equinox"); },
    get en() { return tFor("en", "learn.study.orbit.vernal_equinox"); },
    get detail() { return tFor("ne", "ui.learn.x_e0a35b0d"); },
    tag: "",
  },
  {
    nu: 180,
    get ne() { return tFor("ne", "learn.study.orbit.summer_solstice"); },
    get en() { return tFor("en", "learn.study.orbit.summer_solstice"); },
    get detail() { return tFor("ne", "ui.learn.x_9194aad9"); },
    get tag() { return tFor("ne", "ui.learn.x_956087b9"); },
  },
  {
    nu: 270,
    get ne() { return tFor("ne", "learn.study.orbit.autumnal_equinox"); },
    get en() { return tFor("en", "learn.study.orbit.autumnal_equinox"); },
    get detail() { return tFor("ne", "ui.learn.x_e0a35b0d"); },
    tag: "",
  },
] as const;

export const ORBIT_PRESETS = ORBIT_MARKERS.map((m) => ({
  ne: m.ne,
  en: m.en,
  meanDeg: meanFromTrue(m.nu),
}));
