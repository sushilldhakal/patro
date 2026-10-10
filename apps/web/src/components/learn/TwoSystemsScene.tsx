/**
 * One sky, two measures — the R3F scene.
 *
 * Heliocentric on purpose. Earth goes round the Sun, the Moon goes round
 * Earth, and a sightline runs **from Earth through the Sun and on to the
 * zodiac ring** — which is what a rashi actually is: the direction the Sun is
 * seen in from here. Drawing it this way is the only way the scene can show
 * the thing that matters about a lunar month:
 *
 *   A month is not one lap of the Moon. While the Moon completes its 360°
 *   against the stars in 27.32 days, Earth has carried on ~27° around the Sun,
 *   so the Moon is no longer beside the Sun and is not yet at the next
 *   amavasya. It has to keep going — about **389°** in 29.53 days. Put Earth
 *   at a fixed origin and that extra 29° has nowhere to show; put Earth on its
 *   orbit and the Moon's own trail draws it.
 *
 * The frame is the app's: 0° Mesha along +X, longitude increasing
 * anticlockwise seen from ecliptic north, the same as the 3D Aakash Gochar
 * sky. Positions come from {@link siderealLon}, which is that page's ephemeris
 * with its double-counted precession corrected.
 *
 * The parent owns the clock and the camera in refs, so neither animating nor
 * dragging re-renders React — the scene reports a sampled snapshot back
 * through `onSample` a few times a second, and that is what the HUD reads.
 */

