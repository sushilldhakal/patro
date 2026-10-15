/**
 * The data behind both apps' `components/vastu/VastuCompassRing.tsx` — the
 * compass ring around the zoning sketch: its band radii, the 32 padas and 16
 * directions with their colours, codes and titles, and the 360 degree ticks
 * with their labels. Each app draws the SVG.
 */
import {
  VASTU_DIR16,
  VASTU_ELEMENT_COLOR,
  VASTU_PADAS,
  evenBearings,
  vastuElementAtBearing,
  vastuWheelPoint,
} from "@vedic-patro/domain/vastu";
import { RING_SIZE, R_HOUSE } from "@vedic-patro/domain/vastu-ring";
import { useLocale } from "@vedic-patro/i18n/react";

const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
// Single-line bands, thinner than the wheel's, leave most of the radius for the house.
const R_DEG_OUTER = 306;
const R_DEG_INNER = 290;
const R_16_OUTER = R_DEG_INNER;
const R_16_INNER = 264;
const R_PADA_OUTER = R_16_INNER;
const R_PADA_INNER = 236;

/** Ring geometry, in the ring's own RING_SIZE viewBox. */
export const VASTU_COMPASS_RING = {
  size: RING_SIZE,
  cx: CX,
  cy: CY,
  rDegOuter: R_DEG_OUTER,
  rDegInner: R_DEG_INNER,
  r16Outer: R_16_OUTER,
  r16Inner: R_16_INNER,
  rPadaOuter: R_PADA_OUTER,
  rPadaInner: R_PADA_INNER,
  rHouse: R_HOUSE,
  degLabelR: (R_DEG_OUTER + R_DEG_INNER) / 2,
  dir16LabelR: (R_16_OUTER + R_16_INNER) / 2,
  padaLabelR: (R_PADA_OUTER + R_PADA_INNER) / 2,
  dir16Boundaries: evenBearings(16, 11.25),
  padaBoundaries: evenBearings(32, 0),
  /** The circles between bands. */
  dividers: [R_DEG_OUTER, R_DEG_INNER, R_16_INNER, R_PADA_INNER],
  purushaOpacity: 0.16,
  /** Matches VastuPurushaWheel's own PURUSHA_SIZE formula, sized to R_HOUSE. */
  purushaSize: Math.round(R_HOUSE * Math.SQRT2 * 0.82),
} as const;

/** The 360 degree ticks (labels added per locale in the hook). */
const TICKS = Array.from({ length: 360 }, (_, bearing) => {
  const every10 = bearing % 10 === 0;
  const every5 = bearing % 5 === 0;
  const cardinal = bearing % 90 === 0;
  const tickInner = every10 ? R_DEG_INNER : every5 ? R_DEG_INNER + 4 : R_DEG_OUTER - 5;
  return {
    bearing,
    labelled: every10,
    inner: vastuWheelPoint(bearing, tickInner, CX, CY),
    outer: vastuWheelPoint(bearing, R_DEG_OUTER, CX, CY),
    opacity: cardinal ? 0.9 : every10 ? 0.7 : every5 ? 0.5 : 0.28,
    width: cardinal ? 1.3 : every10 ? 0.8 : every5 ? 0.42 : 0.26,
  };
});

export function useVastuCompassRing() {
  const { t, digits } = useLocale();
  return {
    padas: VASTU_PADAS.map((pada) => {
      const code = `${pada.wall}${digits(pada.index)}`;
      return {
        id: pada.id,
        bearing: pada.bearing,
        status: pada.status,
        color: VASTU_ELEMENT_COLOR[pada.element],
        code,
        title: `${code} · ${t(`vastu.pada.${pada.id}.name`)} · ${t(`vastu.wheel.status.${pada.status}`)}`,
      };
    }),
    dirs: VASTU_DIR16.map((dir) => ({
      id: dir.id,
      bearing: dir.bearing,
      abbr: dir.abbr,
      color: VASTU_ELEMENT_COLOR[vastuElementAtBearing(dir.bearing)],
      title: t(`vastu.dir16.${dir.id}.name`),
    })),
    ticks: TICKS.map((tick) => ({ ...tick, label: tick.labelled ? digits(tick.bearing) : null })),
  };
}
