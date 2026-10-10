/**
 * "What is a day" — the R3F scene, on iOS and Android.
 *
 * A port of the web app's `components/learn/DaySimScene.tsx`. The geometry, the
 * frame, the mechanics and every constant are the same file's; what changed is
 * only the three things a phone cannot do the browser's way. They are marked
 * `── native ──` where they appear, and they are:
 *
 *   1. **Textures** come from the bundler through expo-asset, not from a URL
 *      under `import.meta.env.BASE_URL`.
 *   2. **Labels** are collected a few times a second and drawn as React Native
 *      `Text` by the shell, instead of the scene writing `transform` on DOM
 *      nodes every frame. See `playground-labels.ts` for why.
 *   3. **राहु and केतु** are drawn, not rasterised. The web billboards the app's
 *      own SVG artwork through a canvas element; there is no canvas element
 *      here, so the two nodes are geometry — a ring for राहु's ascending
 *      crossing and a disc for केतु's descending one, in the same two colours,
 *      named by the label overlay.
 *
 * Everything below this line is the web scene's own commentary, kept because it
 * documents geometry that is genuinely identical:
 *
 * The frame is the planet's **equatorial** one: the XZ plane is the equator,
 * and the planet's spin axis is +Y and never moves. Axial tilt therefore does
 * not tilt the planet here — it tilts the *Sun's path*, which is the same
 * geometry read from the other end and the only arrangement in which the three
 * day-arcs can be drawn in one flat plane and compared. That is the whole
 * point of the picture, so it is worth the inversion.
 *
 * Origin is the **mean sun** — the fiction a clock keeps time by, moving at a
 * constant rate along the equator. The planet circles it at a fixed radius.
 * The **true sun** is placed separately from the real orbit (elliptical, and
 * tilted out of the equatorial plane), so the gap between the two suns is
 * visible directly: that gap is the equation of time.
 *
 * Three arcs wrap the planet, each measuring the same rotation against a
 * different zero:
 *
 *   - **sidereal** (blue, outermost) — against the fixed stars. Uniform.
 *   - **true solar** (gold, middle) — against the true sun. Never uniform.
 *   - **mean solar** (red, inner) — against the mean sun. Uniform by construction.
 *
 * The parent owns the clock and camera in refs and mutates them, so neither
 * playing nor dragging re-renders React. The scene reports a sampled snapshot
 * back through `onSample` a few times a second, and the overlay draws its
 * readouts from that.
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { KATHMANDU } from "@/lib/sky3d/horizon";
import {
  atLonInto,
  BELT_MID,
  BELT_OUTER,
  EclipticWheel,
  GuideGrid,
  MONTH_R,
  NAK_INNER,
  NAK_MID,
  NAK_OUTER,
} from "@/components/learn/playground/EclipticWheel";
import {
  usePlaygroundLabels,
  type PlaygroundLabel,
} from "@/components/learn/playground/playground-labels";
import { usePlaygroundTextures } from "@/components/learn/playground/playground-textures";
import { makeEarthMaterial } from "@/lib/sky3d/earth-material";
import {
  equationOfTime,
  euclideanModulo,
  orbitDistance,
  orbitRadii,
  meanAnomalyAt,
  shortestAngle,
  trueAnomaly,
  MESHA_FROM_PERIHELION,
  PERIHELION,
  VERNAL,
  VERNAL_FROM_PERIHELION,
} from "@/lib/sky3d/day-mechanics";

const PI2 = Math.PI * 2;

/** Radius of the mean orbit. Everything else is scaled against this. */
export const MEAN_DISTANCE = 10;
const PLANET_R = 1;
/** काठमाडौँ's longitude in radians — the spin phase that puts it at noon. */
const KATHMANDU_LON = KATHMANDU.lon * (Math.PI / 180);
/** Where the mean sun sits. Read-only — never mutate it. */
const ORIGIN = new THREE.Vector3();
const SUN_R = 0.9;
const MEAN_SUN_R = 0.42;

const MOON_R = 0.27;
/** Shadow grahas — points, not discs, but they still have to read at this scale. */
const NODE_R = 0.16;
/**
 * The Moon's orbit, drawn wide enough for its tilt to mean something.
 *
 * At 2.6 it was 2.6 planet-radii out. The real one is sixty, and that ratio is
 * the whole reason eclipses are rare: 5.14° of inclination lifts the Moon about
 * five planet-radii clear of the shadow, so most months it passes above or
 * below and nothing happens. Compressed to 2.6, the same 5.14° lifts it 0.23 —
 * a quarter of the way to the planet's own edge — so *every* पूर्णिमा put the
 * Moon inside the shadow and every अमावस्या put it across the Sun's face. The
 * sim was claiming an eclipse a fortnight.
 */
const MOON_ORBIT = 3.6;

/**
 * Sidereal months in a sidereal year — 365.256 / 27.322.
 *
 * Tied to the *year*, not to the day, so the Moon keeps making its ~13.37 laps
 * however many rotations the reader gives the year. That is what keeps twelve
 * lunar months falling about eleven days short of the solar one at any setting,
 * which is the only reason to draw the Moon here at all.
 */
const MOON_LAPS_PER_YEAR = 365.256363 / 27.321661;

/**
 * How far off the ecliptic the Moon may be at syzygy and still be eclipsed.
 *
 * The real limits are about 1.5° for a lunar eclipse and a little more for a
 * solar one; one figure for both is close enough for a picture, and it is the
 * *rarity* it is buying — an eclipse season twice a year, not every month.
 */
const ECLIPSE_LAT_LIMIT_DEG = 1.5;

/**
 * How near syzygy counts, in degrees of elongation.
 *
 * The real span of the partial phases, not a widened one: the Moon moves about
 * 12° a day against the Sun, so ±1.5° is the couple of hours an eclipse
 * actually lasts. It goes by quickly at playing speed for the same reason it
 * does in life.
 */
const ECLIPSE_ELONG_WINDOW_DEG = 1.5;

/**
 * One retrograde circuit of the lunar nodes — राहु and केतु. 18 years, 221 days
 * and 16 hours. They travel *clockwise* (against the Moon) and stay exactly
 * 180° apart: they are the two ends of one line, the intersection of the Moon's
 * orbit with the ecliptic, not two independent bodies.
 */
const NODAL_PERIOD_DAYS = 6793.48;
const NODAL_LAPS_PER_YEAR = 365.256363 / NODAL_PERIOD_DAYS;

/**
 * The Moon's orbital plane against the ecliptic.
 *
 * The real inclination is ~5.14°. At this scene's compressed orbit that lift
 * is only a fraction of the planet's radius, so the Moon no longer clears the
 * disc at every syzygy the way a 60-radii orbit would. The honest angle is
 * still the right one to draw: राहु and केतु *are* those two crossings, and
 * exaggerating the tilt made the orbit a different object from the one they
 * live on.
 */
const MOON_INCLINATION = 5.14 * (Math.PI / 180);

/** Synodic laps per year — new moon to new moon, one fewer than sidereal. */
const MOON_SYNODIC_PER_YEAR = MOON_LAPS_PER_YEAR - 1;

/**
 * Where the Moon stands at मेष सङ्क्रान्ति, measured from मेष.
 *
 * The month *names* are lunar even though the month *lengths* are solar: a
 * चान्द्र मास is named for the नक्षत्र its **पूर्णिमा** falls in — वैशाख from
 * विशाखा, जेठ from ज्येष्ठा, कात्तिक from कृत्तिका, and so on round the year.
 * This value is the middle of the plateau of anchors that name the most months
 * correctly, so it is not one step away from losing one.
 *
 * It cannot hold for all twelve at once, and that is the honest part. Twelve
 * lunar months fall about eleven days short of the solar year, so the पूर्णिमा
 * slips a little earlier against the solar month each time. That slippage is
 * exactly what an अधिक मास is inserted to absorb — which this sim does not do,
 * so the drift stays visible rather than being quietly corrected.
 */
const MOON_ANCHOR_FROM_MESHA = 189.25;

/** Points in the Moon's swept trail, over one synodic month. */
const TRAIL_STEPS = 160;
const LAP_SEGMENTS = 240;

/** Ring segment count — arcs quantise to this, so 2° steps. */
const ARC_SEGMENTS = 180;
const WEDGE_SEGMENTS = 48;

