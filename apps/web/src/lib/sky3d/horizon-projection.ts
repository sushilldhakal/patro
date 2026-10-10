/**
 * Equidistant fisheye for the क्षितिज view — the mapping a planetarium dome
 * uses, and the one Stellarium is drawing in its all-sky shots.
 *
 * `r = θ`: screen radius is simply the angle from the look direction. Every
 * direction on the sphere lands somewhere finite — the antipode at `r = π` —
 * so the whole sky is a bounded disc and a line can only ever be as long as
 * the sky is wide.
 *
 * This replaced stereographic (`r = 2·tan(θ/2)`), which sends the antipode to
 * infinity. That is fine while the field is narrow and the two are
 * indistinguishable, but opened out past 180° it tore the cage apart: a
 * vertical circle is a great circle through the zenith and the nadir, and
 * under stereographic it maps to a screen circle through both pole images —
 * one that grows without bound as the meridian turns side-on. The result was
 * a handful of enormous arcs sweeping across the whole canvas and crossing
 * everything, which is not a grid you can read a bearing off.
 *
 * The reason stereographic was reached for — that equidistant "drew a circle
 * and threw the rest away" — was a clip, not the mapping: the old code
 * discarded any ray with `theta > halfFov`, which is what left a disc in a
 * black rectangle. Nothing here clips to the vertical field. The sides and
 * corners keep going exactly as they did, up to the edge of the sphere itself.
 *
 * The 4×4 projection matrix cannot express this, so the mapping is injected
 * into every material and {@link projectHorizon} repeats it for the DOM labels.
 */

import * as THREE from "three";

export type HorizonFisheyeUniforms = {
  uHorizonFov: { value: number };
  uHorizonAspect: { value: number };
  uHorizonStereo: { value: number };
};

export function createHorizonFisheyeUniforms(): HorizonFisheyeUniforms {
  return {
    uHorizonFov: { value: 90 },
    uHorizonAspect: { value: 1 },
    uHorizonStereo: { value: 0 },
  };
}

/** θ past this and tan(θ/2) runs away — a few degrees short of the antipode. */
const THETA_MAX = 3.0543; // 175°

const CLIP_GLSL = /* glsl */ `
uniform float uHorizonFov;
uniform float uHorizonAspect;
uniform float uHorizonStereo;
vec4 horizonClipPosition(vec4 mvPosition) {
  if (uHorizonStereo < 0.5) {
    return projectionMatrix * mvPosition;
  }
  vec3 p = mvPosition.xyz;
  float rxy = length(p.xy);
  float theta = atan(rxy, -p.z);
  float halfFov = radians(uHorizonFov) * 0.5;
  /* Stereographic: r = 2·tan(θ/2), scaled so the *shorter* screen axis hits
     ±1 at the nominal field.

     This used to normalise y by maxR alone and divide x by the aspect, which
     pins the field to the vertical no matter the shape of the canvas. On a
     landscape canvas that is the short axis anyway and nothing changes — but
     on a portrait phone the short axis is the *width*, so a nominal 235° gave
     235° top-to-bottom and only about 200° across, and the same number showed
     visibly less sky than the same number on a wide desktop canvas. Keying it
     to the shorter axis makes the reading mean "at least this much, both
     ways" on any shape of screen.
     The antipode goes to infinity rather than to a finite radius, so whatever
     is behind the observer opens out and fills the frame however wide the lens
     is opened — which is why there is never a disc of sky in a black rectangle
     and never a dark wedge down the sides. It is what Stellarium draws. */
  if (theta > 3.0543) {
    return vec4(2.0, 2.0, 2.0, 1.0);
  }
  float rEq = 2.0 * tan(theta * 0.5);
  float maxR = 2.0 * tan(max(halfFov, 1e-4) * 0.5);
  vec2 dir = rxy > 1e-8 ? p.xy / rxy : vec2(0.0);
  vec2 film = dir * rEq;
  float aspect = max(uHorizonAspect, 1e-4);
  /* Whichever axis is shorter gets divisor 1 — that is the one the field is
     quoted against; the longer axis is stretched by the ratio and shows more. */
  float sx = max(aspect, 1.0);
  float sy = max(1.0 / aspect, 1.0);
  float x = film.x / (maxR * sx);
  float y = film.y / (maxR * sy);
  float zEye = -length(p);
  vec4 depth = projectionMatrix * vec4(0.0, 0.0, zEye, 1.0);
  float ndcZ = depth.w != 0.0 ? depth.z / depth.w : 0.0;
  return vec4(x, y, ndcZ, 1.0);
}
`;

const PROJECT_VERTEX = /* glsl */ `
  vec4 mvPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = horizonClipPosition(mvPosition);
`;

