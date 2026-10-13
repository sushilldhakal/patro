import { Circle, G, Path, Svg } from "react-native-svg";
import { useTheme } from "@/lib/theme-context";
import { elongationFromTithiIndex, moonPhaseLitPath } from "@vedic-patro/domain/moon-phase-svg";

import { illustration, midnight } from "@vedic-patro/design-tokens";
type Props = {
  /** Wheel tithi index 0–29 (0 = शुक्ल प्रतिपदा … 14 = पूर्णिमा … 29 = औंसी). */
  tithiIndex: number;
  size?: number;
  title?: string;
};

const R = 9;
const R_FULL = 10;

/** Match web CalendarMoonPhaseIcon — yellow lit side, slate shadow (not theme foreground). */
function moonColors(isDark: boolean) {
  return {
    darkFill: isDark ? illustration.sky19 : midnight.background,
    darkStroke: isDark ? illustration.teal33 : illustration.sky27,
    yellowFill: isDark ? illustration.amber89 : illustration.amber77,
    yellowStroke: isDark ? illustration.amber47 : illustration.amber40,
  };
}

/**
 * Tithi moon phase glyph for calendar cells — same geometry as web.
 * पूर्णिमा → full yellow disc; औंसी → full dark disc.
 */
export function CalendarMoonPhaseIcon({ tithiIndex, size = 16, title }: Props) {
  const { isDark } = useTheme();
  const { darkFill, darkStroke, yellowFill, yellowStroke } = moonColors(isDark);

  const isPurnima = tithiIndex === 14;
  const isAaushi = tithiIndex === 29;

  const litPath =
    !isPurnima && !isAaushi
      ? moonPhaseLitPath(elongationFromTithiIndex(tithiIndex), R)
      : null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={title}>
      {isPurnima ? (
        <>
          <Circle cx={12} cy={12} r={R_FULL} fill={yellowFill} />
          <Circle cx={12} cy={12} r={R_FULL} fill="none" stroke={yellowStroke} strokeWidth={1} />
        </>
      ) : isAaushi ? (
        <>
          <Circle cx={12} cy={12} r={R_FULL} fill={darkFill} />
          <Circle cx={12} cy={12} r={R_FULL} fill="none" stroke={darkStroke} strokeWidth={1} />
        </>
      ) : litPath ? (
        <>
          <Circle cx={12} cy={12} r={R} fill={darkFill} stroke={darkStroke} strokeWidth={1} />
          <G transform="translate(12, 12)">
            <Path d={litPath} fill={yellowFill} stroke={yellowStroke} strokeWidth={0.5} />
          </G>
        </>
      ) : null}
    </Svg>
  );
}
