import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { RashifalPersonal } from "@/lib/api";
import { RashifalPersonalCard as Shared } from "@vedic-patro/ui/kit/jyotish";

/** Binds the shared card to the rashi glyph. Home still imports this path. */
export function RashifalPersonalCard(props: { name: string; personal: RashifalPersonal }) {
  return <Shared {...props} renderGlyph={(glyph) => <RashiGlyphIcon name={glyph.name} number={glyph.number} size={36} className="shrink-0" />} />;
}
