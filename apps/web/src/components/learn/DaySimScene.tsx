/**
 * "What is a day" — the R3F scene.
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
 * Following {@link ./TwoSystemsScene}: the parent owns the clock and camera in
 * refs and mutates them, so neither playing nor dragging re-renders React. The
 * scene reports a sampled snapshot back through `onSample` a few times a
 * second, and the HTML overlay draws its labels from that.
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import rahuIconUrl from "@/assets/graha/rahu.svg?url";
import ketuIconUrl from "@/assets/graha/ketu.svg?url";
import earthToonUrl from "@/assets/graha/earth-orig.png";
import { KATHMANDU } from "@vedic-patro/domain/sky3d/horizon";
import { makeEarthMaterial } from "@/lib/sky3d/earth-material";
import { atLonInto } from "@/lib/sky3d/ecliptic-position";
import {
  BELT_MID,
  BELT_OUTER,
  EclipticWheel,
  GuideGrid,
  MONTH_R,
  NAK_INNER,
  NAK_MID,
  NAK_OUTER,
} from "@/components/learn/EclipticWheel";
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
} from "@vedic-patro/domain/sky3d/day-mechanics";

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

/**
 * The belts sit far outside the orbit, and that is the honest placement.
 *
 * A rashi is a direction, not a place — the stars behind it are effectively at
 * infinity. Drawing the belt just past the orbit would suggest the planet
 * could reach it; drawing it at two and a half orbits keeps the sightline
 * doing the work of saying which rashi the Sun is *seen* in.
 */
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
 * One retrograde circuit of the lunar nodes — Rāhu and Ketu.
 *
 * 18 years, 221 days and 16 hours. They travel *clockwise* (against the Moon)
 * and stay exactly 180° apart: they are the two ends of one line, the
 * intersection of the Moon's orbit with the ecliptic, not two independent bodies.
 */
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

const NODAL_PERIOD_DAYS = 6793.48;
const NODAL_LAPS_PER_YEAR = 365.256363 / NODAL_PERIOD_DAYS;

/**
 * The Moon's orbital plane against the ecliptic.
 *
 * The real inclination is ~5.14°. At this scene's compressed orbit that lift
 * is only a fraction of the planet's radius, so the Moon no longer clears the
 * disc at every syzygy the way a 60-radii orbit would. The honest angle is
 * still the right one to draw: Rāhu and Ketu *are* those two crossings, and
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
 * Starting the Moon at अमावस्या on मेष 0°, as this did, was an arbitrary phase
 * that put वैशाख's पूर्णिमा in चित्रा and made every month name wrong.
 *
 * This value is chosen so the naming rule actually holds: it is the middle of
 * the plateau of anchors that name the most months correctly, so it is not one
 * step away from losing one.
 *
 * It cannot hold for all twelve at once, and that is the honest part. Twelve
 * lunar months fall about eleven days short of the solar year, so the पूर्णिमा
 * slips a little earlier against the solar month each time; by असोज it has
 * slipped a whole नक्षत्र and the later months read one behind. That slippage
 * is exactly what an ~अधिक मास~ is inserted to absorb — which this sim does not
 * do, so the drift stays visible rather than being quietly corrected.
 */
const MOON_ANCHOR_FROM_MESHA = 189.25;

/** Points in the Moon's swept trail, over one synodic month. */
const TRAIL_STEPS = 160;
const LAP_SEGMENTS = 240;

/* Belt radii live on {@link EclipticWheel} — this scene and Aakash Gochar
   mount that same wheel. */

/** Ring segment count — arcs quantise to this, so 2° steps. */
const ARC_SEGMENTS = 180;
const WEDGE_SEGMENTS = 48;

/** Shared empty array, so non-sampling frames allocate nothing. */
const EMPTY_LABELS: SceneLabel[] = [];

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

/**
 * `src/lib/transition-setter.js`'s own default — every camera setter in the
 * reference lab's `day-sim.vue` (`referenceFramePositionSetter` and friends)
 * leaves it unset, so all of them run at this duration and easing.
 */
const FOCUS_DURATION_MS = 1000;
/** `Copilot.Easing.Quadratic.InOut`, transcribed exactly (`src/lib/copilot.js`). */
function quadInOut(k: number): number {
  if ((k *= 2) < 1) return 0.5 * k * k;
  return -0.5 * (--k * (k - 2) - 1);
}

/**
 * The width:height every chapter's `cam()` distance was tuned against — this
 * scene's canvas on a normal desktop article width.
 *
 * A perspective camera's `fov` is its *vertical* field of view, so a fixed
 * `distance` frames the same vertical slice of the scene on any aspect —
 * portrait or landscape. On a tall phone canvas that slice is almost all
 * empty sky above and below two small, distant bodies, because the extra
 * *height* a portrait canvas has over the reference is height the scene was
 * never asked to fill. Scaling distance down by how much narrower the canvas
 * is than this reference pulls the camera in until the content fills the
 * short dimension the same way it does at the reference aspect, in both
 * axes — a dolly, not a stretch.
 */
const REFERENCE_ASPECT = 1.6;

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
     belongs to is. Separating them from the arcs is what the reference lab
     does, and it is the only way to show two arcs while reading one clock —
     the beat where the sidereal arc has closed but the solar one has not. */
  /** The sidereal (नाक्षत्र) clock face, on the stellar arc. */
  siderealClock: boolean;
  /** The true-Sun clock face, on the solar arc. */
  solarClock: boolean;
  /** The mean-time clock face, on the mean arc. */
  meanClock: boolean;
  /** The globe's rotation so far, in degrees, pinned above the planet. */
  degrees: boolean;
};

export type CameraState = { yaw: number; pitch: number; distance: number };

