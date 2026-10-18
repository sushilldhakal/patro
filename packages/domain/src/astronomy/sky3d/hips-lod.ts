/**
 * The recursive HEALPix quadtree walk that picks which tiles actually
 * render this frame — `stellarium-web-engine`'s `hips_render()` /
 * `render_visitor()`, reproduced in TypeScript rather than ported: start
 * at the 12 order-0 base pixels, and at each visible node decide whether
 * *this* tile's own resolution is still enough for how large it currently
 * projects on screen. If not, recurse into its four children instead of
 * rendering it — so two tiles at the same true order can end up at
 * different final orders once their subtrees are walked, exactly the
 * "centre of view finer, edge coarser" behaviour a global FOV→order table
 * (the thing this replaces, `hipsOrderForFov` — since removed from
 * `hips.ts`) could never produce, because that table's decision never
 * depended on *where in the frame* a tile actually was.
 *
 * Split out from `hips.ts` on purpose: that module is deliberately camera-
 * and scene-agnostic (see its own doc comment), but a screen-size estimate
 * has no meaning without a camera, a projection, and the live rotation the
 * tile group is sitting at — all scene state. This module is the seam
 * between the two: it imports `hips.ts`'s pure HEALPix math and
 * `horizon-projection.ts`'s screen projection, and knows nothing about
 * loading, caching, or materials — `AakashGocharScene.tsx` still owns all
 * of that, same as before.
 */

import * as THREE from "three";
import { projectHorizonRaw } from "./horizon-projection";
import { getHipsChildren, hipsTileCornerVecs, isHipsTileVisible } from "./hips";

/**
 * How many screen pixels a tile's own projected footprint has to exceed
 * before its 512×512 source image is worth trading for four finer ones.
 * Not derived from a formula — `properties.txt`'s tile width is the only
 * hard number here, everything past it is "how much upscaling looks
 * acceptable before the next order is worth the extra requests," which is
 * a visual judgement call. 220px sits below the 256 the brief's own range
 * tops out at: refining a beat earlier reads as sharper detail arriving
 * sooner without measurably more tiles in flight at once, since the
 * concurrency cap (`HIPS_MAX_CONCURRENT_LOADS`) bounds that regardless of
 * how eagerly nodes ask to refine. A single exported constant rather than
 * a number buried in the traversal, so it can be tuned from one place —
 * see `HIPS_MAX_LOCAL_ORDER` in `hips.ts` for the other half of "how much
 * detail," the hard ceiling on how deep refinement can go at all.
 */
export const HIPS_TILE_REFINE_PIXELS = 220;

/** Everything {@link getHipsTileScreenSizePx} needs to turn a tile's own unit-sphere corners into an actual screen-pixel footprint, gathered once per frame by the caller rather than threaded through every recursive call individually. */
export type HipsLodFrame = {
  camera: THREE.Camera;
  /** The HiPS tile group's own current rotation — mirrors the star sphere's `equatorialToHorizonMatrix`, applied here to turn a tile's equatorial-frame corner into the world-space point the camera actually sees. */
  groupQuaternion: THREE.Quaternion;
  groupPosition: THREE.Vector3;
  radius: number;
  fovDeg: number;
  width: number;
  height: number;
};

const scratchWorld = new THREE.Vector3();
const scratchCam = new THREE.Vector3();

/**
 * A corner this many radians or more from the camera's own forward
 * direction is excluded from the bounding-box estimate below rather than
 * trusted at face value — `projectHorizonRaw`'s stereographic radius is
 * `2·tan(θ/2)`, finite but growing without bound as θ approaches π, so a
 * corner out here is not a large-but-real screen position, it is the
 * projection formula itself blowing up.
 *
 * Not a cosmetic margin — a real, measured bug, found and fixed twice.
 * First attempt excluded corners by projected *pixel* distance from frame
 * centre instead of by angle, which fixed the blow-up (order-0 pix 5 measured
 * 6082px, order-1 pix 23 8506px, order-2 pix 95 12564px on a 1280px canvas,
 * before either fix existed) but broke narrow-FOV refinement: at a tight 5°
 * field a legitimately huge order-0 tile has *most* of its corners far
 * outside the frame in pixels — not because of the singularity, but simply
 * because the tile is enormous relative to a 5° window — and a pixel-radius
 * cutoff threw those away too, collapsing the bounding box to a single
 * point and reporting the tile as "small." Radians distinguish the two
 * cases a pixel distance cannot: a corner is only ever a numerical artefact
 * near θ→π, regardless of the current FOV, while "far outside the frame in
 * pixels because the tile is huge" is exactly the signal refinement needs
 * to see. `2.44` (140°) leaves real headroom below `projectHorizonRaw`'s
 * own 175° (`THETA_MAX`) cutoff, where `tan(θ/2)` is already past 5× its
 * value at 90° — comfortably past any tile this app's own order-0..3 set
 * would need to measure honestly, short of the singularity itself.
 */
const HIPS_SCREEN_SIZE_THETA_LIMIT = 2.44;