import { memo, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { DEG, beltDivisions, eclipticToVec3, normalizeDeg } from "@/lib/sky3d/geocentric-model";
import { geocentricPointAt } from "@/lib/sky3d/orbital-model";
import {
  longitudeTravelled,
  siderealLon,
  sunStateAt,
  SIDEREAL_MONTH,
  SYNODIC_MONTH,
  TITHI_ARC,
} from "@/lib/sky3d/two-systems";

export type Focus = "solar" | "lunar" | "both";

export type SceneClock = {
  /** J2000 day number being shown. */
  dt: number;
  playing: boolean;
  /** Simulated days per real second. */
  daysPerSecond: number;
};

export type CameraState = { yaw: number; pitch: number; distance: number };

/** A label the overlay draws in real type, positioned from the scene. */
export type SceneLabel = {
  id: string;
  kind: "rashi" | "body" | "note";
  text: string;
  /** 1–12, rashi labels only. */
  index?: number;
  x: number;
  y: number;
  dim: boolean;
};

export type SceneSample = {
  dt: number;
  labels: SceneLabel[];
  /** Set on the frame a rashi boundary is crossed, so the HUD can flash. */
  sankrantiIndex: number | null;
};

/*
 * Scene units. Nothing is to scale — a true Sun–Earth–Moon model is a dot, a
 * speck and an invisible speck. What is preserved is the *ordering* and the
 * angles, which is all either measure depends on.
 */
const RING_INNER = 7.6;
const RING_OUTER = 8.8;
const RING_MID = (RING_INNER + RING_OUTER) / 2;
/** Mean radius of Earth's orbit; the real distance modulates it below. */
const EARTH_ORBIT = 4.6;
const MOON_ORBIT = 1.15;
/**
 * The Moon's own rashi belt, centred on Earth.
 *
 * The big ring is centred on the *Sun*, which is why a line from Earth through
 * the Sun lands on the belt at exactly the Sun's longitude — the Sun is at the
 * centre, so the sightline is radial. That does not transfer to the Moon:
 * extend an Earth→Moon ray to a Sun-centred ring and, with Earth 4.6 units out
 * and the ring at 8.2, it lands up to 34° away from the Moon's true longitude
 * — more than a whole rashi wrong.
 *
 * So the Moon gets the frame it is actually measured in: a small twelve-fold
 * belt around Earth. Its divisions share the big ring's longitudes, so the two
 * read as parallel, and a sightline from Earth through the Moon now lands on
 * the right sign by construction.
 */
const MOON_BELT_INNER = 1.62;
const MOON_BELT_OUTER = 2.0;
const MOON_BELT_MID = (MOON_BELT_INNER + MOON_BELT_OUTER) / 2;
const SUN_R = 0.58;
const EARTH_R = 0.26;
const MOON_R = 0.13;

/**
 * How much Earth's eccentricity is exaggerated on screen.
 *
 * The orbit is an ellipse, not a circle: Earth is 0.983 AU from the Sun at
 * perihelion and 1.017 at aphelion, and it runs fastest when nearest. That is
 * not decoration — it is the whole reason a solar month is 29 days at one end
 * of the year and 32 at the other, which is what the ladder under the scene is
 * showing. Drawn true, a 3.4% swing is about seven pixels and reads as a
 * circle; multiplied by six it reads as an orbit that is visibly off-centre,
 * while Earth still rides exactly on the drawn curve because both come from
 * the same distances. The readout states the true figure.
 */
const ECCENTRICITY_GAIN = 6;

/** Earth's obliquity — the tilt the seasons come from. */
const AXIAL_TILT = 23.44;
/** One turn against the stars, in days. The solar day is the round 1.0. */
const SIDEREAL_DAY = 0.99726957;

/** Scene radius for a real Sun–Earth distance in AU. */
function orbitRadius(distanceAu: number) {
  return EARTH_ORBIT * (1 + ECCENTRICITY_GAIN * (distanceAu - 1));
}

const GOLD = "#d8c84a";
const SUN_COLOR = "#f8b53c";
const MOON_COLOR = "#cbd5e1";
const EARTH_COLOR = "#5aa9e6";
const INK = "#8fb0c8";
/** Matches the canvas clear colour, so the trail can fade into it. */
const CANVAS_BG = "#050a10";

/**
 * The Moon's trailing path through heliocentric space.
 *
 * Two synodic months of it, so the reader sees the curve *keep going* rather
 * than closing — which is the point: in absolute space the Moon never traces a
 * circle round Earth, it traces a scalloped ring round the Sun, and following
 * one scallop from amavasya to amavasya is watching it cover ~389°.
 */
const TRAIL_DAYS = SYNODIC_MONTH * 2;
const TRAIL_STEPS = 260;

const RASHI_NE = [
  "मेष",
  "वृष",
  "मिथुन",
  "कर्कट",
  "सिंह",
  "कन्या",
  "तुला",
  "वृश्चिक",
  "धनु",
  "मकर",
  "कुम्भ",
  "मीन",
];

const TEXTURES = ["sun", "moon", "earth"].map(
  (k) => `${import.meta.env.BASE_URL}sky3d/${k}.jpg`,
);

function vec(lon: number, lat: number, r: number) {
  return new THREE.Vector3(...eclipticToVec3(lon, lat, r));
}

/**
 * Where Earth stands on its orbit: opposite the direction the Sun is seen in,
 * at the radius its true distance calls for.
 */
function earthAt(sunGeoLon: number, distanceAu: number) {
  return vec(sunGeoLon + 180, 0, orbitRadius(distanceAu));
}

/** The Moon's absolute position — Earth's, plus its own geocentric offset. */
function moonAt(sunGeoLon: number, distanceAu: number, moonLon: number, moonLat: number) {
  return earthAt(sunGeoLon, distanceAu).add(vec(moonLon, moonLat, MOON_ORBIT));
}

/** A flat annulus in the ecliptic plane. */
function Ring({ opacity }: { opacity: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[RING_INNER, RING_OUTER, 160]} />
      <meshBasicMaterial
        color={GOLD}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Alternating shading so twelve equal segments can actually be counted.
 *
 * A RingGeometry sweeps theta in its own XY plane; the group rotation maps
 * that plane onto the ecliptic such that theta reads as ecliptic longitude,
 * which is why every other rashi is simply a geometry with its own
 * `thetaStart`.
 */
function RashiSegments({ opacity }: { opacity: number }) {
  const geometries = useMemo(
    () =>
      Array.from(
        { length: 6 },
        (_, k) =>
          new THREE.RingGeometry(RING_INNER, RING_OUTER, 16, 1, k * (Math.PI / 3), Math.PI / 6),
      ),
    [],
  );
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {geometries.map((geometry, k) => (
        <mesh key={k} geometry={geometry}>
          <meshBasicMaterial
            color={GOLD}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The twelve boundaries, across the ring and standing a little off it. */
function RashiDividers({ opacity }: { opacity: number }) {
  const object = useMemo(() => {
    const points: number[] = [];
    for (const deg of beltDivisions(12)) {
      const a = deg * DEG;
      const cx = Math.cos(a);
      const cz = -Math.sin(a);
      points.push(RING_INNER * cx, 0, RING_INNER * cz, RING_OUTER * cx, 0, RING_OUTER * cz);
      points.push(RING_MID * cx, 0, RING_MID * cz, RING_MID * cx, 0.6, RING_MID * cz);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity }),
    );
  }, [opacity]);

  useEffect(() => {
    (object.material as THREE.LineBasicMaterial).opacity = opacity;
  }, [object, opacity]);

  return <primitive object={object} />;
}

/** A circle in the ecliptic plane — the Moon's orbit guide around Earth. */
function OrbitGuide({
  radius,
  color,
  opacity,
  dashed = true,
}: {
  radius: number;
  color: string;
  opacity: number;
  dashed?: boolean;
}) {
  const object = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 220; i += 1) {
      const a = (i / 220) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(a), 0, -radius * Math.sin(a)));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      dashed
        ? new THREE.LineDashedMaterial({
            color,
            dashSize: 0.16,
            gapSize: 0.12,
            transparent: true,
            opacity,
          })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
    if (dashed) line.computeLineDistances();
    return line;
  }, [radius, color, opacity, dashed]);

  useEffect(() => {
    (object.material as THREE.Material).opacity = opacity;
  }, [object, opacity]);

  return <primitive object={object} />;
}

