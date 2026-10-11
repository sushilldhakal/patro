/** Shared by apps/web/src/components/learn/TwoSystemsStudy.tsx and apps/mobile/components/learn/playground/TwoSystemsStudy.tsx (moved here from both, unchanged). */
export function clampPitch(p: number) {
  /* North of the ecliptic only — from the south side the zodiac runs backwards
     and every rashi reads in reverse order, which is never worth showing. */
  return Math.min(1.45, Math.max(0.12, p));
}