export type SceneLabel = {
  id: string;
  kind: "rashi" | "nakshatra" | "month" | "body" | "clock";
  /** Which clock a `clock` label belongs to, for colouring. */
  tone?: "sidereal" | "solar" | "mean";
  /** 1–12, rashi labels only — the glyph to draw beside the name. */
  index?: number;
  /** Unabbreviated name, nakshatra labels only, for the icon lookup. */
  full?: string;
  /**
   * How the HTML sits on the projected point. Clocks in the original lab
   * hang off the tick (`right: 0; margin-top: -1rem`), not on its centre.
   */
  pin?: "center" | "clock" | "above";
  text: string;
  x: number;
  y: number;
  dim: boolean;
  /**
   * The chapter is pointing at this one.
   *
   * The original lab has a `highlightSolarClock` beat — the narration says
   * "watch this clock" and the reading it means swells and brightens. Meshes
   * get that from the material; a label is HTML, so it travels on the sample
   * and the span styles itself.
   */
  hot?: boolean;
};

/**
 * Which label a `highlight` value points at.
 *
 * The mesh highlights (`earth`, the three arcs) are handled in the frame loop
 * against their materials. These are the ones that land on HTML instead.
 */
const HIGHLIGHT_LABEL: Record<string, string> = {
  "solar-clock": "c-solar",
  "mean-clock": "c-mean",
  "sidereal-clock": "c-sidereal",
  "rotation-angle": "c-deg",
};

/** Screen transform for a projected label — matches the original lab's CSS pins. */
export function labelPinCss(x: number, y: number, pin: SceneLabel["pin"] = "center") {
  const pos = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  if (pin === "clock") return `${pos} translate(-100%, 0) translateY(-1rem)`;
  /* Original `.earth-label { bottom: 1em }` on a centred CSS2D node. */
  if (pin === "above") return `${pos} translate(-50%, -50%) translateY(-1em)`;
  return `${pos} translate(-50%, -50%)`;
}

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
  labels: SceneLabel[];
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
 * need — into a single integer write.
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
 * outline by only 8% and e = 0.17 by 1.5% — an eccentric orbit really is very
 * nearly circular. What eccentricity actually *shows* is the Sun sitting
 * off-centre, by `a·e`, which a centre-drawn ellipse hides completely.
 *
 * Building it from the polar form puts the focus at the origin by construction,
 * with θ = 0 at perihelion, matching the frame the caller already rotates.
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
 * `RingGeometry` emits six indices per theta-segment in order, so the arc
 * length is a single integer write. Angles at or past a full turn draw the
 * whole ring rather than wrapping back to nothing.
 */
function setRingArc(mesh: THREE.Mesh, angle: number, segments: number) {
  const frac = angle >= PI2 ? 1 : euclideanModulo(angle, PI2) / PI2;
  mesh.geometry.setDrawRange(0, Math.max(0, Math.round(frac * segments)) * 6);
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
 * already had, while the two crossings (Rāhu at Ω, Ketu at Ω+180°) stay on the
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
 * Rasterise a bundled SVG into a texture.
 *
 * `TextureLoader` will not do: these files carry a `viewBox` and no width or
 * height, so the browser hands the `<img>` its 300×150 default box and the
 * artwork arrives squashed. Drawing it into a square canvas at a size the
 * camera can zoom into keeps it round and sharp.
 */
function useSvgTexture(url: string, size = 256) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let live = true;
    let made: THREE.CanvasTexture | null = null;
    const img = new Image();
    img.onload = () => {
      if (!live) return;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      made = new THREE.CanvasTexture(canvas);
      made.colorSpace = THREE.SRGBColorSpace;
      made.anisotropy = 4;
      setTexture(made);
    };
    img.src = url;
    return () => {
      live = false;
      made?.dispose();
    };
  }, [url, size]);
  return texture;
}

/**
 * राहु / केतु — the app's own graha artwork, billboarded.
 *
 * A sprite rather than a sphere, and the same SVG the पञ्चाङ्ग tables and the
 * hora ring use, so a shadow graha looks like itself everywhere in the app.
 * The glow behind it is kept: the nodes are not bodies, and a bare icon
 * floating in the plane did not say so.
 */
