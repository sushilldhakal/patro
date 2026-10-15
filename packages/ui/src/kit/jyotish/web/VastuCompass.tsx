import { useId } from "react";
import { annularSectorPath } from "@vedic-patro/domain/vastu";
import { VASTU_COMPASS_RING as R, useVastuCompassRing } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
import type { VastuCompassRingProps } from "../contract";
import { ArcLabel, PadaCodeLabel, RingSeparators, VastuPurushaSilhouette } from "./WheelMarks";

export function VastuCompassRing({ className, center, ink, marks }: VastuCompassRingProps) {
  const ring = useVastuCompassRing();
  const clipId = `vastu-ring-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox={`0 0 ${R.size} ${R.size}`} className={cn(className)} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <circle cx={center.cx} cy={center.cy} r={R.rHouse} />
        </clipPath>
      </defs>
      <circle cx={center.cx} cy={center.cy} r={R.rDegOuter} fill={ink.background} />
      {ring.padas.map((pada) => (
        <g key={`pada-${pada.id}`}>
          <title>{pada.title}</title>
          <path d={annularSectorPath(pada.bearing, 5.625, R.rPadaOuter, R.rPadaInner, center.cx, center.cy)} fill={pada.color} fillOpacity={0.3} />
          <PadaCodeLabel bearing={pada.bearing} radius={R.padaLabelR} code={pada.code} status={pada.status} center={center} ink={ink.text} marks={marks} />
        </g>
      ))}
      {ring.dirs.map((dir) => (
        <g key={`dir16-${dir.id}`}>
          <title>{dir.title}</title>
          <path d={annularSectorPath(dir.bearing, 11.25, R.r16Outer, R.r16Inner, center.cx, center.cy)} fill={dir.color} fillOpacity={0.34} />
          <ArcLabel bearing={dir.bearing} radius={R.dir16LabelR} fontSize={11} className="font-bold" fill={ink.text} center={center}>
            {dir.abbr}
          </ArcLabel>
        </g>
      ))}
      {R.dividers.map((r) => (
        <circle key={`ring-div-${r}`} cx={center.cx} cy={center.cy} r={r} fill="none" stroke={ink.text} strokeOpacity={0.4} strokeWidth={0.9} />
      ))}
      <RingSeparators bearings={R.dir16Boundaries} innerR={R.r16Inner} outerR={R.r16Outer} center={center} ink={ink.text} />
      <RingSeparators bearings={R.padaBoundaries} innerR={R.rPadaInner} outerR={R.rPadaOuter} center={center} ink={ink.text} />
      {ring.ticks.map((tick) => (
        <g key={`tick-${tick.bearing}`}>
          <line x1={tick.inner.x} y1={tick.inner.y} x2={tick.outer.x} y2={tick.outer.y} stroke={ink.text} strokeOpacity={tick.opacity} strokeWidth={tick.width} />
          {tick.label ? (
            <ArcLabel bearing={tick.bearing} radius={R.degLabelR} fontSize={7} className="font-semibold" fillOpacity={0.8} fill={ink.text} center={center}>
              {tick.label}
            </ArcLabel>
          ) : null}
        </g>
      ))}
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        <g transform={`translate(${center.cx} ${center.cy})`} opacity={R.purushaOpacity}>
          <VastuPurushaSilhouette size={R.purushaSize} color={ink.text} />
        </g>
      </g>
    </svg>
  );
}
