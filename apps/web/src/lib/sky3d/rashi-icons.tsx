/**
 * Rashi glyphs, indexed 1–12 from Mesha — the same artwork the rest of the app
 * uses, reused as sky labels on the zodiac belt.
 *
 * The native app gets a component per file from the SVG transformer. Vite has
 * no such transform, so the markup is imported raw and injected; the source
 * strokes are `currentColor`, which is why the wrapper only has to set `color`
 * for the glyph to take the belt's gold.
 */

import mesha from "@/assets/rashi/mesha.svg?raw";
import vrishabha from "@/assets/rashi/vrishabha.svg?raw";
import mithuna from "@/assets/rashi/mithuna.svg?raw";
import karkat from "@/assets/rashi/karkat.svg?raw";
import simha from "@/assets/rashi/simha.svg?raw";
import kanya from "@/assets/rashi/kanya.svg?raw";
import thula from "@/assets/rashi/thula.svg?raw";
import vrushika from "@/assets/rashi/vrushika.svg?raw";
import dhanu from "@/assets/rashi/dhanu.svg?raw";
import makara from "@/assets/rashi/makara.svg?raw";
import kumbha from "@/assets/rashi/kumbha.svg?raw";
import meena from "@/assets/rashi/meena.svg?raw";

/**
 * The files carry `width="24" height="24"`, which would pin every glyph to 24px
 * however large the label wants to be. Dropping both lets the viewBox scale to
 * whatever box the wrapper gives it.
 */
const fluid = (raw: string) =>
  raw
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/<svg([^>]*)>/, (_m, attrs: string) =>
      `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, "")} width="100%" height="100%">`,
    );

/** Index 0 is Mesha; read through {@link RashiSkyGlyph} rather than directly. */
const RASHI_ICONS: string[] = [
  mesha,
  vrishabha,
  mithuna,
  karkat,
  simha,
  kanya,
  thula,
  vrushika,
  dhanu,
  makara,
  kumbha,
  meena,
].map(fluid);

/** A single rashi glyph at `size` px, taking its colour from `color`. */
export function RashiSkyGlyph({
  index,
  size,
  color,
}: {
  /** 1–12 from Mesha. */
  index: number;
  size: number;
  color: string;
}) {
  const svg = RASHI_ICONS[index - 1];
  if (!svg) return null;
  return (
    <span
      aria-hidden
      style={{ display: "block", width: size, height: size, color }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
