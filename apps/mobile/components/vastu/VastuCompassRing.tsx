/**
 * The compass ring on its own — degree rim, 16 directions, N1–N8 padas, and
 * the Vāstu Puruṣa faint in the middle. The native counterpart of the web
 * app's `src/components/vastu/VastuCompassRing.tsx`, band for band.
 *
 * Its geometry (RING_SIZE, R_HOUSE) lives in `@/lib/vastu-ring` so that
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
import { useLocale } from "@/lib/i18n";
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_SEMIBOLD } from "@/lib/fonts";
import {
  VASTU_DIR16,
  VASTU_ELEMENT_COLOR,
  VASTU_INK,
  VASTU_PADAS,
  annularSectorPath,
  evenBearings,
  vastuElementAtBearing,
  vastuWheelPoint,
} from "@/shared/vastu";
import { RING_SIZE, R_HOUSE } from "@/lib/vastu-ring";
import {
  ArcLabel,
  PadaCodeLabel,
  RingSeparators,
  VastuPurushaSilhouette,
} from "./VastuPurushaWheel";

const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;

// Bands are single-line here (just the abbreviation/code, no second attribute
// line like the wheel's own DIR16 ring), so each can be much thinner than the
// wheel's — that leaves most of the radius for the house itself instead of
// the compass.
const R_DEG_OUTER = 306;
const R_DEG_INNER = 290;
const R_16_OUTER = R_DEG_INNER;
const R_16_INNER = 264;
const R_PADA_OUTER = R_16_INNER;
const R_PADA_INNER = 236;
const DEG_LABEL_R = (R_DEG_OUTER + R_DEG_INNER) / 2;
const DIR16_LABEL_R = (R_16_OUTER + R_16_INNER) / 2;
const PADA_LABEL_R = (R_PADA_OUTER + R_PADA_INNER) / 2;
const DIR16_BOUNDARIES = evenBearings(16, 11.25);
const PADA_BOUNDARIES = evenBearings(32, 0);
const PURUSHA_OPACITY = 0.16;
/** Matches VastuPurushaWheel's own PURUSHA_SIZE formula, sized to R_HOUSE. */
const PURUSHA_SIZE = Math.round(R_HOUSE * Math.SQRT2 * 0.82);

export function VastuCompassRing({ size }: { size: number }) {
  const { digits } = useLocale();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} pointerEvents="none">
      {/* @ts-expect-error react-native-svg Defs children typing */}
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={CX} cy={CY} r={R_HOUSE} />
        </ClipPath>
      </Defs>

      <Circle cx={CX} cy={CY} r={R_DEG_OUTER} fill={VASTU_INK.background} />

      {/* N1–N8 pada ring, with the same +/- auspicious marks as the wheel */}
      {VASTU_PADAS.map((pada) => {
        const color = VASTU_ELEMENT_COLOR[pada.element];
        return (
          <G key={`pada-${pada.id}`}>
            <Path
              d={annularSectorPath(pada.bearing, 5.625, R_PADA_OUTER, R_PADA_INNER, CX, CY)}
              fill={color}
              fillOpacity={0.3}
            />
            <PadaCodeLabel
              bearing={pada.bearing}
              radius={PADA_LABEL_R}
              code={`${pada.wall}${digits(pada.index)}`}
              status={pada.status}
            />
          </G>
        );
      })}

      {/* 16-direction abbreviation ring (N, NNE, NE, …) */}
      {VASTU_DIR16.map((dir) => {
        const color = VASTU_ELEMENT_COLOR[vastuElementAtBearing(dir.bearing)];
        return (
          <G key={`dir16-${dir.id}`}>
            <Path
              d={annularSectorPath(dir.bearing, 11.25, R_16_OUTER, R_16_INNER, CX, CY)}
              fill={color}
              fillOpacity={0.34}
            />
            <ArcLabel
              bearing={dir.bearing}
              radius={DIR16_LABEL_R}
              fontSize={15}
              fontFamily={NOTO_DEVANAGARI_BOLD}
            >
              {dir.abbr}
            </ArcLabel>
          </G>
        );
      })}

      {[R_DEG_OUTER, R_DEG_INNER, R_16_INNER, R_PADA_INNER].map((r) => (
        <Circle
          key={`ring-div-${r}`}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke={VASTU_INK.text}
          strokeOpacity={0.4}
          strokeWidth={0.9}
        />
      ))}
      <RingSeparators bearings={DIR16_BOUNDARIES} innerR={R_16_INNER} outerR={R_16_OUTER} />
      <RingSeparators bearings={PADA_BOUNDARIES} innerR={R_PADA_INNER} outerR={R_PADA_OUTER} />

      {/* Degree tick rim on top, same as the wheel, so ring fills can't bleed over it */}
      {Array.from({ length: 360 }, (_, bearing) => {
        const every10 = bearing % 10 === 0;
        const every5 = bearing % 5 === 0;
        const cardinal = bearing % 90 === 0;
        const tickInner = every10 ? R_DEG_INNER : every5 ? R_DEG_INNER + 4 : R_DEG_OUTER - 5;
        const inner = vastuWheelPoint(bearing, tickInner, CX, CY);
        const outer = vastuWheelPoint(bearing, R_DEG_OUTER, CX, CY);
        return (
          <G key={`tick-${bearing}`}>
            <Line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={VASTU_INK.text}
              strokeOpacity={cardinal ? 0.9 : every10 ? 0.7 : every5 ? 0.5 : 0.28}
              strokeWidth={cardinal ? 1.3 : every10 ? 0.8 : every5 ? 0.42 : 0.26}
            />
            {every10 ? (
              <ArcLabel
                bearing={bearing}
                radius={DEG_LABEL_R}
                fontSize={15}
                fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                fillOpacity={0.8}
              >
                {digits(bearing)}
              </ArcLabel>
            ) : null}
          </G>
        );
      })}

      {/* Vastu Purusha, faint, in the middle — head northeast, feet southwest,
          same as the wheel. The sketch sits on top of it. */}
      <G clipPath={`url(#${clipId})`} pointerEvents="none">
        <G transform={`translate(${CX} ${CY})`} opacity={PURUSHA_OPACITY}>
          <VastuPurushaSilhouette size={PURUSHA_SIZE} />
        </G>
      </G>
    </Svg>
  );
}

export default VastuCompassRing;
