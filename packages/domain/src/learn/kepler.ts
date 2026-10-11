/** Shared by apps/web/src/components/learn/sun-earth-moon-math.ts and apps/mobile/lib/learn/sun-earth-moon-math.ts (moved here from both, unchanged). */
export function eccentricAnomaly(Mrad: number, e: number): number {
  let E = Mrad;
  for (let i = 0; i < 10; i++) E = Mrad + e * Math.sin(E);
  return E;
}
