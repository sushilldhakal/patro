/**
 * The Milky Way as a real HiPS survey — DSS2 Color, tiled by CDS off the
 * original Digitized Sky Survey plates — instead of one fixed-resolution
 * panorama. See `public/sky3d/milkyway-hips/properties.txt` for the
 * catalogue's own metadata; every constant below is read from that file,
 * not guessed.
 *
 * This module owns the HEALPix/HiPS math only: tile paths, tile geometry,
 * which tiles a view needs. It renders nothing itself and knows nothing
 * about क्षितिज, ग्रह, or the rest of the scene — `AakashGocharScene.tsx`
 * mounts a group of tiles built from these functions and rotates it exactly
 * the way it already rotates the Milky Way panorama sphere
 * (`equatorialToHorizonMatrix`), so the two stay in perfect agreement
 * without this file needing to know that rotation exists.
 *
 * HEALPix math itself comes from `healpix-ts` (MIT, zero dependencies, a
 * direct port of Górski et al. 2005's reference algorithm) rather than
 * anything hand-rolled — verified against the published order-0 reference
 * values (base pixel 0 centred at RA 45°, Dec +41.8103°) before a single
 * tile was rendered. HiPS itself always uses the NESTED scheme; confirmed
 * both in `stellarium-web-engine`'s own `hips.c` (its `pix*4+i` child
 * relationship is NESTED's own definition) and directly in this survey's
 * `properties.txt`-adjacent behaviour.
 */

import * as THREE from "three";
import {
  order2nside,
  pixcoord2VecNest,
  cornersNest,
  cornersNestLonLat,
  pix2VecNest,
  maxPixelRadius,
} from "healpix-ts";

/** `hips_tile_width` in `properties.txt` — every tile is a 512×512 JPEG. */
export const HIPS_TILE_WIDTH = 512;

/** `hips_order_min` in `properties.txt`. */
export const HIPS_ORDER_MIN = 0;

/**
 * The deepest order actually downloaded (see `properties.txt`'s own
 * `hips_order = 9` — the survey goes deeper; the local copy does not).
 * Nothing here requests an order past this.
 */
export const HIPS_MAX_LOCAL_ORDER = 3;

/** Where the downloaded tiles live — mirrors the HiPS server's own layout. */
const HIPS_BASE_URL = `${import.meta.env.BASE_URL}sky3d/milkyway-hips`;

/**
 * `obs_copyright` / `hips_copyright` from `properties.txt`, verbatim: the
 * DSS2 Color survey's own required credit line.
 */
export const HIPS_ATTRIBUTION =
  "Digitized Sky Survey — STScI/NASA, Colored & Healpixed by CDS (CNRS/Unistra), ODbL-1.0";

/** How many HEALPix base pixels exist at a given order — `12 · nside²`. */
export function hipsTileCount(order: number): number {
  const nside = order2nside(order);
  return 12 * nside * nside;
}

/**
 * The path a tile's own HiPS metadata says it lives at: `Norder{o}/Dir{d}/
 * Npix{p}.jpg`, `d` rounded down to the nearest 10,000 — the standard HiPS
 * layout, the same one the download script already used, verified by
 * fetching real tiles from the origin server before any of this was
 * written (`Norder0/Dir0/Npix0.jpg` through `Norder3/Dir0/Npix767.jpg`,
 * all 200 OK).
 */
export function hipsTilePath(order: number, pix: number): string {
  const dir = Math.floor(pix / 10000) * 10000;
  return `${HIPS_BASE_URL}/Norder${order}/Dir${dir}/Npix${pix}.jpg`;
}

/** The fallback preview image — the whole order-0–3 sky in one small file. */
export function hipsAllskyPath(): string {
  return `${HIPS_BASE_URL}/Norder${HIPS_MAX_LOCAL_ORDER}/Allsky.jpg`;
}

/**
 * A tile's four corners, RA/Dec degrees, `[north, west, south, east]` —
 * `healpix-ts`'s own `cornersNestLonLat`, with `hips_frame = equatorial`
 * (`properties.txt`) read as [RA, Dec] directly: HEALPix's own "longitude"
 * *is* right ascension for an equatorial-frame survey, no rotation between
 * the two.
 */
export function hipsTileCornersRaDec(order: number, pix: number): [number, number][] {
  const nside = order2nside(order);
  return cornersNestLonLat(nside, pix);
}

/**
 * A tile's four corners as unit vectors in the same equatorial frame
 * {@link buildHipsTileGeometry} bakes its own positions in — for
 * `hips-lod.ts`'s screen-size estimate, which needs real 3D points to run
 * through the camera's actual projection rather than a flat angular size.
 */
export function hipsTileCornerVecs(order: number, pix: number): [number, number, number][] {
  const nside = order2nside(order);
  return cornersNest(nside, pix) as [number, number, number][];
}

