import type { PanchangaDay } from "@/lib/api";
import { getPanchangaDetail, getSunrise, toNepaliDigits } from "@/lib/panchanga-format";

export const CHOGHADIYA_EN: Record<string, string> = {
  उद्वेग: "Udvega",
  चर: "Chara",
  लाभ: "Labha",
  अमृत: "Amrita",
  काल: "Kala",
  शुभ: "Shubha",
  रोग: "Roga",
};

export type ChoghadiyaSegment = {
  name: string;
  startG: number;
  endG: number;
  bad?: boolean;
};

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function getChoghadiyaSegments(p: PanchangaDay): ChoghadiyaSegment[] {
  const detail = getPanchangaDetail(p);
  // `getPanchangaDetail`'s return type is loosened to `Record<string, unknown>`
  // on the web build (`panchanga-format.web.ts`) — this app's own tsconfig
  // `moduleSuffixes` makes bare `tsc` resolve that variant even here, so the
  // field this app actually cares about is named back to its real shape.
  const segments = detail?.choghadiya as NonNullable<PanchangaDay["detail"]>["choghadiya"];
  if (!segments?.length) return [];
  return segments.map((c) => ({
    name: c.name_ne,
    startG: c.start_g,
    endG: c.end_g,
    bad: Boolean(c.bad),
  }));
}

export function choghadiyaTone(name: string, bad?: boolean): "bad" | "good" | "neutral" {
  if (bad) return "bad";
  if (name === "लाभ" || name === "अमृत" || name === "शुभ") return "good";
  return "neutral";
}

export function choghadiyaQuality(name: string, bad?: boolean): "शुभ" | "अशुभ" | "सामान्य" {
  const tone = choghadiyaTone(name, bad);
  if (tone === "good") return "शुभ";
  if (tone === "bad") return "अशुभ";
  return "सामान्य";
}

export function ghatiToCivilClockLabel(g: number, sunriseMin: number): string {
  const totalMin = sunriseMin + g * 24;
  let h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h > 24) h = ((h - 1) % 24) + 1;
  return toNepaliDigits(`${h}:${String(m).padStart(2, "0")}`);
}

export function getSunriseMinutes(p: PanchangaDay): number | null {
  return parseTimeToMinutes(getSunrise(p));
}
