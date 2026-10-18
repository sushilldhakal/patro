import type { ShadbalaPlanet } from "@vedic-patro/api-client";
import { BALA_STACK } from "./shadbala-display";
import { type ShadbalaScale, niceCeil } from "@vedic-patro/domain/kundali/shadbala-chart";

export * from "@vedic-patro/domain/kundali/shadbala-chart";

export function positiveSum(planet: ShadbalaPlanet): number {
  return BALA_STACK.reduce((sum, bala) => sum + Math.max(0, planet.breakdown[bala.breakdownKey]), 0);
}

export function yMaxFor(planets: ShadbalaPlanet[], scale: ShadbalaScale): number {
  if (scale === "absolute") return 100;
  if (scale === "required") {
    const peak = Math.max(...planets.map((planet) => (planet.total_virupas / Math.max(planet.required, 1)) * 100), 100);
    return niceCeil(peak * 1.08);
  }
  if (scale === "rupas") {
    const peak = Math.max(...planets.map((planet) => Math.max(planet.rupas, planet.required / 60)));
    return niceCeil(peak * 1.12);
  }
  const peak = Math.max(...planets.map((planet) => Math.max(planet.total_virupas, planet.required)));
  return niceCeil(peak * 1.12);
}

export function displayTotal(planet: ShadbalaPlanet, scale: ShadbalaScale): number {
  if (scale === "rupas") return planet.rupas;
  if (scale === "required") return (planet.total_virupas / Math.max(planet.required, 1)) * 100;
  if (scale === "absolute") return 100;
  return planet.total_virupas;
}

export function displayRequired(planet: ShadbalaPlanet, scale: ShadbalaScale): number | null {
  if (scale === "absolute") return null;
  if (scale === "rupas") return planet.required / 60;
  if (scale === "required") return 100;
  return planet.required;
}

export function segmentDisplay(raw: number, planet: ShadbalaPlanet, scale: ShadbalaScale): number {
  const positive = Math.max(0, raw);
  if (scale === "rupas") return positive / 60;
  if (scale === "required") return (positive / Math.max(planet.required, 1)) * 100;
  if (scale === "absolute") {
    const sum = positiveSum(planet);
    return sum > 0 ? (positive / sum) * 100 : 0;
  }
  return positive;
}