/**
 * SpriteMaterial never includes `project_vertex`. It billboards in view space
 * then does `gl_Position = projectionMatrix * mvPosition`, so राहु / केतु sat
 * on the leftover 60° perspective camera while the belt used stereographic.
 *
 * `mvPosition` at this point is already the *corner*, not the sprite's own
 * origin — Three's own sprite shader has already done `mvPosition.xy +=
 * rotatedPosition` above this — so it can go through {@link
 * horizonClipPosition} directly, the same way any other vertex in the scene
 * does. An earlier version routed it through the sprite's *centre* instead —
 * `horizonClipPosition(mvCenter)` plus a corner offset borrowed from the
 * ordinary `projectionMatrix` — on the theory that running each corner
 * through the fisheye map independently would warp a photo into a
 * trapezoid. That borrowed offset is the real bug: it is the delta a plain
 * 60°-perspective camera would draw, which does not shrink or grow with
 * {@link HorizonFisheyeUniforms.uHorizonFov} at all, so every sprite kept
 * whatever size it happened to have at 60° regardless of how far the लेन्स
 * had actually zoomed — planted at the wrong scale for any other field, most
 * visibly the deep-sky photographs never growing as the reader pushed in on
 * one. Since the map is conformal — angle-preserving at every point, not
 * only at its centre — sending each corner through it independently does not
 * warp a sprite that is a reasonable fraction of the sky; it makes the size
 * agree with the zoom, which the centre-plus-borrowed-delta version never did.
 */
const SPRITE_GL_POSITION = /* glsl */ `
	if (uHorizonStereo > 0.5) {
		gl_Position = horizonClipPosition(mvPosition);
	} else {
		gl_Position = projectionMatrix * mvPosition;
	}
`;

/** Bump when the injected GLSL changes so already-patched materials recompile. */
const HORIZON_FISHEYE_VERSION = 6;

/**
 * Patch a material so its vertices go through {@link CLIP_GLSL} when
 * `uHorizonStereo` is on. Shared uniform objects, so one write per frame
 * reaches every program. Safe to call repeatedly.
 */
export function injectHorizonFisheye(
  material: THREE.Material,
  uniforms: HorizonFisheyeUniforms,
): void {
  if (material.userData.horizonFisheye === HORIZON_FISHEYE_VERSION) return;
  material.userData.horizonFisheye = HORIZON_FISHEYE_VERSION;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.uniforms.uHorizonFov = uniforms.uHorizonFov;
    shader.uniforms.uHorizonAspect = uniforms.uHorizonAspect;
    shader.uniforms.uHorizonStereo = uniforms.uHorizonStereo;
    if (!shader.vertexShader.includes("horizonClipPosition")) {
      shader.vertexShader = `${CLIP_GLSL}\n${shader.vertexShader}`;
    }
    if (shader.vertexShader.includes("mvPosition.xy += rotatedPosition")) {
      shader.vertexShader = shader.vertexShader.replace(
        /mvPosition\.xy \+= rotatedPosition;\s*gl_Position = projectionMatrix \* mvPosition;/,
        `mvPosition.xy += rotatedPosition;\n${SPRITE_GL_POSITION}`,
      );
    } else if (shader.vertexShader.includes("#include <project_vertex>")) {
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", PROJECT_VERTEX);
    } else {
      shader.vertexShader = shader.vertexShader
        .replace(
          /gl_Position\s*=\s*projectionMatrix\s*\*\s*modelViewMatrix\s*\*\s*vec4\(\s*position\s*,\s*1\.0\s*\)\s*;/g,
          "gl_Position = horizonClipPosition(modelViewMatrix * vec4(position, 1.0));",
        )
        .replace(
          /gl_Position\s*=\s*projectionMatrix\s*\*\s*viewMatrix\s*\*\s*modelMatrix\s*\*\s*vec4\(\s*position\s*,\s*1\.0\s*\)\s*;/g,
          "gl_Position = horizonClipPosition(viewMatrix * modelMatrix * vec4(position, 1.0));",
        )
        .replace(
          /gl_Position\s*=\s*projectionMatrix\s*\*\s*viewMatrix\s*\*\s*world\s*;/g,
          "gl_Position = horizonClipPosition(viewMatrix * world);",
        );
    }
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () =>
    `${prevKey.call(material)}|horizon-stereographic-v${HORIZON_FISHEYE_VERSION}`;
  material.needsUpdate = true;
}

export function injectHorizonFisheyeIn(root: THREE.Object3D, uniforms: HorizonFisheyeUniforms): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const raw = mesh.material;
    if (!raw) return;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const mat of list) injectHorizonFisheye(mat, uniforms);
    mesh.frustumCulled = false;
  });
}

/**
 * Screen position of a world point under the same stereographic map the
 * shaders use, without any frame test. `fovDeg` is the vertical field.
 * Returns null only past {@link THETA_MAX}, where the map itself gives up.
 *
 * The grid ruler needs points that land *outside* the canvas: an almucantar is
 * labelled where it crosses the frame, and that crossing is found by walking
 * the line from off-frame to on-frame. {@link projectHorizon} is this plus the
 * cull every other caller wants.
 */