function ShadowGraha({
  color,
  map,
}: {
  color: number;
  map: THREE.Texture | null;
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
      {map ? (
        <sprite scale={[NODE_R * 5, NODE_R * 5, 1]}>
          <spriteMaterial map={map} transparent depthWrite={false} />
        </sprite>
      ) : (
        /* Until the artwork has decoded — one frame, usually. */
        <mesh>
          <sphereGeometry args={[NODE_R, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export interface SceneProps {
  clock: MutableRefObject<SimClock>;
  camera: MutableRefObject<CameraState>;
  /**
   * Camera-drag inertia, in radians/second — `OrbitControls`' damping from
   * the reference lab, ported since this scene has no OrbitControls instance
   * of its own. Free play only; stays `{yaw:0, pitch:0}` everywhere else, so
   * omitting it is exactly the same as passing an inert ref.
   */
  cameraVelocity?: MutableRefObject<{ yaw: number; pitch: number }>;
  /** True while a camera drag owns `camera.current` directly — the decay
   *  below must not also nudge it the same frame. */
  cameraGrabbed?: MutableRefObject<boolean>;
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
  /** The same, in full — the icon lookup needs the unabbreviated name. */
  nakshatraFullNames: string[];
  bodyNames: {
    planet: string;
    sun: string;
    meanSun: string;
    moon: string;
    rahu: string;
    ketu: string;
  };
  clockText: MutableRefObject<{ sidereal: string; solar: string; mean: string }>;
  /**
   * The label spans, by id, so the frame loop can move them directly.
   *
   * Label *positions* have to keep up with the scene at sixty frames a second
   * or the text visibly drags behind the bodies it names — which is what
   * routing them through React state at five samples a second did. What each
   * label says changes rarely, so that still arrives through `onSample`; only
   * the transform is written here.
   */
  labelNodes: MutableRefObject<Map<string, HTMLElement>>;
  onSample: (s: SceneSample) => void;
  /**
   * Which world the globe is. Earth keeps the cartoon map and the Moon;
   * any other graha swaps the surface for that planet's texture and drops
   * the Moon, Rāhu and Ketu — those three belong to Earth.
   */
  planetBody?: PlaygroundGlobe;
  /**
   * Pointer picking the playground uses to drag Earth around the orbit
   * the way the original lab does — filled in on mount, cleared on unmount.
   */
  pick?: MutableRefObject<ScenePick | null>;
  /**
   * Light a named piece of the scene — chapter tour only.
   *
   * `earth` gets a halo; `stellar-day-arc`, `solar-day-arc` and `mean-day-arc`
   * go to full opacity in a paler shade of their own colour.
   */
  highlight?: string;
}

/** Screen-space hits against the globe and the equatorial plane. */
export type ScenePick = {
  hitsPlanet: (clientX: number, clientY: number, rect: DOMRect) => boolean;
  /** Mean anomaly under the pointer on y = 0, or null if the ray misses. */
  anomalyAt: (clientX: number, clientY: number, rect: DOMRect) => number | null;
};

/** Worlds the adjust drawer can put in Earth's place. */
export type PlaygroundGlobe = "earth" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

function DaySimScene({
  clock,
  camera,
  cameraVelocity,
  cameraGrabbed,
  params,
  toggles,
  cameraTarget,
  cameraFollow,
  rashiNames,
  monthNames,
  nakshatraNames,
  nakshatraFullNames,
  bodyNames,
  clockText,
  labelNodes,
  onSample,
  planetBody = "earth",
  pick,
  highlight = "",
}: SceneProps) {
  const { camera: cam, size } = useThree();

  useEffect(() => {
    if (!pick) return;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const toNdc = (cx: number, cy: number, rect: DOMRect) => {
      ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
    };
    pick.current = {
      hitsPlanet(cx, cy, rect) {
        toNdc(cx, cy, rect);
        raycaster.setFromCamera(ndc, cam);
        const target = planetHit.current ?? planetMesh.current;
        return target ? raycaster.intersectObject(target, true).length > 0 : false;
      },
      anomalyAt(cx, cy, rect) {
        toNdc(cx, cy, rect);
        raycaster.setFromCamera(ndc, cam);
        if (!raycaster.ray.intersectPlane(plane, hit)) return null;
        if (hit.x === 0 && hit.z === 0) return null;
        return Math.atan2(-hit.z, hit.x);
      },
    };
    return () => {
      pick.current = null;
    };
  }, [cam, pick, size]);

  const [earthMap, sunMap, skyMap, moonMap] = useLoader(THREE.TextureLoader, [
    earthToonUrl,
    `${import.meta.env.BASE_URL}sky3d/sun.jpg`,
    `${import.meta.env.BASE_URL}sky3d/background.jpg`,
    `${import.meta.env.BASE_URL}sky3d/moon.jpg`,
  ]);
  /* Raw texels: the globe's own shader writes final pixels and does no
     colour-space conversion of its own. See `makeEarthMaterial`. */
  earthMap.colorSpace = THREE.NoColorSpace;
  earthMap.anisotropy = 4;
  const earthMat = useMemo(() => makeEarthMaterial(earthMap), [earthMap]);
  useEffect(() => () => earthMat.dispose(), [earthMat]);

  /* Only Earth carries a Moon (and therefore Rāhu / Ketu). A borrowed
     graha is just a spinning world with its own tilt and ellipse. */
  const hasMoon = planetBody === "earth";
  const showMoon = hasMoon && toggles.moon;
  const showMoonTrail = hasMoon && toggles.moonTrail;
  const showMoonLap = hasMoon && toggles.moonLap;
  const showMoonSight = hasMoon && toggles.moonSightline;

  useEffect(() => {
    if (planetBody === "earth") {
      earthMat.uniforms.map.value = earthMap;
      return;
    }
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}sky3d/${planetBody}.jpg`;
    const tex = new THREE.TextureLoader().load(url, (loaded) => {
      if (cancelled) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.NoColorSpace;
      loaded.anisotropy = 4;
      loaded.needsUpdate = true;
      earthMat.uniforms.map.value = loaded;
    });
    tex.colorSpace = THREE.NoColorSpace;
    return () => {
      cancelled = true;
      if (earthMat.uniforms.map.value === tex) {
        earthMat.uniforms.map.value = earthMap;
      }
      tex.dispose();
    };
  }, [planetBody, earthMap, earthMat]);

  /* ── refs into the scene graph ───────────────────────────────────── */
  const arcRoot = useRef<THREE.Group>(null!);
  const planetMesh = useRef<THREE.Mesh>(null!);
  const planetHit = useRef<THREE.Mesh>(null!);
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
   * against it: with the Sun focused the planet runs its orbit and dips below
   * and above the plane, instead of the plane chasing the planet.
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
  const vMoon = useRef(new THREE.Vector3());
  const vProj = useRef(new THREE.Vector3());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));
  const scratch = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  /* The label occlusion test's own three. It runs inside `push`, after the
     frame's positions are built — borrowing `scratch` or `vTmp` there would
     overwrite `planetPos`, which is `scratch`, and throw every body label that
     is placed from it to the far side of the scene. */
  const vEarth = useRef(new THREE.Vector3());
  const vRay = useRef(new THREE.Vector3());
  const vOc = useRef(new THREE.Vector3());
  const vWorld = useRef(new THREE.Vector3());
  const vCamUp = useRef(new THREE.Vector3());
  const followYaw = useRef(0);
  /* Where the camera is actually pointed this frame, and how far through a
     change of focus it is. See the camera block in the frame loop — this is
     a direct port of the reference lab's `TransitionSetter`
     (`src/lib/transition-setter.js`): a frozen start point eased toward a
     freshly-recomputed target over a fixed 1000ms with `Quadratic.InOut`,
     the same as every one of its camera setters (none pass a custom
     duration or easing, so all of them use that default). */
  const camAnchor = useRef(new THREE.Vector3());
  const lastTarget = useRef<CameraTarget>("meanSun");
  const focusStart = useRef(new THREE.Vector3());
  /* Starts "done" so the very first frame snaps straight to its target
     instead of easing in from the origin — matching the original, which
     only transitions on a *change* of target, never on mount. */
  const focusElapsedMs = useRef(FOCUS_DURATION_MS);

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
  /** How far the earth-orbit rings have faded in (0–1). Null until the first frame. */
  const orbitFade = useRef<number | null>(null);
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
   * here. Rotating the arc about the spin axis by Kathmandu's longitude puts it
   * there, and the standard equirectangular earth texture puts 0° along +X, so
   * a rotation of exactly the longitude is all it takes.
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
  const siderealTick = useMemo(
    () =>
      makeLine(
        (() => {
          const g = new THREE.BufferGeometry();
          /* Original: from the surface (r = 1) out to the clock, so the blue
             mark is visibly stuck to the globe even before the arc has any
             sweep. */
          g.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([1, 0, 0.002, 1.8, 0, 0.002], 3),
          );
          return g;
        })(),
        COLOR.sidereal,
        1,
      ),
    [],
  );
  useEffect(() => () => dispose(siderealTick), [siderealTick]);

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
  /**
   * Where the grid's spokes start — the focused body's own radius.
   *
   * A fixed inner radius cannot serve all three: at 4 it cleared the planet by
   * three units of empty floor, which reads as a hole punched round whatever is
   * being watched. Each body gets its own, so the plane leaves its equator.
   */
  /** The app's own graha artwork for the two nodes. */
  const rahuIcon = useSvgTexture(rahuIconUrl);
  const ketuIcon = useSvgTexture(ketuIconUrl);

  const focusRadius =
    cameraTarget === "planet" ? PLANET_R : cameraTarget === "sun" ? SUN_R : MEAN_SUN_R;

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
   * frame, so an allocating version quietly put fifty short-lived vectors a
   * frame back on the heap after the earlier cleanup.
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

  /** The line of nodes — Rāhu to Ketu through the planet, always a diameter. */
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
   * पञ्चाङ्ग names is the **Moon's**, not the Sun's. Same three-point shape as
   * the solar sightline, so the two read as the same kind of instrument.
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
      /* Clamped so a backgrounded tab does not resume with one giant step. */
      c.day += c.daysPerSecond * Math.min(delta, 0.1);
      const wrappedYears = Math.floor(c.day / daysPerYear);
      if (wrappedYears) {
        /* The year loops; the nodes must not. One lap is 18.6 years. */
        yearCount.current += wrappedYears;
        c.day -= wrappedYears * daysPerYear;
      }
    }

    /* Earth-orbit rings fade in over a second. Snap off so a chapter that
       wants a bare globe (stellar days) does not keep last chapter's rings. */
    const wantOrbit = toggles.planetOrbit ? 1 : 0;
    if (orbitFade.current === null) orbitFade.current = wantOrbit;
    else if (wantOrbit < orbitFade.current) orbitFade.current = wantOrbit;
    else {
      const step = Math.min(delta, 0.1) / 1;
      orbitFade.current = Math.min(wantOrbit, orbitFade.current + step);
    }
    const fade = orbitFade.current;
    const meanMat = meanOrbitLine.material as THREE.LineBasicMaterial;
    meanMat.opacity = 0.55 * fade;
    meanOrbitLine.visible = fade > 0.01 && toggles.meanSun;
    const trueMat = trueOrbitLine.material as THREE.LineBasicMaterial;
    if (toggles.sunOrbit && !toggles.planetOrbit) {
      trueMat.opacity = 0.5;
      sunOrbitGroup.current.visible = toggles.trueSun;
    } else {
      trueMat.opacity = 0.5 * fade;
      sunOrbitGroup.current.visible = toggles.trueSun && fade > 0.01;
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
     * already 100° along: three arcs a third of the way round the globe before
     * the reader has pressed play, three ticks scattered around the planet, and
     * a Kathmandu nowhere near the Sun, all while the clock faces underneath
     * said noon. The clocks were right and the geometry was carrying a constant
     * offset the clocks never had; subtracting it here is what puts the two on
     * the same zero.
     */
    const spin = M - MESHA_FROM_PERIHELION;

    /* Arc root points at the mean sun (hence the π), so the mean arc's zero
       is mean noon and every other arc is measured off the same origin. */
    arcRoot.current.position.copy(planetPos);
    arcRoot.current.rotation.y = M + Math.PI;
    /* The map's +X is Greenwich. Turning the globe back by काठमाडौँ's
       longitude puts *that* meridian on +X — the direction `arcRoot` already
       aims at the Sun — so noon, the red line, the blue tick and the lit
       cap are all Nepal, not England. The sidereal group stays at 0 so the
       growing edge of the ring is the same meridian: it stays painted on
       काठमाडौँ as the planet turns. */
    planetMesh.current.rotation.y = dayAngle - KATHMANDU_LON;
    siderealGroup.current.rotation.y = 0;
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
        a.setXYZ(
          i + 1,
          planetPos.x + len * Math.cos(ang),
          0,
          planetPos.z - len * Math.sin(ang),
        );
      }
      a.needsUpdate = true;
      wedgeGeom.computeBoundingSphere();
      (wedge.current.material as THREE.MeshBasicMaterial).color.setHex(
        eot > 0 ? COLOR.solar : COLOR.mean,
      );
    }

    /* ── the Moon ────────────────────────────────────────────────────── */
    /* Sidereal longitude, anchored so day 0 is an अमावस्या: the Moon starts in
       the Sun's own direction, which is what new moon means. It is lit by the
       same point light as everything else, so its phases are the real geometry
       rather than a painted-on crescent. */
    moonRoot.current.position.copy(planetPos);
    const moonLonAt = (d: number) =>
      beltZeroDeg + MOON_ANCHOR_FROM_MESHA + MOON_LAPS_PER_YEAR * 360 * (d / daysPerYear);
    /**
     * The Moon's place, in the scene's own coordinates.
     *
     * Composed from the model rather than read back off the mesh, for the same
     * reason the sightline below builds its own: a world matrix is only
     * recomputed at render, so on the frame this runs it is one frame stale —
     * and, worse, it already carries the frame shift that `push` is about to
     * add again. See the label block.
     */
    const moonAt = (out: THREE.Vector3, lonDeg: number) =>
      atLonInto(out, lonDeg, MOON_ORBIT).applyQuaternion(moonPlaneQ.current).add(planetPos);
    /** Rāhu at +MOON_ORBIT along the node line, Ketu at −, lifted clear for the name. */
    const nodeAt = (out: THREE.Vector3, signedRadius: number) => {
      out
        .set(signedRadius, 0, 0)
        .applyAxisAngle(AXIS_Y, omegaRad.current)
        .applyQuaternion(moonPlaneQ.current)
        .add(planetPos);
      /* Added rather than set: the node sits on the *ecliptic*, which is tilted
         out of this scene's equatorial plane, so its own y is rarely zero. */
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
    if (showMoon || showMoonTrail || showMoonLap) {
      const moonLon = moonLonAt(day);
      atLonInto(moonMesh.current.position, moonLon, MOON_ORBIT);
      /* Tidally locked — the same face stays turned toward the planet. */
      moonMesh.current.rotation.y = moonLon * (Math.PI / 180) + Math.PI;

      /* Day 0 is no longer an अमावस्या, so the month boundary has to be solved
         for: elongation grows by `MOON_SYNODIC_PER_YEAR` turns a year, and a
         lunar month opens each time it passes a whole turn. */
      const elongTurns =
        (MOON_ANCHOR_FROM_MESHA + MOON_SYNODIC_PER_YEAR * 360 * (day / daysPerYear)) / 360;
      const monthStartDay =
        ((Math.floor(elongTurns) * 360 - MOON_ANCHOR_FROM_MESHA) * daysPerYear) /
        (MOON_SYNODIC_PER_YEAR * 360);
      const travelled = MOON_LAPS_PER_YEAR * 360 * ((day - monthStartDay) / daysPerYear);

      if (showMoonLap) {
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
     * planet-radii out where it belongs sixty, so its 5.14° of tilt lifts it a
     * third of a radius rather than five — from the drawn picture alone every
     * पूर्णिमा looks like it lands in the shadow. The angles are true even
     * though the picture is compressed, so the angles decide.
     *
     * Both limits are the real ones. Nothing in the Moon's own geometry — the
     * inclination, the orbit, the nodal period — is touched to make a shadow
     * easier to catch.
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
      const latDeg = Math.asin(
        Math.min(1, Math.max(-1, toMoon.dot(eclipticNormal))),
      ) * (180 / Math.PI);
      const elongDeg =
        Math.acos(Math.min(1, Math.max(-1, toMoon.dot(toSunDir)))) * (180 / Math.PI);

      /** 1 at dead centre, easing to 0 at the limit. */
      const within = (value: number, limit: number) =>
        Math.max(0, 1 - Math.abs(value) / limit);
      const nearNode = within(latDeg, ECLIPSE_LAT_LIMIT_DEG);
      const solar = nearNode * within(elongDeg, ECLIPSE_ELONG_WINDOW_DEG);
      const lunar = nearNode * within(180 - elongDeg, ECLIPSE_ELONG_WINDOW_DEG);

      /* सूर्य ग्रहण — the Moon's shadow on the planet, under the Moon itself.
         Placed at the sub-lunar point rather than by intersecting the drawn
         ray, for the same reason the test is angular: at this scale the drawn
         ray hits the planet at every अमावस्या. */
      const show = showMoon && solar > 0.02;
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

    /* ── which body the sky ring is hung around ──────────────────────── */
    /*
     * The belts are a ring of *directions*, and the stars that fix those
     * directions are effectively at infinity — so the ring may be hung around
     * whichever body the camera is watching, and each division still points
     * the same way. Hanging it on the planet is the geocentric sky, the one a
     * पात्रो is written from; hanging it on the Sun gives the heliocentric
     * view, where the planet is the thing going round the middle.
     *
     * The Sun's own reading survives the move: from the planet, the Sun lies
     * along `sunLon`, and the point at `sunLon` on a Sun-centred ring is
     * straight out along that same line — so the sightline still crosses the
     * Sun and lands on the rashi it is really in.
     *
     * The Moon's does not, and that is not a rounding error: the Moon is a
     * couple of units from the planet against the Sun's ten, so from the Sun
     * it lies in a quite different direction. Its markers are geocentric
     * quantities, so they are simply not drawn in the heliocentric frame
     * rather than drawn wrong.
     */
    /*
     * The belt hangs on whichever body is focused — including the mean sun.
     *
     * It used to fall back to the planet for anything that was not the true
     * Sun, so focusing the **mean sun** put the camera on the origin while the
     * largest structure in the scene — the rashi ring, wider than the orbit —
     * stayed wrapped around the planet. The mean sun was centred and the
     * picture still read as planet-centred, because the rings said so.
     *
     * The mean sun is the centre of the planet's own orbit, so hanging the belt
     * there is the orbit-centred view, and the planet then visibly runs round
     * inside it.
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
       right ascension instead, which drifts up to ~2.5° away from the true
       ecliptic longitude and would put a sankranti on the wrong day. */
    const toSun = vTmp.current.copy(sunPos).sub(planetPos).applyQuaternion(eclipticQ);
    const sunLon = euclideanModulo(
      Math.atan2(-toSun.z, toSun.x) * (180 / Math.PI),
      360,
    );
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
      /* Out to the belt's far edge, so the line crosses the whole band and
         ends on the rashi it is naming rather than stopping at the label.
         The endpoint keeps its `y`: the belt lies in the *ecliptic*, which is
         tilted out of this scene's equatorial working plane, so flattening it
         to zero left the line hanging up to nine units short of the belt. */
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
    moonNakHighlight.visible = toggles.nakshatraBelt && showMoonSight && geocentric;
    moonSightline.visible = showMoonSight && geocentric;

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
      cameraTarget === "planet" ? planetPos : cameraTarget === "sun" ? sunPos : lookAt.current.set(0, 0, 0);

    /*
     * Switching focus glides; holding it tracks exactly.
     *
     * A hard cut between two bodies ten units apart reads as a teleport — the
     * reader loses which body they were looking at, which is the one thing the
     * control exists to make obvious. So the anchor eases across on a change
     * of target and then snaps to exact.
     *
     * This is `TransitionSetter` itself, not an approximation of it: `target`
     * is recomputed fresh every frame exactly as `getCurrent(current)` is, and
     * `focusStart` is the frozen snapshot `prev` was — so the lerp is from a
     * fixed start toward a possibly-still-moving target (a planet doing twelve
     * rotations a second), reaching wherever the target actually is by the
     * time the 1000ms of `Quadratic.InOut` runs out. A permanent re-lerp
     * toward the live target every frame — which is what this used to be —
     * never actually finishes closing that gap while the target keeps moving.
     */
    if (cameraTarget !== lastTarget.current) {
      lastTarget.current = cameraTarget;
      focusStart.current.copy(camAnchor.current);
      focusElapsedMs.current = 0;
    }
    focusElapsedMs.current = Math.min(FOCUS_DURATION_MS, focusElapsedMs.current + delta * 1000);
    const focusT = quadInOut(focusElapsedMs.current / FOCUS_DURATION_MS);
    camAnchor.current.lerpVectors(focusStart.current, target, focusT);
    /* The world moves, not the camera: everything is slid by −anchor, which
       puts the focused body on the origin and leaves it there. */
    frameRoot.current.position.copy(camAnchor.current).negate();

    /* Drag inertia — see {@link SceneProps.cameraVelocity}. Decays toward
       zero rather than being consumed in one shot, so a hard flick keeps
       coasting for a beat and a gentle one settles almost at once; ~5% of
       the velocity survives each second, which is `OrbitControls`' own feel
       at its `dampingFactor = 0.1` (this scene has no OrbitControls instance
       to inherit that constant from, so it is reproduced here). */
    if (cameraVelocity && !cameraGrabbed?.current) {
      const cv = cameraVelocity.current;
      if (cv.yaw !== 0 || cv.pitch !== 0) {
        v.yaw += cv.yaw * delta;
        v.pitch = Math.max(-1.45, Math.min(1.45, v.pitch + cv.pitch * delta));
        const decay = Math.pow(0.05, delta);
        cv.yaw *= decay;
        cv.pitch *= decay;
      }
    }

    /* Follow eases the yaw round with the planet so it stays put on screen. */
    followYaw.current += shortestAngle((cameraFollow ? -M : 0) - followYaw.current) *
      Math.min(1, delta * 3);
    const yaw = v.yaw + followYaw.current;
    const cosPitch = Math.cos(v.pitch);
    const canvasAspect = size.width / size.height;
    const aspectDistance =
      canvasAspect < REFERENCE_ASPECT ? v.distance * (canvasAspect / REFERENCE_ASPECT) : v.distance;
    cam.position.set(
      aspectDistance * cosPitch * Math.sin(yaw),
      aspectDistance * Math.sin(v.pitch),
      aspectDistance * cosPitch * Math.cos(yaw),
    );
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();

    /* The grid stays on the origin — which *is* the focused body now. It sits
       outside the shifted world for that reason: a plane a body is above or
       below has to hold still, or nothing can be seen to rise through it. */

    /* ── labels: positioned every frame, described five times a second ── */
    frame.current += 1;
    const sampling = frame.current % 12 === 0;
    const labels: SceneLabel[] = sampling ? [] : EMPTY_LABELS;

    /* The trail is world-space and 160 points, so it is rebuilt on the sample
       tick rather than every frame — five times a second is smooth enough for
       a curve that takes a whole month to be drawn. */
    if (sampling && showMoonTrail) {
      const synodicDays = daysPerYear / MOON_SYNODIC_PER_YEAR;
      const a = moonTrail.geometry.getAttribute("position") as THREE.BufferAttribute;
      const v = vAnchor.current;
      const w = vTmp.current;
      for (let i = 0; i <= TRAIL_STEPS; i += 1) {
        const d = day - synodicDays * (1 - i / TRAIL_STEPS);
        const Md = meanAnomalyAt(d / daysPerYear);
        v.set(MEAN_DISTANCE * Math.cos(Md), 0, -MEAN_DISTANCE * Math.sin(Md));
        atLonInto(w, moonLonAt(d), MOON_ORBIT).applyQuaternion(moonPlaneQ.current);
        a.setXYZ(i, v.x + w.x, v.y + w.y, v.z + w.z);
      }
      a.needsUpdate = true;
      moonTrail.geometry.computeBoundingSphere();
    }

    const proj = vProj.current;
    const push = (
      id: string,
      kind: SceneLabel["kind"],
      text: string,
      at: THREE.Vector3,
      dim: boolean,
      tone?: SceneLabel["tone"],
      index?: number,
      full?: string,
      pin: SceneLabel["pin"] = "center",
    ) => {
      /* `at` is built in the scene's own coordinates, which the frame shift
         then slides; project from the shifted position or every label sits
         where its body used to be. */
      const world = vWorld.current.copy(at).add(frameRoot.current.position);
      proj.copy(world).project(cam);
      const node = labelNodes.current.get(id);
      const behind = proj.z > 1;
      const x = (proj.x * 0.5 + 0.5) * size.width;
      const y = (-proj.y * 0.5 + 0.5) * size.height;
      let hidByEarth = false;
      /* Clocks in the original lab are CSS2D — they stay drawn even when the
         globe sits in front. Hiding them is what made the time vanish or jump
         to the far side of the planet. */
      if (kind !== "body" && kind !== "clock") {
        planetMesh.current.getWorldPosition(vEarth.current);
        const maxT = vRay.current.copy(world).sub(cam.position).length();
        if (maxT > 1e-4) {
          const dir = vRay.current.multiplyScalar(1 / maxT);
          const oc = vOc.current.copy(cam.position).sub(vEarth.current);
          const b = oc.dot(dir);
          const c = oc.dot(oc) - PLANET_R * PLANET_R;
          const disc = b * b - c;
          if (disc > 0) {
            const tHit = -b - Math.sqrt(disc);
            hidByEarth = tHit > 0.08 && tHit < maxT - 0.02;
          }
        }
      }
      const off =
        behind ||
        hidByEarth ||
        x < -80 ||
        y < -30 ||
        x > size.width + 80 ||
        y > size.height + 30;

      if (node) {
        /* `transform` rather than left/top: it is composited, so moving fifty
           labels a frame never triggers layout. */
        node.style.transform = labelPinCss(x, y, pin);
        node.style.visibility = off ? "hidden" : "visible";
      }
      if (node) node.dataset.hot = HIGHLIGHT_LABEL[highlight] === id ? "1" : "";
      if (!sampling || off) return;
      labels.push({
        id,
        kind,
        text,
        x,
        y,
        dim,
        index,
        full,
        pin,
        hot: HIGHLIGHT_LABEL[highlight] === id,
      });
      if (tone) labels[labels.length - 1]!.tone = tone;
    };

    /* All three belts are labelled at the middle of each division, not at its
       edge, so a name sits inside the span it names. */
    if (toggles.rashiBelt) {
      for (let i = 0; i < 12; i += 1) {
        push(
          `r-${i}`,
          "rashi",
          rashiNames[i]!,
          atBeltInto(vAnchor.current, beltZeroDeg + i * 30 + 15, BELT_MID).add(beltCentre),
          i !== rashi,
          undefined,
          i + 1,
        );
      }
    }
    if (toggles.monthRing) {
      for (let i = 0; i < 12; i += 1) {
        push(
          `bs-${i}`,
          "month",
          monthNames[i]!,
          atBeltInto(vAnchor.current, beltZeroDeg + i * 30 + 15, MONTH_R).add(beltCentre),
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
          atBeltInto(
            vAnchor.current,
            beltZeroDeg + (i * 360) / 27 + 360 / 54,
            NAK_MID,
          ).add(beltCentre),
          i !== nak,
          undefined,
          undefined,
          nakshatraFullNames[i],
        );
      }
    }

    /* All the body anchors share one scratch: `push` projects immediately and
       never keeps the vector, so it is safe to overwrite between calls. */
    const anchor = vAnchor.current;
    if (showMoon) {
      /*
       * Built from the model, not read back with `getWorldPosition`.
       *
       * These three live inside `frameRoot`, so their world matrices already
       * carry the frame shift — and `push` adds that shift a second time,
       * putting all three names a whole shift away from the bodies they label.
       * It hides at the default focus, where the shift is zero, and is up to
       * ten units off at any other. The matrix is also one frame stale, since
       * nothing has committed this frame's transforms yet.
       */
      push("b-moon", "body", bodyNames.moon, moonAt(anchor, moonLonAt(day)).setY(MOON_R * 3.4), false);
      push("b-rahu", "body", bodyNames.rahu, nodeAt(anchor, MOON_ORBIT), false);
      push("b-ketu", "body", bodyNames.ketu, nodeAt(anchor, -MOON_ORBIT), false);
    }
    /* Names sit a fixed clearance off the *surface*, not a multiple of the
       radius: scaled by radius the mean sun's name crowded its disc while the
       true sun's floated away from one twice the size. */
    if (toggles.meanSun)
      push("b-mean", "body", bodyNames.meanSun, anchor.set(0, MEAN_SUN_R + 0.34, 0), false);

    /* Clock labels ride the tick that marks each arc's zero direction.
       Their angles converge — the three ticks sit on top of each other at day 0,
       and mean and true stay within the equation of time (~16 min, ~4°) of each
       other all year — so each label is pushed out to its own radius instead,
       in the same inner-to-outer order as the three arcs it labels. */
    const tick = (localAngle: number, radius: number) => {
      const a = M + Math.PI + localAngle;
      return anchor.set(
        planetPos.x + radius * Math.cos(a),
        0,
        planetPos.z - radius * Math.sin(a),
      );
    };
    const ct = clockText.current;
    /* Same local `[2, 0, 0]` the original lab pins its clocks to — just
       outside the tick, not a third radius further out. */
    if (toggles.meanArc && toggles.meanClock)
      push("c-mean", "clock", ct.mean, tick(0, 2), false, "mean", undefined, undefined, "clock");
    if (toggles.solarArc && toggles.solarClock)
      push("c-solar", "clock", ct.solar, tick(-eot, 2), false, "solar", undefined, undefined, "clock");
    if (toggles.siderealArc && toggles.siderealClock) {
      /* On the tick: local +X of the sidereal group, which is the Sun-ward
         काठमाडौँ meridian, 2 units out — the original lab's `[2, 0, 0]`. */
      push("c-sidereal", "clock", ct.sidereal, tick(0, 2), false, "sidereal", undefined, undefined, "clock");
    }
    if (toggles.degrees) {
      /* Billboarded like the original `labelUnrotation`: (0, 1, 0) in a
         camera-facing frame at Earth's centre, so the number sits on the
         top of the disc on screen, not stuck to the geographic pole. */
      const deg = Math.round(euclideanModulo(day, 1) * 360);
      vCamUp.current.set(0, 1, 0).transformDirection(cam.matrixWorld);
      push(
        "c-deg",
        "body",
        `${deg}°`,
        anchor.copy(planetPos).addScaledVector(vCamUp.current, PLANET_R * 2.4),
        false,
        undefined,
        undefined,
        undefined,
        "above",
      );
    }

    /* The named-mesh highlights the chapters call for. Both arcs are lit the
       same way the original lab lights them — full opacity and a paler colour,
       rather than an outline, because an arc is a flat wedge and an outline
       round one reads as a fourth arc. */
    const siderealMat = siderealArc.current.material as THREE.MeshBasicMaterial;
    const siderealOn = highlight === "stellar-day-arc";
    siderealMat.opacity = siderealOn ? 1 : 0.8;
    siderealMat.color.setHex(siderealOn ? 0x7ed0ff : COLOR.sidereal);

    const meanArcMat = meanArc.current.material as THREE.MeshBasicMaterial;
    const meanOn = highlight === "mean-day-arc";
    meanArcMat.opacity = meanOn ? 1 : 0.8;
    meanArcMat.color.setHex(meanOn ? 0xffb3ad : COLOR.mean);

    const solarArcMat = solarArc.current.material as THREE.MeshBasicMaterial;
    const solarOn = highlight === "solar-day-arc";
    solarArcMat.opacity = solarOn ? 1 : 0.8;
    solarArcMat.color.setHex(solarOn ? 0xfffbb0 : COLOR.solar);

    if (!sampling) return;
    onSample({
      day,
      eotMinutes: (eot * 24 * 60) / PI2,
      meanAnomaly: M,
      rashi,
      nakshatra: nak,
      moonNakshatra: moonNak,
      sankranti,
      labels,
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
        <meshBasicMaterial map={skyMap} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/*
        One mesh, in the ecliptic, on the focused body.

        It used to sit in the equator (y = 0) while the राशि and महिना belts
        sat in `solarPlaneQ`. At 23.4° those are two surfaces: a flat grid
        through the middle, and the tilted disc the belts stand on. The mesh
        takes the same quaternion as the belts, so अक्ष झुकाव moves it with
        them instead of leaving a straight line across the equator.

        Lines only — the filled disc is the second surface. And only while
        डिग्री is on; the belt disc is forced off below for the same reason.
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
          origin. Positions inside are written in the scene's own coordinates,
          exactly as before — the group carries the frame change. */}
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
            /* Mesh lives on `gridRoot`, already in this same plane. A disc
               here would be the second surface. */
            grid={false}
            showPlane={false}
            rashiBelt={toggles.rashiBelt}
            nakshatraBelt={toggles.nakshatraBelt}
            monthRing={toggles.monthRing}
            rashiHighlightRef={rashiHighlight}
            nakHighlightRef={nakHighlight}
          />
          {/* Visibility of the two Moon markers is owned by the frame loop:
              it also depends on which body the belt is hung around, which only
              it knows. A `visible` prop here would fight it on every render. */}
          <primitive object={moonNakHighlight} position={[0, -0.02, 0]} />
        </group>
      </group>
      </group>

      {/* World-space, not in the belt root: both are drawn from the planet out
          to a belt that is already positioned there. */}
      <primitive object={sightline} visible={toggles.sightline} />
      <primitive object={moonSightline} />

      {/* Mean sun at the origin, and the circle the clock believes in */}
      <group visible={toggles.meanSun}>
        <mesh>
          <sphereGeometry args={[MEAN_SUN_R, 24, 16]} />
          <meshBasicMaterial color={COLOR.mean} wireframe />
        </mesh>
      </group>
      {/* The planet's own track. It is drawn whenever the orbit layer is on,
          not only alongside the mean sun: this circle *is* the path the planet
          travels in this scene, so gating it on another layer left the planet
          moving across empty space with no orbit shown at all. */}
      <primitive object={meanOrbitLine} />

      {/* True sun, its spin, and the orbit it really travels */}
      <group ref={sunGroup} visible={toggles.trueSun}>
        <mesh>
          <sphereGeometry args={[SUN_R, 32, 24]} />
          <meshBasicMaterial map={sunMap} />
        </mesh>
      </group>
      <primitive object={dropLine} visible={toggles.trueSun && toggles.eotWedge} />
      <group ref={sunOrbitGroup}>
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

        The umbra is drawn far larger than it is. A real one is about a fortieth
        of the planet's width — at this scale a couple of pixels, invisible at
        any camera distance that also shows the Moon's orbit. The penumbra ring
        around it is the honest part of the shape: most of the places under it
        see a partial eclipse, not a total one.
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

      {/* The Moon, on its own inclined plane, carried along with the planet */}
      <primitive object={moonTrail} visible={showMoonTrail} />
      <group ref={moonRoot} visible={hasMoon}>
        <group ref={moonPlane}>
          <primitive object={moonOrbitLine} visible={showMoon} />
          <primitive object={lapArc.first} visible={showMoonLap} />
          <primitive object={lapArc.over} visible={showMoonLap} />
          <primitive object={monthStartTick} visible={showMoonLap} />
          <mesh ref={moonMesh} visible={showMoon}>
            <sphereGeometry args={[MOON_R, 32, 24]} />
            <meshStandardMaterial map={moonMap} roughness={1} metalness={0} />
          </mesh>
          {/* Rāhu at +X, Ketu at −X of this axis; the axis itself is Ω. */}
          <group ref={nodeAxis} visible={showMoon}>
            <primitive object={nodeLine} />
            <group position={[MOON_ORBIT, 0, 0]}>
              <ShadowGraha color={COLOR.rahu} map={rahuIcon} />
            </group>
            <group position={[-MOON_ORBIT, 0, 0]}>
              <ShadowGraha color={COLOR.ketu} map={ketuIcon} />
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
        <mesh visible={highlight === "earth"} scale={1.12} frustumCulled={false}>
          <sphereGeometry args={[PLANET_R, 32, 24]} />
          <meshBasicMaterial color={0x7ed0ff} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh ref={planetHit}>
          <sphereGeometry args={[PLANET_R * 1.85, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* The spin axis: one line straight through the globe and out past both
            poles, with a marker on each pole. It sits outside `planetMesh` so
            the spin does not carry it — an axis that rotated with the surface
            would be the one thing in the scene that cannot. */}
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
          <meshBasicMaterial color={COLOR.mean} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>

        <group ref={solarGroup} visible={toggles.solarArc}>
          <mesh geometry={solarGeom} ref={solarArc} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <meshBasicMaterial color={COLOR.solar} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>

        <group ref={siderealGroup} visible={toggles.siderealArc}>
          <primitive object={siderealTick} />
          <mesh geometry={siderealGeom} ref={siderealArc} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
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
