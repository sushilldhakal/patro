/**
 * The data behind both apps' `components/sky3d/CompassControl.tsx`: the
 * dial's size, and where each cardinal letter and in-between dot sits on its
 * ring for the current heading (each walks around the circle on its own so
 * the letters stay upright). Each app draws the dial and handles the drag.
 */
import { bilingualText } from "@vedic-patro/domain/locale";
import { COMPASS_POINTS } from "@vedic-patro/domain/astronomy/sky3d/sky-geometry";
import { useLocale } from "@vedic-patro/i18n/react";

export const COMPASS_DIAL_SIZE = 64;
const RADIUS = COMPASS_DIAL_SIZE / 2;
/** Letters and dots share one ring, inside the rim and clear of the centre glyph. */
const RING_RADIUS = RADIUS - 12;
const POINTS = COMPASS_POINTS.filter((p) => p.major);
/** NE/SE/SW/NW carry no label — just the dot between two cardinals. */
const DOTS = COMPASS_POINTS.filter((p) => !p.major);

function onRing(az: number, heading: number) {
  const a = ((az - heading) * Math.PI) / 180;
  return { x: RADIUS + RING_RADIUS * Math.sin(a), y: RADIUS - RING_RADIUS * Math.cos(a) };
}

export function useCompassDial(heading: number) {
  const { lang } = useLocale();
  return {
    size: COMPASS_DIAL_SIZE,
    radius: RADIUS,
    /** Centres, in dial pixels. */
    dots: DOTS.map((p) => ({ az: p.az, ...onRing(p.az, heading) })),
    points: POINTS.map((p) => ({
      az: p.az,
      north: p.az === 0,
      label: bilingualText(lang, p.ne, p.en),
      ...onRing(p.az, heading),
    })),
  };
}
