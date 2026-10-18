/** Shared by apps/web/src/lib/compass-heading.ts and apps/mobile/lib/compass-heading.ts (moved here from both, unchanged). */
/** Shortest-path blend so 359° → 1° does not swing the long way. */
export function dampHeading(prev: number, next: number, k = 0.28): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return (prev + delta * k + 360) % 360;
}
