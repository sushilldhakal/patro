/** Shared by apps/web/src/components/sky3d/SkyTimeSheet.tsx and apps/mobile/components/sky3d/SkyTimeSheet.tsx (moved here from both, unchanged). */
export const DAY_PERIODS = [
  { id: "morning", at: 6, ne: "बिहान", en: "Morning" },
  { id: "afternoon", at: 30, ne: "दिउँसो", en: "Afternoon" },
  { id: "evening", at: 52, ne: "सन्ध्या", en: "Evening" },
  { id: "moonlight", at: 74, ne: "जूनकिरण", en: "Moonlight" },
  { id: "midnight", at: 92, ne: "मध्यरात", en: "Midnight" },
] as const;

export type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function wallPartsFromMs(timeMs: number, zoneOffsetMs: number): WallParts {
  const local = new Date(timeMs + zoneOffsetMs);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
}

export function wallCivilUtc(p: WallParts): Date {
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function periodIdAtHour(hour: number): (typeof DAY_PERIODS)[number]["id"] {
  if (hour >= 4 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "evening";
  if (hour >= 19) return "moonlight";
  return "midnight";
}
