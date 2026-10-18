/**
 * The ecliptic wheel from the Learn playground — राशि, नक्षत्र, month circle,
 * polar grid — as one object both scenes mount.
 *
 * Aakash Gochar's space view used to redraw this with its own BeltCircle /
 * BeltDivisions helpers. The 27 नक्षत्र boundaries then vanished the moment
 * the polar grid was off, because that copy never carried Learn's ticks
 * (inner→outer spokes at 13°20′, plus the rashi marks that overshoot the rim).
 * This file *is* that Learn geometry. Both canvases import it.
 */

import { useEffect, useLayoutEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import { MONTH_R, NAK_OUTER, COLOR, ellipseGeometry, makeLine, diagramLine, buildRashiBelt, buildGuideGrid, buildRashiHighlight, buildNakBelt, buildNakHighlight, disposeObject } from "@vedic-patro/domain/learn/ecliptic-wheel-geometry";
export { MONTH_R, BELT_INNER, BELT_OUTER, NAK_INNER, NAK_OUTER } from "@vedic-patro/domain/learn/ecliptic-wheel-geometry";
export { BELT_MID, NAK_MID, ECLIPTIC_GRID_COLOR } from "@vedic-patro/domain/astronomy/sky3d/ecliptic-position";

function buildMonthRing() {
  return diagramLine(makeLine(ellipseGeometry(MONTH_R, MONTH_R), 0xe3d9a8, 0.5));
}

/**
 * The polar grid and the disc it is drawn on, on their own.
 *
 * Separate from the wheel because they answer to a different centre: the belts
 * are a sky ring and hang on the observer, while the grid is a *plane* and
 * belongs to whichever body the reader is watching — so Learn mounts this one
 * on the focused body while the belts stay where the sightlines need them.
 * `innerR` is where the spokes leave that body, and wants to be its radius:
 * started short of the surface it reads as a hole, started past it as a gap.
 */
export function GuideGrid({
  visible = true,
  innerR = 4,
  planeInnerR = 0,
  planeOuterR = NAK_OUTER,
  planeOpacity = 0.7,
  planeColor = COLOR.gridPlane,
  planeY = -0.05,
}: {
  visible?: boolean;
  innerR?: number;
  planeInnerR?: number;
  /** Outer radius of the filled disc. Defaults to the नक्षत्र rim. */
  planeOuterR?: number;
  planeOpacity?: number;
  /**
   * Fill colour of the ecliptic disc. Defaults to {@link COLOR.gridPlane},
   * which is a near-black navy — it was picked to sit under a dark sky, and
   * against a lit backdrop no amount of opacity can make it read, because
   * the darkness is in the *colour*, not the alpha. A scene that needs the
   * plane to be seen passes a real colour instead; see
   * {@link ECLIPTIC_GRID_COLOR}.
   */
  planeColor?: number;
  planeY?: number;
}) {
  const grid = useMemo(() => buildGuideGrid(innerR), [innerR]);
  useEffect(() => () => disposeObject(grid), [grid]);

  return (
    <group position={[0, planeY, 0]}>
      <primitive object={grid} visible={visible} />
      {/* Disc stays up with the belts even when the polar grid is off, so
          the fill still reaches the नक्षत्र rim. renderOrder 0, not −1 —
          at −1 this shared it with the Milky Way backdrop, which draws
          additively with the depth test off. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0} raycast={() => {}}>
        {planeInnerR > 0 ? (
          <ringGeometry args={[planeInnerR, planeOuterR, 64]} />
        ) : (
          <circleGeometry args={[planeOuterR, 64]} />
        )}
        <meshBasicMaterial
          color={planeColor}
          transparent={planeOpacity < 1}
          opacity={planeOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest
        />
      </mesh>
    </group>
  );
}

export type EclipticWheelToggles = {
  grid: boolean;
  rashiBelt: boolean;
  nakshatraBelt: boolean;
  monthRing: boolean;
  /**
   * Fill of the ecliptic disc. Keep below 1 so the disc stays in the
   * transparent pass and bodies behind it read as under the plane.
   */
  planeOpacity?: number;
  /** Fill colour of that disc — see {@link GuideGrid}'s own `planeColor`. */
  planeColor?: number;
  /** Where the polar spokes leave the origin. Learn uses 4; space uses Earth. */
  gridInnerR?: number;
  /**
   * Inner radius of the filled disc. 0 is a full circle (Learn). Space starts
   * at Earth's surface so the fill grows outward from the equator, not through
   * the planet.
   */
  planeInnerR?: number;
  /** Outer radius of the filled disc. Defaults to the नक्षत्र rim. */
  planeOuterR?: number;
  /** Shift the polar disc/grid along ecliptic Y. Learn sits it just under the belts. */
  planeY?: number;
};

/**
 * Learn's ecliptic wheel. Parent supplies the frame (tilt / mesha zero);
 * this only draws the belts in their own plane.
 */
export function EclipticWheel({
  grid,
  rashiBelt,
  nakshatraBelt,
  monthRing,
  planeOpacity = 0.7,
  planeColor,
  gridInnerR = 4,
  planeInnerR = 0,
  planeOuterR = NAK_OUTER,
  planeY = -0.05,
  rashiHighlightRef,
  nakHighlightRef,
}: EclipticWheelToggles & {
  rashiHighlightRef?: Ref<THREE.Mesh | null>;
  nakHighlightRef?: Ref<THREE.Mesh | null>;
}) {
  const parts = useMemo(
    () => ({
      monthRingLine: buildMonthRing(),
      rashiBelt: buildRashiBelt(),
      rashiHighlight: buildRashiHighlight(),
      nakBelt: buildNakBelt(),
      nakHighlight: buildNakHighlight(),
    }),
    [],
  );

  useLayoutEffect(() => {
    const assign = (ref: Ref<THREE.Mesh | null> | undefined, mesh: THREE.Mesh | null) => {
      if (!ref || typeof ref === "function") return;
      ref.current = mesh;
    };
    assign(rashiHighlightRef, parts.rashiHighlight);
    assign(nakHighlightRef, parts.nakHighlight);
    return () => {
      assign(rashiHighlightRef, null);
      assign(nakHighlightRef, null);
    };
  }, [parts, rashiHighlightRef, nakHighlightRef]);

  useEffect(
    () => () => {
      disposeObject(parts.monthRingLine);
      disposeObject(parts.rashiBelt);
      disposeObject(parts.rashiHighlight);
      disposeObject(parts.nakBelt);
      disposeObject(parts.nakHighlight);
    },
    [parts],
  );

  return (
    <>
      <GuideGrid
        visible={grid}
        innerR={gridInnerR}
        planeInnerR={planeInnerR}
        planeOuterR={planeOuterR}
        planeOpacity={planeOpacity}
        planeColor={planeColor}
        planeY={planeY}
      />
      <primitive object={parts.monthRingLine} visible={monthRing} />
      <primitive object={parts.rashiBelt} visible={rashiBelt} />
      <primitive object={parts.rashiHighlight} visible={rashiBelt} position={[0, -0.01, 0]} />
      <primitive object={parts.nakBelt} visible={nakshatraBelt} />
      <primitive object={parts.nakHighlight} visible={nakshatraBelt} position={[0, -0.01, 0]} />
    </>
  );
}
