import type { ViewStyle } from "react-native";

/**
 * Wrap grids (`flex-row flex-wrap`) whose rows are always full.
 *
 * - Never fewer than `minCols` per row (2 by default), more when cells of at
 *   least `minCell` px fit.
 * - Cells get a flex basis just under their share and grow to fill the row, so
 *   rounding never pushes the second cell onto its own line (one cell per row
 *   with a blank side), and a short last row stretches instead of leaving an
 *   empty slot.
 */
export function fillGridColumns(
  rowWidth: number,
  minCell: number,
  gap: number,
  minCols = 2,
  maxCols = 6,
): number {
  if (rowWidth <= 0) return minCols;
  const fit = Math.floor((rowWidth + gap) / (minCell + gap));
  return Math.max(minCols, Math.min(maxCols, fit));
}

/** Style for one cell of a `cols`-wide wrap grid in a row `rowWidth` px wide. */
export function fillGridCell(rowWidth: number, cols: number, gap: number): ViewStyle {
  if (rowWidth <= 0) {
    // Before layout: percentage basis, still `cols` per row.
    return { flexBasis: `${Math.floor(100 / cols) - 4}%`, flexGrow: 1, minWidth: 0 };
  }
  const share = (rowWidth - gap * (cols - 1)) / cols;
  return { flexBasis: Math.max(0, Math.floor(share) - 1), flexGrow: 1, flexShrink: 1, minWidth: 0 };
}
