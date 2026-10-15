/** The flat Earth-spin figure: one set of positions for both SVG drawings. */
export const EARTH_ROT_W = 640;
export const EARTH_ROT_H = 220;
export const EARTH_ROT_R = 124;
export const EARTH_ROT_TILT = 23.5;
export const EARTH_ROT_GLOW_PAD = 10;

const cx = EARTH_ROT_W / 2;
const cy = EARTH_ROT_H / 2 + 8;

export const earthRotation = {
  cx,
  cy,
  west: { x: 72, y: cy - 4 },
  east: { x: EARTH_ROT_W - 72, y: cy - 4 },
  axis: { x1: 100, y1: cy, x2: EARTH_ROT_W - 100, y2: cy },
  pole: { x1: cx, y1: cy - EARTH_ROT_R - 6, x2: cx, y2: cy + EARTH_ROT_R + 6 },
  curve: `M ${cx - 38} ${cy + 44} A 46 46 0 1 1 ${cx + 38} ${cy + 44}`,
  label: { x: cx, y: cy + 72 },
};
