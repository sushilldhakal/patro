import { useId } from "react";
import Svg, { Circle, ClipPath, Defs, G, Path } from "react-native-svg";
import { fontFamily } from "@vedic-patro/design-tokens";
import { annularSectorPath } from "@vedic-patro/domain/vastu/vastu";
import { VASTU_COMPASS_RING as R, useVastuCompassRing } from "@vedic-patro/features/vastu";
import type { VastuCompassRingProps } from "../contract";
import { ArcLabel, DegreeTicks, PadaCodeLabel, RingSeparators, VastuPurushaSilhouette } from "./WheelMarks";

const fonts = fontFamily.native;

export function VastuCompassRing({ size, center, ink, marks }: VastuCompassRingProps) {
  const ring = useVastuCompassRing();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;
  const edge = size ?? R.size;
  return (
    <Svg width={edge} height={edge} viewBox={`0 0 ${R.size} ${R.size}`} pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={center.cx} cy={center.cy} r={R.rHouse} />
        </ClipPath>
      </Defs>
      <Circle cx={center.cx} cy={center.cy} r={R.rDegOuter} fill={ink.background} />
      {ring.padas.map((pada) => (
        <G key={`pada-${pada.id}`}>
          <Path d={annularSectorPath(pada.bearing, 5.625, R.rPadaOuter, R.rPadaInner, center.cx, center.cy)} fill={pada.color} fillOpacity={0.3} />
          <PadaCodeLabel bearing={pada.bearing} radius={R.padaLabelR} code={pada.code} status={pada.status} center={center} ink={ink.text} marks={marks} />
        </G>
      ))}
      {ring.dirs.map((dir) => (
        <G key={`dir16-${dir.id}`}>
          <Path d={annularSectorPath(dir.bearing, 11.25, R.r16Outer, R.r16Inner, center.cx, center.cy)} fill={dir.color} fillOpacity={0.34} />
          <ArcLabel bearing={dir.bearing} radius={R.dir16LabelR} fontSize={11} fontFamily={fonts.bold} fill={ink.text} center={center}>
            {dir.abbr}
          </ArcLabel>
        </G>
      ))}
      {R.dividers.map((r) => (
        <Circle key={`ring-div-${r}`} cx={center.cx} cy={center.cy} r={r} fill="none" stroke={ink.text} strokeOpacity={0.4} strokeWidth={0.9} />
      ))}
      <RingSeparators bearings={R.dir16Boundaries} innerR={R.r16Inner} outerR={R.r16Outer} center={center} ink={ink.text} />
      <RingSeparators bearings={R.padaBoundaries} innerR={R.rPadaInner} outerR={R.rPadaOuter} center={center} ink={ink.text} />
      <DegreeTicks ticks={ring.ticks} ink={ink.text} />
      {ring.ticks.map((tick) =>
        tick.label ? (
          <ArcLabel key={`tick-${tick.bearing}`} bearing={tick.bearing} radius={R.degLabelR} fontSize={7} fontFamily={fonts.semibold} fillOpacity={0.8} fill={ink.text} center={center}>
            {tick.label}
          </ArcLabel>
        ) : null,
      )}
      <G clipPath={`url(#${clipId})`} pointerEvents="none">
        <G transform={`translate(${center.cx} ${center.cy})`} opacity={R.purushaOpacity}>
          <VastuPurushaSilhouette size={R.purushaSize} color={ink.text} />
        </G>
      </G>
    </Svg>
  );
}
