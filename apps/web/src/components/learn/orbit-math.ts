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
    ne: "हिम सङ्क्रान्ति",
    en: "Winter solstice",
    detail: "सबैभन्दा लामो रात",
    tag: "सूर्य नजिक · छिटो",
  },
  {
    nu: 90,
    ne: "वसंत विषुव",
    en: "Vernal equinox",
    detail: "दिन र रात बराबर",
    tag: "",
  },
  {
    nu: 180,
    ne: "ग्रीष्म सङ्क्रान्ति",
    en: "Summer solstice",
    detail: "सबैभन्दा लामो दिन",
    tag: "सूर्य टाढा · ढिलो",
  },
  {
    nu: 270,
    ne: "शरद विषुव",
    en: "Autumnal equinox",
    detail: "दिन र रात बराबर",
    tag: "",
  },
] as const;

export const ORBIT_PRESETS = ORBIT_MARKERS.map((m) => ({
  ne: m.ne,
  en: m.en,
  meanDeg: meanFromTrue(m.nu),
}));