/** The twelve-fold belt around Earth that the Moon's sightline reads against. */
function MoonBelt({ opacity }: { opacity: number }) {
  const shading = useMemo(
    () =>
      Array.from(
        { length: 6 },
        (_, k) =>
          new THREE.RingGeometry(
            MOON_BELT_INNER,
            MOON_BELT_OUTER,
            12,
            1,
            k * (Math.PI / 3),
            Math.PI / 6,
          ),
      ),
    [],
  );

  const spokes = useMemo(() => {
    const points: number[] = [];
    for (const deg of beltDivisions(12)) {
      const a = deg * DEG;
      const cx = Math.cos(a);
      const cz = -Math.sin(a);
      points.push(
        MOON_BELT_INNER * cx, 0, MOON_BELT_INNER * cz,
        MOON_BELT_OUTER * cx, 0, MOON_BELT_OUTER * cz,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: MOON_COLOR, transparent: true, opacity }),
    );
  }, [opacity]);

  useEffect(() => {
    (spokes.material as THREE.LineBasicMaterial).opacity = opacity;
  }, [spokes, opacity]);

  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {shading.map((geometry, k) => (
          <mesh key={k} geometry={geometry}>
            <meshBasicMaterial
              color={MOON_COLOR}
              transparent
              opacity={opacity * 0.28}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <primitive object={spokes} />
    </group>
  );
}

/**
 * Earth's orbit, traced from the ephemeris rather than drawn as a circle.
 *
 * Every point is a real (longitude, distance) pair sampled across one sidereal
 * year and put through the same {@link orbitRadius} the planet itself uses, so
 * Earth cannot drift off the curve. The Sun sits at a focus, not the centre —
 * which is the thing worth seeing: the near side and the far side of the year
 * are not the same distance out.
 */
function EarthOrbitPath({ anchorDt, opacity }: { anchorDt: number; opacity: number }) {
  const object = useMemo(() => {
    const STEPS = 360;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const t = anchorDt + (i / STEPS) * 365.256363;
      pts.push(earthAt(siderealLon("sun", t), geocentricPointAt("sun", t).distanceAu));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: EARTH_COLOR, transparent: true, opacity }),
    );
  }, [anchorDt, opacity]);

  useEffect(() => {
    (object.material as THREE.LineBasicMaterial).opacity = opacity;
  }, [object, opacity]);

  return <primitive object={object} />;
}

/**
 * The apsidal line: nearest point to farthest, with a tick at each end.
 *
 * Without it the ellipse reads as a circle drawn slightly off-centre. With it,
 * the asymmetry has a direction and a name.
 */
function ApsisMarkers({ anchorDt, opacity }: { anchorDt: number; opacity: number }) {
  const object = useMemo(() => {
    let near = { d: Infinity, t: anchorDt };
    let far = { d: -Infinity, t: anchorDt };
    for (let i = 0; i < 366; i += 1) {
      const t = anchorDt + i;
      const d = geocentricPointAt("sun", t).distanceAu;
      if (d < near.d) near = { d, t };
      if (d > far.d) far = { d, t };
    }
    const at = (s: { d: number; t: number }) =>
      earthAt(siderealLon("sun", s.t), s.d);
    const a = at(near);
    const b = at(far);
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    return new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({
        color: EARTH_COLOR,
        dashSize: 0.28,
        gapSize: 0.3,
        transparent: true,
        opacity,
      }),
    );
  }, [anchorDt, opacity]);

  useEffect(() => {
    object.computeLineDistances();
    (object.material as THREE.LineDashedMaterial).opacity = opacity;
  }, [object, opacity]);

  return <primitive object={object} />;
}

