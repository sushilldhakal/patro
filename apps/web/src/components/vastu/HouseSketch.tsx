import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import {
  VASTU_ELEMENT_COLOR,
  VASTU_ELEMENT_ORDER,
  VASTU_INK,
  vastuDirection,
  vastuElementTint,
  type CardinalWall,
} from "@vedic-patro/domain/vastu";
import { RING_SIZE, houseBoxInRing } from "@/lib/vastu-ring";
import { houseTemplate, type Rect, type TemplateRoom } from "@/lib/vastu-house-template";
import { kindCounts, type PlotSize, type SpaceAssignment } from "@vedic-patro/domain/vastu-plan";
import { VastuCompassRing } from "./VastuCompassRing";

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
            stroke={VASTU_INK.text}
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
            stroke={VASTU_INK.text}
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

export function HouseSketch({
  plot,
  facing,
  assignments,
}: {
  plot: PlotSize;
  facing: CardinalWall;
  assignments: SpaceAssignment[];
}) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const hatchId = `vastu-court-${useId().replace(/:/g, "")}`;

  const plan = houseTemplate(plot, facing, assignments);
  const counts = kindCounts(assignments);

  // The same inscribed box the ring's geometry defines, back in ring units so
  // the plan is drawn *in* the ring's SVG rather than layered over it.
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
  const size = (r: Rect) =>
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
    <figure className="m-0">
      <div className="relative mx-auto aspect-square w-full max-w-[900px]">
        <VastuCompassRing className="absolute inset-0 h-full w-full" />

        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="absolute inset-0 h-full w-full"
          overflow="visible"
          role="img"
          aria-label={t("vastu.sketch.aria")}
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
                stroke={VASTU_INK.text}
                strokeOpacity={0.55}
                strokeWidth={0.9}
              />
            ))}

            {/* Ālindra — the covered gallery ringing the court on all four sides */}
            <path
              d={`M ${px(outer.x)} ${px(outer.y)} h ${px(outer.w)} v ${px(outer.h)} h ${-px(outer.w)} Z M ${px(court.x)} ${px(court.y)} h ${px(court.w)} v ${px(court.h)} h ${-px(court.w)} Z`}
              fillRule="evenodd"
              fill={vastuElementTint("space", 0.16)}
              stroke={VASTU_INK.text}
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
                <g key={`${room.id}-label`} className="pointer-events-none select-none">
                  <text
                    x={cx}
                    y={cy - (tight ? 0 : 5 * fs)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={VASTU_INK.text}
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
                      fill={VASTU_INK.text}
                      fillOpacity={0.7}
                      fontSize={7.5 * fs}
                    >
                      {size(room.rect)}
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
                fill={VASTU_INK.text}
                fontSize={10 * fs}
                fontWeight={700}
              >
                {t("vastu.sketch.brahmasthan")}
              </text>
              <text
                x={courtCx}
                y={courtCy + 4 * fs}
                textAnchor="middle"
                fill={VASTU_INK.text}
                fillOpacity={0.75}
                fontSize={8 * fs}
              >
                {size(court)}
              </text>
              <text
                x={courtCx}
                y={courtCy + 14 * fs}
                textAnchor="middle"
                fill={DOOR_COLOR}
                fontSize={8 * fs}
                fontWeight={600}
              >
                {t("vastu.sketch.open_to_sky")}
              </text>
            </g>

            {/* Outer wall */}
            <rect
              x={0}
              y={0}
              width={px(plot.width)}
              height={px(plot.height)}
              fill="none"
              stroke={VASTU_INK.text}
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

      <figcaption className="mx-auto mt-2 max-w-[900px] space-y-2">
        <p className="text-center text-xs font-semibold text-foreground sm:text-sm">
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
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-[2px] border border-dashed"
              style={{ borderColor: DOOR_COLOR, backgroundColor: vastuElementTint("fire", 0.16) }}
            />
            {t("vastu.sketch.legend_court")}
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-[2px] border border-black/20"
              style={{ backgroundColor: vastuElementTint("space", 0.16) }}
            />
            {t("vastu.sketch.legend_alindra")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: DOOR_COLOR }} />
            {t("vastu.sketch.legend_flow")}
          </li>
          {VASTU_ELEMENT_ORDER.map((element) => (
            <li key={element} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-[3px] border border-black/15"
                style={{ backgroundColor: vastuElementTint(element, 0.3) }}
              />
              {t(`vastu.element.${element}`)}
            </li>
          ))}
        </ul>

        <ul className="space-y-1 rounded-lg border border-border bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          <li>{t("vastu.sketch.rule_court")}</li>
          <li>{t("vastu.sketch.rule_alindra")}</li>
          <li>{t("vastu.sketch.rule_flow")}</li>
          <li>{t("vastu.sketch.rule_door")}</li>
        </ul>
      </figcaption>
    </figure>
  );
}

export default HouseSketch;
