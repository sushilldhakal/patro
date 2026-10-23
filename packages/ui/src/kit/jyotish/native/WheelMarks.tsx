import { memo, type ReactNode } from "react";
import { G, Path, Text as SvgText } from "react-native-svg";
import { fontFamily } from "@vedic-patro/design-tokens";
import { vastuWheelPoint } from "@vedic-patro/domain/vastu/vastu";
import { PURUSHA_PATH } from "../purusha-path";
import type { VastuCenter, VastuMarks } from "../contract";

const fonts = fontFamily.native;

function normBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/** Spokes between the cells of a ring — one Path for all of them, not a Line per spoke. */
export const RingSeparators = memo(function RingSeparators({
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
  let d = "";
  for (const bearing of bearings) {
    const a = vastuWheelPoint(bearing, innerR, center.cx, center.cy);
    const b = vastuWheelPoint(bearing, outerR, center.cx, center.cy);
    d += `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return <Path d={d} fill="none" stroke={ink} strokeOpacity={0.4} strokeWidth={0.75} pointerEvents="none" />;
});

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
    <G transform={`rotate(${bearing} ${center.cx} ${center.cy})`} pointerEvents="none">
      <G transform={flip ? `rotate(180 ${x} ${y})` : undefined} fill={ink}>
        <SvgText x={x + 1} y={y} textAnchor="end" alignmentBaseline="central" fontSize={12} fontFamily={fonts.semibold} fillOpacity={0.92}>
          {code}
        </SvgText>
        {status === "mixed" ? (
          <>
            <SvgText x={signX} y={y - 4.6} textAnchor="middle" alignmentBaseline="central" fontSize={8} fontFamily={fonts.bold} fill={marks.good}>+</SvgText>
            <SvgText x={signX} y={y + 4.6} textAnchor="middle" alignmentBaseline="central" fontSize={8} fontFamily={fonts.bold} fill={marks.bad}>−</SvgText>
          </>
        ) : status !== "ok" ? (
          <SvgText x={signX} y={y} textAnchor="middle" alignmentBaseline="central" fontSize={9} fontFamily={fonts.bold} fill={status === "good" ? marks.good : marks.bad}>
            {status === "good" ? "+" : "−"}
          </SvgText>
        ) : null}
      </G>
    </G>
  );
}

export function ArcLabel({
  bearing,
  radius,
  center,
  fontSize,
  fill,
  fillOpacity = 0.92,
  fontFamily: family = fonts.regular,
  children,
}: {
  bearing: number;
  radius: number;
  center: VastuCenter;
  fontSize: number;
  fill: string;
  fillOpacity?: number;
  fontFamily?: string;
  children: ReactNode;
}) {
  const flip = normBearing(bearing) > 90 && normBearing(bearing) < 270;
  return (
    <G transform={`rotate(${bearing} ${center.cx} ${center.cy})`} pointerEvents="none">
      <SvgText
        x={center.cx}
        y={center.cy - radius}
        textAnchor="middle"
        alignmentBaseline="central"
        fill={fill}
        fillOpacity={fillOpacity}
        fontSize={fontSize}
        fontFamily={family}
        transform={flip ? `rotate(180 ${center.cx} ${center.cy - radius})` : undefined}
      >
        {children}
      </SvgText>
    </G>
  );
}

export function VastuPurushaSilhouette({ size = 100, color }: { size?: number; color: string }) {
  const scale = size / 220;
  return (
    <G transform={`translate(${-size / 2} ${-size / 2}) scale(${scale})`}>
      <G transform="translate(0,220) scale(0.1,-0.1)" fill={color}>
        <Path d={PURUSHA_PATH} />
      </G>
    </G>
  );
}

type TickPoint = { x: number; y: number };
export type TickSegment = { inner: TickPoint; outer: TickPoint; opacity: number; width: number };

/**
 * The 360 degree ticks as one Path per stroke style (four, not 360 groups of a line): each
 * react-native-svg element is a native view, so the wheel's rim alone used to cost ~720 of them.
 */
export const DegreeTicks = memo(function DegreeTicks({ ticks, ink }: { ticks: readonly TickSegment[]; ink: string }) {
  const groups = new Map<string, { opacity: number; width: number; d: string }>();
  for (const tick of ticks) {
    const key = `${tick.opacity}|${tick.width}`;
    const group = groups.get(key) ?? { opacity: tick.opacity, width: tick.width, d: "" };
    group.d += `M${tick.inner.x.toFixed(2)} ${tick.inner.y.toFixed(2)}L${tick.outer.x.toFixed(2)} ${tick.outer.y.toFixed(2)}`;
    groups.set(key, group);
  }
  return (
    <>
      {[...groups.entries()].map(([key, group]) => (
        <Path key={key} d={group.d} fill="none" stroke={ink} strokeOpacity={group.opacity} strokeWidth={group.width} pointerEvents="none" />
      ))}
    </>
  );
});
