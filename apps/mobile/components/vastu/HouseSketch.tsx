/**
 * A rough Vāstu house sketch: the classical courtyard plan, drawn inside the
 * compass ring. Native counterpart of the web app's
 * `src/components/vastu/HouseSketch.tsx`.
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
 * with layout views: everything then scales together, and the arrows,
 * hatching and dashed court boundary are SVG's job anyway. The ring and the
 * plan are two `Svg`s of the same edge length stacked in one `View`, which is
 * how the web copy stacks its two absolutely-positioned `<svg>`s.
 */

import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, G, Line, Path, Pattern, Rect as SvgRect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_REGULAR, NOTO_DEVANAGARI_SEMIBOLD } from "@/lib/fonts";
import { nepaliSvgTextCenter, nepaliTextStyle } from "@/lib/nepali-text";
import {
  VASTU_ELEMENT_COLOR,
  VASTU_ELEMENT_ORDER,
  VASTU_INK,
  vastuDirection,
  vastuElementTint,
  type CardinalWall,
} from "@vedic-patro/domain/vastu";
import { RING_SIZE, houseBoxInRing } from "@/lib/vastu-ring";
import { houseTemplate, type Rect, type TemplateRoom } from "@vedic-patro/domain/vastu-house-template";
import { kindCounts, type PlotSize, type SpaceAssignment } from "@vedic-patro/domain/vastu-plan";
import { VastuCompassRing } from "./VastuCompassRing";

const DOOR_COLOR = "#C0392B";
/** Ring-units-per-metre this layout was tuned at — label sizes scale off it. */
const REFERENCE_SCALE = 22;

type PxFn = (n: number) => number;

function roomTint(room: TemplateRoom): string {
  return vastuElementTint(vastuDirection(room.zone).element, 0.3);
}

/** Stair treads, so a staircase reads as one rather than as an empty room. */
function StairTreads({ rect, px }: { rect: Rect; px: PxFn }) {
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
            stroke={VASTU_INK.text}
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
            stroke={VASTU_INK.text}
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
    <View className="flex-row items-center gap-1.5">
      {swatch}
      <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11, { dense: true })}>
        {label}
      </Text>
    </View>
  );
}

