import { WHEEL_SIZE } from "@/components/vastu/VastuPurushaWheel";

/**
 * Geometry shared between the compass ring and whatever is drawn inside it.
 *
 * Lives here rather than in `VastuCompassRing.tsx` so that file exports only
 * a component (react-refresh needs that to hot-reload it), and because the
 * caller positioning an overlay inside the ring needs the same numbers the
 * ring itself is laid out with — duplicating them is how the plan and its
 * ring drift apart.
 *
 * RING_SIZE must equal WHEEL_SIZE: `ArcLabel`/`PadaCodeLabel`/
 * `RingSeparators` close over the wheel's own centre rather than taking it as
 * a prop, so the ring has to share that exact centre, not merely its size.
 */
export const RING_SIZE = WHEEL_SIZE;

/** Everything inside this radius is the house — kept clear of the ring bands. */
export const R_HOUSE = 230;

/** Metres of clearance left inside R_HOUSE so the plot never touches the pada ring. */
const HOUSE_MARGIN_M = 0.35;

/**
 * The plot's box inscribed in the R_HOUSE circle, keeping the plot's own
 * aspect. Returned as percentages of RING_SIZE so an HTML overlay can be
 * positioned over the SVG without repeating this arithmetic.
 */
export function houseBoxInRing(
  width: number,
  height: number,
): { widthPct: number; heightPct: number } {
  const diag = Math.hypot(width + HOUSE_MARGIN_M * 2, height + HOUSE_MARGIN_M * 2);
  const scale = (2 * R_HOUSE * 0.97) / diag;
  return {
    widthPct: (width * scale * 100) / RING_SIZE,
    heightPct: (height * scale * 100) / RING_SIZE,
  };
}
