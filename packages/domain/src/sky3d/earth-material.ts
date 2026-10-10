/**
 * The Earth globe's surface, shared by the Learn playground and अन्तरिक्ष.
 *
 * Its own shader rather than one of three's lit materials, for two reasons.
 *
 * **Opacity.** Every fragment writes alpha 1 with blending off, and it always
 * writes depth. Nothing can make the planet see-through, and the belts, orbit
 * lines and grid behind it are hidden by it rather than painted over its face.
 *
 * **The terminator.** Day and night come from `N·L` against the Sun's world
 * position, so the lit cap is centred on the subsolar point: it rides north
 * through उत्तरायण and south through दक्षिणायन exactly as the Sun's declination
 * does, and the boundary is a curve on the sphere rather than a straight cut.
 *
 * Both callers pass the *cartoon* map. It is flat colour with hard coastlines,
 * which survives being dimmed to a third far better than a photograph does —
 * and being dimmed rather than blacked out is the point, because the far side
 * of the planet is what a reader is trying to follow while it turns.
 */

import * as THREE from "three";

/**
 * How much of the map survives on the night side.
 *
 * Not zero. A black cap hides which country is about to come round, which is
 * the one thing the turning globe is there to show. Dark enough that the lit
 * side is unmistakably the lit side.
 */
export const EARTH_NIGHT = 0.34;

export type EarthMaterial = THREE.ShaderMaterial & {
  uniforms: {
    map: { value: THREE.Texture };
    sunPosition: { value: THREE.Vector3 };
    ambient: { value: number };
    sunOn: { value: number };
  };
};

/**
 * @param map The globe's colour map. Give it **raw** texels — set
 *   `colorSpace = THREE.NoColorSpace` — because a `ShaderMaterial` writes final
 *   pixels and three applies no output conversion to it.
 */
export function makeEarthMaterial(map: THREE.Texture): EarthMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      sunPosition: { value: new THREE.Vector3(10, 0, 0) },
      ambient: { value: EARTH_NIGHT },
      sunOn: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 sunPosition;
      uniform float ambient;
      uniform float sunOn;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vec3 tex = texture2D(map, vUv).rgb;
        vec3 n = normalize(vWorldNormal);
        vec3 toSun = normalize(sunPosition - vWorldPos);
        /* Widened either side of 0 so the terminator is a soft band, the way
           dawn and dusk actually are, instead of a drawn line. */
        float day = smoothstep(-0.22, 0.30, dot(n, toSun));
        float lit = mix(ambient, 1.0, day);
        gl_FragColor = vec4(tex * mix(1.0, lit, sunOn), 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NoBlending,
    toneMapped: false,
    fog: false,
  }) as EarthMaterial;
}
