import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
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

/**
 * The compass ring on its own — degree rim, 16 directions, N1–N8 padas, and
 * the Vāstu Puruṣa faint in the middle. Lifted verbatim out of the deleted
 * `HouseFloorPlan`, which is where it used to live wrapped around a solved
 * blueprint; the blueprint is gone but the ring is the part that made the
 * drawing readable as Vāstu, so it now frames the zoning sketch instead.
 *
 * Its geometry (RING_SIZE, R_HOUSE) lives in `@/lib/vastu-ring` so that
 * whatever is drawn inside the ring is positioned off the same numbers.
 */
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

export function VastuCompassRing({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R_HOUSE} />
        </clipPath>
      </defs>

      <circle cx={CX} cy={CY} r={R_DEG_OUTER} fill={VASTU_INK.background} />

      {/* N1–N8 pada ring, with the same +/- auspicious marks as the wheel */}
      {VASTU_PADAS.map((pada) => {
        const color = VASTU_ELEMENT_COLOR[pada.element];
        return (
          <g key={`pada-${pada.id}`}>
            <title>{`${pada.wall}${digits(pada.index)} · ${t(`vastu.pada.${pada.id}.name`)} · ${t(`vastu.wheel.status.${pada.status}`)}`}</title>
            <path
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
          </g>
        );
      })}

      {/* 16-direction abbreviation ring (N, NNE, NE, …) */}
      {VASTU_DIR16.map((dir) => {
        const color = VASTU_ELEMENT_COLOR[vastuElementAtBearing(dir.bearing)];
        return (
          <g key={`dir16-${dir.id}`}>
            <title>{t(`vastu.dir16.${dir.id}.name`)}</title>
            <path
              d={annularSectorPath(dir.bearing, 11.25, R_16_OUTER, R_16_INNER, CX, CY)}
              fill={color}
              fillOpacity={0.34}
            />
            <ArcLabel bearing={dir.bearing} radius={DIR16_LABEL_R} fontSize={11} className="font-bold">
              {dir.abbr}
            </ArcLabel>
          </g>
        );
      })}

      {[R_DEG_OUTER, R_DEG_INNER, R_16_INNER, R_PADA_INNER].map((r) => (
        <circle
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
          <g key={`tick-${bearing}`}>
            <line
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
                fontSize={7}
                className="font-semibold"
                fillOpacity={0.8}
              >
                {digits(bearing)}
              </ArcLabel>
            ) : null}
          </g>
        );
      })}

      {/* Vastu Purusha, faint, in the middle — head northeast, feet southwest,
          same as the wheel. The sketch sits on top of it. */}
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        <g transform={`translate(${CX} ${CY})`} opacity={PURUSHA_OPACITY} style={{ color: VASTU_INK.text }}>
          <VastuPurushaSilhouette size={PURUSHA_SIZE} />
        </g>
      </g>
    </svg>
  );
}
