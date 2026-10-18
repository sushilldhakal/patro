/** Shared by apps/web/src/components/panchanga/use-panchanga-mode.ts and apps/mobile/components/panchanga/use-panchanga-mode.ts (moved here from both, unchanged). */
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function defaultClockForTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "12";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return formatClockParts(Number(h) % 24, Number(m));
}

export function formatClockParts(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}
