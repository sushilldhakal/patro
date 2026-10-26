import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Line, Path, Pattern, Rect as SvgRect, Text as SvgText } from "react-native-svg";
import { Text } from "@vedic-patro/ui";
import { fontFamily } from "@vedic-patro/design-tokens";
import {
  VASTU_ELEMENT_COLOR,
  vastuDirection,
  vastuElementTint,
} from "@vedic-patro/domain/vastu/vastu";
import { RING_SIZE } from "@vedic-patro/domain/vastu/vastu-ring";
import { useHouseSketch } from "@vedic-patro/features/vastu";
import type { Rect, TemplateRoom } from "@vedic-patro/domain/vastu/vastu-house-template";
import type { HouseSketchProps } from "../contract";
import { VastuCompassRing } from "./VastuCompass";
import { ZoomStage } from "../../panchanga/native/ZoomStage";

import { illustration } from "@vedic-patro/design-tokens";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
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
    <G>
      {Array.from({ length: steps - 1 }, (_, i) => {
        const f = (i + 1) / steps;
        return along ? (
          <Line
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
          <Line
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
    </G>
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
    <G transform={`translate(${x} ${y}) rotate(${angle})`}>
      <Line
        x1={-length / 2}
        y1={0}
        x2={length / 2 - head}
        y2={0}
        stroke={DOOR_COLOR}
        strokeOpacity={0.7}
        strokeWidth={1.1 * scale}
      />
      <Path
        d={`M ${length / 2} 0 L ${length / 2 - head} ${-head * 0.55} L ${length / 2 - head} ${head * 0.55} Z`}
        fill={DOOR_COLOR}
        fillOpacity={0.75}
      />
    </G>
  );
}

/** One swatch + caption in the legend under the sketch. */
function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View className={vastuClasses.legendItem}>
      {swatch}
      <Text className={vastuClasses.legendText}>
        {label}
      </Text>
    </View>
  );
}

