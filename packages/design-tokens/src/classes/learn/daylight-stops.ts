import { illustration } from "../../illustration";
import { midnight, wheel } from "../../color";

/** बिहान through मध्यरात, with the website's stop positions (0–1). */
export const DAYLIGHT_STOPS: { at: number; color: string }[] = [
  { at: 0, color: illustration.amber66 },
  { at: 0.14, color: illustration.sky80 },
  { at: 0.28, color: illustration.sky68 },
  { at: 0.4, color: illustration.sky75b },
  { at: 0.5, color: midnight.saffron },
  { at: 0.58, color: illustration.orange54 },
  { at: 0.66, color: illustration.violet33 },
  { at: 0.74, color: illustration.sky19 },
  { at: 0.8, color: illustration.sky70 },
  { at: 0.88, color: midnight.background },
  { at: 0.96, color: wheel.sky2 },
  { at: 1, color: illustration.violet24 },
];

export function daylightGradient(): string {
  return `linear-gradient(90deg,${DAYLIGHT_STOPS.map((stop) => `${stop.color} ${Math.round(stop.at * 100)}%`).join(",")})`;
}