/**
 * A tile's projected screen-space footprint, pixels — the larger of its
 * bounding box's width or height, from its four true corners run through
 * the actual current camera and fisheye projection.
 *
 * Real per-vertex projection rather than a flat "degrees × pixels-per-
 * degree" estimate on purpose: this app's dome uses a stereographic-style
 * warp (`projectHorizonRaw`, `2·tan(θ/2)`) whose screen density is *not*
 * uniform across the frame the way a rectilinear camera's roughly is — a
 * tile near the edge of a wide field can project *larger* than one of the
 * same true angular size at the centre, not smaller, because that warp's
 * own magnification grows with θ. A uniform scalar would get the
 * direction of that effect wrong, not just its magnitude; projecting the
 * real corners costs four `projectHorizonRaw` calls but needs no
 * assumption about where in the frame a tile sits.
 *
 * Corners are individually sanity-checked against {@link
 * HIPS_SCREEN_SIZE_THETA_LIMIT} — see that constant's own doc comment for
 * the real, measured blow-up this guards against.
 *
 * Returns 0 for a tile whose corners all fall outside the projectable
 * range (behind the camera, past `projectHorizonRaw`'s own cutoff, or past
 * the corner-sanity limit above) — treated as "small," which only matters
 * for tiles the visibility test upstream already let through near its own
 * margin, where under-refining costs a slightly coarser edge tile rather
 * than a hole.
 */
export function getHipsTileScreenSizePx(order: number, pix: number, frame: HipsLodFrame): number {
  const corners = hipsTileCornerVecs(order, pix);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hit = false;
  for (const [x, y, z] of corners) {
    scratchWorld
      .set(x * frame.radius, y * frame.radius, z * frame.radius)
      .applyQuaternion(frame.groupQuaternion)
      .add(frame.groupPosition);
    /* Same view-space transform + theta `projectHorizonRaw` computes
       internally, duplicated here rather than exposed from that function,
       so a corner past {@link HIPS_SCREEN_SIZE_THETA_LIMIT} can be
       excluded *before* trusting its (potentially blown-up) projected
       position — see that constant's own doc comment for why pixel
       distance alone can't tell the two failure modes apart. */
    scratchCam.copy(scratchWorld).applyMatrix4(frame.camera.matrixWorldInverse);
    const rxy = Math.hypot(scratchCam.x, scratchCam.y);
    const theta = Math.atan2(rxy, -scratchCam.z);
    if (theta > HIPS_SCREEN_SIZE_THETA_LIMIT) continue;
    const p = projectHorizonRaw(scratchWorld, frame.camera, frame.fovDeg, frame.width, frame.height, scratchCam);
    if (!p) continue;
    hit = true;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!hit) return 0;
  return Math.max(maxX - minX, maxY - minY);
}

/** Whether `(order, pix)` is still worth splitting into its four children — under the order ceiling, and large enough on screen right now that a 512px source image is starting to show it. */
export function shouldRefineHipsTile(order: number, pix: number, frame: HipsLodFrame, maxOrder: number): boolean {
  if (order >= maxOrder) return false;
  return getHipsTileScreenSizePx(order, pix, frame) > HIPS_TILE_REFINE_PIXELS;
}

/** One leaf of the traversal — the order/pix a screen region should actually render at this frame. */
export type HipsLodLeaf = { order: number; pix: number };

/**
 * Walks `(order, pix)` and its descendants, culling anything outside
 * `coneDeg` of `dirEquatorial` (`hips.ts`'s own cone test, per tile rather
 * than a whole order at once) and refining anything still too coarse for
 * its own projected size, down to `maxOrder`.
 *
 * `onVisit` fires for *every* node the walk actually looks at — including
 * ones that go on to refine into children — not just the leaves: a tile
 * being split into four still needs its own texture requested, so it can
 * stand in as the Phase 1 fallback for whichever of its children haven't
 * loaded yet (`findReadyHipsAncestor` in `hips.ts` only finds an ancestor
 * that already has a cache entry). Leaves are collected into `out`, which
 * the caller reuses across frames rather than this function allocating a
 * fresh array every call.
 */
export function evaluateHipsTile(
  order: number,
  pix: number,
  frame: HipsLodFrame,
  dirEquatorial: THREE.Vector3,
  coneDeg: number,
  maxOrder: number,
  onVisit: (order: number, pix: number) => void,
  out: HipsLodLeaf[],
): void {
  if (!isHipsTileVisible(order, pix, dirEquatorial, coneDeg)) return;
  onVisit(order, pix);
  if (shouldRefineHipsTile(order, pix, frame, maxOrder)) {
    for (const [childOrder, childPix] of getHipsChildren(order, pix)) {
      evaluateHipsTile(childOrder, childPix, frame, dirEquatorial, coneDeg, maxOrder, onVisit, out);
    }
    return;
  }
  out.push({ order, pix });
}

/** How many HEALPix base pixels the walk always starts from — order 0 is always exactly 12, by HEALPix's own construction (`12·nside²`, `nside=1`), not something worth importing `hipsTileCount(0)` to recompute every frame for. */
const HIPS_BASE_PIXEL_COUNT = 12;

/**
 * The whole traversal, from all 12 order-0 roots — the caller doesn't
 * need to enumerate or visibility-test the roots itself, {@link
 * evaluateHipsTile} already does that as the first thing it does for
 * every node, roots included.
 */
export function evaluateHipsTiles(
  frame: HipsLodFrame,
  dirEquatorial: THREE.Vector3,
  coneDeg: number,
  maxOrder: number,
  onVisit: (order: number, pix: number) => void,
  out: HipsLodLeaf[],
): void {
  out.length = 0;
  for (let pix = 0; pix < HIPS_BASE_PIXEL_COUNT; pix += 1) {
    evaluateHipsTile(0, pix, frame, dirEquatorial, coneDeg, maxOrder, onVisit, out);
  }
}