/**
 * The angle at Earth between the Sun and the Moon, ticked every 12°.
 *
 * This *is* chandramana, drawn: the filled sector is the elongation, and the
 * ticks inside it count the tithis. It has to be rebuilt each frame, and it
 * rides with Earth around its orbit rather than sitting at the origin.
 */
const WEDGE_STEPS = 96;

function ElongationWedge({
  sunLonRef,
  moonLonRef,
  earthDistRef,
  opacityRef,
}: {
  sunLonRef: MutableRefObject<number>;
  moonLonRef: MutableRefObject<number>;
  earthDistRef: MutableRefObject<number>;
  opacityRef: MutableRefObject<number>;
}) {
  const radius = MOON_ORBIT * 1.28;

  const fan = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((WEDGE_STEPS + 2) * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const index: number[] = [];
    for (let i = 0; i < WEDGE_STEPS; i += 1) index.push(0, i + 1, i + 2);
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: MOON_COLOR,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  const ticks = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(30 * 2 * 3), 3));
    const seg = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: MOON_COLOR, transparent: true, opacity: 0.5 }),
    );
    seg.frustumCulled = false;
    return seg;
  }, []);

  /** Earth→Moon. (Earth→Sun is drawn full length by the sightline below.) */
  const arm = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const seg = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: MOON_COLOR, transparent: true, opacity: 0.85 }),
    );
    seg.frustumCulled = false;
    return seg;
  }, []);

  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const o = opacityRef.current;
    (fan.material as THREE.MeshBasicMaterial).opacity = 0.2 * o;
    (ticks.material as THREE.LineBasicMaterial).opacity = 0.55 * o;
    (arm.material as THREE.LineBasicMaterial).opacity = 0.9 * o;
    const visible = o > 0.02;
    fan.visible = visible;
    ticks.visible = visible;
    arm.visible = visible;
    if (!visible) return;

    const sun = sunLonRef.current;
    const moon = moonLonRef.current;
    const elong = normalizeDeg(moon - sun);

    group.current?.position.copy(earthAt(sun, earthDistRef.current));

    const pos = fan.geometry.getAttribute("position") as THREE.BufferAttribute;
    pos.setXYZ(0, 0, 0, 0);
    for (let i = 0; i <= WEDGE_STEPS; i += 1) {
      const v = vec(sun + (elong * i) / WEDGE_STEPS, 0, radius);
      pos.setXYZ(i + 1, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;

    const tickAttr = ticks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const count = Math.floor(elong / TITHI_ARC);
    for (let i = 0; i < 30; i += 1) {
      if (i < count) {
        const lon = sun + (i + 1) * TITHI_ARC;
        const a = vec(lon, 0, radius * 0.8);
        const b = vec(lon, 0, radius * 1.08);
        tickAttr.setXYZ(i * 2, a.x, a.y, a.z);
        tickAttr.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      } else {
        tickAttr.setXYZ(i * 2, 0, 0, 0);
        tickAttr.setXYZ(i * 2 + 1, 0, 0, 0);
      }
    }
    tickAttr.needsUpdate = true;

    const armAttr = arm.geometry.getAttribute("position") as THREE.BufferAttribute;
    const m = vec(moon, 0, radius * 1.1);
    armAttr.setXYZ(0, 0, 0, 0);
    armAttr.setXYZ(1, m.x, m.y, m.z);
    armAttr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <primitive object={fan} />
      <primitive object={ticks} />
      <primitive object={arm} />
    </group>
  );
}

interface Props {
  clock: MutableRefObject<SceneClock>;
  camera: MutableRefObject<CameraState>;
  focus: Focus;
  /** Any instant in the year being shown — the orbit and apsides trace from it. */
  anchorDt: number;
  /** Amavasya instants, so the swept-lap arc knows where this month began. */
  lunarMonthStarts: number[];
  onSample: (sample: SceneSample) => void;
}

/** Points per swept-lap arc. */
const ARC_STEPS = 128;