/**
 * One tile's geometry, built directly in the same equatorial J2000 unit
 * frame {@link makeMilkyWayGeometry} (`AakashGocharScene.tsx`) already
 * bakes its own sphere in — `pixcoord2VecNest`'s `[X, Y, Z]` uses the
 * identical axis convention (`+Z` the north celestial pole, `+X` toward
 * RA 0°/Dec 0°), confirmed numerically against that function's own formula
 * for a real position (M8: RA 271.5359°, Dec −24.0736°) before this was
 * written. A group of these tiles can therefore share that sphere's own
 * per-frame `equatorialToHorizonMatrix` rotation verbatim — no second
 * coordinate system, no extra rotation to keep in sync.
 *
 * Subdivided into an `n×n` grid rather than one flat quad from the 4
 * corners: a HEALPix pixel is not flat in RA/Dec (most visibly near the
 * poles), and a single quad visibly distorts once the pixel spans more
 * than a few degrees — exactly the failure mode a low `order` tile would
 * hit. `pixcoord2VecNest(nside, pix, ne, nw)` samples the pixel's own true
 * curved interior at every grid vertex instead of interpolating between
 * corners in the wrong (flat) space.
 *
 * UV is `(nw, 1 - ne)` — **not** `(ne, nw)`, which is what this used to be
 * and is wrong. That earlier mapping was checked against the real
 * downloaded tiles by finding two genuinely adjacent pixels (via
 * `pixcoord2VecNest` itself) and comparing their shared boundary under
 * every plausible flip/transpose — e.g. an east/west pair scored 26.7 mean
 * pixel difference for "A's right edge vs B's left edge" against 67–75 for
 * the wrong pairings. That test only proves neighbouring tiles agree with
 * *each other*; a transform applied uniformly to every tile still passes
 * it even when the whole tile set is wrong relative to the sky, because
 * every tile's swapped edge still meets its neighbour's swapped edge.
 *
 * The actual bug surfaced by rendering a real tile (order 3, pix 451, which
 * contains M8) through the true Three.js pipeline and checking where the
 * bright nebula landed relative to a marker placed at M8's real celestial
 * position (RA 271.5359°, Dec −24.0736° → `ne=0.689066 nw=0.416017` in this
 * tile). `stellarium-web-engine`'s own `hips.c` (`render_visitor`) swaps
 * the texture axes relative to the geometry-placement grid — confirmed by
 * fetching and reading the real `src/hips.c`/`src/uv_map.c` source — but a
 * literal `(nw, ne)` swap still measured dark/empty at the marker
 * (mean luma 8.87 in a 24px window) because our texture loader leaves
 * `THREE.Texture.flipY = true` (the default; `loadHipsTileTexture` never
 * overrides it), which Stellarium's own OpenGL path does not carry the
 * same way. Combining the swap with `flipY`'s own `row = (1 - v) * height`
 * gives `(nw, 1 - ne)`, which measured mean luma 72.58 / max 237.2 at the
 * same marker — the bright nebula itself, not background sky — against
 * 8.61 for the old `(ne, nw)` mapping. Cross-checked independently by
 * reading the tile JPEG's own raw pixels directly (bypassing Three.js
 * entirely): the file-space location this predicts scored mean luma 68.22
 * against 7.7–8.9 for every other candidate. Both methods agree.
 *
 * A HEALPix cell's true shape is still not square and departs further from
 * it away from the equator, so a uniform grid still visibly warps a tile at
 * those declinations regardless of which UV formula is used.
 * {@link HIPS_TILE_SUBDIVISIONS} (`AakashGocharScene.tsx`) is the
 * mitigation for that — more grid points sampling the pixel's own true
 * curved interior — not something a UV formula can fix, because the tile
 * image itself was already rendered flat by HipsGen.
 */