const COLOR = {
  sidereal: 0x2888e4,
  solar: 0xdddd00,
  mean: 0xe93f33,
  belt: 0x8a7c2e,
  nakshatra: 0x4a6b8a,
  rahu: 0x8b5cf6,
  ketu: 0xe11d48,
  axis: 0xdfe7f2,
} as const;

const MOON_INCL_Q = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  MOON_INCLINATION,
);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

export type CameraTarget = "meanSun" | "planet" | "sun";

export type SimClock = {
  /** Position in the year, in sidereal rotations. */
  day: number;
  playing: boolean;
  /** Sidereal rotations of simulated time per real second. */
  daysPerSecond: number;
};

export type SimParams = {
  daysPerYear: number;
  eccentricity: number;
  /** Axial tilt in radians. */
  tilt: number;
};

export type SimToggles = {
  grid: boolean;
  planetOrbit: boolean;
  sunOrbit: boolean;
  trueSun: boolean;
  meanSun: boolean;
  eotWedge: boolean;
  siderealArc: boolean;
  solarArc: boolean;
  meanArc: boolean;
  /** काठमाडौँ's meridian, pole to pole — the line noon is reckoned against. */
  primeMeridian: boolean;
  /** The spin axis, run out through both poles, against the orbital plane. */
  axis: boolean;
  /** The twelve राशि, out beyond the orbit. */
  rashiBelt: boolean;
  /** The twenty-seven नक्षत्र, outside the rashi belt. */
  nakshatraBelt: boolean;
  /** बिक्रम months, which *are* the solar rashi — बैशाख opens at मेष. */
  monthRing: boolean;
  /** Planet → Sun → belt: the line that says which rashi the Sun is seen in. */
  sightline: boolean;
  /** The Moon and the path it takes round the planet. */
  moon: boolean;
  /** The Moon's swept path through space — its compound motion made visible. */
  moonTrail: boolean;
  /** One sidereal lap against the extra arc a synodic month still needs. */
  moonLap: boolean;
  /** Earth → Moon → नक्षत्र belt: the Moon's own nakshatra, read off the sky. */
  moonSightline: boolean;
  /* ── the three clock faces ─────────────────────────────────────────
     Each rides its own arc, so a face is only ever drawn when the arc it
     belongs to is. Separating them from the arcs is what lets a chapter show
     two arcs while reading one clock. */
  /** The sidereal (नाक्षत्र) clock face, on the stellar arc. */
  siderealClock: boolean;
  /** The true-Sun clock face, on the solar arc. */
  solarClock: boolean;
  /** The mean-time clock face, on the mean arc. */
  meanClock: boolean;
  /** The globe's rotation so far, in degrees, pinned above the planet — and
   *  the ecliptic polar mesh the degrees are read against. */
  degrees: boolean;
};

export type CameraState = { yaw: number; pitch: number; distance: number };

export type SceneSample = {
  day: number;
  /** Equation of time in minutes. */
  eotMinutes: number;
  meanAnomaly: number;
  /** 0–11: the rashi the Sun is seen in, which is also the बिक्रम month. */
  rashi: number;
  /** 0–26: the nakshatra the Sun is seen in. */
  nakshatra: number;
  /** 0–26: the nakshatra the **Moon** is in — the one a पञ्चाङ्ग names. */
  moonNakshatra: number;
  /** Set on the frame the Sun crosses into a new rashi, so the HUD can flash. */
  sankranti: number | null;
};

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * A ring drawn by `setDrawRange` rather than by rebuilding geometry.
 *
 * `RingGeometry` emits six indices per theta-segment in order, so truncating
 * the index buffer truncates the arc. That turns a per-frame geometry rebuild
 * — which is what an arc whose length changes every frame would otherwise
 * need — into a single integer write. Worth more here than on the web: a
 * geometry rebuild on a phone is a GL buffer upload every frame.
 */
function useArcGeometry(inner: number, outer: number) {
  return useMemo(
    () => new THREE.RingGeometry(inner, outer, ARC_SEGMENTS, 1, 0, PI2),
    [inner, outer],
  );
}

/** Ellipse in the XZ plane, as a closed line. Equal radii give a circle. */
function ellipseGeometry(semiMajor: number, semiMinor: number, segments = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * PI2;
    pts.push(semiMajor * Math.cos(a), 0, -semiMinor * Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/**
 * The orbit ellipse drawn about its **focus**, not its centre.
 *
 * Centring it on the Sun is what made raising the eccentricity look like it did
 * nothing: the semi-minor axis is `a√(1−e²)`, so even e = 0.4 flattens the
 * outline by only 8% — an eccentric orbit really is very nearly circular. What
 * eccentricity actually *shows* is the Sun sitting off-centre, by `a·e`, which
 * a centre-drawn ellipse hides completely.
 */
function focalEllipseGeometry(semiMajor: number, e: number, segments = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * PI2;
    const r = orbitDistance(semiMajor, e, theta);
    pts.push(r * Math.cos(theta), 0, -r * Math.sin(theta));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/**
 * Truncate a full ring to `angle`, by index count rather than by rebuilding.
 *
 * Angles at or past a full turn draw the whole ring rather than wrapping back
 * to nothing.
 */
function setRingArc(mesh: THREE.Mesh, angle: number, segments: number) {
  const frac = angle >= PI2 ? 1 : euclideanModulo(angle, PI2) / PI2;
  mesh.geometry.setDrawRange(0, Math.max(1, Math.round(frac * segments)) * 6);
}

function makeLine(geometry: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    }),
  );
}

/**
 * Tip the Moon's plane around a travelling node line.
 *
 * `rotY(Ω) · rotX(i) · rotY(-Ω)` leaves longitudes in the parent frame alone
 * and only tilts around the diameter at Ω — so the Moon keeps the longitude it
 * already had, while the two crossings (राहु at Ω, केतु at Ω+180°) stay on the
 * ecliptic and drift with Ω.
 */
function composeMoonPlane(
  out: THREE.Quaternion,
  solar: THREE.Quaternion,
  omegaRad: number,
  qNode: THREE.Quaternion,
  qNodeInv: THREE.Quaternion,
) {
  qNode.setFromAxisAngle(AXIS_Y, omegaRad);
  qNodeInv.copy(qNode).invert();
  return out.copy(solar).multiply(qNode).multiply(MOON_INCL_Q).multiply(qNodeInv);
}

/**
 * ── native ── राहु / केतु, drawn rather than rasterised.
 *
 * The web billboards the app's own graha SVG here, by drawing it into a canvas
 * element and handing the result to `CanvasTexture`. There is no canvas element
 * on a phone, and the alternatives — bundling a second set of PNGs, or pulling
 * in an SVG rasteriser — both cost more than the picture is worth.
 *
 * So the two nodes are geometry, and the geometry says what they are. Neither
 * is a body: they are the two ends of the line where the Moon's plane cuts the
 * ecliptic, so each is drawn as a *crossing* rather than a sphere — a ring at
 * राहु, where the Moon climbs north through the plane, and a filled disc at
 * केतु, where it drops back south. Both lie flat in the Moon's own plane, so
 * they turn edge-on as the camera comes down to it, which is exactly what a
 * point on a plane should do. The glow behind each keeps them findable at the
 * distances the belt modes use, and the name comes from the label overlay.
 */
