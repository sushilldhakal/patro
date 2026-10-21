import { useId } from "react";
import Svg, { Circle, ClipPath, G, Image, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { markerArrowhead } from "./arrowhead";
import { useColorScheme } from "nativewind";
import { mobileRoles, withAlpha } from "@vedic-patro/design-tokens";
import { useLocale } from "@vedic-patro/i18n/react";
import {
  EARTH_ROT_GLOW_PAD,
  EARTH_ROT_H,
  EARTH_ROT_R,
  EARTH_ROT_TILT,
  EARTH_ROT_W,
  earthRotation,
} from "@vedic-patro/domain/learn/earth-rotation";
import type { EarthRotationDiagramProps } from "../contract";

export function EarthRotationDiagram({ globeSrc }: EarthRotationDiagramProps) {
  const { t, digits } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const ink = roles.foreground;
  const amber = roles.warning;
  const teal = roles.success;
  const clipId = `earth-clip-${useId().replace(/:/g, "")}`;
  const { cx, cy } = earthRotation;
  const d = EARTH_ROT_R * 2;
  /* The curve is `M cx-38,cy+44 A 46 46 0 1 1 cx+38,cy+44`: an arc over the top whose centre sits
     sqrt(46² - 38²) above the chord. Its head points along the clockwise tangent at the end. */
  const arcCy = cy + 44 - Math.sqrt(46 * 46 - 38 * 38);
  const endX = cx + 38;
  const endY = cy + 44;
  const rotationHead = markerArrowhead(endX, endY, Math.atan2(endX - cx, -(endY - arcCy)), 2.4, 7, 7, 1);

  return (
    <Svg viewBox={`0 0 ${EARTH_ROT_W} ${EARTH_ROT_H}`} width="100%" height={220} accessibilityElementsHidden>
      <ClipPath id={clipId}>
        <Circle cx={cx} cy={cy} r={EARTH_ROT_R} />
      </ClipPath>
      <SvgText x={earthRotation.west.x} y={earthRotation.west.y} fill={withAlpha(ink, 0.78)} fontSize={14} fontWeight="600" textAnchor="middle">
        {t("learn.west")}
      </SvgText>
      <SvgText x={earthRotation.east.x} y={earthRotation.east.y} fill={withAlpha(ink, 0.78)} fontSize={14} fontWeight="600" textAnchor="middle">
        {t("learn.east")}
      </SvgText>
      <Line
        x1={earthRotation.axis.x1}
        y1={earthRotation.axis.y1}
        x2={earthRotation.axis.x2}
        y2={earthRotation.axis.y2}
        stroke={withAlpha(ink, 0.18)}
        strokeWidth={1.2}
        strokeDasharray="4 5"
      />
      <Circle cx={cx} cy={cy} r={EARTH_ROT_R + EARTH_ROT_GLOW_PAD} fill={withAlpha(teal, 0.1)} />
      <G clipPath={`url(#${clipId})`}>
        <Image
          href={globeSrc}
          x={cx - EARTH_ROT_R}
          y={cy - EARTH_ROT_R}
          width={d}
          height={d}
          transform={`rotate(${EARTH_ROT_TILT} ${cx} ${cy})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </G>
      <Circle cx={cx} cy={cy} r={EARTH_ROT_R} fill="none" stroke={withAlpha(ink, 0.38)} strokeWidth={1.3} />
      <Line
        x1={earthRotation.pole.x1}
        y1={earthRotation.pole.y1}
        x2={earthRotation.pole.x2}
        y2={earthRotation.pole.y2}
        stroke={withAlpha(ink, 0.45)}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d={earthRotation.curve} fill="none" stroke={amber} strokeWidth={2.4} strokeLinecap="round" />
      <Polygon points={rotationHead} fill={amber} />
      <SvgText x={earthRotation.label.x} y={earthRotation.label.y} fill={teal} fontSize={14} fontWeight="600" textAnchor="middle">
        {t("learn.west_east")} · ~{digits(24)} {t("learn.hours")}
      </SvgText>
    </Svg>
  );
}
