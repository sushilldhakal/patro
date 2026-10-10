/**
 * The Milky Way as a real HiPS survey — DSS2 Color, tiled by CDS off the
 * original Digitized Sky Survey plates — instead of one fixed-resolution
 * panorama. Line-for-line port of the web app's `src/lib/sky3d/hips.ts`; see
 * that file's own doc comment for the full derivation (M8 UV verification,
 * the parent-fallback quadrant math, the edge-feather reasoning). Only
 * {@link HIPS_BASE_URL} is native-specific — everything else is plain
 * TypeScript/three.js math with nothing DOM-specific to change for
 * `expo-gl`, the same reasoning `earth-material.ts` already documents for
 * itself.
 *
 * — native — `THREE.TextureLoader.prototype.load` is patched globally by
 * `@react-three/fiber/native` (confirmed by reading that package's own
 * source), routing any URL — bundler module ref *or* a plain remote
 * `https://` string — through `expo-asset`'s `Asset.fromModule().
 * downloadAsync()`, which fetches it to local storage before creating the
 * texture. So {@link loadHipsTileTexture} below needs no native-specific
 * rewrite at all: the same `new THREE.TextureLoader().load(url, …)` call
 * web already makes works unchanged on both platforms.
 *
 * See `public/sky3d/milkyway-hips/properties.txt` in the web repo for the
 * catalogue's own metadata; every constant below is read from that file,
 * not guessed.
 */

import { Platform } from "react-native";
import * as THREE from "three";
import Constants from "expo-constants";
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

/**
 * — native — The tiles themselves are not bundled into the app (the local
 * order 0–3 set is ~45MB, and Metro's `require()` needs a static, literal
 * path per file — it cannot resolve a dynamically-built `Norder{o}/Npix{p}`
 * string at runtime the way a `require.context` would). They are fetched
 * from the same production host the web app already serves them from —
 * `public/sky3d/milkyway-hips/` in `dhakal-patro`, deployed as plain static
 * files, verified reachable directly (`curl -I` returned 200) before this
 * was written. Native ignores CORS and can hit that host directly; the web
 * *build* of this app runs on the same origin as the API and gets CORS for
 * free the same way. Only the web *dev* server (`expo start --web`, served
 * from `localhost`) needs the same-origin proxy `metro.config.js` sets up
 * for `/sky3d/*` — see that file's own doc comment, which extends the exact
 * proxy already there for `/api/*`.
 */
const HIPS_PROD_HOST = "https://www.vedicpatro.com";
const HIPS_BASE_URL =
  Platform.OS === "web" && __DEV__
    ? "/sky3d/milkyway-hips"
    : `${(Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(/\/api\/?$/, "") ?? HIPS_PROD_HOST}/sky3d/milkyway-hips`;

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
 * layout, verified against the web app's own copy of these same files.
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
 * frame the Milky Way panorama sphere bakes its own sphere in
 * (`makeMilkyWayGeometry`, `AakashGocharScene.tsx`) — `pixcoord2VecNest`'s
 * `[X, Y, Z]` uses the identical axis convention (`+Z` the north celestial
 * pole, `+X` toward RA 0°/Dec 0°), so a group of these tiles can share that
 * sphere's own per-frame `equatorialToHorizonMatrix` rotation verbatim.
 *
 * Subdivided into an `n×n` grid rather than one flat quad from the 4
 * corners, and UV is `(nw, 1 - ne)` — see the web `hips.ts`'s own doc
 * comment for the full M8-verified derivation of both; reproduced here
 * unchanged since neither depends on anything DOM- or platform-specific.
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
 * rather than its 4 corners joined by straight lines. Ported for parity
 * with the web module; nothing in this app's own scene calls it yet.
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

/* ── HEALPix quadtree ──────────────────────────────────────────────────── */

/**
 * A tile's four NESTED children — `pix*4 + i` for `i` in 0..3, one order
 * deeper.
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

/** The other three NESTED children of `(order, pix)`'s own parent — prefetch candidates. Empty at order 0 (no parent to share). */
export function getHipsSiblings(order: number, pix: number): [number, number][] {
  if (order <= 0) return [];
  const parentPix = Math.floor(pix / 4);
  return getHipsChildren(order - 1, parentPix).filter(([, p]) => p !== pix);
}

/* ── tile visibility ───────────────────────────────────────────────────── */

/** Half-angle from a tile's centre to its farthest corner, degrees. */
export function hipsTileRadiusDeg(order: number): number {
  return (maxPixelRadius(order2nside(order)) * 180) / Math.PI;
}

/**
 * Every tile at `order` whose centre falls within `coneDeg` (plus the
 * tile's own radius) of `dirEquatorial` — see the web `hips.ts`'s own doc
 * comment for the margin's full reasoning (the reproducible dark-wedge bug
 * a flat margin left, and why it scales with `coneDeg` instead).
 */
const HIPS_VISIBLE_MARGIN_FACTOR = 1.3;
const HIPS_VISIBLE_EXTRA_MARGIN_DEG = 6;

/** The same margin `hipsVisibleTiles` bakes in, exposed per-tile so the recursive traversal in `hips-lod.ts` can prune a single node without enumerating a whole order. */
export function hipsVisibleConeLimitDeg(order: number, coneDeg: number): number {
  return coneDeg * HIPS_VISIBLE_MARGIN_FACTOR + hipsTileRadiusDeg(order) + HIPS_VISIBLE_EXTRA_MARGIN_DEG;
}

/** Cosine of the angle between a tile's own centre and `dirEquatorial` — 1 dead-on, falling toward -1 the further away. */
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
 * How urgently a tile deserves one of the limited concurrent load slots —
 * higher loads first. Closer to the camera's own view centre wins; a small
 * bonus for deeper orders breaks ties in favour of detail over a coarser
 * tile at the same screen position during a LOD transition.
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

