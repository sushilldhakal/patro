/**
 * Lists of cards fill the row instead of stacking one per line: 1 column on the very smallest phones,
 * 2 on phones (`phone`, 340px), 3 on iPad portrait (`md`), 4 on iPad landscape and desktop (`lg`).
 * The app's `<Grid cards>` (packages/ui) follows the same steps, measured on the grid's own width.
 * Add the gap (and anything else) beside it: `cn(cardGrid, "gap-4")`.
 */
export const cardGrid = "grid grid-cols-1 phone:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

/** The same columns without `grid`, for a box that already sets it. */
export const cardGridCols = "grid-cols-1 phone:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
