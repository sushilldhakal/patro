/**
 * The data behind both apps' `components/vastu/HouseSketch.tsx`: the courtyard
 * plan for the plot, its placement inside the compass ring (in ring units),
 * the gallery and arrow anchors, room labels and sizes, the caption, the
 * legend and the rules. Each app draws the SVG and the caption.
 */
import { VASTU_ELEMENT_ORDER, type CardinalWall, type VastuElementId } from "@vedic-patro/domain/vastu";
import { RING_SIZE, houseBoxInRing } from "@vedic-patro/domain/vastu-ring";
import { houseTemplate, type Rect } from "@vedic-patro/domain/vastu-house-template";
import { kindCounts, type PlotSize, type SpaceAssignment } from "@vedic-patro/domain/vastu-plan";
import { useLocale } from "@vedic-patro/i18n/react";

/** Ring-units-per-metre this layout was tuned at — label sizes scale off it. */
const REFERENCE_SCALE = 22;

export type HouseSketchLegendItem =
  | { id: "court" | "alindra" | "flow"; label: string }
  | { id: VastuElementId; label: string; element: VastuElementId };

export function useHouseSketch({
  plot,
  facing,
  assignments,
}: {
  plot: PlotSize;
  facing: CardinalWall;
  assignments: SpaceAssignment[];
}) {
  const { t, digits } = useLocale();
  const plan = houseTemplate(plot, facing, assignments);
  const counts = kindCounts(assignments);

  // The same inscribed box the ring's geometry defines, back in ring units so
  // the plan is drawn in the ring's coordinate space.
  const box = houseBoxInRing(plot.width, plot.height);
  const boxW = (box.widthPct / 100) * RING_SIZE;
  const boxH = (box.heightPct / 100) * RING_SIZE;
  const scale = boxW / plot.width;
  const px = (n: number) => n * scale;

  const court = plan.court;
  const outer = plan.alindraOuter;
  const roomSize = (r: Rect) => t("vastu.plan.room_size", { w: digits(r.w.toFixed(1)), h: digits(r.h.toFixed(1)) });

  return {
    plan,
    ringSize: RING_SIZE,
    originX: (RING_SIZE - boxW) / 2,
    originY: (RING_SIZE - boxH) / 2,
    boxW,
    boxH,
    px,
    /** Font scale for labels, clamped around the tuned layout. */
    fs: Math.min(1.35, Math.max(0.7, scale / REFERENCE_SCALE)),
    courtCx: px(court.x + court.w / 2),
    courtCy: px(court.y + court.h / 2),
    galleryMidX: px(outer.x + outer.w / 2),
    galleryMidY: px(outer.y + outer.h / 2),
    galleryTopY: px((outer.y + court.y) / 2),
    galleryBottomY: px((outer.y + outer.h + court.y + court.h) / 2),
    galleryLeftX: px((outer.x + court.x) / 2),
    galleryRightX: px((outer.x + outer.w + court.x + court.w) / 2),
    arrowLen: px(Math.min(plot.width, plot.height) / 4),
    alongWall: plan.door.wall === "north" || plan.door.wall === "south",
    doorHalf: px(0.55),
    roomLabel: (row: SpaceAssignment) => {
      const many = (counts.get(row.kind) ?? 0) > 1 && row.kind !== "staircase";
      return many && row.index != null
        ? t(`vastu.plan.space.${row.kind}_n`, { n: digits(row.index) })
        : t(`vastu.plan.space.${row.kind}`);
    },
    roomSize,
    summary: `${t("vastu.sketch.door_pada", {
      wall: t(`vastu.dir.${facing}.name`),
      pada: t(`vastu.pada.${plan.door.pada.id}.name`),
      n: digits(plan.door.pada.index),
    })} · ${t("vastu.plan.room_size", { w: digits(plot.width.toFixed(1)), h: digits(plot.height.toFixed(1)) })}`,
    legend: [
      { id: "court", label: t("vastu.sketch.legend_court") },
      { id: "alindra", label: t("vastu.sketch.legend_alindra") },
      { id: "flow", label: t("vastu.sketch.legend_flow") },
      ...VASTU_ELEMENT_ORDER.map((element) => ({ id: element, element, label: t(`vastu.element.${element}`) })),
    ] as HouseSketchLegendItem[],
    rules: [
      t("vastu.sketch.rule_court"),
      t("vastu.sketch.rule_alindra"),
      t("vastu.sketch.rule_flow"),
      t("vastu.sketch.rule_door"),
    ],
    labels: {
      aria: t("vastu.sketch.aria"),
      brahmasthan: t("vastu.sketch.brahmasthan"),
      openToSky: t("vastu.sketch.open_to_sky"),
    },
  };
}
