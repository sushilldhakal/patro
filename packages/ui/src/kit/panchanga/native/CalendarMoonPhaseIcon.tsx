import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { elongationFromTithiIndex, normElongation } from "@vedic-patro/domain/astronomy/moon-phase-svg";
import { illustration, midnight } from "@vedic-patro/design-tokens";

export type CalendarMoonPhaseIconProps = {
  tithiIndex: number;
  className?: string;
  size?: number;
  title?: string;
  style?: { width?: number | string; height?: number | string };
};

/** Geometry in the old 24-unit viewBox, so the icon keeps its size and look. */
const VIEWBOX = 24;
const R = 9;
const R_FULL = 10;
const STROKE = 1;
const DEG = Math.PI / 180;

function moonColors(isDark: boolean) {
  return {
    darkFill: isDark ? illustration.sky19 : midnight.background,
    darkStroke: isDark ? illustration.teal33 : illustration.sky27,
    yellowFill: isDark ? illustration.amber89 : illustration.amber77,
    yellowStroke: isDark ? illustration.amber47 : illustration.amber40,
  };
}

/**
 * Tithi moon for calendar cells. Purnima is a full yellow disc; aaushi is a full dark disc.
 *
 * Drawn with plain Views, not react-native-svg. A month grid shows ~35 of these, and on Android
 * every SVG node fires an onLayout event on its first draw. Reanimated flushes pending
 * animation props inside the draw pass for each such event, and on low-end phones that froze
 * the main thread long enough to ANR (Sentry PATRO-6).
 *
 * Shape: a dark disc, its sunlit half (right while waxing), and the terminator — a half-ellipse
 * made by squashing a circle with scaleX — painted dark for a crescent or lit for a gibbous moon.
 */
export function CalendarMoonPhaseIcon({ tithiIndex, size = 16, title }: CalendarMoonPhaseIconProps) {
  const scheme = useColorScheme();
  const { darkFill, darkStroke, yellowFill, yellowStroke } = moonColors(scheme.colorScheme === "dark");
  const unit = size / VIEWBOX;
  const isPurnima = tithiIndex === 14;
  const isAaushi = tithiIndex === 29;
  const a11y = title ? { accessible: true, accessibilityLabel: title } : null;

  if (isPurnima || isAaushi) {
    // The SVG stroke straddled r=10, so the outer edge sits at r + stroke/2.
    const d = (R_FULL + STROKE / 2) * 2 * unit;
    return (
      <View {...a11y} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: STROKE * unit,
            backgroundColor: isPurnima ? yellowFill : darkFill,
            borderColor: isPurnima ? yellowStroke : darkStroke,
          }}
        />
      </View>
    );
  }

  const e = normElongation(elongationFromTithiIndex(tithiIndex));
  const litRight = e <= 180;
  const gibbous = e > 90 && e < 270;
  const squash = Math.max(Math.abs(Math.cos(e * DEG)), 0.001);
  const d = R * 2 * unit;
  const outer = (R + STROKE / 2) * 2 * unit;

  return (
    <View {...a11y} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, overflow: "hidden", backgroundColor: darkFill }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: d / 2,
            left: litRight ? d / 2 : 0,
            backgroundColor: yellowFill,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: gibbous ? yellowFill : darkFill,
            transform: [{ scaleX: squash }],
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: STROKE * unit,
          borderColor: darkStroke,
        }}
      />
    </View>
  );
}
