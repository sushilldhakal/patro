/**
 * Shared राशि glyphs — Noun Project icons (attribution stripped) in मेष→मीन order.
 * The source paths carry no `fill`, so `fill` set on the wrapping <g> is inherited
 * and the glyphs theme correctly in light / dark.
 */
import ariesRaw from "@/assets/rashi/noun-aries-195538.svg?raw";
import taurusRaw from "@/assets/rashi/noun-taurus-195543.svg?raw";
import geminiRaw from "@/assets/rashi/noun-gemini-195537.svg?raw";
import cancerRaw from "@/assets/rashi/noun-cancer-195542.svg?raw";
import leoRaw from "@/assets/rashi/noun-leo-195541.svg?raw";
import virgoRaw from "@/assets/rashi/noun-virgo-195536.svg?raw";
import libraRaw from "@/assets/rashi/noun-libra-195539.svg?raw";
import scorpioRaw from "@/assets/rashi/noun-scorpio-195535.svg?raw";
import sagittariusRaw from "@/assets/rashi/noun-sagittarius-195540.svg?raw";
import capricornRaw from "@/assets/rashi/noun-capricorn-195534.svg?raw";
import aquariusRaw from "@/assets/rashi/noun-aquarius-195533.svg?raw";
import piscesRaw from "@/assets/rashi/noun-pisces-195544.svg?raw";

const innerSvg = (raw: string) =>
  raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/** inner SVG markup of each glyph (source viewBox is 0 0 100 100). */
const RASHI_ICON: string[] = [
  ariesRaw, taurusRaw, geminiRaw, cancerRaw, leoRaw, virgoRaw,
  libraRaw, scorpioRaw, sagittariusRaw, capricornRaw, aquariusRaw, piscesRaw,
].map(innerSvg);

/** A single राशि glyph, drawn `size` px wide and centred at (cx, cy). */
export function RashiGlyph({
  index,
  size,
  cx,
  cy,
  color,
  opacity = 1,
  title,
}: {
  index: number;
  size: number;
  cx: number;
  cy: number;
  color: string;
  opacity?: number;
  title?: string;
}) {
  return (
    <g
      transform={`translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${size / 100})`}
      fill={color}
      opacity={opacity}
      dangerouslySetInnerHTML={{
        __html: `${title ? `<title>${title}</title>` : ""}${RASHI_ICON[index] ?? ""}`,
      }}
    />
  );
}
