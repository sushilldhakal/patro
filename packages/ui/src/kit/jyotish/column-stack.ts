/** Rectangles for one stacked column, in a 0–100 viewBox. Segments are bottom-first. */
export function columnStack(
  segments: readonly { key: string; pct: number; color: string }[],
): { key: string; y: number; height: number; color: string }[] {
  let y = 100;
  return segments.map((segment) => {
    const height = segment.pct;
    y -= height;
    return { key: segment.key, y, height, color: segment.color };
  });
}