/* ── tile lifecycle ────────────────────────────────────────────────────── */

/**
 * `evicted` is terminal — {@link evictHipsTiles} deletes the entry from the
 * cache map in the same step it sets this.
 */
export type HipsTileState = "idle" | "loading" | "ready" | "failed" | "evicted";

/** One tile's live GPU/network state — created lazily, cached by {@link hipsTileKey}, reclaimable by {@link evictHipsTiles}. */
export type HipsTileEntry = {
  order: number;
  pix: number;
  state: HipsTileState;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  /** Which ancestor order {@link HipsTileEntry.fallbackTexture} was built from, or `null` if this tile is currently showing its own texture. */
  fallbackAncestorOrder: number | null;
  /** A cloned-and-cropped view of an ancestor's texture, standing in while this tile's own texture is still loading. */
  fallbackTexture: THREE.Texture | null;
  /** The frame counter this entry was last part of the LOD traversal — {@link evictHipsTiles}'s recency clock. */
  lastUsedFrame: number;
  /** `performance.now()` when a load attempt last failed, or `null` if it never has — {@link loadHipsTileTexture}'s retry-cooldown gate. */
  failedAt: number | null;
  /** `performance.now()` when this entry's own real texture last became ready — the fade-in timer. `null` before the first real arrival. */
  readyAt: number | null;
};

/** The cache key a tile lives under — `"order/pix"`. */
export function hipsTileKey(order: number, pix: number): string {
  return `${order}/${pix}`;
}

/** How many tile fetches may be in flight at once. */
export const HIPS_MAX_CONCURRENT_LOADS = 4;

let hipsLoadsInFlight = 0;

/** How many fetches this module currently has in flight. */
export function hipsLoadsInFlightCount(): number {
  return hipsLoadsInFlight;
}

/**
 * Real DSS2 tiles are individual photographic plates with their own
 * exposure and colour balance, so two neighbouring tiles can meet at a
 * visibly harder edge than anything in the sky itself. Fading each tile's
 * own opacity out near its border — in `ne`/`nw` space, so the fade width
 * is proportional regardless of order — softens that edge into whatever is
 * drawn underneath. See the web `hips.ts`'s own doc comment for the full
 * reasoning; the shader patch itself is identical.
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
    /* `DoubleSide`, not `BackSide` — HEALPix base pixels are rotated four
       different ways around the sky, so a single fixed triangle winding in
       `buildHipsTileGeometry` cannot match `BackSide`'s expected winding
       for all twelve of them at once. See the web `hips.ts`'s own doc
       comment: `BackSide` alone silently back-face-culled every tile. */
    side: THREE.DoubleSide,
    toneMapped: false,
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
 * Stellarium's `hips_get_tile_texture()` parent-fallback, adapted to our
 * `(nw, 1 - ne)` UV convention and expressed as Three.js's native
 * `texture.offset`/`texture.repeat`. See the web `hips.ts`'s own doc
 * comment for the empirical quadrant verification against real downloaded
 * tiles (order 2 pix 112 vs its four order-3 children).
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
 * Points `entry` at a cropped view of `ancestorTexture` via {@link
 * hipsAncestorUvTransform}, so its mesh shows the right quadrant of the
 * parent while its own tile is still loading. Cheap to call every frame:
 * `THREE.Texture.clone()` shares the source ancestor's `.source`, so
 * cloning never re-uploads.
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
 * Walks up from `(order, pix)`'s immediate parent through its grandparent,
 * great-grandparent, etc. and returns the first ancestor entry already
 * `"ready"` in `cache`, or `null` if none of them are.
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

/** How long a failed tile sits out before {@link loadHipsTileTexture} will retry it. */
export const HIPS_FAILED_RETRY_COOLDOWN_MS = 15000;

/**
 * Whether `entry` is worth a load attempt right now — `idle`, or `failed`
 * past its own cooldown. The one place this decision is made, so the
 * scene's per-frame candidate collection and {@link loadHipsTileTexture}
 * itself never disagree about which tiles are eligible.
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
 * Starts fetching one tile's texture, the first time anything actually
 * needs it. See this file's own header comment: `TextureLoader.load` is
 * patched globally by `@react-three/fiber/native`, so this same call
 * fetches over the network and creates a real GPU texture on both
 * platforms, no branch needed here.
 */
export function loadHipsTileTexture(entry: HipsTileEntry): void {
  if (!hipsTileNeedsLoad(entry)) return;
  if (hipsLoadsInFlight >= HIPS_MAX_CONCURRENT_LOADS) return;
  entry.state = "loading";
  hipsLoadsInFlight += 1;
  new THREE.TextureLoader().load(
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
 * Frees every GPU-side resource an entry holds and detaches the mesh from
 * whatever group it was in. Does not touch the cache map itself; {@link
 * evictHipsTiles} deletes the entry separately.
 *
 * Must not dispose a texture some other entry currently has cloned out for
 * its own fallback: {@link evictHipsTiles}'s own protection set is what
 * prevents evicting a tile still serving as someone else's fallback
 * ancestor — this function trusts that guarantee rather than re-deriving it.
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
 * The LRU cache: reclaims entries {@link ensureHipsTile} hasn't touched in
 * a while, once the cache holds more than `maxResident`. `protectedKeys` is
 * the caller's job to build correctly — this frame's LOD leaves and every
 * ancestor {@link findReadyHipsAncestor} could still reach for one of them.
 * A tile mid-`loading` is protected unconditionally regardless of
 * `protectedKeys`. Evicts strictly least-recently-used first.
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