export function TwoSystemsScene({
  clock,
  camera,
  focus,
  anchorDt,
  lunarMonthStarts,
  onSample,
}: Props) {
  const [sunMap, moonMap, earthMap] = useLoader(THREE.TextureLoader, TEXTURES);
  const { camera: cam, size } = useThree();

  const earthGroup = useRef<THREE.Group>(null);
  const earthMesh = useRef<THREE.Mesh>(null);
  const moonGroup = useRef<THREE.Group>(null);
  const moonOrbitGroup = useRef<THREE.Group>(null);

  const sunLon = useRef(0);
  const moonLon = useRef(0);
  /** Sun–Earth distance in AU — what makes the orbit an ellipse on screen. */
  const earthDist = useRef(1);
  /** Focus as animated weights, so switching modes fades rather than snaps. */
  const solarW = useRef(1);
  const lunarW = useRef(1);
  const targetW = focus === "solar" ? [1, 0.14] : focus === "lunar" ? [0.32, 1] : [1, 1];

  const lastRashi = useRef(-1);
  const frame = useRef(0);
  const scratch = useRef(new THREE.Vector3());

  /**
   * Earth → Sun → the ring: one straight sightline, drawn full length.
   *
   * The rashi is read where it lands, which is why it must not stop at the
   * Sun. Watching this line sweep the ring while Earth moves is the whole of
   * sauramana — and it is also why the Sun's apparent motion is real motion of
   * Earth's, seen from inside it.
   */
  const sightline = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: SUN_COLOR, transparent: true, opacity: 0.9 }),
    );
    line.frustumCulled = false;
    return line;
  }, []);

  /**
   * Where the Moon has actually been over the last synodic month.
   *
   * In absolute space the Moon's path is not a circle round Earth but a gently
   * scalloped curve round the Sun — and following it from one amavasya to the
   * next is watching it cover more than a full turn. This is the argument for
   * 389°, drawn rather than asserted.
   */
  const trail = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((TRAIL_STEPS + 1) * 3), 3),
    );
    /* Per-vertex colour rather than per-vertex alpha, which a line material
       has no way to express: the tail is lerped toward the background, which
       reads as fading out while the head stays bright. */
    const colors = new Float32Array((TRAIL_STEPS + 1) * 3);
    const head = new THREE.Color(MOON_COLOR);
    const tail = new THREE.Color(CANVAS_BG);
    const c = new THREE.Color();
    for (let i = 0; i <= TRAIL_STEPS; i += 1) {
      c.copy(tail).lerp(head, (i / TRAIL_STEPS) ** 1.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }),
    );
    line.frustumCulled = false;
    return line;
  }, []);

  /**
   * Earth → Moon → the ring: the same construction as the Sun's sightline, so
   * the reader can read the Moon's rashi off the belt the same way. Together
   * the two lines *are* the elongation — the angle between them is the tithi.
   */
  const moonSightline = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: MOON_COLOR, transparent: true, opacity: 0.8 }),
    );
    line.frustumCulled = false;
    return line;
  }, []);

  /**
   * The lap, swept.
   *
   * A synodic month is not one lap of this circle — it is one lap *and then
   * about 29° more*, because Earth has moved on and the Moon has to catch the
   * Sun up. So the sweep is drawn as two arcs: the first 360° on the orbit
   * itself, and the overshoot on a slightly wider arc outside it, which is the
   * only way a second lap can be seen crossing over the first.
   */
  const lapArc = useMemo(() => {
    const make = (color: string, opacity: number, width: number) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array((ARC_STEPS + 1) * 3), 3),
      );
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width }),
      );
      line.frustumCulled = false;
      return line;
    };
    return { first: make(MOON_COLOR, 0.9, 2), overshoot: make("#7ee787", 1, 3) };
  }, []);

  /** Earth's rotation axis, drawn through the poles. */
  const earthAxis = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -EARTH_R * 1.9, 0),
          new THREE.Vector3(0, EARTH_R * 1.9, 0),
        ]),
        new THREE.LineBasicMaterial({ color: EARTH_COLOR, transparent: true, opacity: 0.7 }),
      ),
    [],
  );

  /** Where this lunar month began, as a tick on the orbit. */
  const startTick = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: "#f8b53c", transparent: true, opacity: 0.95 }),
    );
  }, []);

  /* Re-deriving the month's opening longitude every frame is an ephemeris call
     for a number that changes twelve times a year. */
  const monthStart = useRef({ dt: Number.NaN, lon: 0 });

  const sunMarker = useRef<THREE.Mesh>(null);
  const moonMarker = useRef<THREE.Mesh>(null);
  const activeSeg = useRef<THREE.Mesh>(null);
  const moonSeg = useRef<THREE.Mesh>(null);
  const moonBeltGroup = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    frame.current += 1;

    const c = clock.current;
    if (c.playing) c.dt += delta * c.daysPerSecond;

    const sLon = siderealLon("sun", c.dt);
    const mLon = siderealLon("moon", c.dt);
    const mLat = geocentricPointAt("moon", c.dt).latitude;
    const dAu = geocentricPointAt("sun", c.dt).distanceAu;
    sunLon.current = sLon;
    moonLon.current = mLon;
    earthDist.current = dAu;

    solarW.current += (targetW[0]! - solarW.current) * Math.min(1, delta * 5);
    lunarW.current += (targetW[1]! - lunarW.current) * Math.min(1, delta * 5);

    const earthPos = earthAt(sLon, dAu);
    earthGroup.current?.position.copy(earthPos);
    moonOrbitGroup.current?.position.copy(earthPos);
    moonGroup.current?.position.copy(moonAt(sLon, dAu, mLon, mLat));

    /*
     * Earth's spin — prograde, and about its own tilted axis.
     *
     * Positive `rotation.y` is anticlockwise seen from celestial north, which
     * is the direction Earth actually turns and the same sense its orbit and
     * the zodiac run in; negating it span the planet backwards. The turn is a
     * *sidereal* day because this frame is inertial: 360° in 0.99727 days is
     * what makes the sub-solar point come back round every 1.000 days.
     */
    if (earthMesh.current) {
      earthMesh.current.rotation.y = (c.dt / SIDEREAL_DAY) * 2 * Math.PI;
    }

    /* The sightline: Earth, through the Sun, out to the ring. */
    const onRing = vec(sLon, 0, RING_MID);
    const lineAttr = sightline.geometry.getAttribute("position") as THREE.BufferAttribute;
    lineAttr.setXYZ(0, earthPos.x, earthPos.y, earthPos.z);
    lineAttr.setXYZ(1, onRing.x, onRing.y, onRing.z);
    lineAttr.needsUpdate = true;
    (sightline.material as THREE.LineBasicMaterial).opacity = 0.9 * solarW.current;
    sunMarker.current?.position.copy(onRing);
    if (sunMarker.current) {
      (sunMarker.current.material as THREE.MeshBasicMaterial).opacity = solarW.current;
    }

    const rashi = Math.floor(normalizeDeg(sLon) / 30) % 12;
    if (activeSeg.current) {
      activeSeg.current.rotation.set(-Math.PI / 2, 0, 0);
      activeSeg.current.rotateZ((rashi * Math.PI * 2) / 12);
      (activeSeg.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * solarW.current;
    }

    /*
      The Moon's sightline, in Earth-local space: from Earth, straight out
      along the Moon's own longitude, through the Moon and onto its belt.
      Radial from Earth, so the Moon is exactly on it and the sign it lands in
      is exactly the sign the Moon is in.
    */
    const moonOnBelt = vec(mLon, 0, MOON_BELT_MID);
    const mAttr = moonSightline.geometry.getAttribute("position") as THREE.BufferAttribute;
    mAttr.setXYZ(0, 0, 0, 0);
    mAttr.setXYZ(1, moonOnBelt.x, moonOnBelt.y, moonOnBelt.z);
    mAttr.needsUpdate = true;
    /* Never fully gone: in sauramana focus it dims, but the Moon still has to
       be locatable. */
    const moonVis = Math.max(0.4, lunarW.current);
    (moonSightline.material as THREE.LineBasicMaterial).opacity = 0.8 * moonVis;
    moonMarker.current?.position.copy(moonOnBelt);
    if (moonMarker.current) {
      (moonMarker.current.material as THREE.MeshBasicMaterial).opacity = moonVis;
    }
    const moonRashi = Math.floor(normalizeDeg(mLon) / 30) % 12;
    if (moonSeg.current) {
      moonSeg.current.rotation.set(-Math.PI / 2, 0, 0);
      moonSeg.current.rotateZ((moonRashi * Math.PI * 2) / 12);
      (moonSeg.current.material as THREE.MeshBasicMaterial).opacity = 0.34 * moonVis;
    }
    if (moonBeltGroup.current) moonBeltGroup.current.visible = moonVis > 0.05;

    /* ── the swept lap ──────────────────────────────────────────────── */
    let startDt = lunarMonthStarts[0] ?? c.dt;
    for (const m of lunarMonthStarts) if (m <= c.dt && m > startDt) startDt = m;
    if (monthStart.current.dt !== startDt) {
      monthStart.current = { dt: startDt, lon: siderealLon("moon", startDt) };
    }
    const startLon = monthStart.current.lon;
    const swept = Math.max(0, longitudeTravelled("moon", startDt, c.dt, SIDEREAL_MONTH));

    const writeArc = (line: THREE.Line, fromDeg: number, toDeg: number, radius: number) => {
      const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const span = Math.max(0, toDeg - fromDeg);
      for (let i = 0; i <= ARC_STEPS; i += 1) {
        const p = vec(startLon + fromDeg + (span * i) / ARC_STEPS, 0, radius);
        attr.setXYZ(i, p.x, p.y, p.z);
      }
      attr.needsUpdate = true;
      line.visible = span > 0.5;
    };
    writeArc(lapArc.first, 0, Math.min(swept, 360), MOON_ORBIT);
    writeArc(lapArc.overshoot, 360, Math.max(360, swept), MOON_ORBIT * 1.13);
    (lapArc.first.material as THREE.LineBasicMaterial).opacity = 0.9 * moonVis;
    (lapArc.overshoot.material as THREE.LineBasicMaterial).opacity = moonVis;

    const tickAttr = startTick.geometry.getAttribute("position") as THREE.BufferAttribute;
    const t0 = vec(startLon, 0, MOON_ORBIT * 0.74);
    const t1 = vec(startLon, 0, MOON_ORBIT * 1.24);
    tickAttr.setXYZ(0, t0.x, t0.y, t0.z);
    tickAttr.setXYZ(1, t1.x, t1.y, t1.z);
    tickAttr.needsUpdate = true;
    (startTick.material as THREE.LineBasicMaterial).opacity = 0.95 * moonVis;

    let sankrantiIndex: number | null = null;
    if (lastRashi.current !== -1 && rashi !== lastRashi.current) sankrantiIndex = rashi;
    lastRashi.current = rashi;

    /* ── camera ─────────────────────────────────────────────────────── */
    const v = camera.current;
    const cosPitch = Math.cos(v.pitch);
    cam.position.set(
      v.distance * cosPitch * Math.sin(v.yaw),
      v.distance * Math.sin(v.pitch),
      v.distance * cosPitch * Math.cos(v.yaw),
    );
    cam.lookAt(0, 0, 0);

    /* ── the slow work, five times a second ─────────────────────────── */
    if (frame.current % 12 !== 0 && sankrantiIndex === null) return;

    /* The Moon's path stays drawn in every focus — it is the one line that
       shows the compound motion, and hiding it was never the intent. */
    (trail.material as THREE.LineBasicMaterial).opacity = 0.55 + 0.35 * lunarW.current;
    {
      const trailAttr = trail.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= TRAIL_STEPS; i += 1) {
        const t = c.dt - TRAIL_DAYS * (1 - i / TRAIL_STEPS);
        const sun = sunStateAt(t);
        const p = moonAt(sun.longitude, sun.distanceAu, siderealLon("moon", t), 0);
        trailAttr.setXYZ(i, p.x, p.y, p.z);
      }
      trailAttr.needsUpdate = true;
    }

    const collected: SceneLabel[] = [];
    const project = (
      id: string,
      kind: SceneLabel["kind"],
      text: string,
      at: THREE.Vector3,
      dim: boolean,
      index?: number,
    ) => {
      scratch.current.copy(at).project(cam);
      if (scratch.current.z > 1) return;
      const x = (scratch.current.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.current.y * 0.5 + 0.5) * size.height;
      if (x < -70 || y < -30 || x > size.width + 70 || y > size.height + 30) return;
      collected.push({ id, kind, text, index, x, y, dim });
    };

    for (let i = 0; i < 12; i += 1) {
      project(
        `r-${i}`,
        "rashi",
        RASHI_NE[i]!,
        vec(i * 30 + 15, 0, RING_MID),
        solarW.current < 0.5 || i !== rashi,
        i + 1,
      );
    }
    project("b-sun", "body", "सूर्य", new THREE.Vector3(0, SUN_R * 2.1, 0), false);
    project("b-earth", "body", "पृथ्वी", earthPos.clone().setY(EARTH_R * 3.4), false);
    project(
      "b-moon",
      "body",
      "चन्द्र",
      moonAt(sLon, dAu, mLon, mLat).setY(MOON_R * 4.5),
      lunarW.current < 0.5,
    );

    onSample({ dt: c.dt, labels: collected, sankrantiIndex });
  });

  const segGeometry = useMemo(
    () => new THREE.RingGeometry(RING_INNER, RING_OUTER, 16, 1, 0, Math.PI / 6),
    [],
  );
  const moonSegGeometry = useMemo(
    () => new THREE.RingGeometry(MOON_BELT_INNER, MOON_BELT_OUTER, 12, 1, 0, Math.PI / 6),
    [],
  );

  return (
    <group>
      <ambientLight intensity={0.5} />
      {/* At the Sun, so the Earth's terminator and the Moon's phase are real. */}
      <pointLight position={[0, 0, 0]} intensity={90} distance={80} decay={1.4} color="#fff2d0" />

      <Ring opacity={0.07} />
      <RashiSegments opacity={0.05} />
      <RashiDividers opacity={0.4} />

      {/* The rashi the Sun is seen in. */}
      <mesh ref={activeSeg} geometry={segGeometry}>
        <meshBasicMaterial
          color={SUN_COLOR}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <EarthOrbitPath anchorDt={anchorDt} opacity={0.4} />
      <ApsisMarkers anchorDt={anchorDt} opacity={0.22} />
      {/* The Moon's own orbit, always drawn — it is the circle the Moon is
          going round, and losing it leaves the Moon looking unattached. */}
      {/* Everything read from Earth rides with Earth. */}
      <group ref={moonOrbitGroup}>
        <OrbitGuide radius={MOON_ORBIT} color={MOON_COLOR} opacity={0.28} dashed={false} />
        <primitive object={startTick} />
        <primitive object={lapArc.first} />
        <primitive object={lapArc.overshoot} />
        <group ref={moonBeltGroup}>
          <MoonBelt opacity={0.34} />
          {/* The sign the Moon stands in, on its own belt. */}
          <mesh ref={moonSeg} geometry={moonSegGeometry}>
            <meshBasicMaterial
              color={MOON_COLOR}
              transparent
              opacity={0.34}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <primitive object={moonSightline} />
          <mesh ref={moonMarker}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color={MOON_COLOR} transparent opacity={1} />
          </mesh>
        </group>
      </group>

      <primitive object={sightline} />
      <primitive object={trail} />
      <mesh ref={sunMarker}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={SUN_COLOR} transparent opacity={1} />
      </mesh>

      <ElongationWedge
        sunLonRef={sunLon}
        moonLonRef={moonLon}
        earthDistRef={earthDist}
        opacityRef={lunarW}
      />

      <mesh>
        <sphereGeometry args={[SUN_R, 32, 32]} />
        <meshBasicMaterial map={sunMap} color="#fff0c4" />
      </mesh>
      <mesh>
        <sphereGeometry args={[SUN_R * 1.8, 24, 24]} />
        <meshBasicMaterial color={SUN_COLOR} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <group ref={earthGroup}>
        {/*
          The tilt belongs on a parent, not on the spinning mesh. Three's
          default Euler order is XYZ, so a mesh carrying both would compose as
          Rx·Ry·Rz — the spin applied about the *world* vertical, with the
          globe merely pre-rotated. Nesting makes it Rz(tilt)·Ry(spin), which
          is a planet turning about its own inclined axis.
        */}
        <group rotation={[0, 0, AXIAL_TILT * DEG]}>
          <mesh ref={earthMesh}>
            <sphereGeometry args={[EARTH_R, 40, 40]} />
            <meshStandardMaterial map={earthMap} roughness={0.9} metalness={0} />
          </mesh>
          {/* The axis itself, so the tilt is visible rather than implied. */}
          <primitive object={earthAxis} />
        </group>
      </group>

      <group ref={moonGroup}>
        <mesh>
          <sphereGeometry args={[MOON_R, 28, 28]} />
          <meshStandardMaterial map={moonMap} roughness={1} metalness={0} />
        </mesh>
      </group>

      {/* A faint disc so the ecliptic reads as a surface the orbits sit in. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, RING_INNER, 64]} />
        <meshBasicMaterial
          color={INK}
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default memo(TwoSystemsScene);