export function buildHipsTileGeometry(
  order: number,
  pix: number,
  radius: number,
  subdivisions = 8,
): THREE.BufferGeometry {
  const nside = order2nside(order);
  const n = Math.max(1, subdivisions);
  const rows = n + 1;
  const positions = new Float32Array(rows * rows * 3);
  const uvs = new Float32Array(rows * rows * 2);
  let vi = 0;
  let ui = 0;
  for (let j = 0; j < rows; j += 1) {
    const nw = j / n;
    for (let i = 0; i < rows; i += 1) {
      const ne = i / n;
      const [x, y, z] = pixcoord2VecNest(nside, pix, ne, nw);
      positions[vi++] = x * radius;
      positions[vi++] = y * radius;
      positions[vi++] = z * radius;
      uvs[ui++] = nw;
      uvs[ui++] = 1 - ne;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = j * rows + i;
      const b = a + rows;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * The tile boundary as a closed loop of points on the sphere — for a debug
 * outline, or any other use that wants the pixel's true (curved) edge
 * rather than its 4 corners joined by straight lines.
 */
export function buildHipsTileOutline(
  order: number,
  pix: number,
  radius: number,
  segmentsPerSide = 12,
): THREE.Vector3[] {
  const nside = order2nside(order);
  const out: THREE.Vector3[] = [];
  const edges: [number, number, number, number][] = [
    [0, 0, 1, 0], // south -> east
    [1, 0, 1, 1], // east -> north
    [1, 1, 0, 1], // north -> west
    [0, 1, 0, 0], // west -> south
  ];
  for (const [ne0, nw0, ne1, nw1] of edges) {
    for (let s = 0; s < segmentsPerSide; s += 1) {
      const t = s / segmentsPerSide;
      const ne = ne0 + (ne1 - ne0) * t;
      const nw = nw0 + (nw1 - nw0) * t;
      const [x, y, z] = pixcoord2VecNest(nside, pix, ne, nw);
      out.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }
  }
  out.push(out[0].clone()); // close the loop exactly, not just approximately
  return out;
}

/* ── HEALPix quadtree (Phase 2/3) ─────────────────────────────────────── */

/**
 * A tile's four NESTED children — `pix*4 + i` for `i` in 0..3, one order
 * deeper. NESTED's own definition (confirmed against `stellarium-web-
 * engine`'s `hips.c`, see the module doc comment); nothing to compute
 * beyond the arithmetic itself.
 */
export function getHipsChildren(order: number, pix: number): [number, number][] {
  const base = pix * 4;
  return [
    [order + 1, base],
    [order + 1, base + 1],
    [order + 1, base + 2],
    [order + 1, base + 3],
  ];
}

/** The other three NESTED children of `(order, pix)`'s own parent — Phase 11's prefetch candidates: a leaf tile's siblings are the ones most likely to be needed next on a small pan, at zero extra HEALPix work since they share the parent's own `pix*4+i` arithmetic. Empty at order 0 (no parent to share). */
export function getHipsSiblings(order: number, pix: number): [number, number][] {
  if (order <= 0) return [];
  const parentPix = Math.floor(pix / 4);
  return getHipsChildren(order - 1, parentPix).filter(([, p]) => p !== pix);
}

/**
 * The old global "one order for the whole frame" selector — `fovDeg →
 * order` off a fixed breakpoint table — replaced by the recursive,
 * per-tile, projected-screen-size traversal in `hips-lod.ts`
 * (`evaluateHipsTile`), which is what actually decides refinement now.
 * Removed rather than left unused: keeping a whole-frame order selector
 * around next to a per-tile one invites something reaching for the wrong
 * one later.
 */

/* ── tile visibility (Step 8) ─────────────────────────────────────────── */

/** Half-angle from a tile's centre to its farthest corner, degrees. */
export function hipsTileRadiusDeg(order: number): number {
  return (maxPixelRadius(order2nside(order)) * 180) / Math.PI;
}

/**
 * Every tile at `order` whose centre falls within `coneDeg` (plus the
 * tile's own radius, so a tile is kept the instant any part of it could
 * still be in view rather than only once its centre is) of `dirEquatorial`
 * — the camera's own forward direction, but expressed in the *tiles' own*
 * equatorial frame rather than the horizon frame the camera actually
 * lives in.
 *
 * That one inverse rotation (done once by the caller, not here) is cheaper
 * than rotating every candidate tile's own vector into horizon space to
 * compare against the camera directly, and this file does not need to know
 * the rotation exists either way — see the module doc comment.
 *
 * A conservative test, exactly as the brief allows for: order 3 is at most
 * 768 tiles, cheap enough to walk in full every time the view changes
 * rather than needing a spatial index, and a little margin costs a few
 * extra tiles loaded off-screen, not a hole in the sky.
 *
 * `coneDeg + tileRadius` alone is a rigorous bound *if* `coneDeg` itself
 * never underestimates the frame's real angular reach — but tiles right at
 * that boundary were observed missing in practice (reproducible dark
 * wedges, and on a tall phone screen a whole band across the frame, not a
 * loading race: the tiles simply never made the candidate list). `coneDeg`
 * comes from {@link horizonViewWindow}'s own corner-reach formula, tuned
 * against the grid ruler's roughly-square desktop frame; a phone in
 * portrait reaches much further top-to-bottom relative to its own field
 * than that formula's aspect correction was ever exercised against, so a
 * flat few degrees of slack was nowhere near enough. Scaling the margin
 * with `coneDeg` itself, not just adding a flat buffer, is what actually
 * keeps pace as the frame gets more extreme — a proportionally wider net
 * costs a few more off-screen tiles loaded, never a hole in the sky.
 */
const HIPS_VISIBLE_MARGIN_FACTOR = 1.3;
const HIPS_VISIBLE_EXTRA_MARGIN_DEG = 6;

/** The same margin `hipsVisibleTiles` bakes in, exposed per-tile so the recursive traversal in `hips-lod.ts` can prune a single node without enumerating a whole order. */
export function hipsVisibleConeLimitDeg(order: number, coneDeg: number): number {
  return coneDeg * HIPS_VISIBLE_MARGIN_FACTOR + hipsTileRadiusDeg(order) + HIPS_VISIBLE_EXTRA_MARGIN_DEG;
}

/** Whether one tile could still be in view — see {@link hipsVisibleTiles}'s own doc comment for the margin's reasoning; this is that same test for a single `(order, pix)` instead of a whole order's worth. */
/** Cosine of the angle between a tile's own centre and `dirEquatorial` — 1 dead-on, falling toward -1 the further away. {@link isHipsTileVisible}'s own inner test, exposed separately for {@link hipsTilePriority} (Phase 6) to reuse rather than recomputing the same dot product. */
export function hipsTileCosSep(order: number, pix: number, dirEquatorial: THREE.Vector3): number {
  const nside = order2nside(order);
  const [x, y, z] = pix2VecNest(nside, pix);
  return dirEquatorial.x * x + dirEquatorial.y * y + dirEquatorial.z * z;
}

export function isHipsTileVisible(
  order: number,
  pix: number,
  dirEquatorial: THREE.Vector3,
  coneDeg: number,
): boolean {
  const cosSep = hipsTileCosSep(order, pix, dirEquatorial);
  const cosLimit = Math.cos((hipsVisibleConeLimitDeg(order, coneDeg) * Math.PI) / 180);
  return cosSep >= cosLimit;
}

/**
 * Phase 6: how urgently a tile deserves one of the limited concurrent load
 * slots — higher loads first. Closer to the camera's own view centre wins
 * ("tiles the user is actually looking at first," per the brief); a small
 * bonus for deeper orders breaks ties in favour of the tile actually
 * showing detail over a coarser one sitting at the same screen position
 * during a LOD transition, without letting order dominate over position
 * the way multiplying by `order` outright would.
 */
export function hipsTilePriority(order: number, pix: number, dirEquatorial: THREE.Vector3): number {
  return hipsTileCosSep(order, pix, dirEquatorial) + order * 0.001;
}

export function hipsVisibleTiles(
  order: number,
  dirEquatorial: THREE.Vector3,
  coneDeg: number,
): number[] {
  const n = hipsTileCount(order);
  const out: number[] = [];
  for (let pix = 0; pix < n; pix += 1) {
    if (isHipsTileVisible(order, pix, dirEquatorial, coneDeg)) out.push(pix);
  }
  return out;
}

/* ── tile lifecycle (Steps 9–11) ──────────────────────────────────────── */

/**
 * `evicted` is terminal — {@link evictHipsTiles} deletes the entry from the
 * cache map in the same step it sets this, so nothing actually reads a
 * `HipsTileEntry` sitting in this state; it exists as a value so a mesh
 * mid-disposal (its material/geometry already freed, briefly still
 * reachable through a stale closure or in-flight callback) has an honest
 * state to report rather than silently reporting `idle` and inviting a
 * second load onto disposed GPU objects.
 */
export type HipsTileState = "idle" | "loading" | "ready" | "failed" | "evicted";

/** One tile's live GPU/network state — created lazily, cached by {@link hipsTileKey}. Not immortal any more (Phase 9): {@link evictHipsTiles} can reclaim one that has fallen out of use, unlike the original "whole order 0–3 set is 45MB, keep it all forever" design. */
export type HipsTileEntry = {
  order: number;
  pix: number;
  state: HipsTileState;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  /** Which ancestor order {@link fallbackTexture} was built from, or `null`
   *  if this tile is currently showing its own texture. See {@link
   *  ensureHipsFallbackTexture}. */
  fallbackAncestorOrder: number | null;
  /** A cloned-and-cropped view of an ancestor's texture, standing in while
   *  this tile's own texture is still loading. Owns its own GPU-side
   *  `THREE.Texture` object (for an independent `offset`/`repeat`) but
   *  shares the ancestor's `.source`, so cloning costs no extra upload —
   *  see {@link ensureHipsFallbackTexture}'s own doc comment. */
  fallbackTexture: THREE.Texture | null;
  /** The frame counter (see {@link touchHipsTile}) this entry was last part of the LOD traversal — {@link evictHipsTiles}'s recency clock. Not a timestamp: frame count is what "still in use" actually means here, and comparing counts sidesteps clock/timer-precision questions entirely. */
  lastUsedFrame: number;
  /** `performance.now()` when a load attempt last failed, or `null` if it never has — {@link loadHipsTileTexture}'s retry-cooldown gate. */
  failedAt: number | null;
  /** `performance.now()` when this entry's own real texture (not a Phase 1 fallback) last became ready — Phase 8's fade-in timer. `null` before the first real arrival. */
  readyAt: number | null;
};

/** The cache key a tile lives under — `"order/pix"`. */
export function hipsTileKey(order: number, pix: number): string {
  return `${order}/${pix}`;
}

/** How many tile fetches may be in flight at once — see `loadNebulaTexture`'s own identical reasoning in `AakashGocharScene.tsx`; the same trade-off applies here. */
export const HIPS_MAX_CONCURRENT_LOADS = 4;

let hipsLoadsInFlight = 0;

/** How many fetches this module currently has in flight — for a debug HUD. */
export function hipsLoadsInFlightCount(): number {
  return hipsLoadsInFlight;
}

/**
 * Creates (or returns the already-cached) mesh for one tile. Geometry and
 * material only — no texture yet, and the mesh starts invisible; the
 * caller (the scene) owns adding it to its own group and deciding when it
 * should actually show, the same division of labour {@link ensureHipsTile}
 * name is meant to signal: this makes sure the *object* exists, nothing
 * about whether it belongs on screen this frame.
 */
/**
 * Real DSS2 tiles are individual photographic plates, each with its own
 * exposure and colour balance — CDS's own colouring pass narrows that gap
 * but does not erase it, so two neighbouring tiles from different plates
 * can meet at a visibly harder edge than anything in the sky itself. A
 * plain edge-to-edge tile grid puts that seam at full opacity, which reads
 * as a bug (an unnaturally straight "cut" through the Milky Way) even
 * though every pixel on both sides is genuine image data.
 *
 * Fading each tile's own opacity out near its border — in `ne`/`nw` space,
 * so the fade width is proportional regardless of order — softens that
 * edge into whatever is drawn underneath: the parent-order tile from the
 * crossfade (Step 11), which is coarser but the same DSS2 family and
 * usually closer in tone, or the panorama for an order-0 tile with no
 * parent. Normal blending is what makes that reveal work — `diffuseColor.a`
 * fading to 0 lets the frame behind show through rather than just dimming
 * this tile's own colour toward black.
 */
function injectHipsEdgeFeather(material: THREE.MeshBasicMaterial): void {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    if (shader.fragmentShader.includes("hipsEdgeFeather")) return;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
#ifdef USE_UV
  float hipsEdgeFeather = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  gl_FragColor.a *= smoothstep(0.0, 0.06, hipsEdgeFeather);
#endif
  #include <dithering_fragment>`,
    );
  };
  material.needsUpdate = true;
}

/**
 * @param frame The scene's own per-frame counter ({@link nextHipsFrame}) —
 *   recorded on the entry every call, hit or miss, so {@link
 *   evictHipsTiles} can tell "still in use this frame" from "not touched in
 *   a while" without any wall-clock timer.
 */
export function ensureHipsTile(
  cache: Map<string, HipsTileEntry>,
  order: number,
  pix: number,
  radius: number,
  subdivisions = 8,
  frame = 0,
): HipsTileEntry {
  const key = hipsTileKey(order, pix);
  const existing = cache.get(key);
  if (existing) {
    existing.lastUsedFrame = frame;
    return existing;
  }
  const geometry = buildHipsTileGeometry(order, pix, radius, subdivisions);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    /* `BackSide` is what a viewer standing inside the panorama sphere
       wants — same as {@link makeMilkyWayGeometry}'s own sphere — but
       HEALPix base pixels are rotated four different ways around the
       sky (NESTED's own `pixcoord2VecNest` ne/nw axes do not wind the
       same way in every base pixel), so a single fixed triangle index
       order in `buildHipsTileGeometry` cannot match `BackSide`'s
       expected winding for all twelve of them at once. `BackSide` alone
       silently back-face-culled every tile — nothing rendered even
       though position, texture, and the fisheye shader patch were all
       correct (confirmed by forcing `DoubleSide` and watching a `ff00ff`
       debug tint fill the whole dome). `DoubleSide` costs nothing
       noticeable for an 8×8-subdivided patch and needs no per-base-pixel
       winding table. */
    side: THREE.DoubleSide,
    toneMapped: false,
    /* Tried `AdditiveBlending` here on the theory that it would let the
       panorama's own brightness keep showing through underneath, the same
       way it already lets stars glow through it (see the panorama
       sphere's own doc comment in `AakashGocharScene.tsx`). In practice a
       real DSS2 tile's "black" sky background is not actually zero —
       photographic noise, sky glow in the plate itself — so *every* pixel
       added a little more on top of the panorama's own glow rather than
       just the stars doing it, and the result was a flat, washed-out
       brownish haze with none of a plain tile's own contrast left.
       `NormalBlending` (the default, so nothing to set here) is what a
       photograph wants: each tile replaces what is behind it with its own
       real exposure, which is the crisp result the tile viewer was
       already giving before this was tried. See {@link
       HIPS_BLEND_START_FOV}/{@link HIPS_BLEND_END_FOV} in
       `AakashGocharScene.tsx` for the actual fix to "the panorama
       disappears the instant a tile loads" — a two-layer cross-fade
       across a field-of-view band, not a blend mode that changes what
       every tile looks like everywhere. */
  });
  injectHipsEdgeFeather(material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const entry: HipsTileEntry = {
    order,
    pix,
    state: "idle",
    mesh,
    material,
    fallbackAncestorOrder: null,
    fallbackTexture: null,
    lastUsedFrame: frame,
    failedAt: null,
    readyAt: null,
  };
  cache.set(key, entry);
  return entry;
}

