/**
 * The Moon's face in the horizon and globe views — the phase, drawn honestly.
 *
 * ## Why not just light it, the way अन्तरिक्ष does
 *
 * In the space view the grahas ride shells at something like their true
 * arrangement, so the Sun's own point light falling on the Moon lands the
 * terminator where it belongs and `meshStandardMaterial` needs no help.
 *
 * The other two views place every body at one fixed radius — on the horizon
 * dome, or on the band around the globe — because what they are drawing is a
 * *direction*, not a distance. That keeps every angle in the sky exactly right
 * and throws all the distances away, which is the correct trade for a sky map
 * and fatal for lighting: the Sun ends up the same distance from the observer
 * as the Moon, so the vector from Moon to Sun is nothing like the real one.
 *
 * Lighting the Moon from the Sun's *drawn* position gives a phase angle of
 * `acos(sin(ε/2))` for an elongation ε — half-lit at औंसी and 85% lit at the
 * quarters. Never a crescent, never a new Moon. Confidently wrong is worse than
 * flat, which is why those views drew the Moon evenly lit instead.
 *
 * ## What this does
 *
 * The Sun is 400 times further off than the Moon, so its rays arrive parallel:
 * the lit hemisphere faces the *geocentric direction* of the Sun, and nothing
 * about the real distances matters. That direction survives the projection
 * intact — it is exactly what these views do keep — so `N·L` against it is the
 * true phase, seen from wherever the camera happens to be.
 *
 * A direction uniform rather than a position, then, and the caller feeds it the
 * normalised position of the drawn Sun. See {@link makeEarthMaterial}, which
 * solves the same problem the other way round: the globe is at the origin at
 * its true scale, so there a position is what is wanted.
 */

import * as THREE from "three";

/**
 * How much of the map survives on the unlit side.
 *
 * Not zero, and for a real reason: earthshine. The Moon's night side is lit by
 * a full Earth hanging over it, which is why the whole disc is visible inside a
 * young crescent — "the old Moon in the new Moon's arms". Faint enough that the
 * lit limb is never in doubt.
 */
export const MOON_EARTHSHINE = 0.1;

/**
 * The floor the unlit face is lifted to once the Moon is too small to read a
 * phase off anyway.
 *
 * True earthshine is right when the Moon is a disc you can actually study. It
 * is wrong when the Moon is a dot: at पृथ्वी गोला's scale, and at any wide
 * क्षितिज field, a 10% face against a black sky is not a thin crescent — it is
 * nothing at all, and around औंसी the Moon simply disappeared from the sky it
 * is supposed to be gochar-ing across.
 *
 * At this floor the lit and unlit faces still differ plainly (0.55 against a
 * clamped 1.0), so the phase is not thrown away — the whole disc is just
 * always *there*. `earthshine` is a uniform, so the scene ramps between the
 * two per frame off the field of view; nothing in the shader changes.
 */
export const MOON_UNLIT_FAR = 0.55;

/** क्षितिज fields between these ramp the floor: true phase tight, visible disc wide. */
export const MOON_PHASE_FOV_TIGHT = 15;
export const MOON_PHASE_FOV_WIDE = 60;

export type MoonMaterial = THREE.ShaderMaterial & {
  uniforms: {
    map: { value: THREE.Texture };
    sunDirection: { value: THREE.Vector3 };
    earthshine: { value: number };
  };
};

/**
 * @param map The Moon's colour map. Give it **raw** texels — set
 *   `colorSpace = THREE.NoColorSpace` — because a `ShaderMaterial` writes final
 *   pixels and three applies no output conversion to it.
 */
export function makeMoonMaterial(map: THREE.Texture): MoonMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      earthshine: { value: MOON_EARTHSHINE },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        /* World space, so the terminator is fixed in the sky while the body's
           own signature spin turns the map underneath it. */
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 sunDirection;
      uniform float earthshine;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vec3 tex = texture2D(map, vUv).rgb;
        float ndl = dot(normalize(vWorldNormal), normalize(sunDirection));
        /* Barely softened, unlike the Earth's: an airless body has no dawn, so
           the terminator is as sharp as the pixels allow. The little smoothing
           there is only keeps it from crawling in stair-steps as the phase
           moves.

           Full brightness is pushed past 1.0 and clamped so the lit face does
           not read as grey next to the space view's, where a point light with
           no falloff is doing the same job. */
        float day = smoothstep(-0.02, 0.06, ndl);
        gl_FragColor = vec4(tex * min(1.0, mix(earthshine, 1.35, day)), 1.0);
      }
    `,
    /* Transparent (with alpha pinned at 1.0 in the shader above, so this
       changes nothing about how it looks) so the Moon lands in the same
       render queue a HiPS tile does — see the identical reasoning on the
       graha body materials in `AakashGocharScene.tsx`'s `GrahaBody`. An
       opaque Moon always renders before any tile regardless of actual
       distance, and a tile's own `depthTest: false` means it paints over
       whatever is there without checking; the Moon needs its own explicit
       renderOrder in that same queue to still win. */
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NoBlending,
    toneMapped: false,
    fog: false,
  }) as MoonMaterial;
}
