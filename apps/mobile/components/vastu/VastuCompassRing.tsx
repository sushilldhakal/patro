/**
 * The compass ring on its own — degree rim, 16 directions, N1–N8 padas, and
 * the Vāstu Puruṣa faint in the middle. The native counterpart of the web
 * app's `src/components/vastu/VastuCompassRing.tsx`, band for band.
 *
 * Its geometry (RING_SIZE, R_HOUSE) lives in `@vedic-patro/domain/vastu-ring` so that
 * whatever is drawn inside the ring is positioned off the same numbers, and
 * its labels reuse the wheel's own `ArcLabel`/`PadaCodeLabel`/`RingSeparators`
 * — which close over the wheel's centre, hence RING_SIZE === WHEEL_SIZE.
 *
 * Where the web version stretches to its container with `className`, this one
 * takes an explicit `size` in points: `HouseSketch` stacks it under the plan
 * as two absolutely-positioned `Svg`s of exactly that edge length.
 */

import { useId } from "react";
import Svg, { Circle, ClipPath, Defs, G, Line, Path } from "react-native-svg";
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_SEMIBOLD } from "@/lib/fonts";
import { VASTU_INK, annularSectorPath } from "@vedic-patro/domain/vastu";
import { VASTU_COMPASS_RING as R, useVastuCompassRing } from "@vedic-patro/features/vastu";
import {
  ArcLabel,
  PadaCodeLabel,
  RingSeparators,
  VastuPurushaSilhouette,
} from "./VastuPurushaWheel";

export function VastuCompassRing({ size }: { size: number }) {
  const ring = useVastuCompassRing();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${R.size} ${R.size}`} pointerEvents="none">
      {/* @ts-expect-error react-native-svg Defs children typing */}
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={R.cx} cy={R.cy} r={R.rHouse} />
        </ClipPath>
      </Defs>

      <Circle cx={R.cx} cy={R.cy} r={R.rDegOuter} fill={VASTU_INK.background} />

      {/* N1–N8 pada ring, with the same +/- auspicious marks as the wheel */}
      {ring.padas.map((pada) => {
        const color = pada.color;
        return (
          <G key={`pada-${pada.id}`}>
            <Path
              d={annularSectorPath(pada.bearing, 5.625, R.rPadaOuter, R.rPadaInner, R.cx, R.cy)}
              fill={color}
              fillOpacity={0.3}
            />
            <PadaCodeLabel
              bearing={pada.bearing}
              radius={R.padaLabelR}
              code={pada.code}
              status={pada.status}
            />
          </G>
        );
      })}

      {/* 16-direction abbreviation ring (N, NNE, NE, …) */}
      {ring.dirs.map((dir) => {
        const color = dir.color;
        return (
          <G key={`dir16-${dir.id}`}>
            <Path
              d={annularSectorPath(dir.bearing, 11.25, R.r16Outer, R.r16Inner, R.cx, R.cy)}
              fill={color}
              fillOpacity={0.34}
            />
            <ArcLabel
              bearing={dir.bearing}
              radius={R.dir16LabelR}
              fontSize={15}
              fontFamily={NOTO_DEVANAGARI_BOLD}
            >
              {dir.abbr}
            </ArcLabel>
          </G>
        );
      })}

      {R.dividers.map((r) => (
        <Circle
          key={`ring-div-${r}`}
          cx={R.cx}
          cy={R.cy}
          r={r}
          fill="none"
          stroke={VASTU_INK.text}
          strokeOpacity={0.4}
          strokeWidth={0.9}
        />
      ))}
      <RingSeparators bearings={R.dir16Boundaries} innerR={R.r16Inner} outerR={R.r16Outer} />
      <RingSeparators bearings={R.padaBoundaries} innerR={R.rPadaInner} outerR={R.rPadaOuter} />

      {/* Degree tick rim on top, same as the wheel, so ring fills can't bleed over it */}
      {ring.ticks.map((tick) => {
        const { bearing, inner, outer } = tick;
        return (
          <G key={`tick-${bearing}`}>
            <Line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={VASTU_INK.text}
              strokeOpacity={tick.opacity}
              strokeWidth={tick.width}
            />
            {tick.label ? (
              <ArcLabel
                bearing={bearing}
                radius={R.degLabelR}
                fontSize={15}
                fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                fillOpacity={0.8}
              >
                {tick.label}
              </ArcLabel>
            ) : null}
          </G>
        );
      })}

      {/* Vastu Purusha, faint, in the middle — head northeast, feet southwest,
          same as the wheel. The sketch sits on top of it. */}
      <G clipPath={`url(#${clipId})`} pointerEvents="none">
        <G transform={`translate(${R.cx} ${R.cy})`} opacity={R.purushaOpacity}>
          <VastuPurushaSilhouette size={R.purushaSize} />
        </G>
      </G>
    </Svg>
  );
}

export default VastuCompassRing;
