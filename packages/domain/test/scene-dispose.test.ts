import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { disposeOwnedMaps, disposeSceneGraph } from "../src/astronomy/sky3d/scene-dispose.ts";

const counter = (target: THREE.EventDispatcher<{ dispose: object }>) => {
  const c = { n: 0 };
  (target as THREE.EventDispatcher<{ dispose: object }>).addEventListener("dispose", () => (c.n += 1));
  return c;
};

test("frees geometry and material of meshes, lines and points, each once", () => {
  const root = new THREE.Group();
  const sharedGeo = new THREE.BufferGeometry();
  const sharedMat = new THREE.MeshBasicMaterial();
  const a = new THREE.Mesh(sharedGeo, sharedMat);
  const b = new THREE.Mesh(sharedGeo, sharedMat); // same resources used twice
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
  const points = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
  root.add(a, b, line, points);
  const g = counter(sharedGeo as never);
  const m = counter(sharedMat as never);
  const lg = counter(line.geometry as never);
  const pm = counter(points.material as never);

  const out = disposeSceneGraph(root);

  assert.equal(g.n, 1);
  assert.equal(m.n, 1);
  assert.equal(lg.n, 1);
  assert.equal(pm.n, 1);
  assert.deepEqual(out, { geometries: 3, materials: 3 });
});

test("walks nested groups and material arrays", () => {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  const m1 = new THREE.MeshBasicMaterial();
  const m2 = new THREE.MeshBasicMaterial();
  inner.add(new THREE.Mesh(new THREE.BufferGeometry(), [m1, m2]));
  root.add(inner);
  const c1 = counter(m1 as never);
  const c2 = counter(m2 as never);
  disposeSceneGraph(root);
  assert.equal(c1.n + c2.n, 2);
});

test("never disposes textures (shared loader cache) — only the owner may", () => {
  const tex = new THREE.Texture();
  const t = counter(tex as never);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BufferGeometry(), mat));
  disposeSceneGraph(root);
  assert.equal(t.n, 0);
  assert.equal(mat.map, tex, "map stays assigned so a remount re-uses it");
});

test("never disposes a Sprite's geometry — three shares one quad across every Sprite", () => {
  const s1 = new THREE.Sprite(new THREE.SpriteMaterial());
  const s2 = new THREE.Sprite(new THREE.SpriteMaterial());
  assert.equal(s1.geometry, s2.geometry, "precondition: the quad really is shared");
  const geo = counter(s1.geometry as never);
  const m1 = counter(s1.material as never);
  const root = new THREE.Group();
  root.add(s1);
  disposeSceneGraph(root);
  assert.equal(geo.n, 0);
  assert.equal(m1.n, 1, "its own material is still freed");
});

test("respects the keep set, and is safe to run twice", () => {
  const keepGeo = new THREE.BufferGeometry();
  const dropGeo = new THREE.BufferGeometry();
  const root = new THREE.Group();
  root.add(new THREE.Mesh(keepGeo, new THREE.MeshBasicMaterial()), new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial()));
  const k = counter(keepGeo as never);
  const d = counter(dropGeo as never);
  disposeSceneGraph(root, new Set([keepGeo]));
  disposeSceneGraph(root, new Set([keepGeo]));
  assert.equal(k.n, 0);
  assert.equal(d.n, 2, "dispose is idempotent from the caller's side (three ignores repeats)");
});

test("disposeOwnedMaps frees GPU copies but leaves the map attached (a map-less sprite draws white)", () => {
  const tex = new THREE.Texture();
  const t = counter(tex as never);
  const withMap = new THREE.SpriteMaterial({ map: tex });
  const withoutMap = new THREE.SpriteMaterial();
  assert.equal(disposeOwnedMaps([withMap, withoutMap]), 1);
  assert.equal(t.n, 1);
  assert.equal(withMap.map, tex);
});
