/**
 * A राशि glyph placed inside a study's SVG — the website's `RashiGlyph`
 * (`rashi-icons.tsx`). The website inlines its own SVG files; the app draws
 * the same twelve signs from the shared glyph art its other राशि icons use.
 */
import { G, Path } from "react-native-svg";
import { RASHI_GLYPHS } from "@vedic-patro/ui/glyph-art";

/** A single राशि glyph, drawn `size` wide and centred at (cx, cy). */
export function RashiGlyph({
  index,
  size,
  cx,
  cy,
  color,
  opacity = 1,
}: {
  index: number;
  size: number;
  cx: number;
  cy: number;
  color: string;
  opacity?: number;
  title?: string;
}) {
  const art = RASHI_GLYPHS[index];
  if (!art) return null;
  const [x, y, w, h] = art.vb;
  const s = size / Math.max(w, h);
  return (
    <G
      transform={`translate(${(cx - (w * s) / 2).toFixed(2)} ${(cy - (h * s) / 2).toFixed(2)}) scale(${s}) translate(${-x} ${-y})`}
      opacity={opacity}
    >
      <G
        transform={art.transform}
        fill={color}
        stroke={color}
        strokeWidth={art.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {art.paths.map((p, i) => (
          <Path key={i} d={p.d} strokeWidth={p.strokeWidth} fill={color} stroke={color} />
        ))}
      </G>
    </G>
  );
}