let hipsFrameCounter = 0;

/** Advances and returns the scene's per-frame counter — call once per `useFrame`, before touching any tile this frame, so every {@link ensureHipsTile} call this frame stamps the same value. */
export function nextHipsFrame(): number {
  hipsFrameCounter += 1;
  return hipsFrameCounter;
}

/**
 * Stellarium's `hips_get_tile_texture()` parent-fallback (`src/hips.c`),
 * adapted to our `(nw, 1 - ne)` UV convention and expressed as Three.js's
 * native `texture.offset`/`texture.repeat` instead of a hand-rolled shader
 * transform — that pair already computes exactly `sampledUV = uv * repeat +
 * offset` in the built-in shader chunk, which is precisely the scale+
 * translate this needs.
 *
 * The quadrant arithmetic itself (`pix % 4` picking one quarter of the
 * parent) is Stellarium's own `(pix%4)/2, (pix%4)%2` — but which axis each
 * of those lands on, combined with our own `(nw, 1-ne)` convention rather
 * than Stellarium's, is not something the C source states directly and
 * was not assumed here. Verified empirically: cropped a real downloaded
 * parent tile (order 2, pix 112) into its four quadrants under this exact
 * formula and compared each against all four of its real, already-
 * downloaded children (order 3, pix 448–451, `childIndex = pix % 4` 0–3).
 * Every child scored >0.999 correlation against exactly the quadrant this
 * formula predicts for its own `childIndex`, and ~0 or negative against
 * the other three — `childIndex` 0,1,2,3 → `(tx,ty)` `(0,0),(0,1),(1,0),
 * (1,1)`, `tx` on the nw/column axis, `ty` on the ne/row axis.
 *
 * Composes across more than one level (grandparent, great-grandparent…) by
 * walking up one order at a time: each step is `next = 0.5*next + newOff`,
 * `repeat *= 0.5`, which is the standard "compose a chain of scale+
 * translate maps" accumulation — verified algebraically by expanding two
 * steps by hand (`u2 = 0.5*(0.5*u0+off1)+off2 = 0.25*u0 + 0.5*off1 +
 * off2`, matching what the loop below produces for two iterations).
 */
