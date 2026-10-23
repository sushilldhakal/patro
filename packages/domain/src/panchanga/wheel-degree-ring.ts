/**
 * The degree scale on the panchanga wheel's outermost ring, shared by both
 * apps' `WheelChart`. Longitude is sidereal, 0° at the start of Mesha — the
 * same frame the rashi ring is drawn in.
 */

/** At or past this zoom the scale steps every 5° instead of every 10°. */
export const WHEEL_DEGREE_FINE_ZOOM = 2;
/** At or past this zoom it steps every 1°. */
export const WHEEL_DEGREE_FINEST_ZOOM = 6;
/** At or past this zoom every 1° tick is numbered; below it, every 5th. */
export const WHEEL_DEGREE_EVERY_LABEL_ZOOM = 10;

export type WheelDegreeStep = 1 | 5 | 10;

export type WheelDegreeMark = {
  deg: number;
  /** A rashi boundary (multiple of 30°): drawn with a longer, brighter tick. */
  major: boolean;
  /** Whether this tick carries a number. */
  labelled: boolean;
};

export function wheelDegreeStep(zoom: number): WheelDegreeStep {
  if (zoom >= WHEEL_DEGREE_FINEST_ZOOM) return 1;
  return zoom >= WHEEL_DEGREE_FINE_ZOOM ? 5 : 10;
}

export function wheelDegreeMarks(step: WheelDegreeStep, numberEvery1 = false): WheelDegreeMark[] {
  const marks: WheelDegreeMark[] = [];
  // A 1° cell is ~8.5 wheel units wide, so numbering all of them needs the room
  // a deep zoom gives (`numberEvery1`, see {@link WHEEL_DEGREE_EVERY_LABEL_ZOOM}); before that every 5th is numbered.
  const everyLabel = step !== 1 || numberEvery1;
  for (let deg = 0; deg < 360; deg += step) {
    marks.push({ deg, major: deg % 30 === 0, labelled: everyLabel || deg % 5 === 0 });
  }
  return marks;
}

/**
 * Whether a scale number is too close to the selected graha's readout to be
 * drawn under it. The readout is about 46 units wide on a 489-unit radius.
 */
export function wheelDegreeClearsReadout(deg: number, selectedDeg: number | null): boolean {
  if (selectedDeg == null) return true;
  const d = Math.abs(((deg - selectedDeg + 540) % 360) - 180);
  return d > 4.5;
}

/** "123.46°" — the selected graha's exact longitude as printed on the ring. */
export function formatWheelDegree(deg: number): string {
  const n = ((deg % 360) + 360) % 360;
  return `${n.toFixed(2)}°`;
}

/** Type size, in wheel units, of the selected graha's readout and the scale numbers. */
export const WHEEL_DEGREE_READOUT_SIZE = 9;
export function wheelDegreeNumberSize(step: WheelDegreeStep): number {
  return step === 1 ? 5.5 : step === 5 ? 6.5 : 7.5;
}
