const DEG = Math.PI / 180;

export function normElongation(E: number): number {
  return ((E % 360) + 360) % 360;
}

export function isNewMoonElongation(E: number): boolean {
  const e = normElongation(E);
  return e < 10 || e > 350;
}

export function isFullMoonElongation(E: number): boolean {
  const e = normElongation(E);
  return e >= 170 && e <= 190;
}

/** Fraction of disc lit (0 = औंसी, 1 = पूर्णिमा). */
export function moonLitFraction(E: number): number {
  const e = normElongation(E);
  return (1 - Math.cos(e * DEG)) / 2;
}

/** Lit-side path for moon–sun elongation E (0° new, 180° full). Sun is to the left (−x). */
export function moonPhaseLitPath(E: number, r: number): string {
  const e = normElongation(E);
  const rx = Math.abs(Math.cos(e * DEG)) * r;
  const litRight = e <= 180;
  const gibbous = e > 90 && e < 270;
  const outerSweep = litRight ? 1 : 0;
  const termSweep = litRight ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
  return `M0,${-r} A${r},${r} 0 0 ${outerSweep} 0,${r} A${rx.toFixed(2)},${r} 0 0 ${termSweep} 0,${-r} Z`;
}

/** Mid-tithi elongation for wheel index 0–29 (0° औंसी … ~180° पूर्णिमा). */
export function elongationFromTithiIndex(idx: number): number {
  return (idx + 0.5) * 12;
}

/** Rotate (deg) so the phase disc's sunward side (−x) points at (sx, sy) from moon center. */
export function moonSunFacingRotation(mx: number, my: number, sx: number, sy: number): number {
  const dx = sx - mx;
  const dy = sy - my;
  return (Math.atan2(-dy, dx) * 180) / Math.PI - 180;
}
