/**
 * Arrowheads drawn as plain triangles. react-native-svg's Android markers crash on some path
 * segments (`ArrayIndexOutOfBoundsException` in `RNSVGMarkerPosition.ExtractPathElementFeatures`
 * for arcs and H/V lines), which took the whole app down on those diagrams, so the learn
 * diagrams draw the head themselves at the same size and place a `markerEnd` put it.
 */

/** Triangle points for a head whose tip is at (x, y), pointing along `angle` (radians). */
export function arrowheadPoints(x: number, y: number, angle: number, length: number, width: number): string {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const bx = x - dx * length;
  const by = y - dy * length;
  const hx = (-dy * width) / 2;
  const hy = (dx * width) / 2;
  return `${x},${y} ${bx + hx},${by + hy} ${bx - hx},${by - hy}`;
}

/**
 * Where a marker of `markerLen` × `markerWidth` units, its tip `tipBeyond` units past `refX`,
 * would sit on a path ending at (x, y) heading along `angle` — markers scale with the stroke.
 */
export function markerArrowhead(
  x: number,
  y: number,
  angle: number,
  strokeWidth: number,
  markerLen: number,
  markerWidth: number,
  tipBeyond: number,
): string {
  const tipX = x + Math.cos(angle) * tipBeyond * strokeWidth;
  const tipY = y + Math.sin(angle) * tipBeyond * strokeWidth;
  return arrowheadPoints(tipX, tipY, angle, markerLen * strokeWidth, markerWidth * strokeWidth);
}

/** End point and heading of a straight `M x y H x2` / `M x y V y2` / `M x y L x2 y2` path. */
export function straightPathEnd(d: string): { x: number; y: number; angle: number } | null {
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number);
  const cmd = d.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!n || n.length < 3) return null;
  const [x0, y0] = n as [number, number];
  let x1 = x0;
  let y1 = y0;
  if (cmd === "MH") x1 = n[2]!;
  else if (cmd === "MV") y1 = n[2]!;
  else if (cmd === "ML" && n.length >= 4) {
    x1 = n[2]!;
    y1 = n[3]!;
  } else return null;
  return { x: x1, y: y1, angle: Math.atan2(y1 - y0, x1 - x0) };
}