export function hipsAncestorUvTransform(
  order: number,
  pix: number,
  ancestorOrder: number,
): { repeat: number; offsetX: number; offsetY: number } {
  let repeat = 1;
  let offsetX = 0;
  let offsetY = 0;
  let o = order;
  let p = pix;
  while (o > ancestorOrder) {
    const q = p % 4;
    const tx = q >> 1;
    const ty = q & 1;
    offsetX = 0.5 * offsetX + 0.5 * tx;
    offsetY = 0.5 * offsetY + 0.5 * (1 - ty);
    repeat *= 0.5;
    p = Math.floor(p / 4);
    o -= 1;
  }
  return { repeat, offsetX, offsetY };
}

/**
 * Points `entry` at a cropped view of `ancestorTexture` (an already-loaded
 * texture from `entry`'s own ancestor chain, `ancestorOrder` levels up) via
 * {@link hipsAncestorUvTransform}, so its mesh shows the right quadrant of
 * the parent — not the whole parent stretched — while its own tile is
 * still loading.
 *
 * Cheap to call every frame: `THREE.Texture.clone()` shares the source
 * ancestor's `.source` (confirmed in the installed three@0.185.1's own
 * `Texture.prototype.copy`, `this.source = source.source`), which is what
 * `WebGLTextures` keys its GPU cache on — cloning never re-uploads. Still
 * only clones when the ancestor actually changed (`fallbackAncestorOrder`
 * mismatch), not every call, and disposes the outgoing clone so the GPU
 * side doesn't accumulate one-per-frame.
 */
