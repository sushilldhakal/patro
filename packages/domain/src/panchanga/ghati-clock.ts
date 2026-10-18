/** Shared by apps/web/src/components/panchanga/GhatiClock.tsx and apps/mobile/components/panchanga/GhatiClock.tsx (moved here from both, unchanged). */
export function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
