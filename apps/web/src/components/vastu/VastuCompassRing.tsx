import { useId } from "react";
import { VASTU_INK, annularSectorPath } from "@vedic-patro/domain/vastu";
import { VASTU_COMPASS_RING as R, useVastuCompassRing } from "@vedic-patro/features/vastu";
import {
  ArcLabel,
  PadaCodeLabel,
  RingSeparators,
  VastuPurushaSilhouette,
} from "./VastuPurushaWheel";

/**
 * The compass ring on its own — degree rim, 16 directions, N1–N8 padas, and
 * the Vāstu Puruṣa faint in the middle. Lifted verbatim out of the deleted
 * `HouseFloorPlan`, which is where it used to live wrapped around a solved
 * blueprint; the blueprint is gone but the ring is the part that made the
 * drawing readable as Vāstu, so it now frames the zoning sketch instead.
 *
 * Its geometry (RING_SIZE, R_HOUSE) lives in `@vedic-patro/domain/vastu-ring` so that
 * whatever is drawn inside the ring is positioned off the same numbers.
 */
export function VastuCompassRing({ className }: { className?: string }) {
  const ring = useVastuCompassRing();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${R.size} ${R.size}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={R.cx} cy={R.cy} r={R.rHouse} />
        </clipPath>
      </defs>

      <circle cx={R.cx} cy={R.cy} r={R.rDegOuter} fill={VASTU_INK.background} />

      {/* N1–N8 pada ring, with the same +/- auspicious marks as the wheel */}
      {ring.padas.map((pada) => {
        const color = pada.color;
        return (
          <g key={`pada-${pada.id}`}>
            <title>{pada.title}</title>
            <path
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
          </g>
        );
      })}

      {/* 16-direction abbreviation ring (N, NNE, NE, …) */}
      {ring.dirs.map((dir) => {
        const color = dir.color;
        return (
          <g key={`dir16-${dir.id}`}>
            <title>{dir.title}</title>
            <path
              d={annularSectorPath(dir.bearing, 11.25, R.r16Outer, R.r16Inner, R.cx, R.cy)}
              fill={color}
              fillOpacity={0.34}
            />
            <ArcLabel bearing={dir.bearing} radius={R.dir16LabelR} fontSize={11} className="font-bold">
              {dir.abbr}
            </ArcLabel>
          </g>
        );
      })}

      {R.dividers.map((r) => (
        <circle
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
          <g key={`tick-${bearing}`}>
            <line
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
                fontSize={7}
                className="font-semibold"
                fillOpacity={0.8}
              >
                {tick.label}
              </ArcLabel>
            ) : null}
          </g>
        );
      })}

      {/* Vastu Purusha, faint, in the middle — head northeast, feet southwest,
          same as the wheel. The sketch sits on top of it. */}
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        <g transform={`translate(${R.cx} ${R.cy})`} opacity={R.purushaOpacity} style={{ color: VASTU_INK.text }}>
          <VastuPurushaSilhouette size={R.purushaSize} />
        </g>
      </g>
    </svg>
  );
}
