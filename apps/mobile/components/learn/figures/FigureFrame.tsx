/**
 * The frame of a still Learn figure, as the website draws one: the SVG at the
 * article's width, then a small muted caption (`<figure>` + `<figcaption>`).
 *
 * `currentColor` in a figure is the article's ink, as it is on the website,
 * and text without a face of its own gets the app's Devanagari face.
 */
import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { G } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { STUDY_FONT, useStudyInk } from "@/components/learn/study/study-ink";

export function FigureFrame({
  w,
  h,
  label,
  caption,
  maxWidth,
  fitScreen,
  children,
}: {
  w: number;
  h: number;
  label: string;
  caption?: ReactNode;
  /** The website's `max-w-[…]` on the svg, in points. */
  maxWidth?: number;
  /** Keep a square wheel within the screen's height (the website's `wheelFitScreen`). */
  fitScreen?: boolean;
  children: ReactNode;
}) {
  const ink = useStudyInk();
  const { height } = useWindowDimensions();
  const limit = Math.min(maxWidth ?? Infinity, fitScreen ? Math.max(260, height * 0.62) : Infinity);
  return (
    <View className="my-4 w-full">
      <View
        className="w-full self-center"
        style={[{ aspectRatio: w / h }, Number.isFinite(limit) ? { maxWidth: limit } : null]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" color={ink.ink}>
          <G fontFamily={STUDY_FONT.regular}>{children}</G>
        </Svg>
      </View>
      {caption ? (
        <Text className="mt-1.5 text-xs leading-snug text-muted-foreground" style={nepaliTextStyle(12)}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
