import type { GlyphArt } from "@/lib/wheel-glyph-art";

/**
 * Draw a glyph centred on (cx, cy), scaled to fit a `size`-square box.
 */
export function WheelGlyph({
  art,
  size,
  cx,
  cy,
  className,
  opacity = 1,
  title,
}: {
  art: GlyphArt | undefined;
  size: number;
  cx: number;
  cy: number;
  className?: string;
  opacity?: number;
  title?: string;
}) {
  if (!art) return null;
  const [minX, minY, w, h] = art.vb;
  const scale = size / Math.max(w, h);
  const tx = cx - (minX + w / 2) * scale;
  const ty = cy - (minY + h / 2) * scale;
  return (
    <g
      transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`}
      className={className}
      opacity={opacity}
      dangerouslySetInnerHTML={{
        __html: `${title ? `<title>${title}</title>` : ""}${art.inner}`,
      }}
    />
  );
}
