/** Browse-year/month URL parameters, shared by the website and the app's browse hooks (moved here from both, unchanged). */
import type { Era } from "./era";
import { getCurrentBs } from "./bs-calendar";

export function positiveInt(y: number): number {
  const t = Math.trunc(y);
  return t >= 1 ? t : 1;
}

export function positiveMonth(m: number): number {
  const t = Math.trunc(m);
  if (t < 1) return 1;
  if (t > 12) return 12;
  return t;
}

export function defaultBrowseYear(era: Era): number {
  if (era === "bs" || era === "bbs") return getCurrentBs().year;
  return new Date().getFullYear();
}