function ShadowGraha({
  color,
  filled,
}: {
  color: number;
  /** केतु is the descending crossing — a solid disc against राहु's open ring. */
  filled: boolean;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[NODE_R * 1.9, 16, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        {filled ? (
          <circleGeometry args={[NODE_R * 1.5, 24]} />
        ) : (
          <ringGeometry args={[NODE_R * 0.95, NODE_R * 1.5, 24]} />
        )}
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export interface SceneProps {
  clock: MutableRefObject<SimClock>;
  camera: MutableRefObject<CameraState>;
  params: SimParams;
  toggles: SimToggles;
  cameraTarget: CameraTarget;
  cameraFollow: boolean;
  /** The twelve राशि, in the reader's language. */
  rashiNames: string[];
  /** The twelve बिक्रम months — बैशाख first, aligned to मेष. */
  monthNames: string[];
  /** The twenty-seven नक्षत्र, short forms — what the belt is labelled with. */
  nakshatraNames: string[];
  bodyNames: {
    planet: string;
    sun: string;
    meanSun: string;
    moon: string;
    rahu: string;
    ketu: string;
  };
  clockText: MutableRefObject<{ sidereal: string; solar: string; mean: string }>;
  onLabels: (labels: PlaygroundLabel[]) => void;
  onSample: (s: SceneSample) => void;
  /**
   * Which world the globe is. Earth keeps the cartoon map and the Moon; any
   * other graha swaps the surface for that planet's texture and drops the
   * Moon, राहु and केतु — those three belong to Earth.
   */
  planetBody?: PlaygroundGlobe;
}

/** Worlds the adjust drawer can put in Earth's place. */
export type PlaygroundGlobe = "earth" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

function DaySimScene({
  clock,
  camera,
  params,
  toggles,
  cameraTarget,
  cameraFollow,
  rashiNames,
  monthNames,
  nakshatraNames,
  bodyNames,
  clockText,
  onLabels,
  onSample,
  planetBody = "earth",
}: SceneProps) {
  const cam = useThree((s) => s.camera);
  const labels = usePlaygroundLabels(onLabels);

  /* ── native ── bundler modules, not URLs. See `playground-textures.ts`. All
     six candidate globes are loaded up front rather than swapped in lazily —
     a bundler module has to be `require`d statically, so there is no runtime
     `TextureLoader().load(url)` to pick one on demand the way the web does. */
  const textures = usePlaygroundTextures();
  /* Raw texels: the globe's own shader writes final pixels and does no
     colour-space conversion of its own. See `makeEarthMaterial`. Every
     candidate needs the same override — `usePlaygroundTextures` applies
     sRGB uniformly, and only this shader's own un-corrected reading is right
     for whichever one is on screen. */
  for (const key of ["earth", "mars", "mercury", "jupiter", "venus", "saturn"] as const) {
    if (textures[key]) textures[key].colorSpace = THREE.NoColorSpace;
  }
  const earthMat = useMemo(() => makeEarthMaterial(textures.earth), [textures.earth]);
  useEffect(() => () => earthMat.dispose(), [earthMat]);

  /* Only Earth carries a Moon (and therefore राहु/केतु). A borrowed graha is
     just a spinning world with its own tilt and ellipse. */
  const hasMoon = planetBody === "earth";

  useEffect(() => {
    const tex = textures[planetBody];
    if (tex) earthMat.uniforms.map.value = tex;
  }, [planetBody, textures, earthMat]);

  /* ── refs into the scene graph ───────────────────────────────────── */

  /* ── refs into the scene graph ───────────────────────────────────── */
  const arcRoot = useRef<THREE.Group>(null!);
  const planetMesh = useRef<THREE.Mesh>(null!);
  const siderealGroup = useRef<THREE.Group>(null!);
  const solarGroup = useRef<THREE.Group>(null!);
  const siderealArc = useRef<THREE.Mesh>(null!);
  const solarArc = useRef<THREE.Mesh>(null!);
  const meanArc = useRef<THREE.Mesh>(null!);
  const sunGroup = useRef<THREE.Group>(null!);
  const sunLight = useRef<THREE.PointLight>(null!);
  const wedge = useRef<THREE.Mesh>(null!);
  const sunOrbitGroup = useRef<THREE.Group>(null!);
  const moonRoot = useRef<THREE.Group>(null!);
  const moonPlane = useRef<THREE.Group>(null!);
  const nodeAxis = useRef<THREE.Group>(null!);
  const beltRoot = useRef<THREE.Group>(null!);
  const gridRoot = useRef<THREE.Group>(null!);
  /**
   * The whole moving world, slid so the focused body sits on the origin.
   *
   * Focus used to be a camera move: the camera flew to the body and the grid
   * flew with it, so the *floor* travelled and every orbit line appeared to
   * drift. Shifting the world instead makes focus what it claims to be — a
   * change of reference frame. The focused body is then genuinely still at the
   * centre, the grid is a fixed plane it sits on, and everything else moves
   * against it.
   */
  const frameRoot = useRef<THREE.Group>(null!);
  const solarShadow = useRef<THREE.Group>(null!);
  const vMoonWorld = useRef(new THREE.Vector3());
  const vShadow = useRef(new THREE.Vector3());
  const rashiHighlight = useRef<THREE.Mesh>(null!);
  const nakHighlight = useRef<THREE.Mesh>(null!);
  const moonMesh = useRef<THREE.Mesh>(null!);
  const moonPlaneQ = useRef(new THREE.Quaternion());
  const qMoonNode = useRef(new THREE.Quaternion());
  const qMoonNodeInv = useRef(new THREE.Quaternion());
  const omegaRad = useRef(0);
  const yearCount = useRef(0);

  const frame = useRef(0);
  const lastRashi = useRef(-1);
  /* Scratch, reused every frame — see `atLonInto`. */
  const vSun = useRef(new THREE.Vector3());
  const vTmp = useRef(new THREE.Vector3());
  const vAnchor = useRef(new THREE.Vector3());
  const vCamUp = useRef(new THREE.Vector3());
  const vMoon = useRef(new THREE.Vector3());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));
  const scratch = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const followYaw = useRef(0);
  /* Where the camera is actually pointed this frame, and how far through a
     change of focus it is. See the camera block in the frame loop. */
  const camAnchor = useRef(new THREE.Vector3());
  const lastTarget = useRef<CameraTarget>("meanSun");
  const focusEase = useRef(1);

  const siderealGeom = useArcGeometry(1.4, 1.6);
  const solarGeom = useArcGeometry(1.2, 1.4);
  const meanGeom = useArcGeometry(0.98, 1.2);

  /* Orbit outlines only change when the orbit's shape does. */
  const { semiMajor } = useMemo(
    () => orbitRadii(params.eccentricity, MEAN_DISTANCE),
    [params.eccentricity],
  );
  const trueOrbitLine = useMemo(
    () => makeLine(focalEllipseGeometry(semiMajor, params.eccentricity), COLOR.solar, 0.5),
    [semiMajor, params.eccentricity],
  );
  const meanOrbitLine = useMemo(
    () => makeLine(ellipseGeometry(MEAN_DISTANCE, MEAN_DISTANCE), COLOR.mean, 0.55),
    [],
  );
  /**
   * The spin axis, run out well past both poles.
   *
   * This scene keeps the planet's *equator* as its working plane and tilts the
   * Sun's plane instead, which is what makes the equation of time tractable —
   * so the axis is world-vertical here rather than leaning over. The 23.44°
   * does not vanish with that choice, it changes which line carries it: the
   * tilt is the angle between this axis and the orbital plane the planet is
   * riding, and the low camera of the tilt mode is aimed to show exactly that.
   */
  const axisLine = useMemo(
    () =>
      makeLine(
        (() => {
          const g = new THREE.BufferGeometry();
          const L = PLANET_R * 2.3;
          g.setAttribute("position", new THREE.Float32BufferAttribute([0, -L, 0, 0, L, 0], 3));
          return g;
        })(),
        COLOR.axis,
        0.85,
      ),
    [],
  );
  /**
   * Half a great circle, pole to pole, through **काठमाडौँ**.
   *
   * Drawn in the XY plane it would run through longitude 0° — Greenwich — which
   * is the wrong meridian for this app entirely: every time the app quotes is
   * reckoned from Nepal, so the line that marks "noon here" has to pass through
   * here. The standard equirectangular earth texture puts 0° along +X, so a
   * rotation of exactly the longitude is all it takes.
   */
  const localMeridian = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = -Math.PI / 2 + (i / 48) * Math.PI;
      pts.push(1.003 * Math.cos(a), 1.003 * Math.sin(a), 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const line = makeLine(g, 0xdd2222, 0.95);
    /* A rotation of +y about the spin axis carries +X east, which is the
       direction longitude runs. */
    line.rotation.y = KATHMANDU.lon * (Math.PI / 180);
    return line;
  }, []);

  const dispose = (o: THREE.Line) => {
    o.geometry.dispose();
    (o.material as THREE.Material).dispose();
  };
  useEffect(() => () => dispose(trueOrbitLine), [trueOrbitLine]);
  useEffect(() => () => dispose(meanOrbitLine), [meanOrbitLine]);
  useEffect(() => () => dispose(localMeridian), [localMeridian]);
  useEffect(() => () => dispose(axisLine), [axisLine]);

  /**
   * Rotation carrying the equatorial plane onto the ecliptic.
   *
   * Built from the tilt about the vernal-equinox direction — so the Sun's path
   * leaves the equator by exactly the axial tilt, crossing it at the equinoxes.
   */
  const solarPlaneQ = useMemo(() => {
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      VERNAL_FROM_PERIHELION,
    );
    return q.multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-params.tilt, -VERNAL_FROM_PERIHELION, 0),
      ),
    );
  }, [params.tilt]);

  /** The inverse — equatorial frame back to ecliptic, for reading longitudes. */
  const eclipticQ = useMemo(() => solarPlaneQ.clone().invert(), [solarPlaneQ]);

  /**
   * Where the grid's spokes start — the focused body's own radius.
   *
   * A fixed inner radius cannot serve all three: at 4 it cleared the planet by
   * three units of empty floor, which reads as a hole punched round whatever is
   * being watched. Each body gets its own, so the plane leaves its equator.
   */
  const focusRadius =
    cameraTarget === "planet" ? PLANET_R : cameraTarget === "sun" ? SUN_R : MEAN_SUN_R;

  /**
   * Where मेष 0° sits, so that **day 0 is मेष सङ्क्रान्ति — बैशाख १**.
   *
   * The orbit's own zero is perihelion, which has no reason to coincide with
   * the start of the बिक्रम year. Rather than bend the dynamics to make it —
   * which would drag the equation of time's phase along with it — the *belt*
   * is rotated so its origin lands wherever the Sun actually is at day 0. The
   * physics is untouched; only the labelling moves.
   *
   * It depends on eccentricity because the true anomaly does, so the belt
   * re-seats itself when that slider moves. That is correct rather than
   * incidental: a rounder orbit really does put सङ्क्रान्ति somewhere else
   * relative to perihelion.
   */
  const beltZeroDeg = useMemo(
    () =>
      euclideanModulo(
        trueAnomaly(MESHA_FROM_PERIHELION, params.eccentricity) * (180 / Math.PI) + 180,
        360,
      ),
    [params.eccentricity],
  );

  /**
   * A longitude on the belt, placed in the ecliptic plane where it belongs.
   *
   * Writes into a vector you own: this runs for every belt label on every
   * frame, so an allocating version quietly puts fifty short-lived vectors a
   * frame back on the heap.
   */
  const atBeltInto = useCallback(
    (out: THREE.Vector3, lonDeg: number, radius: number) =>
      atLonInto(out, lonDeg, radius).applyQuaternion(solarPlaneQ),
    [solarPlaneQ],
  );

  /** The Moon's orbital plane: the ecliptic, tipped by its own inclination. */
  const seedMoonPlane = useCallback(
    (omega: number) => {
      composeMoonPlane(
        moonPlaneQ.current,
        solarPlaneQ,
        omega,
        qMoonNode.current,
        qMoonNodeInv.current,
      );
      if (moonPlane.current) moonPlane.current.quaternion.copy(moonPlaneQ.current);
    },
    [solarPlaneQ],
  );
  useLayoutEffect(() => seedMoonPlane(omegaRad.current), [seedMoonPlane]);

  const moonOrbitLine = useMemo(
    () => makeLine(ellipseGeometry(MOON_ORBIT, MOON_ORBIT, 96), 0x9aa8c0, 0.4),
    [],
  );
  useEffect(() => () => dispose(moonOrbitLine), [moonOrbitLine]);

  /** The line of nodes — राहु to केतु through the planet, always a diameter. */
  const nodeLine = useMemo(
    () =>
      makeLine(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-MOON_ORBIT, 0, 0),
          new THREE.Vector3(MOON_ORBIT, 0, 0),
        ]),
        0xc4b5fd,
        0.55,
      ),
    [],
  );
  useEffect(() => () => dispose(nodeLine), [nodeLine]);

  /**
   * The Moon's path through space over one synodic month.
   *
   * Drawn in *world* coordinates, not around the planet — because the planet
   * is moving too. What it shows is the compound motion: the Moon never loops
   * back on itself, it scallops forward along the planet's own orbit. This is
   * the single line that makes the next two arcs inevitable.
   */
  const moonTrail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array((TRAIL_STEPS + 1) * 3), 3),
    );
    return makeLine(g, 0xb9c6de, 0.65);
  }, []);
  useEffect(() => () => dispose(moonTrail), [moonTrail]);

  /**
   * One sidereal lap, and the arc a synodic month still needs beyond it.
   *
   * The Moon returns to the same *star* after 360°, but by then the planet has
   * carried on around the Sun, so the Moon is not yet back beside it — it must
   * travel about **29° further** to reach the next new moon. Two arcs at
   * different radii: the full lap underneath, the overshoot standing proud of
   * it. That gap is the difference between a 27.3-day month and a 29.5-day one.
   */
  const lapArc = useMemo(() => {
    const first = new THREE.Mesh(
      new THREE.RingGeometry(MOON_ORBIT * 1.06, MOON_ORBIT * 1.14, LAP_SEGMENTS, 1, 0, PI2),
      new THREE.MeshBasicMaterial({
        color: 0x8fa6c8,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const over = new THREE.Mesh(
      new THREE.RingGeometry(MOON_ORBIT * 1.16, MOON_ORBIT * 1.3, LAP_SEGMENTS, 1, 0, PI2),
      new THREE.MeshBasicMaterial({
        color: COLOR.solar,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    first.rotation.x = -Math.PI / 2;
    over.rotation.x = -Math.PI / 2;
    return { first, over };
  }, []);
  useEffect(
    () => () => {
      for (const m of [lapArc.first, lapArc.over]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
    [lapArc],
  );

  /** Where the current lunar month began — the reference the arcs sweep from. */
  const monthStartTick = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    return makeLine(g, 0xffffff, 0.75);
  }, []);
  useEffect(() => () => dispose(monthStartTick), [monthStartTick]);

  /* Wedge geometry: a fixed-size fan whose vertices move each frame. */
  const wedgeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array((WEDGE_SEGMENTS + 2) * 3), 3),
    );
    const idx: number[] = [];
    for (let i = 1; i <= WEDGE_SEGMENTS; i += 1) idx.push(0, i, i + 1);
    g.setIndex(idx);
    return g;
  }, []);
  useEffect(() => () => wedgeGeom.dispose(), [wedgeGeom]);

  const dropLine = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    return makeLine(g, COLOR.solar, 0.5);
  }, []);
  useEffect(() => () => dispose(dropLine), [dropLine]);

  /**
   * Earth → Moon → नक्षत्र belt.
   *
   * The Sun's line stops at the राशि belt's outer edge; this one carries on
   * through to the far edge of the नक्षत्र ring, because the nakshatra a
   * पञ्चाङ्ग names is the **Moon's**, not the Sun's.
   */
  const moonSightline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    return makeLine(g, 0xb9c6de, 0.85);
  }, []);
  useEffect(() => () => dispose(moonSightline), [moonSightline]);

  /** The नक्षत्र the Moon stands in, lit in its own colour. */
  const moonNakHighlight = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(NAK_INNER, NAK_OUTER, 10, 1, 0, PI2 / 27),
      new THREE.MeshBasicMaterial({
        color: 0xb9c6de,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }, []);
  useEffect(
    () => () => {
      moonNakHighlight.geometry.dispose();
      (moonNakHighlight.material as THREE.Material).dispose();
    },
    [moonNakHighlight],
  );

  /** Planet → Sun → belt. Three points, so the elbow at the Sun is visible. */
  const sightline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    return makeLine(g, COLOR.solar, 0.75);
  }, []);
  useEffect(() => () => dispose(sightline), [sightline]);

  useFrame((_, delta) => {
    const { daysPerYear, eccentricity: e, tilt } = params;
    const c = clock.current;

    /* ── advance the clock ───────────────────────────────────────────── */
    if (c.playing) {
      /* Clamped so a backgrounded app does not resume with one giant step. */
      c.day += c.daysPerSecond * Math.min(delta, 0.1);
      const wrappedYears = Math.floor(c.day / daysPerYear);
      if (wrappedYears) {
        /* The year loops; the nodes must not. One lap is 18.6 years. */
        yearCount.current += wrappedYears;
        c.day -= wrappedYears * daysPerYear;
      }
    }

    /* ── where everything is ─────────────────────────────────────────── */
    const day = c.day;
    const M = meanAnomalyAt(day / daysPerYear);
    const theta = trueAnomaly(M, e);
    const r = orbitDistance(semiMajor, e, theta);
    const eot = equationOfTime(M, e, tilt, PERIHELION - VERNAL);
    const dayAngle = euclideanModulo(day, 1) * PI2;

    const planetPos = scratch.current.set(
      MEAN_DISTANCE * Math.cos(M),
      0,
      -MEAN_DISTANCE * Math.sin(M),
    );

    /* True sun: down the real orbit from the planet, out of the equatorial
       plane by the tilt. */
    const sunOffset = vTmp.current
      .set(1, 0, 0)
      .applyAxisAngle(yAxis.current, theta)
      .applyQuaternion(solarPlaneQ)
      .setLength(r);
    const sunPos = vSun.current.copy(planetPos).sub(sunOffset);

    /* ── planet, arcs ────────────────────────────────────────────────── */
    /**
     * How far the mean sun has moved *since day 0*, not since perihelion.
     *
     * `M` is measured from perihelion, and मेष sits `MESHA_FROM_PERIHELION`
     * (~100°) past it — so every rotation measured with raw `M` opened day 0
     * already 100° along. Subtracting it here is what puts the geometry and the
     * three clock faces on the same zero.
     */
    const spin = M - MESHA_FROM_PERIHELION;

    /* Arc root points at the mean sun (hence the π), so the mean arc's zero
       is mean noon and every other arc is measured off the same origin. */
    arcRoot.current.position.copy(planetPos);
    arcRoot.current.rotation.y = M + Math.PI;
    /* Backing the spin off by काठमाडौँ's longitude puts *its* meridian — the
       red line, and the one every time in this app is reckoned from — under the
       Sun, instead of Greenwich. */
    planetMesh.current.rotation.y = dayAngle - spin - KATHMANDU_LON;
    siderealGroup.current.rotation.y = -spin;
    solarGroup.current.rotation.y = -eot;

    const setArc = (mesh: THREE.Mesh, angle: number) => setRingArc(mesh, angle, ARC_SEGMENTS);
    setArc(siderealArc.current, dayAngle);
    setArc(solarArc.current, dayAngle + eot - spin);
    setArc(meanArc.current, dayAngle - spin);

    /* ── suns ────────────────────────────────────────────────────────── */
    sunGroup.current.position.copy(sunPos);
    sunGroup.current.rotation.y = M * 15;
    sunLight.current.position.copy(sunPos);
    sunOrbitGroup.current.position.copy(sunPos);

    /* The globe shades itself against the Sun's *world* place, which the frame
       shift moves — read it back off the light rather than from `sunPos`, or
       the lit side stops tracking the moment the reader changes focus. */
    {
      const u = earthMat.uniforms;
      sunLight.current.getWorldPosition(u.sunPosition.value as THREE.Vector3);
      u.sunOn.value = toggles.trueSun ? 1 : 0;
    }

    /* Vertical drop from the true sun to the equatorial plane — the part of
       the offset that the tilt alone is responsible for. */
    {
      const a = dropLine.geometry.getAttribute("position") as THREE.BufferAttribute;
      a.setXYZ(0, sunPos.x, sunPos.y, sunPos.z);
      a.setXYZ(1, sunPos.x, 0, sunPos.z);
      a.needsUpdate = true;
      dropLine.geometry.computeBoundingSphere();
    }

    /* ── equation-of-time wedge ──────────────────────────────────────── */
    if (toggles.eotWedge) {
      const a = wedgeGeom.getAttribute("position") as THREE.BufferAttribute;
      /* Apex at the planet; one edge to the mean sun, the other swept round
         by the equation of time to the true sun. Both are drawn flat in the
         equatorial plane — the wedge measures an angle, not a distance. */
      a.setXYZ(0, planetPos.x, 0, planetPos.z);
      const toMean = Math.atan2(-(0 - planetPos.z), 0 - planetPos.x);
      const len = MEAN_DISTANCE * 0.75;
      for (let i = 0; i <= WEDGE_SEGMENTS; i += 1) {
        const ang = toMean - eot * (i / WEDGE_SEGMENTS);
        a.setXYZ(i + 1, planetPos.x + len * Math.cos(ang), 0, planetPos.z - len * Math.sin(ang));
      }
      a.needsUpdate = true;
      wedgeGeom.computeBoundingSphere();
      (wedge.current.material as THREE.MeshBasicMaterial).color.setHex(
        eot > 0 ? COLOR.solar : COLOR.mean,
      );
    }

    /* ── the Moon ────────────────────────────────────────────────────── */
    moonRoot.current.position.copy(planetPos);
    const moonLonAt = (d: number) =>
      beltZeroDeg + MOON_ANCHOR_FROM_MESHA + MOON_LAPS_PER_YEAR * 360 * (d / daysPerYear);
    /** The Moon's place in the scene's own coordinates, for labels and tests. */
    const moonAt = (out: THREE.Vector3, lonDeg: number) =>
      atLonInto(out, lonDeg, MOON_ORBIT).applyQuaternion(moonPlaneQ.current).add(planetPos);
    /**
     * राहु at +MOON_ORBIT along the node line, केतु at −.
     *
     * Lifted clear of the marker for the name, by adding rather than setting:
     * the node sits on the *ecliptic*, which is tilted out of this scene's
     * equatorial plane, so its own y is rarely zero.
     */
    const nodeAt = (out: THREE.Vector3, signedRadius: number) => {
      out
        .set(signedRadius, 0, 0)
        .applyAxisAngle(AXIS_Y, omegaRad.current)
        .applyQuaternion(moonPlaneQ.current)
        .add(planetPos);
      out.y += NODE_R * 2.6;
      return out;
    };
    /* Clockwise = decreasing longitude. One lap in NODAL_PERIOD_DAYS.
       `yearCount` survives the year wrapping so the nodes keep travelling. */
    const rahuLon = euclideanModulo(
      -NODAL_LAPS_PER_YEAR * 360 * (yearCount.current + day / daysPerYear),
      360,
    );
    omegaRad.current = rahuLon * (Math.PI / 180);
    composeMoonPlane(
      moonPlaneQ.current,
      solarPlaneQ,
      omegaRad.current,
      qMoonNode.current,
      qMoonNodeInv.current,
    );
    moonPlane.current.quaternion.copy(moonPlaneQ.current);
    nodeAxis.current.rotation.y = omegaRad.current;
    if (hasMoon && (toggles.moon || toggles.moonTrail || toggles.moonLap)) {
      const moonLon = moonLonAt(day);
      atLonInto(moonMesh.current.position, moonLon, MOON_ORBIT);
      /* Tidally locked — the same face stays turned toward the planet. */
      moonMesh.current.rotation.y = moonLon * (Math.PI / 180) + Math.PI;

      /* Day 0 is not an अमावस्या, so the month boundary has to be solved for:
         elongation grows by `MOON_SYNODIC_PER_YEAR` turns a year, and a lunar
         month opens each time it passes a whole turn. */
      const elongTurns =
        (MOON_ANCHOR_FROM_MESHA + MOON_SYNODIC_PER_YEAR * 360 * (day / daysPerYear)) / 360;
      const monthStartDay =
        ((Math.floor(elongTurns) * 360 - MOON_ANCHOR_FROM_MESHA) * daysPerYear) /
        (MOON_SYNODIC_PER_YEAR * 360);
      const travelled = MOON_LAPS_PER_YEAR * 360 * ((day - monthStartDay) / daysPerYear);

      if (toggles.moonLap) {
        /* Both arcs start at the Moon's place when the month opened. */
        const startLon = moonLonAt(monthStartDay);
        lapArc.first.rotation.z = startLon * (Math.PI / 180);
        lapArc.over.rotation.z = (startLon + 360) * (Math.PI / 180);
        setRingArc(lapArc.first, Math.min(travelled, 360) * (Math.PI / 180), LAP_SEGMENTS);
        setRingArc(lapArc.over, Math.max(0, travelled - 360) * (Math.PI / 180), LAP_SEGMENTS);
        lapArc.over.visible = travelled > 360;

        const a = monthStartTick.geometry.getAttribute("position") as THREE.BufferAttribute;
        const t = vAnchor.current;
        atLonInto(t, startLon, MOON_ORBIT * 0.72);
        a.setXYZ(0, t.x, t.y, t.z);
        atLonInto(t, startLon, MOON_ORBIT * 1.34);
        a.setXYZ(1, t.x, t.y, t.z);
        a.needsUpdate = true;
        monthStartTick.geometry.computeBoundingSphere();
      }
    }

    /*
     * ── ग्रहण ─────────────────────────────────────────────────────────
     *
     * Decided in *angles*, drawn in the scene's own units, and the split is
     * deliberate.
     *
     * The test is the real one an almanac uses: at syzygy, is the Moon's
     * ecliptic latitude inside the eclipse limit? That latitude comes straight
     * out of the model — the orbit is tilted about the राहु–केतु axis, so the
     * Moon is only near the ecliptic when a syzygy falls near a node, which is
     * why eclipses come in seasons twice a year instead of every fortnight.
     *
     * It cannot be read off the drawn geometry instead. The Moon is drawn 3.6
     * planet-radii out where it belongs sixty, so from the drawn picture alone
     * every पूर्णिमा looks like it lands in the shadow. The angles are true even
     * though the picture is compressed, so the angles decide.
     */
    {
      const moonWorld = atLonInto(vMoonWorld.current, moonLonAt(day), MOON_ORBIT)
        .applyQuaternion(moonPlaneQ.current)
        .add(planetPos);

      const toMoon = vShadow.current.copy(moonWorld).sub(planetPos).normalize();
      const toSunDir = vTmp.current.copy(sunPos).sub(planetPos).normalize();
      /* Latitude off the ecliptic, and elongation from the Sun — both as the
         observer on the planet would measure them. */
      const eclipticNormal = vAnchor.current.set(0, 1, 0).applyQuaternion(solarPlaneQ);
      const latDeg =
        Math.asin(Math.min(1, Math.max(-1, toMoon.dot(eclipticNormal)))) * (180 / Math.PI);
      const elongDeg =
        Math.acos(Math.min(1, Math.max(-1, toMoon.dot(toSunDir)))) * (180 / Math.PI);

      /** 1 at dead centre, easing to 0 at the limit. */
      const within = (value: number, limit: number) => Math.max(0, 1 - Math.abs(value) / limit);
      const nearNode = within(latDeg, ECLIPSE_LAT_LIMIT_DEG);
      const solar = nearNode * within(elongDeg, ECLIPSE_ELONG_WINDOW_DEG);
      const lunar = nearNode * within(180 - elongDeg, ECLIPSE_ELONG_WINDOW_DEG);

      /* सूर्य ग्रहण — the Moon's shadow on the planet, under the Moon itself.
         Placed at the sub-lunar point rather than by intersecting the drawn
         ray, for the same reason the test is angular. */
      const show = hasMoon && toggles.moon && solar > 0.02;
      solarShadow.current.visible = show;
      if (show) {
        const hit = vShadow.current.copy(toMoon).multiplyScalar(PLANET_R).add(planetPos);
        const normal = vTmp.current.copy(toMoon);
        solarShadow.current.position.copy(hit).addScaledVector(normal, 0.015);
        solarShadow.current.lookAt(vMoonWorld.current);
        /* Grows as the shadow closes on the middle of the disc. */
        solarShadow.current.scale.setScalar(0.45 + 0.55 * solar);
      }

      /* चन्द्र ग्रहण — the planet's shadow on the Moon, so it is the Moon that
         darkens. Copper rather than black: the planet's air bends red light
         into its own shadow, which is why a totally eclipsed Moon still shows. */
      const mat = moonMesh.current.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(1 - 0.62 * lunar, 1 - 0.86 * lunar, 1 - 0.9 * lunar);
    }

    /*
     * ── which body the sky ring is hung around ────────────────────────
     *
     * The belts are a ring of *directions*, and the stars that fix those
     * directions are effectively at infinity — so the ring may be hung around
     * whichever body the camera is watching, and each division still points the
     * same way. Hanging it on the planet is the geocentric sky, the one a
     * पात्रो is written from; hanging it on the Sun gives the heliocentric view.
     * The mean sun is the centre of the planet's own orbit, so hanging it there
     * is the orbit-centred view, and the planet visibly runs round inside it.
     */
    const beltCentre =
      cameraTarget === "planet" ? planetPos : cameraTarget === "sun" ? sunPos : ORIGIN;
    /* The Moon's markers are geocentric quantities — an ecliptic longitude read
       from the planet — so they are drawn only while the belt is on the planet,
       rather than drawn wrong against a ring centred somewhere else. */
    const geocentric = cameraTarget === "planet";

    /* ── which rashi is the Sun seen in ──────────────────────────────── */
    /* A rashi is a division of the **ecliptic**, not of the equator, so the
       longitude has to be read in the ecliptic frame — undo the tilt first.
       Measuring it in this scene's equatorial working frame would hand back
       right ascension instead, which drifts up to ~2.5° away and would put a
       sankranti on the wrong day. */
    const toSun = vTmp.current.copy(sunPos).sub(planetPos).applyQuaternion(eclipticQ);
    const sunLon = euclideanModulo(Math.atan2(-toSun.z, toSun.x) * (180 / Math.PI), 360);
    /* Measured from मेष, not from the orbit's perihelion — so day 0 reads
       मेष 0° / बैशाख १ exactly, whatever the eccentricity. */
    const lonFromMesha = euclideanModulo(sunLon - beltZeroDeg, 360);
    const rashi = Math.floor(lonFromMesha / 30) % 12;
    const nak = Math.floor((lonFromMesha * 27) / 360) % 27;

    /* The highlight lives inside the ecliptic group, so its own rotation is
       just the rashi's start longitude within that plane. */
    if (rashiHighlight.current) rashiHighlight.current.rotation.z = rashi * (Math.PI / 6);
    if (nakHighlight.current) nakHighlight.current.rotation.z = nak * (PI2 / 27);

    if (toggles.sightline) {
      /* Out to the belt's far edge, so the line crosses the whole band and ends
         on the rashi it is naming. The endpoint keeps its `y`: the belt lies in
         the *ecliptic*, tilted out of this scene's equatorial working plane, so
         flattening it to zero left the line hanging short of the belt. */
      const hit = atBeltInto(vAnchor.current, sunLon, BELT_OUTER).add(beltCentre);
      const a = sightline.geometry.getAttribute("position") as THREE.BufferAttribute;
      a.setXYZ(0, planetPos.x, planetPos.y, planetPos.z);
      a.setXYZ(1, sunPos.x, sunPos.y, sunPos.z);
      a.setXYZ(2, hit.x, hit.y, hit.z);
      a.needsUpdate = true;
      sightline.geometry.computeBoundingSphere();
    }

    /* The Moon's own longitude, read from the world vector rather than assumed
       from `moonLon`: the 5.14° orbital inclination tilts the direction, so the
       ecliptic longitude is not quite the in-plane angle. */
    const mDir = atLonInto(vMoon.current, moonLonAt(day), MOON_ORBIT)
      .applyQuaternion(moonPlaneQ.current)
      .applyQuaternion(eclipticQ);
    const moonEclLon = euclideanModulo(Math.atan2(-mDir.z, mDir.x) * (180 / Math.PI), 360);
    const moonNak =
      Math.floor((euclideanModulo(moonEclLon - beltZeroDeg, 360) * 27) / 360) % 27;
    moonNakHighlight.rotation.z = moonNak * (PI2 / 27);
    moonNakHighlight.visible = hasMoon && toggles.nakshatraBelt && toggles.moonSightline && geocentric;
    moonSightline.visible = hasMoon && toggles.moonSightline && geocentric;

    if (moonSightline.visible) {
      /* Rebuilt rather than read off the mesh: `getWorldPosition` would use a
         matrix this frame has not committed yet. */
      const mPos = atLonInto(vTmp.current, moonLonAt(day), MOON_ORBIT)
        .applyQuaternion(moonPlaneQ.current)
        .add(planetPos);
      const a = moonSightline.geometry.getAttribute("position") as THREE.BufferAttribute;
      a.setXYZ(0, planetPos.x, planetPos.y, planetPos.z);
      a.setXYZ(1, mPos.x, mPos.y, mPos.z);
      const hit = atBeltInto(vAnchor.current, moonEclLon, NAK_OUTER).add(beltCentre);
      a.setXYZ(2, hit.x, hit.y, hit.z);
      a.needsUpdate = true;
      moonSightline.geometry.computeBoundingSphere();
    }

    let sankranti: number | null = null;
    if (lastRashi.current !== -1 && rashi !== lastRashi.current) sankranti = rashi;
    lastRashi.current = rashi;

    beltRoot.current.position.copy(beltCentre);

    /* ── camera ──────────────────────────────────────────────────────── */
    const v = camera.current;
    const target =
      cameraTarget === "planet"
        ? planetPos
        : cameraTarget === "sun"
          ? sunPos
          : lookAt.current.set(0, 0, 0);

    /*
     * Switching focus glides; holding it tracks exactly.
     *
     * A hard cut between two bodies ten units apart reads as a teleport — the
     * reader loses which body they were looking at, which is the one thing the
     * control exists to make obvious. So the anchor eases across on a change of
     * target and then snaps to exact, because a permanent lerp would trail
     * behind a planet moving twelve rotations a second.
     */
    if (cameraTarget !== lastTarget.current) {
      lastTarget.current = cameraTarget;
      focusEase.current = 0;
    }
    if (focusEase.current < 1) {
      focusEase.current = Math.min(1, focusEase.current + delta * 2.5);
      camAnchor.current.lerp(target, Math.min(1, delta * 6));
    } else {
      camAnchor.current.copy(target);
    }
    /* The world moves, not the camera: everything is slid by −anchor, which
       puts the focused body on the origin and leaves it there. */
    frameRoot.current.position.copy(camAnchor.current).negate();

    /* Follow eases the yaw round with the planet so it stays put on screen. */
    followYaw.current +=
      shortestAngle((cameraFollow ? -M : 0) - followYaw.current) * Math.min(1, delta * 3);
    const yaw = v.yaw + followYaw.current;
    const cosPitch = Math.cos(v.pitch);
    cam.position.set(
      v.distance * cosPitch * Math.sin(yaw),
      v.distance * Math.sin(v.pitch),
      v.distance * cosPitch * Math.cos(yaw),
    );
    cam.lookAt(0, 0, 0);

    /* ── labels and the sampled readout ──────────────────────────────── */
    frame.current += 1;
    const sampling = frame.current % 12 === 0;
    const collecting = labels.begin();

    /* The trail is world-space and 160 points, so it is rebuilt on the sample
       tick rather than every frame — five times a second is smooth enough for
       a curve that takes a whole month to be drawn, and on a phone it is the
       difference between a 160-vertex upload every frame and one in twelve. */
    if (hasMoon && sampling && toggles.moonTrail) {
      const synodicDays = daysPerYear / MOON_SYNODIC_PER_YEAR;
      const a = moonTrail.geometry.getAttribute("position") as THREE.BufferAttribute;
      const w0 = vAnchor.current;
      const w1 = vTmp.current;
      for (let i = 0; i <= TRAIL_STEPS; i += 1) {
        const d = day - synodicDays * (1 - i / TRAIL_STEPS);
        const Md = meanAnomalyAt(d / daysPerYear);
        w0.set(MEAN_DISTANCE * Math.cos(Md), 0, -MEAN_DISTANCE * Math.sin(Md));
        atLonInto(w1, moonLonAt(d), MOON_ORBIT).applyQuaternion(moonPlaneQ.current);
        a.setXYZ(i, w0.x + w1.x, w0.y + w1.y, w0.z + w1.z);
      }
      a.needsUpdate = true;
      moonTrail.geometry.computeBoundingSphere();
    }

    if (collecting) {
      const shift = frameRoot.current.position;
      const anchor = vAnchor.current;
      /** `at` is in the scene's own coordinates; the frame shift slides it. */
      const push = (
        id: string,
        kind: PlaygroundLabel["kind"],
        text: string,
        at: THREE.Vector3,
        dim: boolean,
        extra?: { tone?: PlaygroundLabel["tone"]; index?: number; full?: string },
      ) => labels.push({ id, kind, text, dim, ...extra }, at.add(shift));

      /* All three belts are labelled at the middle of each division, not at its
         edge, so a name sits inside the span it names. */
      if (toggles.rashiBelt) {
        for (let i = 0; i < 12; i += 1) {
          push(
            `r-${i}`,
            "rashi",
            rashiNames[i]!,
            atBeltInto(anchor, beltZeroDeg + i * 30 + 15, BELT_MID).add(beltCentre),
            i !== rashi,
            { index: i + 1 },
          );
        }
      }
      if (toggles.monthRing) {
        for (let i = 0; i < 12; i += 1) {
          push(
            `bs-${i}`,
            "month",
            monthNames[i]!,
            atBeltInto(anchor, beltZeroDeg + i * 30 + 15, MONTH_R).add(beltCentre),
            i !== rashi,
          );
        }
      }
      if (toggles.nakshatraBelt) {
        for (let i = 0; i < 27; i += 1) {
          push(
            `n-${i}`,
            "nakshatra",
            nakshatraNames[i]!,
            atBeltInto(anchor, beltZeroDeg + (i * 360) / 27 + 360 / 54, NAK_MID).add(beltCentre),
            i !== nak,
            { index: i + 1 },
          );
        }
      }

      /* All the body anchors share one scratch: `push` projects immediately and
         never keeps the vector, so it is safe to overwrite between calls. */
      push("b-planet", "body", bodyNames.planet, anchor.copy(planetPos).setY(PLANET_R * 2.2), false);
      if (hasMoon && toggles.moon) {
        /* Built from the model rather than read back with `getWorldPosition`.
           A world matrix is only recomputed at render, so on the frame this
           runs it still holds the *previous* frame's frame-shift — and the
           label then has that shift added to it a second time, which throws the
           three lunar names ten units off whenever focus is anything but the
           mean sun (where the shift happens to be zero, which is why it is easy
           to miss). Composing the position the same way the Moon's own
           sightline does keeps it exact and one frame fresher. */
        push(
          "b-moon",
          "body",
          bodyNames.moon,
          moonAt(anchor, moonLonAt(day)).setY(MOON_R * 3.4),
          false,
        );
        push("b-rahu", "body", bodyNames.rahu, nodeAt(anchor, MOON_ORBIT), false);
        push("b-ketu", "body", bodyNames.ketu, nodeAt(anchor, -MOON_ORBIT), false);
      }
      /* Names sit a fixed clearance off the *surface*, not a multiple of the
         radius: scaled by radius the mean sun's name crowded its disc while the
         true sun's floated away from one twice the size. */
      if (toggles.trueSun)
        push("b-sun", "body", bodyNames.sun, anchor.copy(sunPos).setY(sunPos.y + SUN_R + 0.34), false);
      if (toggles.meanSun)
        push("b-mean", "body", bodyNames.meanSun, anchor.set(0, MEAN_SUN_R + 0.34, 0), false);

      /* Clock labels ride the tick that marks each arc's zero direction. Their
         angles converge — the three ticks sit on top of each other at day 0,
         and mean and true stay within the equation of time (~16 min, ~4°) of
         each other all year — so each label is pushed out to its own radius
         instead, in the same inner-to-outer order as the three arcs. */
      const tick = (localAngle: number, radius: number) => {
        const a = M + Math.PI + localAngle;
        return anchor.set(
          planetPos.x + radius * Math.cos(a),
          0,
          planetPos.z - radius * Math.sin(a),
        );
      };
      const ct = clockText.current;
      if (toggles.meanArc && toggles.meanClock)
        push("c-mean", "clock", ct.mean, tick(0, 1.75), false, { tone: "mean" });
      if (toggles.solarArc && toggles.solarClock)
        push("c-solar", "clock", ct.solar, tick(-eot, 2.45), false, { tone: "solar" });
      if (toggles.siderealArc && toggles.siderealClock)
        push("c-sidereal", "clock", ct.sidereal, tick(-spin, 3.15), false, { tone: "sidereal" });
      if (toggles.degrees) {
        /* Billboarded: straight up in the camera's own frame, so the number sits
           on top of the disc on screen rather than stuck to the geographic pole. */
        const deg = Math.round((((day % 1) + 1) % 1) * 360);
        const up = vCamUp.current.set(0, 1, 0).transformDirection(cam.matrixWorld);
        anchor.copy(planetPos).addScaledVector(up, PLANET_R * 2.4);
        push("c-deg", "body", `${deg}°`, anchor, false);
      }
    }
    labels.end();

    if (!sampling) return;
    onSample({
      day,
      eotMinutes: (eot * 24 * 60) / PI2,
      meanAnomaly: M,
      rashi,
      nakshatra: nak,
      moonNakshatra: moonNak,
      sankranti,
    });
  });

  return (
    <>
      {/* Lights are the **Moon's** now — the globe shades itself in its own
          shader. Kept low so the Moon's phases stay phases: raise the fill and
          the crescent fills in. */}
      <ambientLight intensity={toggles.trueSun ? 0.22 : 0.7} />

      {/* Sky. `BackSide` alone turns the sphere outside-in — a negative scale
          as well would cancel it out and cull every face. */}
      <mesh>
        <sphereGeometry args={[300, 32, 16]} />
        <meshBasicMaterial map={textures.background} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/*
        The polar grid, on the body the reader has focused.

        Its own root rather than a layer of the wheel: the belts are a sky ring
        and have to stay on the observer for the sightlines to read, while the
        grid is a *plane* — the thing a body is above or below — and that only
        means anything when it holds still. It sits outside the frame root, on
        the origin, which is where the focused body now is.

        **Ecliptic, one mesh.** It takes the same quaternion as the belts, so the
        axial-tilt slider moves it with them instead of leaving a straight line
        across the equator. Lines only — a filled disc would be a second
        surface — and only while डिग्री is on.
      */}
      <group ref={gridRoot} quaternion={solarPlaneQ}>
        <group rotation={[0, beltZeroDeg * (Math.PI / 180), 0]}>
          <GuideGrid
            visible={toggles.degrees}
            showPlane={false}
            innerR={focusRadius}
            planeInnerR={focusRadius}
          />
        </group>
      </group>

      {/* Everything that moves, slid together so the focused body is at the
          origin. Positions inside are written in the scene's own coordinates —
          the group carries the frame change. */}
      <group ref={frameRoot}>
        {/* No falloff: at this scale a physical inverse-square would leave the
            Moon almost unlit. It also doubles as the globe's own sun position —
            the shader reads its world place every frame. */}
        <pointLight ref={sunLight} intensity={2.2} distance={0} decay={0} />

        {/* राशि · नक्षत्र · बिक्रम महिना.

            The whole belt group is carried into the **ecliptic** plane, because
            that is the plane the divisions are defined on. In this scene's
            equatorial working frame that means the belt visibly tilts as the
            axial-tilt slider moves — which is not a side effect but the thing
            the tilt topics are trying to show: the Sun's road is not the
            planet's equator. */}
        <group ref={beltRoot}>
          <group quaternion={solarPlaneQ}>
            {/* The belt's own zero rotated onto मेष, so the spokes line up with
                the labels and with the sightline's reading. */}
            <group rotation={[0, beltZeroDeg * (Math.PI / 180), 0]}>
              <EclipticWheel
                /* The grid is not drawn here: it belongs to the focused body,
                   not to the observer the belts hang on. See `gridRoot`. */
                grid={false}
                rashiBelt={toggles.rashiBelt}
                nakshatraBelt={toggles.nakshatraBelt}
                monthRing={toggles.monthRing}
                rashiHighlightRef={rashiHighlight}
                nakHighlightRef={nakHighlight}
              />
              {/* Visibility of the two Moon markers is owned by the frame loop:
                  it also depends on which body the belt is hung around, which
                  only it knows. A `visible` prop here would fight it. */}
              <primitive object={moonNakHighlight} position={[0, -0.02, 0]} />
            </group>
          </group>
        </group>

        {/* World-space, not in the belt root: both are drawn from the planet
            out to a belt that is already positioned there. */}
        <primitive object={sightline} visible={toggles.sightline} />
        <primitive object={moonSightline} />

        {/* Mean sun at the origin, and the circle the clock believes in */}
        <group visible={toggles.meanSun}>
          <mesh>
            <sphereGeometry args={[MEAN_SUN_R, 24, 16]} />
            <meshBasicMaterial color={COLOR.mean} wireframe />
          </mesh>
        </group>
        {/* The planet's own track. Drawn whenever the orbit layer is on, not
            only alongside the mean sun: this circle *is* the path the planet
            travels here, so gating it on another layer left the planet moving
            across empty space with no orbit shown at all. */}
        <primitive object={meanOrbitLine} visible={toggles.planetOrbit} />

        {/* True sun, its spin, and the orbit it really travels */}
        <group ref={sunGroup} visible={toggles.trueSun}>
          <mesh>
            <sphereGeometry args={[SUN_R, 32, 24]} />
            <meshBasicMaterial map={textures.sun} />
          </mesh>
        </group>
        <primitive object={dropLine} visible={toggles.trueSun && toggles.eotWedge} />
        <group ref={sunOrbitGroup} visible={toggles.sunOrbit && toggles.trueSun}>
          <group rotation={[0, VERNAL_FROM_PERIHELION, 0]}>
            <group rotation={[-params.tilt, -VERNAL_FROM_PERIHELION, 0]}>
              <primitive object={trueOrbitLine} rotation={[0, Math.PI, 0]} />
            </group>
          </group>
        </group>

        {/* The equation-of-time wedge */}
        <mesh ref={wedge} visible={toggles.eotWedge} geometry={wedgeGeom} position={[0, 0.002, 0]}>
          <meshBasicMaterial
            color={COLOR.solar}
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/*
          The Moon's shadow on the planet, at a सूर्य ग्रहण.

          World-space, not parented to the planet: the shadow stands still while
          the planet turns under it, which is why a total eclipse sweeps a track
          across the ground rather than sitting on one country.

          The umbra is drawn far larger than it is. A real one is about a
          fortieth of the planet's width — at this scale a couple of pixels,
          invisible at any camera distance that also shows the Moon's orbit. The
          penumbra ring around it is the honest part of the shape: most of the
          places under it see a partial eclipse, not a total one.
        */}
        <group ref={solarShadow} visible={false}>
          <mesh>
            <circleGeometry args={[PLANET_R * 0.2, 32]} />
            <meshBasicMaterial
              color={0x05070c}
              transparent
              opacity={0.9}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, -0.004]}>
            <circleGeometry args={[PLANET_R * 0.42, 32]} />
            <meshBasicMaterial
              color={0x05070c}
              transparent
              opacity={0.4}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* The Moon, on its own inclined plane, carried along with the planet.
            Earth's alone: a borrowed graha has no Moon, राहु or केतु to draw. */}
        <primitive object={moonTrail} visible={hasMoon && toggles.moonTrail} />
        <group ref={moonRoot} visible={hasMoon}>
          <group ref={moonPlane}>
            <primitive object={moonOrbitLine} visible={toggles.moon} />
            <primitive object={lapArc.first} visible={toggles.moonLap} />
            <primitive object={lapArc.over} visible={toggles.moonLap} />
            <primitive object={monthStartTick} visible={toggles.moonLap} />
            <mesh ref={moonMesh} visible={toggles.moon}>
              <sphereGeometry args={[MOON_R, 32, 24]} />
              <meshStandardMaterial map={textures.moon} roughness={1} metalness={0} />
            </mesh>
            {/* राहु at +X, केतु at −X of this axis; the axis itself is Ω. */}
            <group ref={nodeAxis} visible={toggles.moon}>
              <primitive object={nodeLine} />
              <group position={[MOON_ORBIT, 0, 0]}>
                <ShadowGraha color={COLOR.rahu} filled={false} />
              </group>
              <group position={[-MOON_ORBIT, 0, 0]}>
                <ShadowGraha color={COLOR.ketu} filled />
              </group>
            </group>
          </group>
        </group>

        {/* Planet and its three day-arcs */}
        <group ref={arcRoot}>
          <mesh ref={planetMesh} material={earthMat} frustumCulled={false}>
            <sphereGeometry args={[PLANET_R, 64, 48]} />
            <primitive object={localMeridian} visible={toggles.primeMeridian} />
          </mesh>

          {/* The spin axis: one line straight through the globe and out past
              both poles, with a marker on each pole. It sits outside
              `planetMesh` so the spin does not carry it — an axis that rotated
              with the surface would be the one thing in the scene that cannot. */}
          <group visible={toggles.axis}>
            <primitive object={axisLine} />
            <mesh position={[0, PLANET_R, 0]}>
              <sphereGeometry args={[PLANET_R * 0.06, 12, 8]} />
              <meshBasicMaterial color={COLOR.axis} />
            </mesh>
            <mesh position={[0, -PLANET_R, 0]}>
              <sphereGeometry args={[PLANET_R * 0.06, 12, 8]} />
              <meshBasicMaterial color={COLOR.axis} />
            </mesh>
          </group>

          <mesh
            ref={meanArc}
            visible={toggles.meanArc}
            geometry={meanGeom}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.001, 0]}
          >
            <meshBasicMaterial
              color={COLOR.mean}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>

          <group ref={solarGroup} visible={toggles.solarArc}>
            <mesh
              geometry={solarGeom}
              ref={solarArc}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.001, 0]}
            >
              <meshBasicMaterial
                color={COLOR.solar}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>

          <group ref={siderealGroup} visible={toggles.siderealArc}>
            <mesh
              geometry={siderealGeom}
              ref={siderealArc}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.001, 0]}
            >
              <meshBasicMaterial
                color={COLOR.sidereal}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

export default memo(DaySimScene);