export function HouseSketch({
  size,
  plot,
  facing,
  assignments,
}: {
  /** Rendered edge length in points, shared by the ring and the plan. */
  size: number;
  plot: PlotSize;
  facing: CardinalWall;
  assignments: SpaceAssignment[];
}) {
  const { t, digits } = useLocale();
  const hatchId = `vastu-court-${useId().replace(/:/g, "")}`;

  const plan = houseTemplate(plot, facing, assignments);
  const counts = kindCounts(assignments);

  // The same inscribed box the ring's geometry defines, back in ring units so
  // the plan is drawn *in* the ring's coordinate space rather than layered
  // over it in points.
  const box = houseBoxInRing(plot.width, plot.height);
  const boxW = (box.widthPct / 100) * RING_SIZE;
  const boxH = (box.heightPct / 100) * RING_SIZE;
  const originX = (RING_SIZE - boxW) / 2;
  const originY = (RING_SIZE - boxH) / 2;
  const scale = boxW / plot.width;
  const px: PxFn = (n) => n * scale;
  const fs = Math.min(1.35, Math.max(0.7, scale / REFERENCE_SCALE));

  const label = (row: SpaceAssignment) => {
    const many = (counts.get(row.kind) ?? 0) > 1 && row.kind !== "staircase";
    return many && row.index != null
      ? t(`vastu.plan.space.${row.kind}_n`, { n: digits(row.index) })
      : t(`vastu.plan.space.${row.kind}`);
  };
  const roomSize = (r: Rect) =>
    t("vastu.plan.room_size", { w: digits(r.w.toFixed(1)), h: digits(r.h.toFixed(1)) });

  const court = plan.court;
  const outer = plan.alindraOuter;
  const courtCx = px(court.x + court.w / 2);
  const courtCy = px(court.y + court.h / 2);
  const galleryMidX = px(outer.x + outer.w / 2);
  const galleryMidY = px(outer.y + outer.h / 2);
  const galleryTopY = px((outer.y + court.y) / 2);
  const galleryBottomY = px((outer.y + outer.h + court.y + court.h) / 2);
  const galleryLeftX = px((outer.x + court.x) / 2);
  const galleryRightX = px((outer.x + outer.w + court.x + court.w) / 2);
  const arrowLen = px(Math.min(plot.width, plot.height) / 4);
  const alongWall = plan.door.wall === "north" || plan.door.wall === "south";
  const doorHalf = px(0.55);

  return (
    <View>
      <View style={{ width: size, height: size }} className="self-center">
        <View className="absolute inset-0">
          <VastuCompassRing size={size} />
        </View>

        <View className="absolute inset-0">
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            accessibilityLabel={t("vastu.sketch.aria")}
            pointerEvents="none"
          >
            {/* @ts-expect-error react-native-svg Defs children typing */}
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
                  stroke={VASTU_INK.text}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                />
              ))}

              {/* Ālindra — the covered gallery ringing the court on all four sides */}
              <Path
                d={`M ${px(outer.x)} ${px(outer.y)} h ${px(outer.w)} v ${px(outer.h)} h ${-px(outer.w)} Z M ${px(court.x)} ${px(court.y)} h ${px(court.w)} v ${px(court.h)} h ${-px(court.w)} Z`}
                fillRule="evenodd"
                fill={vastuElementTint("space", 0.16)}
                stroke={VASTU_INK.text}
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
                  <StairTreads key={`${room.id}-tread`} rect={room.rect} px={px} />
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
                      {...nepaliSvgTextCenter}
                      fill={VASTU_INK.text}
                      fontSize={(tight ? 7.5 : 9.5) * fs}
                      fontFamily={NOTO_DEVANAGARI_BOLD}
                    >
                      {label(room)}
                    </SvgText>
                    {!tight && (
                      <SvgText
                        x={cx}
                        y={cy + 7 * fs}
                        textAnchor="middle"
                        fill={VASTU_INK.text}
                        fillOpacity={0.7}
                        fontSize={15 * fs}
                        fontFamily={NOTO_DEVANAGARI_REGULAR}
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
                  fill={VASTU_INK.text}
                  fontSize={15 * fs}
                  fontFamily={NOTO_DEVANAGARI_BOLD}
                >
                  {t("vastu.sketch.brahmasthan")}
                </SvgText>
                <SvgText
                  x={courtCx}
                  y={courtCy + 4 * fs}
                  textAnchor="middle"
                  fill={VASTU_INK.text}
                  fillOpacity={0.75}
                  fontSize={15 * fs}
                  fontFamily={NOTO_DEVANAGARI_REGULAR}
                >
                  {roomSize(court)}
                </SvgText>
                <SvgText
                  x={courtCx}
                  y={courtCy + 14 * fs}
                  textAnchor="middle"
                  fill={DOOR_COLOR}
                  fontSize={15 * fs}
                  fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                >
                  {t("vastu.sketch.open_to_sky")}
                </SvgText>
              </G>

              {/* Outer wall */}
              <SvgRect
                x={0}
                y={0}
                width={px(plot.width)}
                height={px(plot.height)}
                fill="none"
                stroke={VASTU_INK.text}
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

      <View className="mt-2 gap-2">
        <Text
          className="text-body text-center font-semibold text-foreground"
          style={nepaliTextStyle(13)}
        >
          {t("vastu.sketch.door_pada", {
            wall: t(`vastu.dir.${facing}.name`),
            pada: t(`vastu.pada.${plan.door.pada.id}.name`),
            n: digits(plan.door.pada.index),
          })}
          {" · "}
          {t("vastu.plan.room_size", {
            w: digits(plot.width.toFixed(1)),
            h: digits(plot.height.toFixed(1)),
          })}
        </Text>

        <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <LegendItem
            swatch={
              <View
                className="h-2.5 w-4 rounded-[2px] border border-dashed"
                style={{ borderColor: DOOR_COLOR, backgroundColor: vastuElementTint("fire", 0.16) }}
              />
            }
            label={t("vastu.sketch.legend_court")}
          />
          <LegendItem
            swatch={
              <View
                className="h-2.5 w-4 rounded-[2px] border border-black/20"
                style={{ backgroundColor: vastuElementTint("space", 0.16) }}
              />
            }
            label={t("vastu.sketch.legend_alindra")}
          />
          <LegendItem
            swatch={
              <View className="h-0.5 w-4 rounded-full" style={{ backgroundColor: DOOR_COLOR }} />
            }
            label={t("vastu.sketch.legend_flow")}
          />
          {VASTU_ELEMENT_ORDER.map((element) => (
            <LegendItem
              key={element}
              swatch={
                <View
                  className="h-2.5 w-2.5 rounded-[3px] border border-black/15"
                  style={{ backgroundColor: vastuElementTint(element, 0.3) }}
                />
              }
              label={t(`vastu.element.${element}`)}
            />
          ))}
        </View>

        <View className="gap-1 rounded-lg border border-border bg-background px-3 py-2">
          {(["rule_court", "rule_alindra", "rule_flow", "rule_door"] as const).map((rule) => (
            <Text
              key={rule}
              className="text-caption text-muted-foreground"
              style={nepaliTextStyle(11, { dense: true })}
            >
              {t(`vastu.sketch.${rule}`)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default HouseSketch;