export function projectHorizonRaw(
  world: THREE.Vector3,
  camera: THREE.Camera,
  fovDeg: number,
  width: number,
  height: number,
  scratch: THREE.Vector3,
): { x: number; y: number } | null {
  scratch.copy(world).applyMatrix4(camera.matrixWorldInverse);
  const rxy = Math.hypot(scratch.x, scratch.y);
  const theta = Math.atan2(rxy, -scratch.z);
  if (theta > THETA_MAX) return null;
  const maxR = 2 * Math.tan(Math.max((fovDeg * Math.PI) / 360, 1e-4) / 2);
  const dirX = rxy > 1e-8 ? scratch.x / rxy : 0;
  const dirY = rxy > 1e-8 ? scratch.y / rxy : 0;
  const aspect = width / Math.max(height, 1);
  /* Must match `CLIP_GLSL` above exactly, or every label and every hit test
     drifts away from the star it belongs to. */
  const sx = Math.max(aspect, 1);
  const sy = Math.max(1 / aspect, 1);
  const rSt = 2 * Math.tan(theta / 2);
  const nx = (dirX * rSt) / (maxR * sx);
  const ny = (dirY * rSt) / (maxR * sy);
  return { x: (nx * 0.5 + 0.5) * width, y: (-ny * 0.5 + 0.5) * height };
}

/**
 * Screen position of a world point, culled to a little outside the canvas —
 * what a label anchor wants. Returns null off-frame.
 */
export function projectHorizon(
  world: THREE.Vector3,
  camera: THREE.Camera,
  fovDeg: number,
  width: number,
  height: number,
  scratch: THREE.Vector3,
): { x: number; y: number } | null {
  const hit = projectHorizonRaw(world, camera, fovDeg, width, height, scratch);
  if (!hit) return null;
  if (hit.x < -60 || hit.y < -30 || hit.x > width + 60 || hit.y > height + 30) return null;
  return hit;
}

/**
 * The half-angle from the view centre to a corner of the frame, degrees — the
 * radius of the cone the canvas actually shows.
 *
 * Under stereographic the corner is *not* at half the diagonal field of a
 * perspective camera; it is wherever `2·tan(θ/2)` reaches the corner of the
 * film rectangle. The grid ruler uses it to walk only the almucantars and
 * verticals that can reach the frame instead of all 179 of them.
 */
export function horizonConeRadiusDeg(fovDeg: number, width: number, height: number): number {
  const aspect = width / Math.max(height, 1);
  const maxR = 2 * Math.tan(Math.max((fovDeg * Math.PI) / 360, 1e-4) / 2);
  /* The film rectangle's own half-extents — same `sx`/`sy` the projection
     uses, so the cone still just reaches the corner on either orientation. */
  const corner = maxR * Math.hypot(Math.max(aspect, 1), Math.max(1 / aspect, 1));
  return Math.min(175, (2 * Math.atan(corner / 2) * 180) / Math.PI);
}

/**
 * The patch of sky the canvas is showing: where the lens points, and how far
 * the corners of the frame reach around it.
 *
 * The grid ruler uses it to walk only the lines that can reach the frame, and
 * the fine cage tiers to build only the piece of sphere in view. Both would
 * otherwise be doing whole-sky work for a one-degree window.
 *
 * The azimuth half-width is a deliberate over-estimate: meridians crowd
 * together towards the poles, so a cone that reaches high altitudes spans far
 * more azimuth than altitude. Too wide costs a few lines drawn off-screen;
 * too narrow drops them where they were wanted.
 */
export function horizonViewWindow(
  camera: THREE.Camera,
  fovDeg: number,
  width: number,
  height: number,
): {
  centreAlt: number;
  centreAz: number;
  cone: number;
  altLo: number;
  altHi: number;
  azHalf: number;
} {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const centreAlt = (Math.asin(Math.min(1, Math.max(-1, forward.y))) * 180) / Math.PI;
  const centreAz = (Math.atan2(forward.x, -forward.z) * 180) / Math.PI;
  const cone = Math.min(179, horizonConeRadiusDeg(fovDeg, width, height) * 1.06);
  /* Right up to the pole, not half a degree short of it. The fine cage is
     built only inside this window, so clipping it at 89.5° meant the last
     circles — 89°30′, 89°40′, 89°45′, the ones a one-degree field centred on
     the zenith is entirely made of — were never generated, and the middle of
     the grid came out empty. */
  const altLo = Math.max(-89.99, centreAlt - cone);
  const altHi = Math.min(89.99, centreAlt + cone);
  const reachAlt = Math.min(89, Math.max(Math.abs(altLo), Math.abs(altHi)));
  const azHalf =
    cone >= 90 || Math.abs(centreAlt) + cone >= 89
      ? 180
      : Math.min(180, cone / Math.cos((reachAlt * Math.PI) / 180));
  return { centreAlt, centreAz, cone, altLo, altHi, azHalf };
}
