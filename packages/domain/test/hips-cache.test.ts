import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  disposeAllHipsTiles,
  disposeHipsTile,
  ensureHipsFallbackTexture,
  ensureHipsTile,
  evictHipsTiles,
  hipsLoadsInFlightCount,
  hipsTileKey,
  loadHipsTileTexture,
  stepHipsIdleRelease,
  type HipsIdleState,
  type HipsTileEntry,
} from "../src/astronomy/sky3d/hips.ts";

const RADIUS = 398;
const SUBDIV = 2; // geometry detail is irrelevant here; keep the tests fast

type Cache = Map<string, HipsTileEntry>;

/** A texture that counts how many times it was disposed. */
function spyTexture(): THREE.Texture & { disposed: number } {
  const tex = new THREE.Texture() as THREE.Texture & { disposed: number };
  tex.disposed = 0;
  tex.addEventListener("dispose", () => {
    tex.disposed += 1;
  });
  return tex;
}

function addTile(cache: Cache, order: number, pix: number, frame: number, state: HipsTileEntry["state"] = "ready") {
  const entry = ensureHipsTile(cache, order, pix, RADIUS, SUBDIV, frame);
  entry.state = state;
  if (state === "ready") entry.material.map = spyTexture();
  return entry;
}

function fillOrder0(cache: Cache, frame = 0) {
  for (let p = 0; p < 12; p += 1) addTile(cache, 0, p, frame);
}

const keys = (...pairs: [number, number][]) => new Set(pairs.map(([o, p]) => hipsTileKey(o, p)));

test("eviction never disposes a protected tile, even far over budget", () => {
  const cache: Cache = new Map();
  fillOrder0(cache, 1);
  const visible = [addTile(cache, 1, 0, 1), addTile(cache, 1, 1, 1), addTile(cache, 1, 2, 1)];
  const protectedKeys = new Set([...Array.from({ length: 12 }, (_, p) => hipsTileKey(0, p)), ...visible.map((e) => hipsTileKey(e.order, e.pix))]);

  const evicted = evictHipsTiles(cache, protectedKeys, 4); // budget far below the protected set
  assert.equal(evicted, 0);
  assert.equal(cache.size, 15);
  for (const e of visible) {
    assert.equal((e.material.map as ReturnType<typeof spyTexture>).disposed, 0);
    assert.notEqual(e.state, "evicted");
  }
});

test("eviction is least-recently-used first and stops at the budget", () => {
  const cache: Cache = new Map();
  const tiles = [0, 1, 2, 3, 4, 5].map((p) => addTile(cache, 2, p, 10 + p)); // frame == recency
  const evicted = evictHipsTiles(cache, new Set(), 4);
  assert.equal(evicted, 2);
  assert.equal(cache.size, 4);
  assert.equal(tiles[0]!.state, "evicted");
  assert.equal(tiles[1]!.state, "evicted");
  for (const t of tiles.slice(2)) assert.equal(t.state, "ready");
});

test("a tile that is still loading is never evicted", () => {
  const cache: Cache = new Map();
  const loading = addTile(cache, 3, 7, 1, "loading");
  addTile(cache, 3, 8, 2);
  evictHipsTiles(cache, new Set(), 0);
  assert.equal(loading.state, "loading");
  assert.ok(cache.has(hipsTileKey(3, 7)));
  assert.equal(cache.size, 1);
});

test("evicting a tile frees only its own geometry, material and textures", () => {
  const cache: Cache = new Map();
  const keep = addTile(cache, 2, 0, 5);
  const drop = addTile(cache, 2, 1, 1);
  const keepTex = keep.material.map as ReturnType<typeof spyTexture>;
  const dropTex = drop.material.map as ReturnType<typeof spyTexture>;
  let geometryDisposed = 0;
  let materialDisposed = 0;
  drop.mesh.geometry.addEventListener("dispose", () => (geometryDisposed += 1));
  drop.material.addEventListener("dispose", () => (materialDisposed += 1));

  evictHipsTiles(cache, keys([2, 0]), 1);

  assert.equal(dropTex.disposed, 1);
  assert.equal(geometryDisposed, 1);
  assert.equal(materialDisposed, 1);
  assert.equal(keepTex.disposed, 0);
  assert.equal(keep.state, "ready");
  assert.equal(drop.mesh.parent, null);
});

