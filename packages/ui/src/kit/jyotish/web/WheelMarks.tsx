import type { ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { vastuWheelPoint } from "@vedic-patro/domain/vastu/vastu";
import { PURUSHA_PATH } from "../purusha-path";
import type { VastuCenter, VastuMarks } from "../contract";

function normBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

export function RingSeparators({
  bearings,
  innerR,
  outerR,
  center,
  ink,
}: {
  bearings: readonly number[];
  innerR: number;
  outerR: number;
  center: VastuCenter;
  ink: string;
}) {
  return bearings.map((bearing) => {
    const a = vastuWheelPoint(bearing, innerR, center.cx, center.cy);
    const b = vastuWheelPoint(bearing, outerR, center.cx, center.cy);
    return (
      <line
        key={`sep-${innerR}-${outerR}-${bearing}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={ink}
        strokeOpacity={0.4}
        strokeWidth={0.75}
      />
    );
  });
}

export function PadaCodeLabel({
  bearing,
  radius,
  code,
  status,
  center,
  ink,
  marks,
}: {
  bearing: number;
  radius: number;
  code: string;
  status: "good" | "ok" | "bad" | "mixed";
  center: VastuCenter;
  ink: string;
  marks: VastuMarks;
}) {
  const flip = normBearing(bearing) > 90 && normBearing(bearing) < 270;
  const x = center.cx;
  const y = center.cy - radius;
  const signX = x + 8;
  return (
    <g transform={`rotate(${bearing} ${center.cx} ${center.cy})`}>
      <g transform={flip ? `rotate(180 ${x} ${y})` : undefined} className="pointer-events-none select-none" fill={ink}>
        <text x={x + 1} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={600} fillOpacity={0.92}>
          {code}
        </text>
        {status === "mixed" ? (
          <>
            <text x={signX} y={y - 4.6} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={800} fill={marks.good}>+</text>
            <text x={signX} y={y + 4.6} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={800} fill={marks.bad}>−</text>
          </>
        ) : status !== "ok" ? (
            <text x={signX} y={y} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800} fill={status === "good" ? marks.good : marks.bad}>
            {status === "good" ? "+" : "−"}
          </text>
        ) : null}
      </g>
    </g>
  );
}

export function ArcLabel({
  bearing,
  radius,
  center,
  className,
  fontSize,
  fill,
  fillOpacity = 0.92,
  children,
}: {
  bearing: number;
  radius: number;
  center: VastuCenter;
  className?: string;
  fontSize: number;
  fill: string;
  fillOpacity?: number;
  children: ReactNode;
}) {
  const flip = normBearing(bearing) > 90 && normBearing(bearing) < 270;
  return (
    <g transform={`rotate(${bearing} ${center.cx} ${center.cy})`}>
      <text
        x={center.cx}
        y={center.cy - radius}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn("pointer-events-none select-none", className)}
        fill={fill}
        fillOpacity={fillOpacity}
        fontSize={fontSize}
        transform={flip ? `rotate(180 ${center.cx} ${center.cy - radius})` : undefined}
      >
        {children}
      </text>
    </g>
  );
}

export function VastuPurushaSilhouette({ size = 100, color }: { size?: number; color: string }) {
  const scale = size / 220;
  return (
    <g transform={`translate(${-size / 2} ${-size / 2}) scale(${scale})`}>
      <g transform="translate(0,220) scale(0.1,-0.1)" fill={color} stroke="none">
        <path d={PURUSHA_PATH} />
      </g>
    </g>
  );
}
