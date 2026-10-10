/** Shared North-Indian kundali geometry (300×300 viewBox). */

export type Point = [number, number];

/** House polygons — counter-clockwise from top-center diamond. */
export const NI_HOUSE_POLYGONS: Record<number, Point[]> = {
  1: [[150, 0], [225, 75], [150, 150], [75, 75]],
  2: [[0, 0], [150, 0], [75, 75]],
  3: [[0, 0], [75, 75], [0, 150]],
  4: [[0, 150], [75, 75], [150, 150], [75, 225]],
  5: [[0, 150], [75, 225], [0, 300]],
  6: [[0, 300], [75, 225], [150, 300]],
  7: [[150, 300], [75, 225], [150, 150], [225, 225]],
  8: [[150, 300], [225, 225], [300, 300]],
  9: [[225, 225], [300, 300], [300, 150]],
  10: [[300, 150], [225, 225], [150, 150], [225, 75]],
  11: [[300, 150], [225, 75], [300, 0]],
  12: [[225, 75], [300, 0], [150, 0]],
};

/**
 * Fixed rāśi → house slot on a North-Indian गोचर कुण्डली (Surya-patro convention).
 * मेष at top-right corner, मीन at right-center, मिथुन at top-center, etc.
 */
export const GOCHAR_RASHI_TO_HOUSE: Record<number, number> = {
  1: 11,
  2: 12,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9,
  12: 10,
};

export function polygonCentroid(points: Point[]): Point {
  const n = points.length;
  const sum = points.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}

export function pointsToSvg(points: Point[]): string {
  return points.map((p) => p.join(",")).join(" ");
}

function polygonBounds(points: Point[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export interface HouseGridLayout {
  /** Planet abbreviations per row (last row may hold fewer). */
  columns: number;
  rows: number;
  /** px — shrinks as more planets need to fit. */
  fontSize: number;
  /** Horizontal distance between column centers, px. */
  colGap: number;
  /** Vertical distance between row baselines, px. */
  rowGap: number;
}

/**
 * Row-first grid for the planet abbreviations inside one house, sized to
 * that house's own polygon shape. A crowded house wraps to more rows and
 * shrinks its font instead of stacking planets past the polygon edge (or
 * off the SVG canvas) where they'd be clipped and invisible.
 */
export function planetGridLayout(points: Point[], count: number): HouseGridLayout {
  if (count <= 0) return { columns: 0, rows: 0, fontSize: 13, colGap: 0, rowGap: 0 };

  const { width, height } = polygonBounds(points);
  const isKite = Math.abs(width - height) < 1; // houses 1,4,7,10: square bounding box
  const isWide = width > height; // e.g. houses 2,6,8,12: wide-short triangles

  // Conservative usable box for planet text below the rashi label — kites
  // have the most room; narrow triangles trade width for height and vice
  // versa, so favouring the right number of columns per shape matters more
  // than an exact polygon-inscribed fit.
  const safeWidth = width * (isKite ? 0.62 : 0.55);
  const safeHeight = isKite ? 85 : isWide ? 40 : 100;

  const idealColumns = isKite ? 3 : isWide ? 3 : 2;
  const columns = Math.min(count, idealColumns);
  const rows = Math.ceil(count / columns);

  const PITCH_RATIO = 1.3; // label pitch ≈ 1.3 × font size, incl. gap
  const fontFromWidth = safeWidth / columns / PITCH_RATIO;
  const fontFromHeight = safeHeight / rows / PITCH_RATIO;
  const fontSize = Math.max(7, Math.min(13, fontFromWidth, fontFromHeight));

  return {
    columns,
    rows,
    fontSize,
    colGap: fontSize * PITCH_RATIO,
    rowGap: fontSize * PITCH_RATIO,
  };
}
