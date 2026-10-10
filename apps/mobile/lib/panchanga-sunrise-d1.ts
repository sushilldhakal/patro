import type { PanchangaDay } from "@/lib/api";
import { buildBhavaChart, type BhavaHouse } from "@/lib/bhava";
import type { GrahaKey } from "@/lib/graha-details";
import {
  getInstantLagna,
  getPlanetRows,
  rashiNeFromNumber,
  resolveLagnaSiderealLongitude,
} from "./panchanga-format";

function lagnaRashiNumber(p: PanchangaDay): number | undefined {
  const lagna = getInstantLagna(p);
  if (!lagna) return undefined;
  const longitude = resolveLagnaSiderealLongitude(lagna);
  if (longitude != null) {
    return Math.floor((((longitude % 360) + 360) % 360) / 30) + 1;
  }
  if (lagna.number != null && lagna.number >= 1 && lagna.number <= 12) return lagna.number;
  return undefined;
}

/** Whole-sign D1 (rāśi) chart for the page's selected date/time. */
export function buildPanchangaD1Houses(p: PanchangaDay | null | undefined): BhavaHouse[] | null {
  if (!p) return null;

  const lagnaRashi = lagnaRashiNumber(p);
  if (!lagnaRashi) return null;

  const planetRashis = getPlanetRows(p).flatMap((row) => {
    if (row.siderealLongitude == null) return [];
    const rashi =
      Math.floor((((row.siderealLongitude % 360) + 360) % 360) / 30) + 1;
    if (rashi < 1 || rashi > 12) return [];
    return [
      {
        key: row.key as GrahaKey,
        labelNe: row.label,
        rashi,
        isRetrograde: row.isRetrograde,
        isCombust: row.isCombust,
      },
    ];
  });

  if (!planetRashis.length) return null;
  return buildBhavaChart(lagnaRashi, planetRashis, rashiNeFromNumber);
}

/** @deprecated Use buildPanchangaD1Houses */
export const buildSunriseD1Houses = buildPanchangaD1Houses;
