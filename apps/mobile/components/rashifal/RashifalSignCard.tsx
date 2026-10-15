import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import { RashifalSignCard as Shared } from "@vedic-patro/ui/kit/jyotish";

/** Binds the shared card to the rashi glyph. Home still imports this path. */
export function RashifalSignCard(props: { sign: RashifalSignBlock; period: RashifalPeriod; taraLine?: string }) {
  return <Shared {...props} renderGlyph={(glyph) => <RashiGlyphIcon name={glyph.name} number={glyph.number} size={36} />} />;
}