export function ensureHipsFallbackTexture(
  entry: HipsTileEntry,
  ancestorTexture: THREE.Texture,
  ancestorOrder: number,
): THREE.Texture {
  if (entry.fallbackAncestorOrder === ancestorOrder && entry.fallbackTexture) {
    return entry.fallbackTexture;
  }
  const { repeat, offsetX, offsetY } = hipsAncestorUvTransform(entry.order, entry.pix, ancestorOrder);
  const tex = ancestorTexture.clone();
  tex.repeat.set(repeat, repeat);
  tex.offset.set(offsetX, offsetY);
  tex.colorSpace = ancestorTexture.colorSpace;
  tex.needsUpdate = true;
  entry.fallbackTexture?.dispose();
  entry.fallbackTexture = tex;
  entry.fallbackAncestorOrder = ancestorOrder;
  return tex;
}

/** Releases `entry`'s fallback texture (if any) and clears the tracking fields — called once the tile's own real texture takes over, or the tile is discarded. */
export function clearHipsFallbackTexture(entry: HipsTileEntry): void {
  entry.fallbackTexture?.dispose();
  entry.fallbackTexture = null;
  entry.fallbackAncestorOrder = null;
}

/**
 * Walks up from `(order, pix)`'s immediate parent through its
 * grandparent, great-grandparent, etc. — `Stellarium`'s own recursive
 * search in `hips_get_tile_texture()` — and returns the first ancestor
 * entry already `"ready"` in `cache`, or `null` if none of them are (an
 * order-0 ancestor with nothing loaded yet, e.g. right at startup).
 *
 * Only finds ancestors that already have a cache entry — i.e. that some
 * caller has already run through {@link ensureHipsTile} at least once.
 * The scene proactively does this for every order-0 tile (cheap: 12
 * total) as soon as the HiPS layer turns on, so a fallback is available
 * almost immediately rather than only once the immediate parent order
 * happens to have loaded.
 */
