/** Shared by apps/web/src/components/kundali/ShadbalaChart.tsx and apps/mobile/components/kundali/ShadbalaChart.tsx (moved here from both, unchanged). */
import type { ShadbalaPlanet } from "@vedic-patro/api-client";
import { BALA_STACK } from "./shadbala-display";

export type ShadbalaScale = "virupas" | "rupas" | "absolute" | "required";

export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}

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

export function formatScaleValue(value: number, scale: ShadbalaScale, digits: (v: string | number) => string): string {
  if (scale === "required" || scale === "absolute") return `${digits(Math.round(value))}%`;
  return digits(value >= 100 ? value.toFixed(0) : value.toFixed(1));
}

export function fmt(value: number | undefined, digits: (v: string | number) => string, places = 2): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(places);
  const signed = value < 0 ? `−${abs}` : abs;
  return digits(signed);
}