export function HouseSketch({ size, plot, facing, assignments, ink, center, marks }: HouseSketchProps) {
  const edge = size ?? RING_SIZE;
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
    <View>
      <ZoomStage size={edge}>
      {(dim) => (
      <View style={{ width: dim, height: dim }} className="self-center">
        <View className="absolute inset-0">
          <VastuCompassRing size={dim} center={center} ink={ink} marks={marks} />
        </View>

        <View className="absolute inset-0">
          <Svg
            width={dim}
            height={dim}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            accessibilityLabel={sketch.labels.aria}
            pointerEvents="none"
          >
            <Defs>
              <Pattern
                id={hatchId}
                width={7}
                height={7}
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
              >
                <Line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={7}
                  stroke={VASTU_ELEMENT_COLOR.fire}
                  strokeOpacity={0.35}
                  strokeWidth={1.6}
                />
              </Pattern>
            </Defs>

            <G transform={`translate(${originX} ${originY})`}>
              {/* Room blocks, tinted by the element of the zone they sit in */}
              {plan.rooms.map((room) => (
                <SvgRect
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
              <Path
                d={`M ${px(outer.x)} ${px(outer.y)} h ${px(outer.w)} v ${px(outer.h)} h ${-px(outer.w)} Z M ${px(court.x)} ${px(court.y)} h ${px(court.w)} v ${px(court.h)} h ${-px(court.w)} Z`}
                fillRule="evenodd"
                fill={vastuElementTint("space", 0.16)}
                stroke={ink.text}
                strokeOpacity={0.45}
                strokeWidth={0.9}
              />

              {/* Brahmasthāna — open to the sky, nothing built in it */}
              <SvgRect
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
                  <G key={`${room.id}-label`} pointerEvents="none">
                    <SvgText
                      x={cx}
                      y={cy - (tight ? 0 : 5 * fs)}
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fill={ink.text}
                      fontSize={(tight ? 7.5 : 9.5) * fs}
                      fontFamily={fontFamily.native.bold}
                    >
                      {label(room)}
                    </SvgText>
                    {!tight && (
                      <SvgText
                        x={cx}
                        y={cy + 7 * fs}
                        textAnchor="middle"
                        fill={ink.text}
                        fillOpacity={0.7}
                        fontSize={7.5 * fs}
                        fontFamily={fontFamily.native.regular}
                      >
                        {roomSize(room.rect)}
                      </SvgText>
                    )}
                  </G>
                );
              })}

              {/* Court label */}
              <G pointerEvents="none">
                <SvgText
                  x={courtCx}
                  y={courtCy - 7 * fs}
                  textAnchor="middle"
                  fill={ink.text}
                  fontSize={10 * fs}
                  fontFamily={fontFamily.native.bold}
                >
                  {sketch.labels.brahmasthan}
                </SvgText>
                <SvgText
                  x={courtCx}
                  y={courtCy + 4 * fs}
                  textAnchor="middle"
                  fill={ink.text}
                  fillOpacity={0.75}
                  fontSize={8 * fs}
                  fontFamily={fontFamily.native.regular}
                >
                  {roomSize(court)}
                </SvgText>
                <SvgText
                  x={courtCx}
                  y={courtCy + 14 * fs}
                  textAnchor="middle"
                  fill={DOOR_COLOR}
                  fontSize={8 * fs}
                  fontFamily={fontFamily.native.semibold}
                >
                  {sketch.labels.openToSky}
                </SvgText>
              </G>

              {/* Outer wall */}
              <SvgRect
                x={0}
                y={0}
                width={px(plot.width)}
                height={px(plot.height)}
                fill="none"
                stroke={ink.text}
                strokeWidth={3}
              />

              {/* Main door — the one placement rule this sketch really asserts */}
              <Line
                x1={px(plan.door.x) - (alongWall ? doorHalf : 0)}
                y1={px(plan.door.y) - (alongWall ? 0 : doorHalf)}
                x2={px(plan.door.x) + (alongWall ? doorHalf : 0)}
                y2={px(plan.door.y) + (alongWall ? 0 : doorHalf)}
                stroke={DOOR_COLOR}
                strokeWidth={5 * fs}
                strokeLinecap="round"
              />
            </G>
          </Svg>
        </View>
      </View>
      )}
      </ZoomStage>

      <View className={vastuClasses.sketchCaption}>
        <Text
          className={vastuClasses.sketchSummary}
         
        >
          {sketch.summary}
        </Text>

        <View className={vastuClasses.sketchLegend}>
          <LegendItem
            swatch={
              <View
                className={vastuClasses.legendSwatchCourt}
                style={{ borderColor: DOOR_COLOR, backgroundColor: vastuElementTint("fire", 0.16) }}
              />
            }
            label={sketch.legend[0]!.label}
          />
          <LegendItem
            swatch={
              <View
                className={vastuClasses.legendSwatchAlindra}
                style={{ backgroundColor: vastuElementTint("space", 0.16) }}
              />
            }
            label={sketch.legend[1]!.label}
          />
          <LegendItem
            swatch={
              <View className={vastuClasses.legendSwatchFlow} style={{ backgroundColor: DOOR_COLOR }} />
            }
            label={sketch.legend[2]!.label}
          />
          {sketch.legend.flatMap((item) => ("element" in item ? [item.element] : [])).map((element, i) => (
            <LegendItem
              key={element}
              swatch={
                <View
                  className={vastuClasses.legendSwatchElement}
                  style={{ backgroundColor: vastuElementTint(element, 0.3) }}
                />
              }
              label={sketch.legend[3 + i]!.label}
            />
          ))}
        </View>

        <View className={vastuClasses.sketchRules}>
          {sketch.rules.map((rule) => (
            <Text
              key={rule}
              className={vastuClasses.sketchRuleText}
             
            >
              {rule}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