export function findReadyHipsAncestor(
  cache: Map<string, HipsTileEntry>,
  order: number,
  pix: number,
): HipsTileEntry | null {
  let o = order - 1;
  let p = Math.floor(pix / 4);
  while (o >= 0) {
    const entry = cache.get(hipsTileKey(o, p));
    if (entry && entry.state === "ready" && entry.material.map) return entry;
    p = Math.floor(p / 4);
    o -= 1;
  }
  return null;
}

/**
 * Starts fetching one tile's texture, the first time anything actually
 * needs it — mirrors `loadNebulaTexture`'s own reasoning in
 * `AakashGocharScene.tsx` almost exactly: lazy, capped concurrency, a
 * failed tile is left `failed` rather than retried every frame.
 */
/** How long a failed tile sits out before {@link loadHipsTileTexture} will retry it — long enough that a real, still-broken URL doesn't get hammered every frame, short enough that a transient network blip during a fast pan recovers within the same viewing session. */
export const HIPS_FAILED_RETRY_COOLDOWN_MS = 15000;

/**
 * Whether `entry` is worth a load attempt right now — `idle`, or `failed`
 * past its own cooldown. The one place this decision is made: {@link
 * loadHipsTileTexture} uses it as its own early-return gate, and the
 * scene's per-frame candidate collection (`AakashGocharScene.tsx`) uses it
 * to decide whether a tile belongs in this frame's priority queue at all.
 * Duplicating "idle or cooled-down-failed" in both places invites exactly
 * the bug this function replaced: the candidate list checking only `idle`
 * meant a `failed` tile past its cooldown could sit in the cache forever,
 * since `loadHipsTileTexture` was willing to retry it but nothing was ever
 * calling that function on it again.
 */
export function hipsTileNeedsLoad(entry: HipsTileEntry): boolean {
  if (entry.state === "idle") return true;
  return (
    entry.state === "failed" &&
    entry.failedAt !== null &&
    performance.now() - entry.failedAt >= HIPS_FAILED_RETRY_COOLDOWN_MS
  );
}

/**
 * Its own manager, never the shared `THREE.DefaultLoadingManager` — tiles
 * stream in continuously as the view pans and zooms, long after the scene
 * has finished its initial load. Reporting to the default manager made a
 * global "is anything loading" overlay elsewhere in the app (see
 * `AakashGocharSky.tsx`) flash back in on every pinch-zoom, since a fresh
 * batch of tile fetches looks identical to that manager as the page's own
 * first-load textures starting over.
 */
const hipsLoadingManager = new THREE.LoadingManager();

export function loadHipsTileTexture(entry: HipsTileEntry): void {
  if (!hipsTileNeedsLoad(entry)) return;
  if (hipsLoadsInFlight >= HIPS_MAX_CONCURRENT_LOADS) return;
  entry.state = "loading";
  hipsLoadsInFlight += 1;
  new THREE.TextureLoader(hipsLoadingManager).load(
    hipsTilePath(entry.order, entry.pix),
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      entry.material.map = tex;
      entry.material.needsUpdate = true;
      entry.state = "ready";
      entry.readyAt = performance.now();
      clearHipsFallbackTexture(entry);
      hipsLoadsInFlight = Math.max(0, hipsLoadsInFlight - 1);
    },
    undefined,
    () => {
      entry.state = "failed";
      entry.failedAt = performance.now();
      hipsLoadsInFlight = Math.max(0, hipsLoadsInFlight - 1);
    },
  );
}

/**
 * Frees every GPU-side resource an entry holds — geometry, material (and
 * with it, `map` if it points at this tile's *own* texture rather than a
 * shared ancestor's — see the guard below), and any {@link
 * ensureHipsFallbackTexture} clone — and detaches the mesh from whatever
 * group it was in. Does not touch the cache map itself; {@link
 * evictHipsTiles} deletes the entry separately, and disposal is also what
 * a full teardown (unmount) wants without necessarily going through
 * eviction's "is it still needed" logic.
 *
 * The one thing this must *not* do is dispose a texture some other entry
 * currently has cloned out for its own Phase 1 fallback: `fallbackTexture`
 * clones share their ancestor's `.source` (see {@link
 * ensureHipsFallbackTexture}), but disposing the *ancestor's own* `THREE.
 * Texture` object still frees that shared source's GPU upload out from
 * under every clone still pointing at it. Evicting a tile currently serving
 * as someone else's fallback ancestor is exactly what {@link
 * evictHipsTiles}'s own protection set exists to prevent — this function
 * trusts that guarantee rather than re-deriving it.
 */
export function disposeHipsTile(entry: HipsTileEntry): void {
  entry.mesh.removeFromParent();
  entry.mesh.geometry.dispose();
  entry.material.map?.dispose();
  entry.material.dispose();
  entry.fallbackTexture?.dispose();
  entry.state = "evicted";
}