test("a child's fallback clone is its own Texture: evicting the ancestor does not dispose the clone", () => {
  // The GPU upload is reference-counted per Texture object by three, so what matters
  // here is that eviction touches only the ancestor's object, leaving the clone to
  // be disposed by (and only by) the child that owns it.
  const cache: Cache = new Map();
  const ancestor = addTile(cache, 1, 0, 1);
  const child = addTile(cache, 2, 0, 9, "loading");
  const ancestorTex = ancestor.material.map as THREE.Texture;
  const clone = ensureHipsFallbackTexture(child, ancestorTex, 1) as ReturnType<typeof spyTexture>;
  clone.disposed = 0;
  clone.addEventListener("dispose", () => (clone.disposed += 1));
  assert.notEqual(clone, ancestorTex);
  assert.equal(clone.source, ancestorTex.source, "clone shares the decoded source");

  evictHipsTiles(cache, new Set(), 1); // ancestor is the only evictable tile

  assert.equal(ancestor.state, "evicted");
  assert.equal(clone.disposed, 0);
  assert.equal(child.fallbackTexture, clone);
});

test("disposing a tile twice is harmless", () => {
  const cache: Cache = new Map();
  const e = addTile(cache, 2, 3, 1);
  const tex = e.material.map as ReturnType<typeof spyTexture>;
  disposeHipsTile(e);
  disposeHipsTile(e);
  assert.equal(e.state, "evicted");
  assert.ok(tex.disposed >= 1);
});

test("disposeAllHipsTiles empties the cache and the cache can be reused (Strict Mode remount)", () => {
  const cache: Cache = new Map();
  fillOrder0(cache);
  addTile(cache, 1, 4, 1);
  addTile(cache, 1, 5, 1, "loading");

  assert.equal(disposeAllHipsTiles(cache), 14);
  assert.equal(cache.size, 0);
  assert.equal(disposeAllHipsTiles(cache), 0, "second call is a no-op");

  const fresh = ensureHipsTile(cache, 0, 0, RADIUS, SUBDIV, 99);
  assert.equal(fresh.state, "idle");
  assert.equal(cache.size, 1);
});

test("a load that lands after its tile was disposed frees its texture and releases its slot", () => {
  const original = THREE.TextureLoader.prototype.load;
  let onLoad: ((t: THREE.Texture) => void) | undefined;
  let onError: ((e: unknown) => void) | undefined;
  (THREE.TextureLoader.prototype as unknown as { load: unknown }).load = function (
    _url: string,
    ok: (t: THREE.Texture) => void,
    _progress: unknown,
    err: (e: unknown) => void,
  ) {
    onLoad = ok;
    onError = err;
    return new THREE.Texture();
  };
  try {
    const before = hipsLoadsInFlightCount();
    const cache: Cache = new Map();
    const entry = ensureHipsTile(cache, 1, 1, RADIUS, SUBDIV, 1);
    loadHipsTileTexture(entry);
    assert.equal(entry.state, "loading");
    assert.equal(hipsLoadsInFlightCount(), before + 1);

    disposeAllHipsTiles(cache); // scene unmounted mid-fetch
    assert.equal(entry.state, "evicted");

    const late = spyTexture();
    onLoad!(late);
    assert.equal(late.disposed, 1, "the decoded texture is freed, not left attached to nothing");
    assert.equal(entry.state, "evicted", "must not resurrect to ready");
    assert.equal(entry.material.map, null, "must not attach a texture to a disposed material");
    assert.equal(hipsLoadsInFlightCount(), before, "the concurrency slot is given back");

    // Same for the failure path.
    const entry2 = ensureHipsTile(cache, 1, 2, RADIUS, SUBDIV, 2);
    loadHipsTileTexture(entry2);
    disposeAllHipsTiles(cache);
    onError!(new Error("network"));
    assert.equal(entry2.state, "evicted");
    assert.equal(hipsLoadsInFlightCount(), before);
  } finally {
    (THREE.TextureLoader.prototype as unknown as { load: unknown }).load = original;
  }
});

