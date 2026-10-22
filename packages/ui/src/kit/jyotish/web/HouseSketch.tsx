import { useId } from "react";
import {
  VASTU_ELEMENT_COLOR,
  vastuDirection,
  vastuElementTint,
} from "@vedic-patro/domain/vastu/vastu";
import { RING_SIZE } from "@vedic-patro/domain/vastu/vastu-ring";
import { useHouseSketch } from "@vedic-patro/features/vastu";
import type { Rect, TemplateRoom } from "@vedic-patro/domain/vastu/vastu-house-template";
import { cn } from "@vedic-patro/design-tokens/cn";
import { wheelFitScreen } from "@vedic-patro/design-tokens/classes/wheel-classes";
import type { HouseSketchProps } from "../contract";
import { VastuCompassRing } from "./VastuCompass";

import { illustration } from "@vedic-patro/design-tokens";
import { ZoomStage } from "../../panchanga/web/ZoomStage";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
/**
 * A rough Vāstu house sketch: the classical courtyard plan, drawn inside the
 * compass ring.
 *
 * Not a floor plan and not a solver's output — `vastu-house-template.ts` is
 * plain arithmetic on the plot's dimensions, and rooms sit in whatever
 * compass zone `assignVastuSpaces` gave them. What it does show is the shape
 * the treatises actually describe: the Brahmasthāna open in the middle, the
 * ālindra gallery ringing it so every room is reached without crossing the
 * court, clockwise (pradakṣiṇā) movement around that gallery, and the main
 * door standing in a named, auspicious pada of the facing wall.
 *
 * Drawn in the ring's own SVG coordinate space (RING_SIZE units) rather than
 * in HTML: everything then scales together, and the arrows, hatching and
 * dashed court boundary are SVG's job anyway.
 */

const DOOR_COLOR = illustration.red46;

type PxFn = (n: number) => number;

function roomTint(room: TemplateRoom): string {
  return vastuElementTint(vastuDirection(room.zone).element, 0.3);
}

/** Stair treads, so a staircase reads as one rather than as an empty room. */
function StairTreads({ rect, px, stroke }: { rect: Rect; px: PxFn; stroke: string }) {
  const along = rect.h >= rect.w;
  const steps = 7;
  return (
    <g aria-hidden="true">
      {Array.from({ length: steps - 1 }, (_, i) => {
        const f = (i + 1) / steps;
        return along ? (
          <line
            key={i}
            x1={px(rect.x)}
            y1={px(rect.y + rect.h * f)}
            x2={px(rect.x + rect.w)}
            y2={px(rect.y + rect.h * f)}
            stroke={stroke}
            strokeOpacity={0.3}
            strokeWidth={0.7}
          />
        ) : (
          <line
            key={i}
            x1={px(rect.x + rect.w * f)}
            y1={px(rect.y)}
            x2={px(rect.x + rect.w * f)}
            y2={px(rect.y + rect.h)}
            stroke={stroke}
            strokeOpacity={0.3}
            strokeWidth={0.7}
          />
        );
      })}
    </g>
  );
}

/** One pradakṣiṇā arrow: clockwise movement along a side of the gallery. */
function FlowArrow({
  x,
  y,
  length,
  angle,
  scale,
}: {
  x: number;
  y: number;
  length: number;
  angle: number;
  scale: number;
}) {
  const head = 3.4 * scale;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} aria-hidden="true">
      <line
        x1={-length / 2}
        y1={0}
        x2={length / 2 - head}
        y2={0}
        stroke={DOOR_COLOR}
        strokeOpacity={0.7}
        strokeWidth={1.1 * scale}
      />
      <path
        d={`M ${length / 2} 0 L ${length / 2 - head} ${-head * 0.55} L ${length / 2 - head} ${head * 0.55} Z`}
        fill={DOOR_COLOR}
        fillOpacity={0.75}
      />
    </g>
  );
}

