import { useId } from "react";
import Svg, { Circle, ClipPath, G, Image, Line, Marker, Path, Text as SvgText } from "react-native-svg";
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
  const markerId = `ss-rot-arrow-${useId().replace(/:/g, "")}`;
  const { cx, cy } = earthRotation;
  const d = EARTH_ROT_R * 2;

  return (
    <Svg viewBox={`0 0 ${EARTH_ROT_W} ${EARTH_ROT_H}`} width="100%" height={220} accessibilityElementsHidden>
      <Marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <Path d="M0,0 L7,3.5 L0,7 Z" fill={amber} />
      </Marker>
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
      <Path d={earthRotation.curve} fill="none" stroke={amber} strokeWidth={2.4} strokeLinecap="round" markerEnd={`url(#${markerId})`} />
      <SvgText x={earthRotation.label.x} y={earthRotation.label.y} fill={teal} fontSize={14} fontWeight="600" textAnchor="middle">
        {t("learn.west_east")} · ~{digits(24)} {t("learn.hours")}
      </SvgText>
    </Svg>
  );
}
