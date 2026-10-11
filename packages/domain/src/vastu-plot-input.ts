/** Plot dimension input parsing, shared by both apps' Vastu plot planner (moved here from both, unchanged). */
export function parseDimension(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
