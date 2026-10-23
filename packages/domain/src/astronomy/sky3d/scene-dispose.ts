import * as THREE from "three";

/**
 * Teardown for a 3D sky scene that is going away: frees the geometry and
 * material of everything under `root`, so GPU memory does not depend on the
 * platform's GL context being reclaimed promptly (on native, `forceContextLoss`
 * is not guaranteed to do anything — the context goes when its view does).
 *
 * What it deliberately does *not* touch:
 *
 * - **Textures.** `Material.dispose()` does not free `map`, and textures here
 *   come from a loader cache shared with other canvases (`useLoader`), so
 *   freeing them is the owner's call. Textures this scene alone owns (HiPS
 *   tiles, nebula photographs) are disposed by their owners.
 * - **A `Sprite`'s geometry.** three gives every `Sprite` one module-level
 *   static quad; disposing it from one scene would drop it from every other.
 * - Anything in `keep` — resources the caller knows are shared.
 *
 * Re-use after this is safe: `dispose()` on three objects only releases the
 * renderer's copy, and the next render re-creates it. That is what makes the
 * call harmless under React Strict Mode's simulated unmount/remount, and why
 * calling it twice is fine.
 */
export function disposeSceneGraph(
  root: THREE.Object3D,
  keep: ReadonlySet<unknown> = new Set(),
): { geometries: number; materials: number } {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    const o = obj as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
      isSprite?: boolean;
    };
    if (o.geometry && !o.isSprite && !keep.has(o.geometry)) geometries.add(o.geometry);
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!keep.has(m)) materials.add(m);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  return { geometries: geometries.size, materials: materials.size };
}

/**
 * Frees GPU copies of textures that a material owns *and* nothing else
 * shares. Leaves `material.map` assigned: a sprite whose `map` is nulled
 * draws as a solid white quad, so a remount that re-uses the same material
 * must find its picture still there and simply re-upload it.
 */
export function disposeOwnedMaps(materials: Iterable<THREE.Material & { map?: THREE.Texture | null }>): number {
  let n = 0;
  for (const m of materials) {
    if (m.map) {
      m.map.dispose();
      n += 1;
    }
  }
  return n;
}