/**
 * Phase 9's LRU cache: reclaims entries {@link ensureHipsTile} hasn't
 * touched in a while, once the cache holds more than `maxResident`.
 *
 * `protectedKeys` is the caller's job to build correctly, not this
 * function's — it needs to know both this frame's LOD leaves *and* every
 * ancestor {@link findReadyHipsAncestor} could still reach for one of them
 * (which the recursive traversal's own `onVisit` already touches, so
 * "touched this frame" and "protected" end up the same set in practice —
 * see `AakashGocharScene.tsx`'s own per-frame block). A tile mid-`loading`
 * is protected unconditionally regardless of `protectedKeys`: disposing a
 * mesh a `TextureLoader` callback is still going to write into later would
 * either throw or silently leak a texture with nowhere left to attach.
 *
 * Evicts strictly least-recently-used first (by {@link
 * HipsTileEntry.lastUsedFrame}) until at or under budget, or until nothing
 * left is safe to take.
 */
export function evictHipsTiles(
  cache: Map<string, HipsTileEntry>,
  protectedKeys: ReadonlySet<string>,
  maxResident: number,
): number {
  if (cache.size <= maxResident) return 0;
  const candidates: HipsTileEntry[] = [];
  for (const entry of cache.values()) {
    if (entry.state === "loading") continue;
    if (protectedKeys.has(hipsTileKey(entry.order, entry.pix))) continue;
    candidates.push(entry);
  }
  candidates.sort((a, b) => a.lastUsedFrame - b.lastUsedFrame);
  const overBudget = cache.size - maxResident;
  const toEvict = candidates.slice(0, Math.max(0, overBudget));
  for (const entry of toEvict) {
    disposeHipsTile(entry);
    cache.delete(hipsTileKey(entry.order, entry.pix));
  }
  return toEvict.length;
}

/**
 * Step-14 debug HUD data — the scene lives inside the Canvas and this app
 * has no DOM-overlay bridge into it (no `Html` from drei anywhere in this
 * codebase's sky3d tree), while the HUD itself is plain DOM markup drawn by
 * the parent page outside the Canvas. A mutable module singleton is the
 * simplest bridge: the scene overwrites it in place once per frame (only
 * while debug is on), and the HUD polls it on an interval. Deliberately not
 * React state on the write side — this runs inside `useFrame` and must never
 * trigger a re-render of the 3D scene.
 */
/** One rendered leaf, for the per-tile debug listing (Step 12). */
export interface HipsDebugTile {
  order: number;
  pix: number;
  state: HipsTileState | "fallback";
  screenPx: number;
}

export interface HipsDebugSnapshot {
  on: boolean;
  fovDeg: number;
  /** The lowest and highest order actually present among this frame's leaves — `-1` for both when nothing is on screen. Two different numbers here is the direct proof the recursive traversal (Phase 2/3) is choosing different resolutions in different parts of the frame, not one order for everything. */
  minOrderPresent: number;
  maxOrderPresent: number;
  maxOrder: number;
  refinePixels: number;
  leafCount: number;
  readyCount: number;
  loadingCount: number;
  fallbackCount: number;
  cachedCount: number;
  inFlight: number;
  /** Capped list of the actual leaves this frame, for the "O3 P451 READY 184px" style per-tile readout. */
  tiles: HipsDebugTile[];
}

const HIPS_DEBUG_TILE_LIST_CAP = 60;

const hipsDebugSnapshot: HipsDebugSnapshot = {
  on: false,
  fovDeg: 0,
  minOrderPresent: -1,
  maxOrderPresent: -1,
  maxOrder: HIPS_MAX_LOCAL_ORDER,
  refinePixels: 0,
  leafCount: 0,
  readyCount: 0,
  loadingCount: 0,
  fallbackCount: 0,
  cachedCount: 0,
  inFlight: 0,
  tiles: [],
};

export function writeHipsDebugSnapshot(next: Omit<HipsDebugSnapshot, "on" | "maxOrder">): void {
  hipsDebugSnapshot.on = true;
  hipsDebugSnapshot.fovDeg = next.fovDeg;
  hipsDebugSnapshot.minOrderPresent = next.minOrderPresent;
  hipsDebugSnapshot.maxOrderPresent = next.maxOrderPresent;
  hipsDebugSnapshot.refinePixels = next.refinePixels;
  hipsDebugSnapshot.leafCount = next.leafCount;
  hipsDebugSnapshot.readyCount = next.readyCount;
  hipsDebugSnapshot.loadingCount = next.loadingCount;
  hipsDebugSnapshot.fallbackCount = next.fallbackCount;
  hipsDebugSnapshot.cachedCount = next.cachedCount;
  hipsDebugSnapshot.inFlight = next.inFlight;
  hipsDebugSnapshot.tiles = next.tiles.slice(0, HIPS_DEBUG_TILE_LIST_CAP);
}

export function clearHipsDebugSnapshot(): void {
  hipsDebugSnapshot.on = false;
}

export function readHipsDebugSnapshot(): HipsDebugSnapshot {
  return hipsDebugSnapshot;
}