/* ── idle release: the "8 second" behaviour ─────────────────────────────── */

function idleFixture() {
  const cache: Cache = new Map();
  fillOrder0(cache);
  for (let p = 0; p < 6; p += 1) addTile(cache, 2, p, 1);
  const idle: HipsIdleState = { offSince: null };
  return { cache, idle };
}

test("idle release: nothing happens while the layer is on, and the clock stays reset", () => {
  const { cache, idle } = idleFixture();
  assert.equal(stepHipsIdleRelease(cache, idle, true, 1_000, 8_000), 0);
  assert.equal(stepHipsIdleRelease(cache, idle, true, 100_000, 8_000), 0);
  assert.equal(idle.offSince, null);
  assert.equal(cache.size, 18);
});

test("idle release: starts the clock on the first off frame, releases only after the delay", () => {
  const { cache, idle } = idleFixture();
  assert.equal(stepHipsIdleRelease(cache, idle, false, 1_000, 8_000), 0);
  assert.equal(idle.offSince, 1_000);
  assert.equal(stepHipsIdleRelease(cache, idle, false, 8_999, 8_000), 0, "7.999s: not yet");
  assert.equal(cache.size, 18);
  assert.equal(stepHipsIdleRelease(cache, idle, false, 9_001, 8_000), 6);
  assert.equal(cache.size, 12);
  for (let p = 0; p < 12; p += 1) assert.ok(cache.has(hipsTileKey(0, p)), "order-0 floor survives");
});

test("idle release: reactivating before the delay cancels it", () => {
  const { cache, idle } = idleFixture();
  stepHipsIdleRelease(cache, idle, false, 1_000, 8_000);
  stepHipsIdleRelease(cache, idle, false, 7_000, 8_000);
  stepHipsIdleRelease(cache, idle, true, 7_500, 8_000); // zoomed back in
  assert.equal(idle.offSince, null);
  // Zooming out again starts a fresh 8s, measured from the new off frame.
  stepHipsIdleRelease(cache, idle, false, 8_000, 8_000);
  assert.equal(stepHipsIdleRelease(cache, idle, false, 15_000, 8_000), 0, "only 7s since the new off frame");
  assert.equal(cache.size, 18);
});

test("idle release: after a long render-loop pause with the layer still off, the next frame releases; if it came back on, it does not", () => {
  const a = idleFixture();
  stepHipsIdleRelease(a.cache, a.idle, false, 1_000, 8_000);
  assert.equal(stepHipsIdleRelease(a.cache, a.idle, false, 600_000, 8_000), 6);

  const b = idleFixture();
  stepHipsIdleRelease(b.cache, b.idle, false, 1_000, 8_000);
  assert.equal(stepHipsIdleRelease(b.cache, b.idle, true, 600_000, 8_000), 0);
  assert.equal(b.cache.size, 18);
});

test("idle release never evicts a tile that is still loading", () => {
  const { cache, idle } = idleFixture();
  const loading = addTile(cache, 3, 100, 1, "loading");
  stepHipsIdleRelease(cache, idle, false, 0, 8_000);
  stepHipsIdleRelease(cache, idle, false, 10_000, 8_000);
  assert.equal(loading.state, "loading");
  assert.ok(cache.has(hipsTileKey(3, 100)));
});

test("repeated mount/unmount cycles: dispose-all then reuse never touches another cycle's tiles", () => {
  const cache: Cache = new Map();
  const idle: HipsIdleState = { offSince: null };
  for (let cycle = 0; cycle < 5; cycle += 1) {
    fillOrder0(cache, cycle);
    const mine = addTile(cache, 1, cycle, cycle);
    stepHipsIdleRelease(cache, idle, false, cycle * 20_000, 8_000);
    disposeAllHipsTiles(cache); // unmount
    idle.offSince = null;
    assert.equal(cache.size, 0);
    assert.equal(mine.state, "evicted");
  }
});
