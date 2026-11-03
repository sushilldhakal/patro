import { cn } from "@vedic-patro/design-tokens/cn";
import type { GlyphArt } from "../glyph-art-types";
import { RASHI_GLYPHS } from "../rashi-glyph-art";
import { rashiIconIndex } from "../glyph-lookup";

/* Its own module so the home page's rashifal picker pulls in the rashi glyphs only,
   not the nakshatra ones beside them in ElementGlyphIcon. */
export type GlyphIconProps = {
  name?: string | null;
  number?: number | null;
  size?: number;
  className?: string;
};

export function GlyphSvg({ art, size, className }: { art: GlyphArt; size: number; className?: string }) {
  const [x, y, w, h] = art.vb;
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
      style={{ color: "var(--glyph-color)" }}
    >
      <g
        transform={art.transform}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={art.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {art.paths.map((path, index) => (
          <path key={index} d={path.d} strokeWidth={path.strokeWidth} />
        ))}
      </g>
    </svg>
  );
}

export function RashiGlyphIcon({ name, number, size = 28, className }: GlyphIconProps) {
  const idx = rashiIconIndex(name, number);
  const art = idx == null ? undefined : RASHI_GLYPHS[idx];
  if (!art) return null;
  return <GlyphSvg art={art} size={size} className={className} />;
}
