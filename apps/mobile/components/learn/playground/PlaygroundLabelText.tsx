/**
 * One projected name over a playground canvas.
 *
 * Shared by both 3D studies, because the rule for how a belt name is drawn —
 * which colour, which glyph, how it is centred on an anchor it must not cover —
 * is the same in each and worth having in one place. The scenes differ in what
 * they *project*; they should not differ in how it looks.
 *
 * Memoised on the label's own fields, because a collecting pass replaces the
 * whole list and most entries have not changed since the last one.
 *
 * The glyph is drawn only for the division the body is actually standing in.
 * The web draws one beside every name, which it can afford — there the labels
 * are DOM nodes that never re-render. Here a pass is a React render of every
 * label, and twenty-seven नक्षत्र SVGs inside that is the difference between a
 * smooth transport row and a stuttering one. The undimmed one is the only glyph
 * carrying information anyway: it says where the Sun or the Moon is.
 */

import { memo } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import {
  NakshatraGlyphIcon,
  RashiGlyphIcon,
} from "@/components/panchanga/element/ElementGlyphIcon";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { PlaygroundLabel } from "@/components/learn/playground/playground-labels";

import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
/** The three day-clocks' colours, and the belts'. */
export const LABEL_TONE = {
  sidereal: illustration.sky69,
  solar: illustration.amber60b,
  mean: illustration.red68,
} as const;

export const LABEL_GOLD = illustration.amber57;

function labelColor(label: PlaygroundLabel): string {
  if (label.tone) return LABEL_TONE[label.tone];
  switch (label.kind) {
    case "rashi":
      return LABEL_GOLD;
    case "nakshatra":
      return illustration.sky70;
    case "month":
      return illustration.amber77b;
    default:
      /* Bodies are white, except the two shadow grahas, which carry the colours
         they are drawn in so a name and its marker match. */
      return label.id === "b-rahu" ? illustration.blue85 : label.id === "b-ketu" ? illustration.red71b : neutral.white;
  }
}

export const PlaygroundLabelText = memo(function PlaygroundLabelText({
  label,
}: {
  label: PlaygroundLabel;
}) {
  const glyph =
    label.dim || label.index == null ? null : label.kind === "rashi" ? (
      <RashiGlyphIcon number={label.index} size={13} />
    ) : label.kind === "nakshatra" ? (
      <NakshatraGlyphIcon number={label.index} size={15} />
    ) : null;

  return (
    <View
      pointerEvents="none"
      className="absolute items-center"
      style={{
        left: label.x,
        top: label.y,
        /* Centred on the anchor without measuring: the box is free to overflow
           its own origin, and it is lifted by half a line so the text does not
           cover the point it names. */
        transform: [{ translateX: -45 }, { translateY: -8 }],
        width: 90,
        opacity: label.dim ? 0.45 : 1,
      }}
    >
      {glyph}
      <Text
        numberOfLines={1}
        className="text-caption font-semibold"
        style={[
          nepaliTextStyle(10),
          {
            color: labelColor(label),
            textAlign: "center",
            textShadowColor: withAlpha(neutral.black, 0.95),
            textShadowRadius: 3,
          },
        ]}
      >
        {label.text}
      </Text>
    </View>
  );
});

export default PlaygroundLabelText;
