/** Parashari divisional (varga) signs: `jyotish::vargas` in apps/rust (`vargas.py`). */
import { pyFloorDiv, pyInt, pyMod } from "../../panchanga/engine/py";

export const VARGA_DIVISIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60];
const idx = (x: number) => Math.max(0, pyInt(x));
const part = (d: number, step: number) => idx(pyFloorDiv(d, step));
const partN = (d: number, n: number) => idx(Math.floor(d / (30 / n)));
const byModality = (sign: number, starts: [number, number, number]) => starts[sign % 3];

/** The 1-based sign a longitude falls in for a division (D1 … D60). */
export function vargaRashi(division: number, longitude: number): number {
  const lon = pyMod(longitude, 360);
  const s = idx(pyFloorDiv(lon, 30)) % 12;
  const d = pyMod(lon, 30);
  const odd = s % 2 === 0; // an odd sign is an even 0-based index
  const from = (start: number, p: number) => ((start + p) % 12) + 1;
  switch (division) {
    case 2: return odd === d < 15 ? 5 : 4;
    case 3: return ((s + part(d, 10) * 4) % 12) + 1;
    case 4: return ((s + 3 * part(d, 7.5)) % 12) + 1;
    case 5: return from(odd ? 0 : 6, part(d, 6));
    case 6: return from(s, part(d, 5));
    case 7: return from(odd ? s : (s + 6) % 12, partN(d, 7));
    case 8: return from(byModality(s, [0, 4, 8]), part(d, 3.75));
    case 9: return (idx((lon * 9) / 30) % 12) + 1;
    case 10: return from(odd ? s : (s + 8) % 12, part(d, 3));
    case 11: return from(odd ? 0 : 6, partN(d, 11));
    case 12: return from(s, part(d, 2.5));
    case 16: return from(byModality(s, [0, 4, 8]), partN(d, 16));
    case 20: return from(byModality(s, [0, 8, 4]), part(d, 1.5));
    case 24: return from(odd ? 4 : 3, part(d, 1.25));
    case 27: return from([0, 3, 6, 9][s % 4], partN(d, 27));
    case 30: return trimshamsha(s, d);
    case 40: return from(odd ? 0 : 6, part(d, 0.75));
    case 45: return from(byModality(s, [0, 4, 8]), partN(d, 45));
    case 60: return from(s, part(d, 0.5));
    default: return s + 1;
  }
}

function trimshamsha(sign: number, d: number): number {
  if (sign % 2 === 0) return d < 5 ? 1 : d < 10 ? 11 : d < 18 ? 9 : d < 25 ? 3 : 7;
  return d < 5 ? 2 : d < 12 ? 6 : d < 18 ? 12 : d < 25 ? 10 : 8;
}