export function HouseSketch({ plot, facing, assignments, ink, center, marks, size }: HouseSketchProps) {
  void size;
  const hatchId = `vastu-court-${useId().replace(/:/g, "")}`;
  const sketch = useHouseSketch({ plot, facing, assignments });
  const {
    plan,
    originX,
    originY,
    px,
    fs,
    courtCx,
    courtCy,
    galleryMidX,
    galleryMidY,
    galleryTopY,
    galleryBottomY,
    galleryLeftX,
    galleryRightX,
    arrowLen,
    alongWall,
    doorHalf,
    roomLabel: label,
    roomSize,
  } = sketch;
  const court = plan.court;
  const outer = plan.alindraOuter;

  return (
    <figure className="m-0">
      <ZoomStage className="mx-auto max-w-[900px]">
      {() => (
      <div className={cn("relative aspect-square w-full", wheelFitScreen)}>
        <VastuCompassRing className="absolute inset-0 h-full w-full" center={center} ink={ink} marks={marks} />

        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="absolute inset-0 h-full w-full"
          overflow="visible"
          role="img"
          aria-label={sketch.labels.aria}
        >
          <defs>
            <pattern
              id={hatchId}
              width="7"
              height="7"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="7"
                stroke={VASTU_ELEMENT_COLOR.fire}
                strokeOpacity={0.35}
                strokeWidth="1.6"
              />
            </pattern>
          </defs>

          <g transform={`translate(${originX} ${originY})`}>
            {/* Room blocks, tinted by the element of the zone they sit in */}
            {plan.rooms.map((room) => (
              <rect
                key={`${room.id}-fill`}
                x={px(room.rect.x)}
                y={px(room.rect.y)}
                width={px(room.rect.w)}
                height={px(room.rect.h)}
                fill={roomTint(room)}
                stroke={ink.text}
                strokeOpacity={0.55}
                strokeWidth={0.9}
              />
            ))}

            {/* Ālindra — the covered gallery ringing the court on all four sides */}
            <path
              d={`M ${px(outer.x)} ${px(outer.y)} h ${px(outer.w)} v ${px(outer.h)} h ${-px(outer.w)} Z M ${px(court.x)} ${px(court.y)} h ${px(court.w)} v ${px(court.h)} h ${-px(court.w)} Z`}
              fillRule="evenodd"
              fill={vastuElementTint("space", 0.16)}
              stroke={ink.text}
              strokeOpacity={0.45}
              strokeWidth={0.9}
            />

            {/* Brahmasthāna — open to the sky, nothing built in it */}
            <rect
              x={px(court.x)}
              y={px(court.y)}
              width={px(court.w)}
              height={px(court.h)}
              fill={`url(#${hatchId})`}
              stroke={DOOR_COLOR}
              strokeOpacity={0.55}
              strokeDasharray="5 3"
              strokeWidth={1.1}
            />

            {plan.rooms.map((room) =>
              room.kind === "staircase" ? (
                <StairTreads key={`${room.id}-tread`} rect={room.rect} px={px} stroke={ink.text} />
              ) : null,
            )}

            {/* Clockwise (pradakṣiṇā) movement around the court */}
            <FlowArrow x={galleryMidX} y={galleryTopY} length={arrowLen} angle={0} scale={fs} />
            <FlowArrow x={galleryRightX} y={galleryMidY} length={arrowLen} angle={90} scale={fs} />
            <FlowArrow x={galleryMidX} y={galleryBottomY} length={arrowLen} angle={180} scale={fs} />
            <FlowArrow x={galleryLeftX} y={galleryMidY} length={arrowLen} angle={270} scale={fs} />

            {/* Room names + sizes */}
            {plan.rooms.map((room) => {
              const cx = px(room.rect.x + room.rect.w / 2);
              const cy = px(room.rect.y + room.rect.h / 2);
              const tight = room.rect.w < 2.2 || room.rect.h < 1.7;
              return (
                <g key={`${room.id}-label`} className="pointer-events-none select-none">
                  <text
                    x={cx}
                    y={cy - (tight ? 0 : 5 * fs)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={ink.text}
                    fontSize={(tight ? 7.5 : 9.5) * fs}
                    fontWeight={700}
                  >
                    {label(room)}
                  </text>
                  {!tight && (
                    <text
                      x={cx}
                      y={cy + 7 * fs}
                      textAnchor="middle"
                      fill={ink.text}
                      fillOpacity={0.7}
                      fontSize={7.5 * fs}
                    >
                      {roomSize(room.rect)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Court label */}
            <g className="pointer-events-none select-none">
              <text
                x={courtCx}
                y={courtCy - 7 * fs}
                textAnchor="middle"
                fill={ink.text}
                fontSize={10 * fs}
                fontWeight={700}
              >
                {sketch.labels.brahmasthan}
              </text>
              <text
                x={courtCx}
                y={courtCy + 4 * fs}
                textAnchor="middle"
                fill={ink.text}
                fillOpacity={0.75}
                fontSize={8 * fs}
              >
                {roomSize(court)}
              </text>
              <text
                x={courtCx}
                y={courtCy + 14 * fs}
                textAnchor="middle"
                fill={DOOR_COLOR}
                fontSize={8 * fs}
                fontWeight={600}
              >
                {sketch.labels.openToSky}
              </text>
            </g>

            {/* Outer wall */}
            <rect
              x={0}
              y={0}
              width={px(plot.width)}
              height={px(plot.height)}
              fill="none"
              stroke={ink.text}
              strokeWidth={3}
            />

            {/* Main door — the one placement rule this sketch really asserts */}
            <line
              x1={px(plan.door.x) - (alongWall ? doorHalf : 0)}
              y1={px(plan.door.y) - (alongWall ? 0 : doorHalf)}
              x2={px(plan.door.x) + (alongWall ? doorHalf : 0)}
              y2={px(plan.door.y) + (alongWall ? 0 : doorHalf)}
              stroke={DOOR_COLOR}
              strokeWidth={5 * fs}
              strokeLinecap="round"
              aria-hidden="true"
            />
          </g>
        </svg>
      </div>
      )}
      </ZoomStage>

      <figcaption className={cn(vastuClasses.sketchCaption, "mx-auto max-w-[900px]")}>
        <p className={vastuClasses.sketchSummary}>
          {sketch.summary}
        </p>

        <ul className={cn(vastuClasses.sketchLegend, vastuClasses.legendText)}>
          <li className={vastuClasses.legendItem}>
            <span
              className={cn(vastuClasses.legendSwatchCourt, "inline-block")}
              style={{ borderColor: DOOR_COLOR, backgroundColor: vastuElementTint("fire", 0.16) }}
            />
            {sketch.legend[0]!.label}
          </li>
          <li className={vastuClasses.legendItem}>
            <span
              className={cn(vastuClasses.legendSwatchAlindra, "inline-block")}
              style={{ backgroundColor: vastuElementTint("space", 0.16) }}
            />
            {sketch.legend[1]!.label}
          </li>
          <li className={vastuClasses.legendItem}>
            <span className={cn(vastuClasses.legendSwatchFlow, "inline-block")} style={{ backgroundColor: DOOR_COLOR }} />
            {sketch.legend[2]!.label}
          </li>
          {sketch.legend.flatMap((item) => ("element" in item ? [item.element] : [])).map((element, i) => (
            <li key={element} className={vastuClasses.legendItem}>
              <span
                className={cn(vastuClasses.legendSwatchElement, "inline-block")}
                style={{ backgroundColor: vastuElementTint(element, 0.3) }}
              />
              {sketch.legend[3 + i]!.label}
            </li>
          ))}
        </ul>

        <ul className={cn(vastuClasses.sketchRules, vastuClasses.sketchRuleText)}>
          {sketch.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

