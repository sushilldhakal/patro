/**
 * 3D Aakash Gochar — the canvas, its gestures, the label overlay and the controls.
 *
 * The scene itself lives in {@link AakashGocharScene}; this component owns the
 * simulation clock, the camera, and everything the user can press. Both the
 * clock and the camera are held in refs so dragging or running the animation
 * never re-renders the tree — React only hears a sampled snapshot, five times a
 * second, which is also what positions the text labels over the canvas.
 *
 * This is the web counterpart of the mobile screen of the same name. The scene
 * below it is shared verbatim; what differs is everything the hand touches —
 * pointer events instead of a PanResponder, a fixed overlay instead of a modal,
 * and a wheel gesture the phone has no use for.
 */

import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree } from "@react-three/fiber";
import { DefaultLoadingManager } from "three";
import {
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  FastForward,
  Focus,
  Grid3x3,
  MapPin,
  Maximize2,
  Minimize2,
  Mountain,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { GocharGraha, VedicStarPosition } from "@/lib/api";
import type { Era } from "@/lib/era";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import {
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  bsMonthLabel,
  WEEKDAYS_SHORT_NE,
} from "@/lib/bs-calendar";
import {
  dragScaleForZoom,
  fovForZoom,
  HORIZON_ZOOM_MAX,
  HORIZON_ZOOM_MIN,
  SPACE_FOV,
} from "@/lib/sky3d/sky-zoom";
import {
  DEFAULT_STEP_INDEX,
  nearestStepIndex,
  TIME_STEPS,
} from "@/lib/sky3d/time-steps";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { RATE_NOTCHES, rateToSlider, sliderToRate } from "@/lib/sky3d/rate-slider";
import { SkySearch } from "@/components/sky3d/SkySearch";
import { displayVedicStars, vedicStarTargets, type SkyTarget } from "@/lib/sky3d/sky-catalogue";
import {
  localFavourites,
  pushRecent,
  putFavourites,
  recents as readRecents,
  syncFavourites,
} from "@/lib/sky3d/sky-bookmarks";
import { useAuth } from "@/lib/auth/AuthContext";
import { bikramFromSun } from "@/lib/sky3d/bikram-solar";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { NAKSHATRA_SHORT } from "@/lib/sky3d/nakshatra-stars";
import { useLocale, bilingualText } from "@/i18n/locale";
import { formatRashiByNumber } from "@/lib/rashi-i18n";
import { cn } from "@/lib/utils";
import { GRAHA_COLOR, normalizeDeg, rashiOfLongitude } from "@/lib/sky3d/geocentric-model";
import { KATHMANDU, type Observer } from "@/lib/sky3d/horizon";
import {
  ayanamsa,
  calibrate,
  daysSinceJ2000,
  GEO_BODY_ORDER,
  type SkyCalibration,
} from "@/lib/sky3d/orbital-model";
import { RashiSkyGlyph } from "@/lib/sky3d/rashi-icons";
import { getZonedTimeParts } from "@/lib/zoned-time";
import { SOLAR_STATIONS } from "@/lib/sky3d/sky-geometry";
import { POLE_STARS } from "@/lib/sky3d/pole-stars";
import {
  AakashGocharScene,
  type SceneToggles,
  type ScreenLabel,
  type SimState,
  PADA_ZOOM,
  type SkyMode,
  type SkySample,
  type ViewState,
} from "@/components/sky3d/AakashGocharScene";
import { HIPS_ATTRIBUTION, readHipsDebugSnapshot, type HipsDebugSnapshot } from "@/lib/sky3d/hips";
import { CompassControl } from "@/components/sky3d/CompassControl";
import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import compassNeedle from "@/assets/compass.svg?raw";
import { useDeviceOrientation, type OrientationSample } from "@/lib/sky3d/device-orientation";

const Scene = memo(AakashGocharScene);

const CANVAS_BG = "#04070d";

/**
 * The camera's far clip plane.
 *
 * It has to clear the far side of the sky sphere, not just the near side.
 * पृथ्वी गोला parks its camera at `GLOBE_CAM_R` (300) while the sky is a
 * sphere of radius 400 around the *origin* — so the far half of that sphere
 * is 700 units from the camera. At the old 600 everything past the plane was
 * cut, and cutting a sphere at a constant distance from the camera leaves a
 * perfectly circular hole: that was the black disc the globe appeared to sit
 * on, and the same cut was eating the background stars behind it. 1000
 * clears 300 + 400 with room to spare.
 */
const SKY_FAR = 1000;
/** Degrees → radians, for the compass dial's heading → camera yaw. */
const DEG_TO_RAD = Math.PI / 180;

/**
 * Native fullscreen often does not fire a ResizeObserver. R3F then keeps the
 * in-page drawing buffer, so the camera looks along −Z at y=40 and the
 * ecliptic (around the origin) never enters the frame.
 */
function FitCanvas() {
  const gl = useThree((s) => s.gl);
  const setSize = useThree((s) => s.setSize);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = gl.domElement.parentElement;
    if (!el) return;
    let lastW = 0;
    let lastH = 0;
    const sync = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;
      if (Math.abs(w - lastW) < 0.5 && Math.abs(h - lastH) < 0.5) return;
      lastW = w;
      lastH = h;
      setSize(w, h);
      invalidate();
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, [gl, setSize, invalidate]);

  return null;
}

/**
 * Step-14 temporary debug HUD for the HiPS Milky Way tile layer. The tile
 * LOD/visibility work happens inside the Canvas (see `hipsGroupRef`'s
 * per-frame block in {@link AakashGocharScene}), but this is a plain DOM
 * overlay outside it, so it polls the module-level snapshot that scene
 * writes into each frame ({@link writeHipsDebugSnapshot}) rather than
 * receiving it as a prop — a prop would either force Scene to re-render at
 * frame rate or need its own ref-forwarding plumbing, both overkill for a
 * HUD meant to be deleted once the tile renderer is verified. Off (renders
 * nothing) unless `?hipsdebug` is in the URL or `window.__hipsDebug()` was
 * called from the console.
 */
function HipsDebugHud() {
  const [snap, setSnap] = useState<HipsDebugSnapshot>(() => readHipsDebugSnapshot());
  useEffect(() => {
    const id = window.setInterval(() => setSnap(readHipsDebugSnapshot()), 200);
    return () => window.clearInterval(id);
  }, []);
  if (!snap.on) return null;
  const tilesOn = snap.maxOrderPresent >= 0;
  /* `minOrderPresent !== maxOrderPresent` is the direct, visible proof the
     recursive per-tile traversal (Phase 2/3) is actually choosing different
     resolutions in different parts of the frame — not the same order for
     everything, which is exactly what the old FOV→order table always did. */
  const mixedOrders = tilesOn && snap.minOrderPresent !== snap.maxOrderPresent;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 max-h-[70vh] overflow-hidden rounded-lg border border-emerald-400/30 bg-black/70 px-2.5 py-1.5 font-mono text-[11px] leading-tight text-emerald-200 backdrop-blur">
      <div>
        hips fov {snap.fovDeg.toFixed(1)}° ·{" "}
        {tilesOn
          ? `orders ${snap.minOrderPresent}${mixedOrders ? `–${snap.maxOrderPresent}` : ""}/${snap.maxOrder}${
              mixedOrders ? " (mixed)" : ""
            } · refine>${snap.refinePixels}px`
          : "panorama (above threshold)"}
      </div>
      <div>
        leaves {snap.leafCount} · ready {snap.readyCount} · fallback {snap.fallbackCount} · loading {snap.loadingCount} ·
        cached {snap.cachedCount} · inflight {snap.inFlight}
      </div>
      {snap.tiles.length > 0 && (
        <div className="mt-1 max-h-[50vh] overflow-y-auto border-t border-emerald-400/20 pt-1">
          {snap.tiles.map((t) => (
            <div key={`${t.order}/${t.pix}`}>
              O{t.order} P{t.pix} · {t.state} · {t.screenPx}px
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Overlay label colours, applied inline.
 *
 * These sit on the black canvas in both themes, so they must never inherit the
 * theme foreground — light mode would otherwise turn them near-black on it.
 */
const LABEL_COLOR = {
  rashi: "#f4c542",
  nakshatra: "#6fe08a",
  month: "#e3d9a8",
  pada: "#8fd6b0",
  cardinal: "#ff8a8a",
  azimuth: "#7ea9d8",
  station: "#ffd166",
  tilt: "#ffd166",
  axis: "#9fc4f0",
  poleStar: "#cfe0ff",
  vedicStar: "#ffe08a",
  nebula: "#e39bff",
  asterism: "#e6efff",
  tropic: "#e2d264",
  observer: "#ff6b6b",
  hud: "#ffffff",
  hudDim: "rgba(255,255,255,0.72)",
  overlayDim: "rgba(236,242,244,0.62)",
} as const;

/** Learn year-mode framing — same wheel scale, same seat above it. */
const SYSTEM_YAW = 0.2;
const SYSTEM_PITCH = 1.15;
const SYSTEM_DISTANCE = 70;
/** Zoom value that opens the horizon view at a ~70° lens — wide enough to
 *  read the sky, narrow enough that the rashi belt does not stretch. */
const HORIZON_WIDE = 26;
/**
 * Where the horizon camera starts: due south, a little above the skyline.
 *
 * South because that is where the zodiac rides from Kathmandu's latitude — the
 * ecliptic crosses the meridian in the southern sky, so facing north opens on
 * the one quarter with no grahas in it. The pitch is small so the hills sit
 * in the lower half of the frame, the way a planetarium opens on the horizon.
 *
 * Yaw is measured with +X east and −Z north (see `altAzToVec3`), so π faces
 * south.
 */
const HORIZON_YAW = Math.PI;
const HORIZON_PITCH = 0.12;
/** Default zoom in the Earth-globe view — frames the globe and its ring. */
const GLOBE_VIEW = 78;
/**
 * Where the globe camera starts.
 *
 * Past a right angle, so the face turned towards you is the one the observer is
 * standing on — the page is Kathmandu's sky, and opening on the Pacific would
 * put the marker round the back.
 */
/**
 * The zoom each view opens at — the one where its drag speed is calibrated.
 *
 * Dragging turns the sky by an angle, and an angle is worth a different number
 * of pixels at every zoom. Anchoring on each view's own opening zoom keeps the
 * feel each one already had and only changes what zooming in does to it.
 */
const HOME_DISTANCE: Record<SkyMode, number> = {
  space: SYSTEM_DISTANCE,
  horizon: HORIZON_WIDE,
  globe: GLOBE_VIEW,
};

const GLOBE_YAW = Math.PI - 0.6;
const GLOBE_PITCH = 0.42;

/** The camera never comes closer than this, nor pulls back further — क्षितिज's
 *  own range, so a full zoom in lands on 1° and a full zoom out on 235°. From
 *  `sky-zoom` rather than repeated here: these two numbers and the field the
 *  lens is set to have to be the same pair or the ends become unreachable. */
const ZOOM_MIN = HORIZON_ZOOM_MIN;
const ZOOM_MAX = HORIZON_ZOOM_MAX;
/** Space view matches the Learn playground's orbit range. */
const SPACE_ZOOM_MIN = 6;
const SPACE_ZOOM_MAX = 130;

const clampZoom = (v: number, skyMode: SkyMode) =>
  skyMode === "space"
    ? Math.min(SPACE_ZOOM_MAX, Math.max(SPACE_ZOOM_MIN, v))
    : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));

/** How far a press may wander, in px, and still count as a tap rather than a drag. */
const DRAG_SLOP = 5;
/** Taking the wheel back from the gyro must be a real pan. A 5px slop is a
    thumb resting on the glass while the phone is raised. */
const SENSOR_RELEASE_SLOP = 40;

/**
 * What counts as a control rather than sky.
 *
 * A press that lands on one of these is that control's — it neither starts a
 * camera drag nor has its touch gesture eaten. In fullscreen the control row
 * floats *over* the canvas, so both handlers meet its events and both have to
 * hand them back.
 */
/**
 * An iPhone or an iPad — the platforms whose own fullscreen fights the sky.
 *
 * iPadOS reports itself as a Macintosh and has done since 13, so the user agent
 * alone cannot tell them apart. A real Mac has no touch points; every iPad has
 * five. The pair together is the test.
 */
function isAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 1 && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent);
}

const CONTROL_SELECTOR = "button, input, select, [role='button'], [data-sky-controls]";

/**
 * The most the belt text is allowed to grow as the camera pulls back.
 *
 * Deliberately small. The idea behind growing it at all is sound — the belt
 * shrinks to a ring in the middle of the screen and fixed-size text goes with
 * it — but at 2.4 the rashi names came out near thirty points, big enough to
 * smother the ring they name and each other. The far zoom is where there is
 * *least* room between labels, not most.
 */
const LABEL_SCALE_MAX = 1.3;
/** Close-up: names grow as the lens tightens, capped so a 1° crop is not a wall of type. */
const CLOSE_LABEL_SCALE_MAX = 2.8;

/** Look all the way up to the zenith, and almost to the nadir. */
/**
 * How far क्षितिज may tip: all the way to the zenith and the nadir.
 *
 * The dome view writes the camera's rotation directly (`rotation.set(-pitch,
 * yaw, 0)` in YXZ), so a pole is an ordinary direction there — nothing
 * degenerates at it. Stopping three degrees short, which is what ±1.52 did,
 * meant the one thing you cannot reach is the point every vertical converges
 * on: pushed in to a one-degree field the pole sat off the edge of the frame
 * and the centre of the grid could not be looked at at all.
 */
const DOME_PITCH_MAX = Math.PI / 2;
/**
 * अन्तरिक्ष and पृथ्वी गोला stop short of it, and have to.
 *
 * Those two orbit the target and aim with `lookAt`, which needs an up vector
 * that is not parallel to the view — exactly at the pole it is, and the frame
 * rolls right over. This is the original limit, kept where it is load-bearing.
 */
const ORBIT_PITCH_MAX = 1.52;
function clampPitch(p: number, max: number = ORBIT_PITCH_MAX) {
  return Math.max(-max, Math.min(max, p));
}
/**
 * Points shaved off the belt text at the widest zoom, ramped in with the scale.
 *
 * With the cap above this very nearly cancels the growth, which is the point:
 * out at the far end the names hold their own size instead of swelling.
 */
const LABEL_WIDE_TRIM = 3;

/**
 * A zone-shifted instant → the UTC midnight of the day it lands on.
 *
 * `adToBS` reads a mid-day instant off the device's own calendar and a UTC one
 * off UTC, so anything shown against the observed place has to arrive already
 * flattened to its day — otherwise an evening in Kathmandu reads as tomorrow to
 * anyone further east. Built through the UTC setters because `new Date(y, …)`
 * folds years 0–99 into the 1900s, and this clock runs to both ends of history.
 */
const zoneMidnight = (shifted: Date) => {
  const midnight = new Date(0);
  midnight.setUTCFullYear(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight;
};

/**
 * A नक्षत्र's figure, drawn in the overlay's own colour.
 *
 * Not `NakshatraIcon`: that one is styled `text-foreground` for the pages it
 * was written for, and the foreground over this canvas is near-black in light
 * mode — the same trap {@link LABEL_COLOR} exists to avoid. Same artwork, same
 * `.fx` fill convention, colour inherited from the label it sits in.
 */
function NakshatraFigure({ svg, size }: { svg?: string; size: number }) {
  if (!svg) return null;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block shrink-0 [&_.fx]:fill-current [&_.fx]:stroke-none"
      aria-hidden
    >
      <g dangerouslySetInnerHTML={{ __html: svg }} />
    </svg>
  );
}

/** Overlay font size that grows with zoom-in, without the belt's far-zoom trim. */
const zoomFont = (base: number, scale: number) =>
  Math.min(22, Math.round(base * scale * 10) / 10);

/** Belt-label font size at `scale`, with the wide-zoom trim applied. */
const beltFontSize = (base: number, scale: number) =>
  base * scale - (LABEL_WIDE_TRIM * (scale - 1)) / (LABEL_SCALE_MAX - 1);

export type AakashGocharSkyProps = {
  /** Gochar rows for {@link date} — the API longitudes the model is pinned to. */
  gochar?: Record<string, GocharGraha>;
  /**
   * The server's Lahiri ayanamsa for {@link date}, degrees — where the sidereal
   * zero stands against the equinox. The scene pins its own fit to it.
   */
  ayanamsaDeg?: number;
  /**
   * The 32 named वैदिक तारा, positioned server-side for {@link date} from the
   * Swiss Ephemeris fixed-star catalogue. Plotted as-is in the horizon and
   * globe views — see [[VedicStarPosition]].
   */
  vedicStars?: VedicStarPosition[];
  /** The date the gochar rows describe; the simulation starts here. */
  date: Date;
  /**
   * Lets the transport row's calendar button jump the page to a new date —
   * the only way to change dates once the sky is fullscreen, where the date
   * nav above the canvas is out of reach.
   */
  onDateChange?: (date: Date) => void;
  /**
   * Which calendar the fullscreen date picker reads its year in, and the way
   * back out when the reader changes it.
   *
   * The sky runs to both ends of the Vikram axis, and most of what is down
   * there is पू.वि.सं. — but a पू.वि.सं. day cannot be dated from the offline
   * table, so the conversion belongs to the page that owns the fetch.
   * {@link onEraChange} is the same callback the date nav above the canvas
   * takes; without it the picker stays on वि.सं. and converts locally.
   */
  era?: Era;
  /**
   * The Vikram day the page last asked for, when it came from a Vikram pick.
   * The picker opens on it — `adToBS` cannot re-derive a पू.वि.सं. date from
   * the instant, so without this the picker opens on a nonsense वि.सं. year.
   */
  vikram?: { era: Era; year: number; month: number; day: number } | null;
  onEraChange?: (era: Era, calendar?: { year: number; month: number; day: number }) => void;
  clock?: string;
  onClockChange?: (clock: string) => void;
  /** Where the sky is being watched from. Drives the whole horizon view. */
  observer?: Observer;
  /** The place's timezone — the clock in the HUD reads on its wall, not UTC. */
  timeZone?: string;
  /**
   * What to call the place on screen — the city the page is set to, already in
   * the reader's language. The meridian toggle is named after it: the line is
   * drawn through wherever you are watching from, so calling it काठमाडौँ रेखा
   * while the page is set to Tokyo names the wrong city.
   */
  placeLabel?: string;
  /**
   * The graha the sky is focused on. Optional: pass it with
   * {@link onSelectedKeyChange} to drive selection from outside — the page pairs
   * the sky with its detail cards that way — or leave both off and the sky keeps
   * its own.
   */
  selectedKey?: GrahaKey | null;
  onSelectedKeyChange?: (key: GrahaKey | null) => void;
  /** Canvas height in px when not fullscreen. */
  height?: number;
};

export function AakashGocharSky({
  gochar,
  ayanamsaDeg,
  vedicStars,
  date,
  onDateChange,
  onClockChange,
  observer = KATHMANDU,
  timeZone = "Asia/Kathmandu",
  placeLabel,
  height = 660,
  selectedKey: selectedKeyProp,
  onSelectedKeyChange,
}: AakashGocharSkyProps) {
  const { lang, digits } = useLocale();
  const pick = useCallback(
    (ne: string, en: string) => bilingualText(lang, ne, en),
    [lang],
  );

  /* The API is the source of truth: pin the model onto it for this date, so the
     scene is exact here and merely smooth as the clock runs away from it. */
  const calibration: SkyCalibration = useMemo(
    () => (gochar ? calibrate(date, gochar) : {}),
    [gochar, date],
  );

  /* Same idea for the frame the longitudes live in: the offset that carries the
     scene's own Lahiri fit onto the server's value for this date. The fit is
     already sub-arcminute near now, but it drifts by a third of a degree a
     thousand years out — enough to slide the whole belt off its stars. */
  const ayanamsaShift = useMemo(
    () => (ayanamsaDeg == null ? 0 : ayanamsaDeg - ayanamsa(daysSinceJ2000(date))),
    [ayanamsaDeg, date],
  );

  const sim = useRef<SimState>({
    timeMs: date.getTime(),
    secondsPerRealSecond: TIME_STEPS[DEFAULT_STEP_INDEX].seconds,
    playing: true,
  });
  /* Opens on अन्तरिक्ष from above, so the rashi / नक्षत्र / month wheel
     reads as a wheel — the Learn playground's own framing. Globe is one chip
     away. */
  const view = useRef<ViewState>({
    yaw: SYSTEM_YAW,
    pitch: SYSTEM_PITCH,
    distance: SYSTEM_DISTANCE,
  });

  const [mode, setMode] = useState<SkyMode>("space");

  /** True while the scene's `useLoader` textures (planet/star/milky-way/toon
   * earth JPGs+PNGs, several MB combined) are still in flight. The Suspense
   * boundary around `<Scene>` has a `null` fallback — R3F can't render DOM
   * inside the WebGL tree — so this drives a DOM overlay instead, tracked via
   * the shared `THREE.DefaultLoadingManager` every `useLoader` texture load
   * reports to, rather than leaving the canvas a flat, unexplained color for
   * as long as those assets take to fetch and decode. */
  const [texturesLoading, setTexturesLoading] = useState(true);
  useEffect(() => {
    const manager = DefaultLoadingManager;
    const prevOnStart = manager.onStart;
    const prevOnLoad = manager.onLoad;
    manager.onStart = (...args) => {
      setTexturesLoading(true);
      prevOnStart?.(...args);
    };
    manager.onLoad = () => {
      setTexturesLoading(false);
      prevOnLoad?.();
    };
    return () => {
      manager.onStart = prevOnStart;
      manager.onLoad = prevOnLoad;
    };
  }, []);

  /** Captured once at Canvas creation, so AR mode can clear to transparent
      instead of {@link CANVAS_BG} and let the camera behind it show through. */
  const glRef = useRef<{ setClearColor: (color: number | string, alpha?: number) => void } | null>(
    null,
  );

  /**
   * The compass dial's own heading, degrees — 0 north, clockwise, same frame
   * as the scene's az. Mirrors `view.current.yaw` in state only so the dial
   * has something to re-render from; the ref stays the one the frame loop
   * reads.
   */
  const [compassHeading, setCompassHeading] = useState(0);
  /** The back camera is actually live behind the sky. Always false unless {@link gyroMode} is too. */
  const [arMode, setArMode] = useState(false);
  /** The device's own tilt/turn is driving `view.current.yaw`/`pitch` — with or without the camera on. */
  const [gyroMode, setGyroMode] = useState(false);
  /** "फोन माथि उठाउनुहोस्" — up for the fixed window between the tap that asks for the gyro and it actually taking over. */
  const [gyroPrompt, setGyroPrompt] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Written from the sensor event itself, not a React effect — orientation
      arrives at sensor rate and the frame loop already reads `view.current`. */
  const gyroLiveRef = useRef(false);
  const applyOrientationSample = useCallback((sample: OrientationSample) => {
    if (!gyroLiveRef.current) return;
    view.current.yaw = sample.yaw;
    view.current.pitch = clampPitch(sample.pitch, DOME_PITCH_MAX);
    view.current.roll = sample.roll;
    setGyroPrompt((open) => (open ? false : open));
  }, []);
  const { requestPermission } = useDeviceOrientation(
    gyroMode || arMode || gyroPrompt,
    applyOrientationSample,
  );
  const gyroPromptTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(gyroPromptTimer.current), []);

  const onCompassHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
    // The horizon camera's own yaw runs opposite true azimuth (see the
    // `cam.rotation.set` derivation in AakashGocharScene) — negate here so
    // dragging the dial to W actually turns the camera to face west instead
    // of its mirror image, east.
    view.current.yaw = -heading * DEG_TO_RAD;
  }, []);

  const stopCameraStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  /** The reader's own drag — on the dial or the sky itself — taking the
      wheel back from whichever sensor was driving it. */
  const stopSensorMode = useCallback(() => {
    gyroLiveRef.current = false;
    setGyroMode(false);
    setArMode(false);
    setCameraStream(null);
    view.current.roll = 0;
    window.clearTimeout(gyroPromptTimer.current);
    setGyroPrompt(false);
  }, []);

  /** A tap on the dial while neither sensor is running: ask the reader to
      raise the phone, and start applying samples on this same tap.
      `requestPermission` is fired synchronously from the tap — iOS only
      honours it inside a user-gesture call stack. */
  const requestGyro = useCallback(() => {
    setMode("horizon");
    gyroLiveRef.current = true;
    setGyroPrompt(true);
    setGyroMode(true);
    void requestPermission().then((ok) => {
      if (ok) return;
      gyroLiveRef.current = false;
      setGyroMode(false);
      setGyroPrompt(false);
    });
    window.clearTimeout(gyroPromptTimer.current);
    // Backstop only — the overlay normally lifts on the first sensor sample.
    gyroPromptTimer.current = window.setTimeout(() => {
      setGyroPrompt(false);
    }, 8000);
  }, [requestPermission]);

  /** The dial's centre glyph, tapped once the gyro has already turned it
      into a lens: opens the back camera without touching the tilt that's
      already driving the view. */
  const requestCamera = useCallback(() => {
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        setCameraStream(stream);
        setArMode(true);
      } catch {
        // Permission denied, or no back camera to ask for (a laptop) — the
        // dial stays a gyro-only compass rather than opening onto a black
        // rectangle.
      }
    })();
  }, []);

  /** What a clean tap on the dial means depends entirely on which sensor,
      if any, is already live — see {@link CompassControl}'s own doc comment. */
  const onCompassTap = useCallback(() => {
    if (gyroMode && !arMode) {
      requestCamera();
      return;
    }
    if (!gyroMode && !arMode) requestGyro();
  }, [gyroMode, arMode, requestCamera, requestGyro]);

  // Release the camera hardware whenever the stream this component is
  // holding changes or the sky unmounts — a stream nobody stopped keeps the
  // camera light on and the sensor busy behind whatever screen comes next.
  useEffect(() => {
    return () => stopCameraStream(cameraStream);
  }, [cameraStream, stopCameraStream]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    gyroLiveRef.current = gyroMode || arMode;
  }, [gyroMode, arMode]);

  /** Camera passthrough only once `getUserMedia` actually resolved — AR mode
      alone would otherwise leave a black rectangle where the lens should be. */
  const showCamera = arMode && cameraStream != null;

  // Transparent clear so the camera behind the Canvas shows through; opaque
  // otherwise. Toggled here rather than in `onCreated`, which only fires once.
  useEffect(() => {
    glRef.current?.setClearColor(CANVAS_BG, showCamera ? 0 : 1);
  }, [showCamera]);

  /**
   * The city the page is set to, for anything named after the observer.
   *
   * Just the city: the page's own label carries the country too — "काठमाडौँ,
   * NP" — which reads as a postal address once "रेखा" is appended to it.
   */
  const placeName = placeLabel?.split(",")[0].trim() || pick("काठमाडौँ", "Kathmandu");
  /**
   * The clock, as one chosen step and two switches.
   *
   * The step is the single source of truth — {@link TIME_STEPS} — and the
   * arrows, the play button and the rate readout all measure themselves
   * against the same rung. `timeRate` below is derived rather than stored, so
   * the two can never say different things about how fast the sky is running.
   */
  const [stepIndex, setStepIndex] = useState(DEFAULT_STEP_INDEX);
  const [playing, setPlaying] = useState(true);
  const [reverse, setReverse] = useState(false);
  const speed = TIME_STEPS[stepIndex];
  /** Signed simulated seconds per real second. 0 is paused. */
  const timeRate = playing ? (reverse ? -speed.seconds : speed.seconds) : 0;
  /* Controlled when the page passes a key, uncontrolled otherwise — the inner
     state is kept either way so an uncontrolled sky still works on its own. */
  const [ownSelectedKey, setOwnSelectedKey] = useState<GrahaKey | null>(null);
  const controlled = selectedKeyProp !== undefined;
  const selectedKey = controlled ? selectedKeyProp : ownSelectedKey;
  const [sample, setSample] = useState<SkySample | null>(null);
  /* क्षितिज's own FOV readout — shown a moment after each real change in
     zoom, not left standing. */
  const [fovBadge, setFovBadge] = useState(false);
  const lastFov = useRef<number | null>(null);
  const fovHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(fovHideTimer.current), []);
  /* The sky opens on four: the degree cage, the names, the राशि belt and the
     line through the place you are watching from. Everything else — the
     नक्षत्र and महिना rings, the figures, the pole stars, the तिल्ट, the
     landscape — is a layer you go and ask for. Opening with all twelve on was
     a wall of text and line over the one thing most people came to read. */
  const [toggles, setToggles] = useState<SceneToggles>({
    grid: true,
    labels: true,
    rashiBelt: true,
    vedicStars: true,
    constellations: true,
    primeMeridian: true,
    nakshatraBelt: false,
    monthRing: false,
    lockStars: false,
    lockCenter: false,
    tilt: false,
    landscape: false,
  });
  const [flash, setFlash] = useState<number | null>(null);
  const lastRashi = useRef<number | null>(null);
  const [phaseFlash, setPhaseFlash] = useState<"amavasya" | "purnima" | "solar" | "lunar" | null>(
    null,
  );
  const lastSyzygy = useRef<"amavasya" | "purnima" | "solar" | "lunar" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  /* Fullscreen only: the whole control row folds away to a single chevron, so
     the sky can have the entire screen when you just want to watch it. */
  const [controlsOpen, setControlsOpen] = useState(true);
  /* The transport row's own date picker — the date nav above the canvas is
     unreachable once fullscreen, so this is the only way to jump dates there. */
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  /* The lock needs a target, and hitting one on the sky is small on a phone —
     so the lock button doubles as the way to choose it. */
  const [grahaPickerOpen, setGrahaPickerOpen] = useState(false);
  /* The other thing the camera can follow: your own place on the globe, which
     holds it under the camera while the sky turns overhead. Exclusive with a
     graha — the lock has one target. */
  const [lockObserver, setLockObserver] = useState(false);
  /* Every press that *asks* to centre something bumps this; the scene answers
     it with one snap. Following holds the camera only while the clock runs, so
     "focus this" has to be an event rather than a state — on a paused sky the
     state alone would centre nothing. */
  const [searchOpen, setSearchOpen] = useState(false);
  const [favourites, setFavourites] = useState<string[]>(() => localFavourites());
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecents());
  /**
   * Where the camera has been asked to look, for anything that is not a graha.
   *
   * A graha already has a way to be centred — select it and ask for focus — but
   * a star has no object in the scene to select. So a fixed target is passed
   * down as a position and a nonce, and the scene aims at it the same way it
   * aims at a followed graha, for one frame.
   */
  const [skyAim, setSkyAim] = useState<{
    lon: number;
    lat: number;
    nonce: number;
    fov?: number;
    /** See {@link SkyTargetAt}'s own doc comment — whether `lon` is already
     *  a current sidereal longitude (वैदिक तारा) or a raw J2000 tropical one
     *  (everything else), since the scene's aim handler converts the two
     *  differently. */
    sidereal?: boolean;
  } | null>(null);
  /** What the reticle is currently sitting on, for the caption under it. */
  const [aimed, setAimed] = useState<SkyTarget | null>(null);
  /** Whether the camera actually centred on {@link aimed} — a follow/search
      pick, not a bare select — which is the only time the fixed reticle
      belongs on screen; a select-only pick leaves the camera where it was. */
  const [aimedCentered, setAimedCentered] = useState(false);
  const { user } = useAuth();
  const signedIn = !!user;

  /* Signing in pulls the account's list down and folds this browser's into it. */
  useEffect(() => {
    let alive = true;
    void syncFavourites(signedIn).then((ids) => {
      if (alive) setFavourites(ids);
    });
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const toggleFavourite = useCallback(
    (id: string) => {
      setFavourites((current) => {
        const next = current.includes(id)
          ? current.filter((v) => v !== id)
          : [...current, id];
        void putFavourites(next, signedIn);
        return next;
      });
    },
    [signedIn],
  );

  const [focusNonce, setFocusNonce] = useState(0);
  const askFocus = useCallback(() => setFocusNonce((n) => n + 1), []);

  // Following the date nav above the canvas keeps the two in step.
  useEffect(() => {
    sim.current.timeMs = date.getTime();
  }, [date]);

  useEffect(() => {
    sim.current.playing = timeRate !== 0;
    sim.current.secondsPerRealSecond = timeRate === 0 ? 1 : timeRate;
  }, [timeRate]);

  /**
   * A press of either fast button. Coming from a standstill or from the other
   * direction it starts at a minute a second — the first rung that is actually
   * fast, real time being the one below it; otherwise it climbs a rung and
   * stops at the top, seventy-two years a second.
   */
  /**
   * पछाडि and अगाडि, which now move the clock rather than the throttle.
   *
   * One press is one step of the chosen size — pick १ दिन and अगाडि is
   * tomorrow, pick १ वर्ष and it is next year. Running, they turn the sky
   * round instead: the same step, applied every second, in the direction
   * pressed. Either way the number on the readout is what happens, which is
   * the whole point of there being one ladder.
   */
  const stepTime = useCallback(
    (direction: "forward" | "back") => {
      const wantReverse = direction === "back";
      if (playing) {
        setReverse(wantReverse);
        return;
      }
      const delta = (wantReverse ? -1 : 1) * TIME_STEPS[stepIndex].seconds * 1000;
      sim.current.timeMs += delta;
    },
    [playing, stepIndex],
  );

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  /** Shared by the time-sheet's rate slider and the desktop transport row. */
  const applyTimeRate = useCallback((rate: number) => {
    if (rate === 0) {
      setPlaying(false);
      return;
    }
    setStepIndex(nearestStepIndex(rate));
    setReverse(rate < 0);
    setPlaying(true);
  }, []);

  /* ── gestures ─────────────────────────────────────────────────────────── */

  /* The handlers are built once, so they read the live mode from a ref. */
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  /** Same reasoning: read fresh inside the imperative listeners below, which
      close over this once and are not rebuilt on every render. Includes the
      pending prompt too — a drag started while it's still up should cancel
      the gyro that's about to take over, not just the ones already live. */
  const sensorModeRef = useRef(gyroMode || arMode || gyroPrompt);
  useEffect(() => {
    sensorModeRef.current = gyroMode || arMode || gyroPrompt;
  }, [gyroMode, arMode, gyroPrompt]);

  /**
   * Live pointers on the canvas, by pointerId. One drags the sky; two pinch it.
   * A Map rather than state — the whole point is that dragging never renders.
   */
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });
  /** Where the current one-finger drag started, in client px. */
  const dragOrigin = useRef({ x: 0, y: 0 });
  /** The pointer that owns the pan — a stray second id must not switch us to pinch. */
  const dragId = useRef<number | null>(null);
  const dragging = useRef(false);

  /**
   * Re-anchor the gesture on where the camera is now and on whichever pointer
   * is still down. Called when a gesture starts, and again when a finger lifts
   * out of a pinch — otherwise the remaining finger resumes the drag maths
   * against a stale origin and the sky jumps.
   */
  const reanchor = useCallback(() => {
    gestureStart.current = { ...view.current, pinch: 0 };
    const id = dragId.current;
    const live = id != null ? pointers.current.get(id) : [...pointers.current.values()][0];
    if (live) dragOrigin.current = { x: live.x, y: live.y };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    view.current.distance = clampZoom(view.current.distance * factor, modeRef.current);
  }, []);

  /* The wheel is the desktop's pinch. Bound imperatively and non-passively:
     React's onWheel is passive, so it cannot stop the page scrolling under a
     zoom. */
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      /* Trackpads report small, frequent deltas and mice one big one; the
         exponent keeps both feeling like the same gesture. */
      zoomBy(Math.exp(e.deltaY * 0.0012));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    /* `fullscreen` is not read in here, but entering it re-roots this subtree:
       the old wrapper goes and a new one takes its place, and a listener bound
       to the node this ran on the first time is left on a node nobody can
       reach. Re-binding on the swap is the whole reason it is a dependency —
       without it the wheel stopped zooming the moment the sky went fullscreen. */
  }, [zoomBy, fullscreen]);

  /*
   * Pointer drag is bound on the wrapper (down) and on window in the capture
   * phase (move/up). React-three-fiber also listens on the canvas; a window
   * capture listener still sees the event first, so a graha hit cannot swallow
   * the pan. preventDefault stops the browser taking a sideways swipe as
   * back-navigation — that was "cannot side drag".
   */
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(CONTROL_SELECTOR)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      /*
       * A primary pointer down means no other finger is on the glass — so
       * anything still in the map is a ghost, and the map is cleared before it
       * is believed.
       *
       * Ghosts happen: a pointerup swallowed by the browser taking the touch
       * for itself, or a gesture in flight when this effect rebinds (it does,
       * on entering fullscreen) and its release lands on a listener that no
       * longer exists. The ref outlives the listener either way. One ghost is
       * all it takes — the next single-finger drag then counts two pointers,
       * takes itself for a pinch, and zooms the sky instead of turning it,
       * which is a sky that cannot be dragged at all until the page reloads.
       */
      if (e.isPrimary) pointers.current.clear();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      if (dragId.current == null) {
        dragId.current = e.pointerId;
        dragging.current = false;
        reanchor();
      }
      /* The gesture belongs to the sky from here until the finger lifts. With
         the capture, every move and the release are delivered to this element
         whatever they pass over on the way — a control that floats above the
         canvas, the edge of the screen — instead of the drag being handed off
         mid-turn. Safari can still steal a touch for a system gesture, which is
         what the ghost-clearing above exists for. */
      if (e.pointerType !== "mouse") {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* Already captured, or the pointer is gone. Neither is worth failing
             the drag over. */
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      if (e.cancelable) e.preventDefault();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

      /* A real drag starting while a sensor is driving the view is the
         reader taking the wheel back — dropped the instant this gesture
         actually turns into a drag rather than staying a tap, then the same
         move goes on to pan the sky manually below. */
      const wasDragging = dragging.current;
      const cancelSensorIfDragging = () => {
        if (!wasDragging && dragging.current && sensorModeRef.current) stopSensorMode();
      };

      const touches = [...pointers.current.values()].filter((p) => p.type === "touch");
      if (touches.length >= 2) {
        const [a, b] = touches;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (!dist) return;
        if (!gestureStart.current.pinch) gestureStart.current.pinch = dist;
        view.current.distance = clampZoom(
          gestureStart.current.distance * (gestureStart.current.pinch / dist),
          modeRef.current,
        );
        dragging.current = true;
        cancelSensorIfDragging();
        return;
      }

      if (e.pointerId !== dragId.current) return;

      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      const mode = modeRef.current;
      const slop = sensorModeRef.current ? SENSOR_RELEASE_SLOP : DRAG_SLOP;
      if (mode !== "space" && !dragging.current && Math.hypot(dx, dy) < slop) {
        return;
      }
      dragging.current = true;
      cancelSensorIfDragging();

      if (mode === "horizon") {
        /* Grab the sky: one screen-height of drag is one vertical field, so a
           pull pans by the same angle the image actually covers.
         *
         * Both signs are "the sky follows the finger" — pull down and the sky
         * comes down with you. `pitch` counts *downward* from the horizon (the
         * camera reads it as `rotation.x = -pitch`), so following the finger
         * means subtracting dy, not adding it. Adding it turned क्षितिज into
         * the one view of the three that pushed the sky away from the drag:
         * space and globe both already move theirs with it. */
        const h = Math.max(el.clientHeight, 1);
        const k =
          ((fovForZoom("horizon", view.current.distance) * Math.PI) / 180) / h;
        view.current.yaw = gestureStart.current.yaw + dx * k;
        view.current.pitch = clampPitch(gestureStart.current.pitch - dy * k, DOME_PITCH_MAX);
      } else {
        const zoomScale = dragScaleForZoom(mode, view.current.distance, HOME_DISTANCE[mode]);
        view.current.yaw = gestureStart.current.yaw - dx * 0.006 * zoomScale;
        view.current.pitch = clampPitch(gestureStart.current.pitch + dy * 0.005 * zoomScale);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      if (dragId.current === e.pointerId) {
        dragId.current = null;
        dragging.current = false;
        const next = pointers.current.keys().next();
        if (!next.done) dragId.current = next.value;
      }
      reanchor();
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { capture: true, passive: false });
    window.addEventListener("pointerup", onUp, { capture: true });
    window.addEventListener("pointercancel", onUp, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onUp, { capture: true });
    };
  }, [fullscreen, reanchor, stopSensorMode]);

  /*
   * Touch drags belong to the sky, and have to say so to the browser.
   *
   * Safari on iPad reads a downward swipe over a fullscreened element as "leave
   * fullscreen" — the same gesture that dismisses a fullscreen video — so
   * dragging the globe south dropped the reader back onto the page. Nothing in
   * CSS settles it: `touch-action: none` governs scrolling and pinch-zoom, not
   * that gesture, and React's own onTouchMove is bound passively at the root,
   * so calling preventDefault there does nothing at all. It has to be an
   * imperative non-passive listener, exactly as the wheel above is.
   */
  useEffect(() => {
    /* Space, horizon, and fullscreen take the swipe for the sky. Globe still
       leaves page-scroll alone while the canvas sits in the document. */
    const el = canvasWrapRef.current;
    if (!el || !(fullscreen || mode === "space" || mode === "horizon")) return;
    const onTouchMove = (e: TouchEvent) => {
      /* The control row floats over the sky in fullscreen, so a touch there
         reaches this listener on its way up. That row scrolls sideways on a
         narrow screen, and swallowing its touchmove would leave half the chips
         unreachable — so anything that starts on a control keeps its gesture. */
      const target = e.target;
      if (target instanceof Element && target.closest(CONTROL_SELECTOR)) return;
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [fullscreen, mode]);

  /**
   * A press in the sky puts every panel away.
   *
   * फिल्टर and केन्द्रविन्दु open over the picture, and the thing they are for
   * is the picture — so reaching past one to touch what it covers is the plain
   * way to say you are done with it. Leaving them up until their own button is
   * pressed again meant every look at the sky cost two presses.
   *
   * On `pointerdown`, so it clears out of the way before the drag it is part
   * of rather than after it, and only when something is actually open.
   */
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    if (!drawerOpen && !focusOpen && !grahaPickerOpen && !searchOpen && !aimed) return;
    const dismiss = (e: PointerEvent) => {
      /* Outside the panel only. The panels float over the canvas, so every
         press on a checkbox inside one also reaches this listener on its way
         up — which closed the panel under the finger before the box it was
         aimed at could be ticked. `CONTROL_SELECTOR` is the same test the drag
         handler uses to leave controls alone, and the panels carry
         `data-sky-controls` for exactly this. */
      const t = e.target;
      if (t instanceof Element && t.closest(CONTROL_SELECTOR)) return;
      setDrawerOpen(false);
      setFocusOpen(false);
      setGrahaPickerOpen(false);
      setSearchOpen(false);
      /* And the reticle. It marks the one thing the reader asked to be shown;
         touching the sky is asking for something else. */
      setAimed(null);
    };
    el.addEventListener("pointerdown", dismiss);
    return () => el.removeEventListener("pointerdown", dismiss);
  }, [aimed, drawerOpen, focusOpen, grahaPickerOpen, searchOpen]);

  const onSample = useCallback((next: SkySample) => {
    setSample(next);
    // `view.current.yaw` is the one place camera facing actually lives —
    // written by the canvas drag, the view chips, a search pick's one-shot
    // aim, or (in AR mode) the device's own sensors. The dial just mirrors
    // whichever of those moved it most recently, sampled at the same rate
    // everything else reads the scene at. Negated for the same reason
    // {@link onCompassHeadingChange} negates going the other way — camera
    // yaw and true azimuth run opposite each other.
    setCompassHeading(normalizeDeg(-view.current.yaw / DEG_TO_RAD));
    // A brief FOV readout while क्षितिज actually zooms — a nicety only that
    // view has a field of view worth naming, and only worth showing while
    // the number is actually changing, not sitting on screen permanently.
    if (mode === "horizon") {
      const fov = fovForZoom("horizon", next.zoomDistance);
      if (lastFov.current != null && Math.abs(fov - lastFov.current) > 0.05) {
        setFovBadge(true);
        window.clearTimeout(fovHideTimer.current);
        fovHideTimer.current = window.setTimeout(() => setFovBadge(false), 1500);
      }
      lastFov.current = fov;
    }
  }, [mode]);

  /**
   * One press: mark it, nothing else.
   *
   * The camera stays put and ग्रह पछ्याउनुहोस् goes off — a single press names
   * what you are looking at, it does not ask to be shown it, and it is not a
   * standing order to keep riding whatever was selected before. Only a second
   * press inside {@link onFollow}'s window means either of those, and the
   * scene's own picker already tells the two apart before either handler is
   * called — so this one never has to guess, and never has to undo a camera
   * move the other press is about to make.
   *
   * Pressing the graha already selected clears it, in both modes.
   */
  const onSelect = useCallback(
    (key: GrahaKey) => {
      setAimed(null);
      const current = controlled ? selectedKeyProp : ownSelectedKey;
      const clearing = current === key;
      setToggles((t) => (t.lockCenter ? { ...t, lockCenter: false } : t));
      if (controlled) {
        onSelectedKeyChange?.(clearing ? null : key);
        return;
      }
      setOwnSelectedKey(clearing ? null : key);
      onSelectedKeyChange?.(clearing ? null : key);
    },
    [controlled, onSelectedKeyChange, ownSelectedKey, selectedKeyProp],
  );

  /** A press that landed on nothing — the follow lock lets go, same as a
      press on a different graha. Selection itself is left alone: emptying it
      too was not asked for, and a stray tap should not lose your place. */
  const onEmptyPress = useCallback(() => {
    setAimed(null);
    setToggles((t) => (t.lockCenter ? { ...t, lockCenter: false } : t));
  }, []);


  /** Select outright — the picker names a graha, so it never toggles it off. */
  const setSelected = useCallback(
    (key: GrahaKey | null) => {
      if (!controlled) setOwnSelectedKey(key);
      onSelectedKeyChange?.(key);
    },
    [controlled, onSelectedKeyChange],
  );

  /**
   * Pressed twice — ride it.
   *
   * One press is "show me this", which centres it and then hands the drag back.
   * Two is "stay on it": ग्रह पछ्याउनुहोस् goes on and the camera holds the
   * graha in the middle while the clock runs and the sky slides past behind it.
   */
  const onFollow = useCallback(
    (key: GrahaKey) => {
      setAimed(null);
      setSelected(key);
      /* `lockStars` off, always. Following a graha means the camera rides it —
         it does not mean the sky stops. Left on, the local horizon and its
         Alt-Az grid freeze with the stars and the whole view reads as locked,
         which is not what a second press asked for. The other two ways in,
         followGraha and followObserver, have always cleared it here too. */
      setToggles((t) => ({ ...t, lockCenter: true, lockStars: false }));
      askFocus();
    },
    [askFocus, setSelected],
  );

  /**
   * A search result was chosen, or a star was pressed twice: put it in the
   * middle and mark it.
   *
   * Grahas go through the path that already exists — select, then ask to focus
   * — so the selection panel, the follow toggle and the graha's own card all
   * agree with what the camera is doing. Anything fixed is handed to the scene
   * as a position instead. Either way it lands under the reticle, which is
   * only drawn once something has actually been centred — see {@link aimedCentered}.
   */
  const pickTarget = useCallback(
    (target: SkyTarget) => {
      setAimed(target);
      setAimedCentered(true);
      setRecentIds(pushRecent(target.id));
      if (target.at === "graha") {
        setSelected(target.graha);
        askFocus();
      } else {
        setSkyAim({
          lon: target.lon,
          lat: target.lat,
          nonce: Date.now(),
          fov: target.aimFov,
          sidereal: target.sidereal,
        });
      }
      setSearchOpen(false);
    },
    [askFocus, setSelected],
  );

  /**
   * One press: mark it where it already stands, camera untouched — the star
   * equivalent of graha's {@link onSelect}. A named star already carries its
   * own label in the sky (see `SkyLabels`), so there is nothing here for the
   * reticle to draw; a वैदिक तारा gets its own in-scene crown instead (see
   * `aimedId` in `AakashGocharScene`), which is why this never needs a
   * screen-space marker of its own the way a centred pick does.
   */
  const selectTarget = useCallback((target: SkyTarget) => {
    setAimed(target);
    setAimedCentered(false);
    setRecentIds(pushRecent(target.id));
  }, []);

  const catalogStars = useMemo(() => displayVedicStars(vedicStars ?? []), [vedicStars]);
  const namedStars = useMemo(() => vedicStarTargets(catalogStars), [catalogStars]);

  const starTarget = useCallback(
    (star: VedicStarPosition, index: number): SkyTarget =>
      namedStars[index] ?? {
        id: `vedic:${index}`,
        kind: "star",
        ne: star.ne,
        en: star.en,
        hintNe: star.designation,
        hintEn: star.designation,
        at: "sky",
        lon: star.lon,
        lat: star.lat,
        sidereal: true,
      },
    [namedStars],
  );

  const onSelectStar = useCallback(
    (star: VedicStarPosition, index: number) => {
      setToggles((t) => (t.vedicStars ? t : { ...t, vedicStars: true }));
      selectTarget(starTarget(star, index));
    },
    [starTarget, selectTarget],
  );

  const onFollowStar = useCallback(
    (star: VedicStarPosition, index: number) => {
      setToggles((t) => (t.vedicStars ? t : { ...t, vedicStars: true }));
      pickTarget(starTarget(star, index));
    },
    [starTarget, pickTarget],
  );

  type SkyHit = {
    id: string;
    ne: string;
    en: string;
    lon: number;
    lat: number;
    hintNe?: string;
    hintEn?: string;
    sidereal?: boolean;
  };
  const skyHitTarget = useCallback(
    (hit: SkyHit): SkyTarget => ({
      id: hit.id,
      kind: "star",
      ne: hit.ne,
      en: hit.en,
      hintNe: hit.hintNe,
      hintEn: hit.hintEn,
      at: "sky",
      lon: hit.lon,
      lat: hit.lat,
      sidereal: hit.sidereal,
    }),
    [],
  );

  const onAimSky = useCallback(
    (hit: SkyHit) => {
      setToggles((t) => (t.constellations ? t : { ...t, constellations: true }));
      selectTarget(skyHitTarget(hit));
    },
    [skyHitTarget, selectTarget],
  );

  const onFollowSky = useCallback(
    (hit: SkyHit) => {
      setToggles((t) => (t.constellations ? t : { ...t, constellations: true }));
      pickTarget(skyHitTarget(hit));
    },
    [skyHitTarget, pickTarget],
  );

  /**
   * Choose your own place as the lock target, and follow it straight away.
   *
   * The Earth's spin comes back on with it. Following your own place only says
   * anything while the globe is actually turning — the camera riding round with
   * it is the whole picture — and against a frozen Earth the lock would look
   * like it had done nothing at all.
   */
  const followObserver = useCallback(() => {
    setLockObserver(true);
    setToggles((t) => ({ ...t, lockCenter: true, lockStars: false }));
    askFocus();
  }, [askFocus]);

  /* Pressing the marker again lets it go, the same way pressing the graha
     already selected clears that. */
  const toggleObserver = useCallback(() => {
    setLockObserver((on) => {
      if (on) setToggles((t) => ({ ...t, lockCenter: false }));
      else {
        setToggles((t) => ({ ...t, lockCenter: true, lockStars: false }));
        askFocus();
      }
      return !on;
    });
  }, [askFocus]);

  /** Follow a graha instead — which is the other half of the same choice. */
  const followGraha = useCallback(
    (key: GrahaKey) => {
      setLockObserver(false);
      setSelected(key);
      /* `lockStars` off, always. Following a graha means the camera rides it —
         it does not mean the sky stops. Left on, the local horizon and its
         Alt-Az grid freeze with the stars and the whole view reads as locked,
         which is not what a second press asked for. The other two ways in,
         followGraha and followObserver, have always cleared it here too. */
      setToggles((t) => ({ ...t, lockCenter: true, lockStars: false }));
      askFocus();
    },
    [setSelected, askFocus],
  );

  /* No target, nothing to centre on: the lock cannot stay on once its graha is
     deselected and your place is not standing in for it, or the camera
     silently stops following. An invariant over two pieces of state rather
     than one prop mirrored into another, so it's enforced here rather than
     at each place selectedKey/lockObserver can become falsy. */
  useEffect(() => {
    if (!selectedKey && !lockObserver) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToggles((t) => (t.lockCenter ? { ...t, lockCenter: false } : t));
    }
  }, [selectedKey, lockObserver]);

  /** What the lock is aimed at, named — or null when it is aimed at nothing. */
  const lockTargetName = lockObserver
    ? { ne: "तपाईंको स्थान", en: "your location" }
    : selectedKey
      ? GRAHA_NAME[selectedKey]
      : null;

  /* Fullscreen takes the viewport, so the page behind it must not scroll — not
     only when the browser's own presentation is doing the covering, but on
     iPad too, where {@link isAppleTouch} skips that API and the fixed layer
     below is the whole of fullscreen: a drag the sky declines there — one that
     starts on a control, or a rubber-band at the end of a turn — would
     otherwise reach the document and slide the app around behind the sky.
     Escape has to get out either way, which is the one affordance a fixed
     overlay owes a keyboard. One lock for both cases, or two independent locks
     racing to restore the same global leave it stuck on whichever wrote last —
     which is exactly what left scrolling dead after fullscreen until a reload,
     the one time this existed twice. */
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  /** The fixed layer the sky moves into — and what the browser is handed. */
  const overlayRef = useRef<HTMLDivElement | null>(null);

  /*
   * Ask the browser for the screen, not just the viewport.
   *
   * A fixed layer only ever covers the page: the address bar, the tab strip and
   * the OS status bar all stay, which is exactly the "not really fullscreen"
   * this is here to fix — and on a phone the URL bar keeps a slice of the sky
   * for itself. The Fullscreen API takes the lot.
   *
   * The fixed layer stays underneath as the fallback rather than being replaced
   * by it: iOS Safari has the API on <video> alone and refuses this outright,
   * and a request can also be denied by permissions policy. Either way the
   * overlay is already on screen and nothing is lost.
   *
   * On iPad the API is *not* refused, and that was the bug. iPadOS 15 gained
   * element fullscreen, so the request succeeded there and the browser took
   * over the presentation — along with its own way out of it, which on iPad is
   * a downward swipe. A one-finger drag to look at the ground was therefore
   * read by Safari as "leave fullscreen", `fullscreenchange` fired, and the
   * handler below pulled the overlay down with it. The sky never got the
   * gesture. iPhone was fine only because the request failed there and the
   * fixed layer was doing all the work already.
   *
   * So on Apple touch devices it is the fixed layer and nothing else: no
   * browser presentation to swipe out of, and the only way back is the button.
   * Everywhere else the native call still runs, where it buys a hidden URL bar
   * and has no gesture attached to it.
   */
  useEffect(() => {
    const el = overlayRef.current;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const active = () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    if (!fullscreen) {
      if (active()) (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      return;
    }
    if (!el) return;
    /* iPad drags the sky out of fullscreen, so it never goes in. See
       {@link isAppleTouch}: the fixed layer is the whole of fullscreen there. */
    if (isAppleTouch()) return;

    const target = el as HTMLDivElement & { webkitRequestFullscreen?: () => void };
    /* navigationUI: "hide" is a hint; browsers that do not know it ignore the
       dictionary rather than the call. */
    void Promise.resolve(
      target.requestFullscreen
        ? target.requestFullscreen({ navigationUI: "hide" })
        : target.webkitRequestFullscreen?.(),
    ).catch(() => {
      /* Denied — the fixed layer under this is the whole fallback. */
    });

    /* Browsers offer their own way out (Escape, the F11 key, a swipe on the
       notch). Leaving that way has to bring the overlay down with it, or the
       page is left in a fullscreen layout that is no longer fullscreen. */
    const onChange = () => {
      if (!active()) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [fullscreen]);

  /* Memoised so `simStamp` below does not see a fresh Date on every render —
     the HUD reformats five times a second as it is. */
  const simDate = useMemo(
    () => (sample ? new Date(sample.timeMs) : date),
    [sample, date],
  );
  /* The Sun the scene has already computed — the calendar past the table's end. */
  const sunLongitude = sample?.sky.sun.longitude;
  const sunSpeed = sample?.sky.sun.speedDegPerDay;
  const sunRashi = sunLongitude == null ? null : rashiOfLongitude(sunLongitude);
  const sunMonthName =
    sunRashi == null
      ? ""
      : lang === "en"
        ? BS_MONTH_NAMES[sunRashi - 1]
        : BS_MONTHS_NE[sunRashi - 1];
  const sunRashiName = sunRashi == null ? "" : formatRashiByNumber(sunRashi, lang);

  const elongation =
    sample?.sky.sun && sample.sky.moon
      ? normalizeDeg(sample.sky.moon.longitude - sample.sky.sun.longitude)
      : null;
  /** ±15° of conjunction / opposition — the Moon is visually between the Sun
      and Earth, or Earth sits between them. */
  const syzygy: "amavasya" | "purnima" | null =
    elongation == null
      ? null
      : elongation <= 15 || elongation >= 345
        ? "amavasya"
        : Math.abs(elongation - 180) <= 15
          ? "purnima"
          : null;
  const eclipse = sample?.eclipse ?? null;
  const skyEvent: "amavasya" | "purnima" | "solar" | "lunar" | null = eclipse
    ? eclipse.kind
    : syzygy;

  useEffect(() => {
    if (sunRashi == null) return;
    if (lastRashi.current !== null && lastRashi.current !== sunRashi) setFlash(sunRashi);
    lastRashi.current = sunRashi;
  }, [sunRashi]);
  useEffect(() => {
    if (flash === null) return;
    const id = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(id);
  }, [flash]);
  useEffect(() => {
    if (skyEvent && lastSyzygy.current !== skyEvent) setPhaseFlash(skyEvent);
    lastSyzygy.current = skyEvent;
  }, [skyEvent]);
  useEffect(() => {
    if (phaseFlash === null) return;
    const id = setTimeout(() => setPhaseFlash(null), 2400);
    return () => clearTimeout(id);
  }, [phaseFlash]);

  /* Names grow both ways: a little as the camera pulls back (the belt shrinks
     to a ring), and more as it pushes in (fixed 9px type on a 1° crop reads as
     dust). Close-up uses field of view so a tight क्षितिज crop and a tight
     globe crop scale the same way. */
  const modeBaseline =
    mode === "space" ? SYSTEM_DISTANCE : mode === "globe" ? GLOBE_VIEW : HORIZON_WIDE;
  const labelScale = (() => {
    if (!sample) return 1;
    const d = sample.zoomDistance;
    if (mode === "space") {
      if (d >= SYSTEM_DISTANCE) {
        return Math.min(LABEL_SCALE_MAX, Math.sqrt(d / SYSTEM_DISTANCE));
      }
      return Math.min(CLOSE_LABEL_SCALE_MAX, Math.sqrt(SYSTEM_DISTANCE / Math.max(d, 10)));
    }
    const homeFov = fovForZoom(mode, modeBaseline);
    const nowFov = fovForZoom(mode, d);
    if (nowFov >= homeFov - 0.05) {
      return Math.min(LABEL_SCALE_MAX, Math.sqrt(Math.max(1, d / modeBaseline)));
    }
    return Math.min(CLOSE_LABEL_SCALE_MAX, Math.sqrt(homeFov / Math.max(nowFov, 1)));
  })();
  /* Close enough for the belt to carry its detail — the same threshold the
     scene uses to decide whether to offer पाद anchors at all, so the figures
     and the quarter numbers arrive together rather than one zoom apart. */
  const labelDetail = (sample?.zoomDistance ?? Infinity) <= PADA_ZOOM;

  /**
   * The place's offset from UT, taken once at the date the page is on.
   *
   * The simulation runs tens of thousands of years either way, where asking a
   * timezone database what the offset "was" is meaningless — and Kathmandu has
   * never had DST anyway. One offset, applied throughout, is both the honest
   * answer and the only one that survives the trip.
   */
  const zoneOffsetMs = useMemo(() => {
    const zoned = getZonedTimeParts(date, timeZone);
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    let delta = zoned.hour * 60 + zoned.minute - utcMinutes;
    if (delta > 840) delta -= 1440;
    if (delta <= -720) delta += 1440;
    return delta * 60000;
  }, [date, timeZone]);

  const applyInstant = useCallback(
    (ms: number) => {
      sim.current.timeMs = ms;
      const local = new Date(ms + zoneOffsetMs);
      const y = local.getUTCFullYear();
      const mo = local.getUTCMonth() + 1;
      const d = local.getUTCDate();
      const hh = local.getUTCHours();
      const mm = local.getUTCMinutes();
      const ss = local.getUTCSeconds();
      const civil = new Date(0);
      civil.setFullYear(y, mo - 1, d);
      civil.setHours(12, 0, 0, 0);
      onDateChange?.(civil);
      onClockChange?.(
        `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
      );
    },
    [onDateChange, onClockChange, zoneOffsetMs],
  );

  /**
   * The clock reading, in the calendar the reader is using and on the wall of
   * the place they picked — not UTC, and not the device's own zone.
   *
   * Everything here is arithmetic on the instant. Formatting a far date and
   * parsing it back does not survive: `new Date("20143-08-06T12:00:00")` is an
   * Invalid Date, and Intl quietly drops the era, so 2829 BC came back as AD
   * 2830. Hence UTC getters on a shifted instant, and a weekday counted in
   * days from the epoch.
   */
  const simStamp = useMemo(() => {
    const local = new Date(simDate.getTime() + zoneOffsetMs);
    const y = local.getUTCFullYear();
    const mo = String(local.getUTCMonth() + 1).padStart(2, "0");
    const d = String(local.getUTCDate()).padStart(2, "0");
    const wall = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
      local.getUTCMinutes(),
    ).padStart(2, "0")}`;
    // 1 Jan 1970 was a Thursday, and 0 is Sunday.
    const dayIndex = Math.floor((simDate.getTime() + zoneOffsetMs) / 86400000);
    const weekday = (((dayIndex + 4) % 7) + 7) % 7;
    const place = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
    // Proleptic Gregorian throughout, as everywhere else in the app; year 0 is
    // 1 BC, so anything at or below it reads with the era spelled out.
    const adYear = y > 0 ? `${y}` : `${1 - y} BC`;

    /* Past बि.सं. २२०० the compiled table has nothing, so the Sun becomes the
       calendar it always was — see [[bikram-solar]]. Marked with ≈ so it never
       passes for the almanac. The civil day goes with it, so the table is asked
       about the place's day rather than the device's.

       Computed for both languages, not just नेपाली: the corner readout names
       the day in बिक्रम whichever language the page is in — an English reader
       of a Nepali almanac still wants "Asar 10", not the Gregorian date the HUD
       already carries. */
    const bs = bikramFromSun(simDate, sunLongitude ?? 0, sunSpeed, zoneMidnight(local));

    /* The corner readout: the day, and the clock as a clock is read — twelve
       hours and a half-of-day word, not the 24-hour stamp the HUD keeps. */
    const h24 = local.getUTCHours();
    const minute = String(local.getUTCMinutes()).padStart(2, "0");
    const h12 = h24 % 12 || 12;
    const half =
      lang === "en" ? (h24 < 12 ? "AM" : "PM") : h24 < 12 ? "पूर्वाह्न" : "अपराह्न";
    const short = {
      day: `${bsMonthLabel(bs.month, lang)} ${digits(bs.day)}`,
      clock: `${digits(h12)}:${digits(minute)} ${half}`,
    };

    if (lang === "en") {
      return { date: `${adYear}-${mo}-${d}`, time: `${wall} · ${place}`, short };
    }

    const adYearNe = y > 0 ? `${digits(y)} ई.` : `${digits(1 - y)} ई.पू.`;

    const mark = bs.approximate ? "≈" : "";
    return {
      short,
      date: `${mark}${digits(bs.year)} ${bsMonthLabel(bs.month, "ne")} ${digits(bs.day)}, ${
        WEEKDAYS_SHORT_NE[weekday]
      }बार`,
      // Out past the table the AD year rides along, so the reading can be
      // checked against a calendar the reader already knows.
      time: `${digits(wall)} · ${place}${bs.approximate ? ` · ${adYearNe}` : ""}`,
    };
  }, [simDate, zoneOffsetMs, timeZone, lang, digits, sunLongitude, sunSpeed]);

  const isDay = mode === "horizon" && (sample?.sunAltitude ?? -90) > -0.5;

  /* Fullscreen runs edge to edge; the HUD and the zoom column start below any
     notch the browser reports. */
  const overlayTop = fullscreen ? "calc(env(safe-area-inset-top, 0px) + 16px)" : "12px";
  /* The two bottom corners, clear of the home indicator in fullscreen. */
  const overlayBottom = fullscreen ? "calc(env(safe-area-inset-bottom, 0px) + 16px)" : "12px";
  /**
   * The HUD's own top, which in fullscreen is lower than everything else's.
   *
   * Safari on iPad puts its own exit-fullscreen ✕ in the top-left corner —
   * inside the page's fullscreen element, over whatever is there — and what was
   * there is the date, the time and the place. It fades after a few seconds,
   * which is a few seconds of the one line the reader is most likely to want.
   * So the HUD starts below it. There is no way to ask how big it is, so this
   * is the corner button's own size plus room to breathe, and it costs nothing
   * anywhere else: the sky behind it is sky.
   */
  const hudTop = fullscreen
    ? "calc(env(safe-area-inset-top, 0px) + 68px)"
    : "12px";

  /* ── controls ─────────────────────────────────────────────────────────── */

  /* The controls are built once and placed twice — a pinned row over the sky in
     fullscreen, a panel under it otherwise — so the two layouts can never drift
     apart in what they offer. */
  const transport = (
    <>
      <IconButton
        icon={<Rewind className="size-full" />}
        label={pick("एक पाइला पछाडि", "One step back")}
        active={playing && reverse}
        compact={fullscreen}
        onPress={() => stepTime("back")}
      />
      <IconButton
        icon={playing ? <Pause className="size-full" /> : <Play className="size-full" />}
        label={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
        active={playing}
        compact={fullscreen}
        onPress={togglePlay}
      />
      <IconButton
        icon={<FastForward className="size-full" />}
        label={pick("एक पाइला अगाडि", "One step forward")}
        active={playing && !reverse}
        compact={fullscreen}
        onPress={() => stepTime("forward")}
      />
      {/* मिति and मितिमा फर्कनुहोस् used to sit here too. The date is already
          chosen from the nav above the sky, and the reset now lives in the top
          corner with the other two view buttons — this row is left as the
          transport alone, which is what it will be reduced to. */}
    </>
  );

  const viewChips = (
    <>
      <Chip
        active={mode === "space"}
        label={pick("अन्तरिक्ष", "Space")}
        onPress={() => {
          setMode("space");
          view.current = { yaw: SYSTEM_YAW, pitch: SYSTEM_PITCH, distance: SYSTEM_DISTANCE };
        }}
      />
      <Chip
        active={mode === "horizon"}
        label={pick("क्षितिज", "Horizon")}
        onPress={() => {
          setMode("horizon");
          /* You are standing on your own place here, so following it is a lock
             on nothing — the globe view is the one where that marker moves. */
          setLockObserver(false);
          setToggles((t) => (t.lockCenter && !selectedKey ? { ...t, lockCenter: false } : t));
          view.current = { yaw: HORIZON_YAW, pitch: HORIZON_PITCH, distance: HORIZON_WIDE };
        }}
      />
      <Chip
        active={mode === "globe"}
        label={pick("पृथ्वी गोला", "Earth globe")}
        onPress={() => {
          setMode("globe");
          view.current = { yaw: GLOBE_YAW, pitch: GLOBE_PITCH, distance: GLOBE_VIEW };
        }}
      />
    </>
  );

  const body = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        fullscreen && "flex h-full min-h-0 flex-col rounded-none border-0",
      )}
      style={{ background: CANVAS_BG }}
    >
      <div
        ref={canvasWrapRef}
        className={cn(
          "relative min-h-0 w-full select-none overscroll-none",
          /* Space and horizon own both axes — pan-y was eating sideways drags
             on the trackpad (browser back-swipe) and leaving only an inverted
             vertical turn. Globe in the page still yields vertical swipes so
             you can scroll past the canvas. */
          (fullscreen || mode === "space") && "flex-1",
          fullscreen || mode === "space" || mode === "horizon" ? "touch-none" : "touch-pan-y",
        )}
        style={{
          height: fullscreen ? "100%" : height,
          backgroundColor: CANVAS_BG,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        {/* AR mode's backdrop: the real world, behind a transparently-cleared
            Canvas. A sibling underneath rather than inside it, so the GL
            surface layers directly on top of it. */}
        {showCamera ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <Canvas
          camera={{ position: [0, 40, 26], fov: SPACE_FOV, near: 0.1, far: SKY_FAR }}
          gl={{ antialias: true, alpha: true }}
          resize={{ debounce: 0, offsetSize: true }}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
          onCreated={({ camera, gl }) => {
            gl.setClearColor(CANVAS_BG);
            camera.lookAt(0, 0, 0);
            /* `style` on <Canvas> lands on the wrapper R3F renders, not on the
               <canvas> inside it, which was therefore still `touch-action:
               auto`. The wrapper's `none` does cover its descendants, but
               Safari has been uneven about honouring an ancestor's value, and
               this is the element the finger actually lands on. Set it where it
               cannot be argued with. */
            gl.domElement.style.touchAction = "none";
            glRef.current = gl;
          }}
        >
          <FitCanvas />
          <Suspense fallback={null}>
            <Scene
              sim={sim}
              view={view}
              mode={mode}
              observer={observer}
              calibration={calibration}
              ayanamsaShift={ayanamsaShift}
              vedicStars={catalogStars}
              selectedKey={selectedKey}
              skyAim={skyAim}
              aimedId={aimed?.id ?? null}
              lockObserver={lockObserver}
              focusNonce={focusNonce}
              toggles={toggles}
              onSelect={onSelect}
              onFollow={onFollow}
              onSelectStar={onSelectStar}
              onFollowStar={onFollowStar}
              onAimSky={onAimSky}
              onFollowSky={onFollowSky}
              onEmptyPress={onEmptyPress}
              onSelectObserver={toggleObserver}
              onSample={onSample}
              arBackground={showCamera}
              sensorDrive={gyroMode || arMode}
            />
          </Suspense>
        </Canvas>

        {texturesLoading ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: CANVAS_BG }}
          >
            <VedicPatroLoader />
          </div>
        ) : null}

        {/* Step-14 tile HUD — temporary, `?hipsdebug` only; see
            {@link HipsDebugHud}. */}
        <HipsDebugHud />

        {/* Step-17 credit for the HiPS Milky Way tiles, required by the
            DSS2 Color survey's ODbL licence — visible whenever the tile
            layer itself can be on screen (horizon mode, camera background
            off). Bottom-right, clear of the compass dial docked
            bottom-centre (see {@link CompassControl}). */}
        {mode === "horizon" && !showCamera ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-10 max-w-[70%] text-right text-[9px] leading-tight text-white/35">
            {HIPS_ATTRIBUTION}
          </div>
        ) : null}

        {/* Bottom-centre, over the canvas: drag it to turn the sky, tap it
            for the gyro, tap the lens it becomes for the camera. See
            {@link CompassControl}. */}
        <CompassControl
          heading={compassHeading}
          onHeadingChange={onCompassHeadingChange}
          gyroMode={gyroMode}
          cameraOn={arMode}
          onTap={onCompassTap}
          onManualDrag={stopSensorMode}
          visible={mode === "horizon"}
        />

        {/* "फोन माथि उठाउनुहोस्" — the window between asking for the gyro and
            it actually taking over. */}
        {gyroPrompt ? (
          <div
            data-sky-controls
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/40"
          >
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span
                aria-hidden
                style={{ width: 56, height: 56, color: "#f4c542" }}
                dangerouslySetInnerHTML={{ __html: compassNeedle }}
              />
              <p className="m-0 text-2xl font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                {pick("फोन माथि उठाउनुहोस्", "Point your device up")}
              </p>
            </div>
          </div>
        ) : null}

        {/* Labels ride over the canvas rather than in it — real Devanagari type,
            positioned from the scene's own projection of each anchor. */}
        {sample && toggles.labels ? (
          <SkyLabels
            labels={sample.labels}
            scale={labelScale}
            detail={labelDetail}
            flatBelts={mode === "space"}
            selectedId={aimed?.id}
            onAimLabel={(label) => {
              if (label.kind === "vedicstar" && label.index != null) {
                const star = catalogStars[label.index];
                if (star) onSelectStar(star, label.index);
                return;
              }
              if (
                (label.kind === "star" || label.kind === "asterism" || label.kind === "nebula") &&
                label.lon != null &&
                label.lat != null
              ) {
                onAimSky({
                  id: label.id,
                  ne: label.textNe ?? label.text ?? "",
                  en: label.text ?? label.textNe ?? "",
                  lon: label.lon,
                  lat: label.lat,
                });
              }
            }}
          />
        ) : null}

        {/* क्षितिज's field of view — named only while it is actually moving,
            same "flashes then fades" pattern as सङ्क्रान्ति above. Sits right
            over the compass dial, the one other control down here, rather
            than up with the HUD it has nothing to do with. */}
        {mode === "horizon" && fovBadge && sample ? (
          <div className="pointer-events-none absolute bottom-[88px] left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {pick("दृश्य क्षेत्र", "FOV")} {digits(Math.round(fovForZoom("horizon", sample.zoomDistance)))}°
          </div>
        ) : null}

        {/* HUD — the simulated instant, which drifts away from the nav once it runs. */}
        <div
          className="pointer-events-none absolute rounded-lg border border-white/15 bg-black/45 px-2.5 py-1.5 backdrop-blur"
          style={{ top: hudTop, left: "calc(env(safe-area-inset-left, 0px) + 12px)" }}
        >
          {sunRashi != null ? (
            <>
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                {pick("सूर्य राशि · महिना", "Sun's rashi · month")}
              </p>
              <p className="m-0 text-sm font-bold text-white">
                {sunRashiName} · {sunMonthName}
              </p>
            </>
          ) : null}
          {eclipse?.kind === "solar" ? (
            <p className="m-0 mt-1 text-[11px] font-bold text-amber-200">
              {pick(
                `सूर्यग्रहण · औंसी + ${eclipse.node === "rahu" ? "राहु" : "केतु"}`,
                `Solar eclipse · new moon + ${eclipse.node === "rahu" ? "Rāhu" : "Ketu"}`,
              )}
            </p>
          ) : eclipse?.kind === "lunar" ? (
            <p className="m-0 mt-1 text-[11px] font-bold text-rose-200">
              {pick(
                `चन्द्रग्रहण · पूर्णिमा + ${eclipse.node === "rahu" ? "राहु" : "केतु"}`,
                `Lunar eclipse · full moon + ${eclipse.node === "rahu" ? "Rāhu" : "Ketu"}`,
              )}
            </p>
          ) : syzygy === "amavasya" ? (
            <p className="m-0 mt-1 text-[11px] font-bold text-slate-200">
              {pick("औंसी · चन्द्र सूर्य र पृथ्वीको बीचमा", "Amavasya · Moon between Sun and Earth")}
            </p>
          ) : syzygy === "purnima" ? (
            <p className="m-0 mt-1 text-[11px] font-bold text-amber-100">
              {pick("पूर्णिमा · पृथ्वी सूर्य र चन्द्रको बीचमा", "Purnima · Earth between Sun and Moon")}
            </p>
          ) : null}
          <p className="m-0 mt-1 text-[11px] font-bold" style={{ color: LABEL_COLOR.hud }}>
            {simStamp.date}
          </p>
          <p className="m-0 text-[10px]" style={{ color: LABEL_COLOR.hudDim }}>
            {simStamp.time}
          </p>
          <p className="m-0 text-[10px]" style={{ color: LABEL_COLOR.hudDim }}>
            {mode === "horizon"
              ? `${pick("क्षितिज", "Horizon")} · ${digits(observer.lat.toFixed(2))}°, ${digits(
                  observer.lon.toFixed(2),
                )}° · ${isDay ? pick("दिन", "day") : pick("रात", "night")}`
              : mode === "globe"
                ? pick("पृथ्वी गोला · क्रान्तिवृत्त वलय", "Earth globe · ecliptic ring")
                : pick("अन्तरिक्षबाट", "From space")}
          </p>
          {/* The rate, since the speed buttons no longer carry a caption. */}
          <p className="m-0 text-[10px]" style={{ color: LABEL_COLOR.hudDim }}>
            {playing
              ? `${reverse ? "◀◀" : "▶▶"} ${pick(speed.ne, speed.en)}`
              : pick("⏸ रोकिएको", "⏸ paused")}
          </p>
        </div>

        {phaseFlash !== null ? (
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border px-4 py-1.5 text-sm font-bold backdrop-blur",
              phaseFlash === "solar"
                ? "border-amber-300/70 bg-amber-500/25 text-amber-50"
                : phaseFlash === "lunar"
                  ? "border-rose-400/70 bg-rose-900/40 text-rose-100"
                  : phaseFlash === "purnima"
                    ? "border-amber-200/60 bg-amber-100/15 text-amber-50"
                    : "border-slate-400/60 bg-slate-500/20 text-slate-100",
            )}
          >
            {phaseFlash === "solar"
              ? pick("सूर्यग्रहण · चन्द्र सूर्यलाई ढाक्छ", "Solar eclipse · Moon covers the Sun")
              : phaseFlash === "lunar"
                ? pick("चन्द्रग्रहण · पृथ्वीको छाया चन्द्रमा", "Lunar eclipse · Earth's shadow on the Moon")
                : phaseFlash === "amavasya"
                  ? pick("औंसी · चन्द्र सूर्य–पृथ्वीको बीचमा", "Amavasya · Moon between Sun and Earth")
                  : pick("पूर्णिमा · पृथ्वी सूर्य–चन्द्रको बीचमा", "Purnima · Earth between Sun and Moon")}
          </div>
        ) : flash !== null ? (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-100 backdrop-blur">
            {pick("सङ्क्रान्ति", "Sankranti")} · {formatRashiByNumber(flash, lang)} ·{" "}
            {lang === "en" ? BS_MONTH_NAMES[flash - 1] : BS_MONTHS_NE[flash - 1]} {digits(1)}
          </div>
        ) : null}

        <div className="absolute right-3 flex gap-2" style={{ top: overlayTop }}>
          <IconButton
            icon={<Search size={16} />}
            label={pick("आकाशमा खोज्नुहोस्", "Search the sky")}
            active={searchOpen}
            onPress={() => {
              setSearchOpen((v) => !v);
              setFocusOpen(false);
              setDrawerOpen(false);
            }}
          />
          <IconButton
            icon={<RotateCcw size={16} />}
            label={pick("मितिमा फर्कनुहोस्", "Back to the chosen date")}
            active={false}
            onPress={() => {
              /* The nav above starts on today, so with no date chosen this is
                 simply "back to now". */
              sim.current.timeMs = date.getTime();
            }}
          />
          <IconButton
            icon={<Focus size={16} />}
            label={pick("केन्द्रविन्दु", "Focus")}
            active={focusOpen}
            onPress={() => {
              setFocusOpen((v) => !v);
              setDrawerOpen(false);
            }}
          />
          <IconButton
            icon={fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            label={
              fullscreen
                ? pick("सामान्य दृश्य", "Exit fullscreen")
                : pick("पूर्ण स्क्रिन", "Fullscreen")
            }
            active={fullscreen}
            onPress={() => setFullscreen((f) => !f)}
          />
        </div>

        {/* The view panel, in the corner of the sky itself rather than up in
            the chrome: what it switches is all *in* the picture, and the two
            corners below the canvas are the two hands holding the phone. */}
        <div
          className="absolute left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2"
          style={{ bottom: overlayBottom }}
        >
          {drawerOpen ? (
          <div
            data-sky-controls
            className="flex max-h-[calc(100%-1rem)] w-[min(300px,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-black/85 p-3.5 backdrop-blur"
          >
            {/* The four the sky is mostly read through, as tiles rather than
                chips — big enough to hit with a thumb, and each one a picture
                of what it turns on. */}
            <div className={mode === "horizon" ? "grid grid-cols-4 gap-1" : "grid grid-cols-3 gap-1"}>
              <ViewTile
                icon={<Grid3x3 className="size-full" />}
                label={pick("ग्रिड", "Grids")}
                active={toggles.grid}
                onPress={() => setToggles((t) => ({ ...t, grid: !t.grid }))}
              />
              <ViewTile
                icon={<Sparkles className="size-full" />}
                label={pick("तारापुञ्ज", "Figures")}
                active={toggles.constellations}
                onPress={() => setToggles((t) => ({ ...t, constellations: !t.constellations }))}
              />
              {/* Only क्षितिज stands on ground; the other two look at the Earth
                  from outside it, where there is no landscape to switch. A
                  control that can never do anything in this view is not a
                  control, so it is dropped rather than shown greyed. In
                  क्षितिज it is the single switch for the hillside — there is no
                  second chip that has to agree with it. */}
              {mode === "horizon" ? (
                <ViewTile
                  icon={<Mountain className="size-full" />}
                  label={pick("भूभाग", "Landscape")}
                  active={toggles.landscape}
                  onPress={() => setToggles((t) => ({ ...t, landscape: !t.landscape }))}
                />
              ) : null}
              <ViewTile
                icon={<CaseSensitive className="size-full" />}
                label={pick("नाम", "Labels")}
                active={toggles.labels}
                onPress={() => setToggles((t) => ({ ...t, labels: !t.labels }))}
              />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
              {pick("मार्गदर्शक", "Guides")}
            </span>
            {/* ग्रिड is a tile above; the rest are the finer guides, which
                stay as chips because they are read before they are pressed. */}
            <div className="flex flex-wrap gap-1.5">
              {/* Only पृथ्वी गोला, where the Earth turning under the zodiac is
                  the thing on screen and holding it still is how you read the
                  ring against it. अन्तरिक्ष is already in the stars' own
                  frame, and in क्षितिज a frozen sky is just a stopped clock. */}
              {mode === "globe" ? (
                <Chip
                  active={toggles.lockStars}
                  label={pick("तारा स्थिर", "Lock to stars")}
                  onPress={() => setToggles((t) => ({ ...t, lockStars: !t.lockStars }))}
                />
              ) : null}
              {/* The observer's meridian is a line drawn on a globe you are
                  looking *at* — in अन्तरिक्ष and पृथ्वी गोला. Standing on the
                  dome you are on that line, so there is nothing to draw and
                  the scene never drew one; the chip was a switch wired to
                  nothing. Named after wherever the page is set to, not after
                  Kathmandu. */}
              {mode === "horizon" ? null : (
                <Chip
                  active={toggles.primeMeridian}
                  label={pick(`${placeName} रेखा`, `${placeName} meridian`)}
                  onPress={() => setToggles((t) => ({ ...t, primeMeridian: !t.primeMeridian }))}
                />
              )}
              {mode !== "space" ? (
                <Chip
                  active={toggles.vedicStars}
                  label={pick("वैदिक तारा", "Vedic stars")}
                  onPress={() => setToggles((t) => ({ ...t, vedicStars: !t.vedicStars }))}
                />
              ) : null}
              {mode === "globe" ? (
                <Chip
                  active={toggles.tilt}
                  label={pick("अक्ष झुकाव", "Tilt")}
                  onPress={() => setToggles((t) => ({ ...t, tilt: !t.tilt }))}
                />
              ) : null}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
              {pick("वलय", "Belts")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={toggles.rashiBelt}
                label={pick("राशि", "Rashi")}
                onPress={() => setToggles((t) => ({ ...t, rashiBelt: !t.rashiBelt }))}
              />
              <Chip
                active={toggles.nakshatraBelt}
                label={pick("नक्षत्र", "Nakshatra")}
                onPress={() => setToggles((t) => ({ ...t, nakshatraBelt: !t.nakshatraBelt }))}
              />
              {/* The बिक्रम month ring belongs to अन्तरिक्ष, where the wheel is
                  the subject. On the dome it is a fourth band stacked on the
                  राशि and नक्षत्र strips over a sky already carrying stars and a
                  cage; on the globe it drew nothing at all — the ring lives in
                  the space-only wheel — so the chip there was a switch wired to
                  nothing. */}
              {mode !== "space" ? null : (
                <Chip
                  active={toggles.monthRing}
                  label={pick("महिना", "Months")}
                  onPress={() => setToggles((t) => ({ ...t, monthRing: !t.monthRing }))}
                />
              )}
            </div>
          </div>
          ) : null}
          <IconButton
            icon={<SlidersHorizontal size={16} />}
            label={pick("दृश्य नियन्त्रण", "View controls")}
            active={drawerOpen}
            onPress={() => {
              setDrawerOpen((v) => !v);
              setFocusOpen(false);
            }}
          />
        </div>

        {/* The instant the sky is actually showing, named in बिक्रम — and the
            way into changing it. The nav above the canvas cannot be reached in
            fullscreen, and once the clock is running it is showing the day you
            arrived on rather than the one on screen. */}
        <button
          type="button"
          data-sky-controls
          onClick={() => setDatePickerOpen(true)}
          className="absolute right-3 z-10 flex flex-col items-end rounded-xl border border-white/15 bg-black/60 px-2.5 py-1.5 text-right leading-tight backdrop-blur transition-colors hover:border-white/40"
          style={{ bottom: overlayBottom }}
        >
          <span className="text-sm font-bold text-white">{simStamp.short.day}</span>
          <span className="text-[11px] font-semibold text-white/70">{simStamp.short.clock}</span>
        </button>

        {searchOpen ? (
          <div
            className="absolute right-3 z-20"
            style={{ top: `calc(${overlayTop} + 2.75rem)` }}
          >
            <SkySearch
              extra={namedStars}
              favourites={favourites}
              recentIds={recentIds}
              onPick={pickTarget}
              onToggleFavourite={toggleFavourite}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        ) : null}

        {/* The reticle: what the camera has been *centred* on — a follow or a
            search pick, never a bare select — is marked here. Nailed to the
            middle of the screen used to be the whole implementation, which is
            only ever true for the one frame right after the pick lands the
            camera on it; drag the view at all afterwards (नक्षत्र/नेबुला
            picks hold the camera for a single frame, not continuously — see
            the doc comment on `skyAim` handling in `AakashGocharScene`) and
            the mark stayed dead centre while the thing it was marking slid
            out from under it. Reading its live screen position off the same
            `sample.labels` the sky's own names come from — matched by the
            same id `SkySearch`/`sky-catalogue.ts` hand out — keeps it glued
            to the actual object instead. Nothing carries a live label until
            it clears its own reveal threshold (a graha has none; an ordinary
            नक्षत्र star only picks one up once bright enough; a नेबुला once
            the photograph itself is showing), so those fall back to the old
            centred mark, which is still correct for the one frame it takes
            the camera to get there. */}
        {aimed && aimedCentered ? (() => {
          const live = sample?.labels.find((l) => l.id === aimed.id);
          const style = live
            ? { left: live.x, top: live.y, transform: "translate(-50%, -50%)" }
            : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
          return (
            <div className="pointer-events-none absolute z-10" style={style}>
              <div className="relative grid place-items-center">
                <svg viewBox="0 0 48 48" className="size-12 text-amber-300/80" aria-hidden>
                  <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="24" y1="2" x2="24" y2="13" />
                    <line x1="24" y1="35" x2="24" y2="46" />
                    <line x1="2" y1="24" x2="13" y2="24" />
                    <line x1="35" y1="24" x2="46" y2="24" />
                  </g>
                </svg>
                {live ? null : (
                  <span className="absolute top-[calc(50%+1.9rem)] whitespace-nowrap rounded-full border border-amber-300/40 bg-black/70 px-2 py-0.5 text-[11px] font-bold text-amber-100 backdrop-blur">
                    {lang === "en" ? aimed.en : aimed.ne}
                  </span>
                )}
              </div>
            </div>
          );
        })() : null}

        {focusOpen ? (
          <div
            data-sky-controls
            className="absolute right-3 z-10 flex w-[min(230px,calc(100%-1.5rem))] flex-col gap-2.5 rounded-xl border border-white/15 bg-black/85 p-3.5 backdrop-blur"
            style={{ top: `calc(${overlayTop} + 2.75rem)` }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
              {pick("केन्द्रविन्दु", "Focus")}
            </span>
            <div className="flex flex-col gap-1">
              {(
                [
                  ["sun", pick("सूर्य", "Sun")],
                  ["earth", pick("पृथ्वी", "Earth")],
                  ["moon", pick("चन्द्र", "Moon")],
                  ["mercury", pick("बुध", "Mercury")],
                  ["venus", pick("शुक्र", "Venus")],
                  ["jupiter", pick("बृहस्पति", "Jupiter")],
                  ["saturn", pick("शनि", "Saturn")],
                  ["mars", pick("मंगल", "Mars")],
                  ["rahu", pick("राहु", "Rahu")],
                  ["ketu", pick("केतु", "Ketu")],
                ] as const
              ).map(([key, label]) => {
                const checked = key === "earth" ? !selectedKey : selectedKey === key;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
                  >
                    <input
                      type="radio"
                      name="gochar-focus"
                      className="size-3.5 accent-white"
                      checked={checked}
                      onChange={() => {
                        if (key === "earth") {
                          setLockObserver(false);
                          setSelected(null);
                          setToggles((t) => ({ ...t, lockCenter: false }));
                          return;
                        }
                        followGraha(key);
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <label className="flex cursor-pointer items-center gap-2 border-t border-white/10 pt-2.5 text-xs font-semibold text-white/70 hover:text-white">
              <input
                type="checkbox"
                className="size-3.5 accent-white"
                checked={toggles.lockCenter && !!selectedKey}
                disabled={!selectedKey}
                onChange={() => {
                  /* Read outside the updater: React may run an updater more
                     than once, and a nonce bumped in there would fire twice
                     for one press. */
                  if (!toggles.lockCenter) askFocus();
                  setToggles((t) => ({ ...t, lockCenter: !t.lockCenter }));
                }}
              />
              {pick("ग्रह पछ्याउनुहोस्", "Follow graha")}
            </label>
          </div>
        ) : null}
      </div>

      {/* Dark glass under the canvas, matching the Learn playground: the chips
          and transport sit on the sky's own black rather than a light card. */}
      <div
        data-sky-controls
        className={cn(
          "flex flex-col gap-3 border-t border-white/10 bg-black/30 px-3.5 py-3 text-white",
          fullscreen &&
            "shrink-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          fullscreen && (controlsOpen ? "max-h-[46vh]" : "max-h-none"),
        )}
      >
        {fullscreen && !controlsOpen ? (
          <div className="flex items-center gap-1.5">
            <IconButton
              icon={playing ? <Pause className="size-full" /> : <Play className="size-full" />}
              label={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
              active={playing}
              compact
              onPress={togglePlay}
            />
            <div className="flex-1" />
            <IconButton
              icon={<ChevronUp className="size-full" />}
              label={pick("नियन्त्रण देखाउनुहोस्", "Show controls")}
              active={false}
              compact
              onPress={() => setControlsOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {viewChips}
              {fullscreen ? (
                <>
                  <div className="flex-1" />
                  <IconButton
                    icon={<ChevronDown className="size-full" />}
                    label={pick("नियन्त्रण लुकाउनुहोस्", "Hide controls")}
                    active={false}
                    compact
                    onPress={() => setControlsOpen(false)}
                  />
                </>
              ) : null}
            </div>
            {/* The step buttons ask a lot of a touch screen — a phone or
                tablet already has the same play/pause/rate control one tap
                away in the time sheet (मिति बटन → SkyTimeSheet). On a
                pointer-driven screen there is room to keep it right here, so
                only xl+ gets this row (lg still matches an iPad in
                landscape), now paired with the same bipolar rate slider so a
                drag reaches every rung from १ से/से to १०० वर्ष/से without
                opening the sheet. */}
            <div className="hidden items-center gap-2.5 xl:flex">
              {transport}
              <input
                type="range"
                min={-RATE_NOTCHES}
                max={RATE_NOTCHES}
                step={1}
                value={Math.round(rateToSlider(timeRate))}
                aria-label={pick("गति", "Speed")}
                className="sky-time-slider sky-time-slider--thin min-w-0 flex-1"
                onChange={(e) => applyTimeRate(sliderToRate(Number(e.target.value)))}
              />
            </div>
          </>
        )}
      </div>

      {/* What the camera should ride — a graha, or the ground you are standing
          on. Picking one turns the lock on in the same press: choosing here is
          only ever asked for because you want to follow it. */}
      {grahaPickerOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <button
            type="button"
            aria-label={pick("बन्द गर्नुहोस्", "Close")}
            className="absolute inset-0 cursor-default"
            onClick={() => setGrahaPickerOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4">
            <p className="m-0 mb-3 text-sm font-bold text-foreground">
              {pick("के पछ्याउने?", "What should the camera follow?")}
            </p>
            {/* Your own place, first: it is the one target that is not up in
                the sky, and the one that holds the ground still while the
                zodiac turns overhead. */}
            <button
              type="button"
              onClick={() => {
                followObserver();
                setGrahaPickerOpen(false);
              }}
              className={cn(
                "mb-2 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors",
                lockObserver
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <MapPin className="size-3.5 shrink-0" style={{ color: LABEL_COLOR.observer }} />
              <span className="truncate">{pick("तपाईंको स्थान", "Your location")}</span>
            </button>
            <div className="grid grid-cols-3 gap-2">
              {GEO_BODY_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    followGraha(key);
                    setGrahaPickerOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                    !lockObserver && selectedKey === key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: GRAHA_COLOR[key] }}
                  />
                  <span className="truncate">
                    {pick(GRAHA_NAME[key].ne, GRAHA_NAME[key].en)}
                  </span>
                </button>
              ))}
            </div>
            {lockTargetName ? (
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setLockObserver(false);
                  setSelected(null);
                  setGrahaPickerOpen(false);
                }}
              >
                {pick("पछ्याउन छोड्नुहोस्", "Stop following")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* In-tree, not portalled: this has to paint inside the fullscreen layer. */}
      {datePickerOpen ? (
        <SkyTimeSheet
          timeMs={sample?.timeMs ?? date.getTime()}
          zoneOffsetMs={zoneOffsetMs}
          timeRate={timeRate}
          onClose={() => setDatePickerOpen(false)}
          onApplyMs={applyInstant}
          onTimeRate={applyTimeRate}
          onTogglePlay={togglePlay}
          onResetRate={() => {
            setStepIndex(DEFAULT_STEP_INDEX);
            setReverse(false);
            setPlaying(true);
          }}
        />
      ) : null}
    </div>
  );

  if (!fullscreen) return body;

  /*
   * Portalled to <body>, same as the Learn playground.
   *
   * `position: fixed` inside the page is trapped by PageShell's
   * `overflow-x-hidden` (which computes as a scroll container). The overlay
   * then sizes against that column, the canvas often measures 0×0 on the
   * first paint, and the ecliptic around Earth never enters the frame.
   * A portal escapes that box. Theme tokens live on `:root` / `.dark`, so
   * they still apply on <body>.
   *
   * The overlay is a flex column so the canvas wrap's `flex-1` / `h-full`
   * actually receive a height — without that, R3F keeps the in-page buffer.
   */
  return (
    <>
      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {pick("पूर्ण स्क्रिनमा खुलेको छ — बन्द गर्न Esc थिच्नुहोस्", "Open in fullscreen — press Esc to close")}
      </div>
      {createPortal(
        <div
          ref={overlayRef}
          /* `overscroll-none` so a drag that runs past the sky has nothing to
             rubber-band into — on iPad that pull is read as leaving fullscreen. */
          className="fixed inset-0 z-[100] flex h-[100dvh] min-h-0 w-full flex-col overscroll-none"
          style={{ background: CANVAS_BG }}
        >
          {body}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * The year a star takes its turn as pole star, in the reader's era. Nepali gets
 * बिक्रम सम्वत्, which is where every other year in the app is quoted.
 */
function formatPoleYear(
  year: number | undefined,
  lang: string,
  digits: (v: string | number) => string,
): string {
  if (year == null) return "";
  if (lang === "en") {
    return year < 0
      ? `${Math.abs(year).toLocaleString("en-US")} BC`
      : `AD ${year.toLocaleString("en-US")}`;
  }
  const bs = year + 57;
  const abs = digits(Math.abs(bs).toLocaleString("en-US"));
  return bs < 0 ? `${abs} बि.सं. पूर्व` : `${abs} बि.सं.`;
}

/** Absolutely placed, centred on the anchor, and never wrapping. */
/**
 * A grid degree, hung *inside* the border it belongs to.
 *
 * These are not anchored on a point in the sky like every other label — they
 * sit where a line crosses the edge of the frame, so centring the text on that
 * crossing would push half of it off the canvas. Each border pulls its numbers
 * inwards instead, and the ones riding the skyline are centred just above it
 * so they do not sit on the horizon line itself.
 */
function gridDegreeBox(
  x: number,
  y: number,
  side: ScreenLabel["side"],
): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  };
  if (side === "left") return { ...base, left: x + 3, top: y - 6 };
  if (side === "right") return { ...base, left: x - 3, top: y - 6, transform: "translateX(-100%)" };
  if (side === "top") return { ...base, left: x, top: y, transform: "translateX(-50%)" };
  if (side === "bottom") return { ...base, left: x, top: y - 12, transform: "translateX(-50%)" };
  // The meridian's own scale: set beside the line rather than across it.
  if (side === "meridian") return { ...base, left: x + 4, top: y - 6, opacity: 0.8 };
  // The skyline: lifted clear of the horizon line it is measuring.
  return { ...base, left: x, top: y - 13, transform: "translateX(-50%)", opacity: 0.75 };
}

function labelBox(x: number, y: number, width: number, top: number): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    transform: `translate3d(${x - width / 2}px, ${y + top}px, 0)`,
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    willChange: "transform",
  };
}

/**
 * The text over the canvas. Memoised. Positions follow the star points on the
 * same camera move; the HUD clock still samples on its own slower tick.
 */
const SkyLabels = memo(function SkyLabels({
  labels,
  scale = 1,
  detail = false,
  flatBelts = false,
  selectedId,
  onAimLabel,
}: {
  labels: ScreenLabel[];
  /** Grows the rashi/nakshatra belt text as the camera pulls back — a fixed
      pixel size reads fine close up but disappears against the wider view
      once the belt has shrunk to a small ring in the middle of the screen. */
  scale?: number;
  /** Close in: each नक्षत्र carries its figure over its name, and the पाद
      quarters are named. Further out both are clutter on a crowded ring. */
  detail?: boolean;
  /** Space-view wheel: Learn playground colours, and dim the inactive spans. */
  flatBelts?: boolean;
  selectedId?: string;
  onAimLabel?: (label: ScreenLabel) => void;
}) {
  const { lang, digits } = useLocale();
  const pick = (ne: string, en: string) => bilingualText(lang, ne, en);
  const rashiColor = LABEL_COLOR.rashi;
  const nakColor = flatBelts ? "#8fb6d8" : LABEL_COLOR.nakshatra;
  const monthColor = LABEL_COLOR.month;

  return (
    <div className="pointer-events-none absolute inset-0">
      {labels.map((label) => {
        /* Two independent fades that multiply: the space wheel greys the spans
           that are not the live one, and the horizon view greys whatever is
           under the ground. A नक्षत्र can be both at once. */
        const dim = (flatBelts && label.dim ? 0.4 : 1) * (label.below ? 0.75 : 1);
        if (label.kind === "rashi" && label.index) {
          const iconSize = 22 * scale;
          const boxWidth = 76 * scale;
          return (
            <div
              key={label.id}
              className="flex flex-col items-center"
              style={{
                position: "absolute",
                left: label.x - boxWidth / 2,
                top: label.y - 12 * scale,
                width: boxWidth,
                opacity: dim,
              }}
            >
              <RashiSkyGlyph index={label.index} size={iconSize} color={rashiColor} />
              <span
                className="max-w-full truncate font-bold"
                style={{ fontSize: beltFontSize(14, scale), color: rashiColor }}
              >
                {formatRashiByNumber(label.index, lang)}
              </span>
            </div>
          );
        }
        if (label.kind === "month" && label.index) {
          return (
            <span
              key={label.id}
              className="font-semibold"
              style={{
                ...labelBox(label.x, label.y, 72 * scale, -6 * scale),
                fontSize: beltFontSize(12, scale),
                color: monthColor,
                opacity: dim,
              }}
            >
              {lang === "en" ? BS_MONTH_NAMES[label.index - 1] : BS_MONTHS_NE[label.index - 1]}
            </span>
          );
        }
        if (label.kind === "nakshatra" && label.index) {
          const nak = NAKSHATRA_ICONS[label.index - 1];
          /* Space wheel matches the Learn playground: full names (उत्तरभाद्रपदा)
             overflow a 13°20′ span, so the belt uses NAKSHATRA_SHORT. Globe and
             horizon keep the unabbreviated name — the camera can push in. */
          const short = NAKSHATRA_SHORT[label.index - 1];
          const named = flatBelts ? short : nak;
          const boxWidth = (flatBelts ? 56 : 90) * scale;
          const name = named ? (lang === "en" ? named.en : named.ne) : "";
          /* Space wheel always carries the figure, like the Learn playground.
             Globe/horizon only add it close in — further out it is a smudge
             on a crowded ring, so the name goes alone. */
          if (!detail && !flatBelts) {
            return (
              <span
                key={label.id}
                style={{
                  ...labelBox(label.x, label.y, boxWidth, -6 * scale),
                  fontSize: beltFontSize(12, scale),
                  color: nakColor,
                  opacity: dim,
                }}
              >
                {name}
              </span>
            );
          }
          return (
            <div
              key={label.id}
              className="flex flex-col items-center"
              style={{
                position: "absolute",
                left: label.x - boxWidth / 2,
                top: label.y - 14 * scale,
                width: boxWidth,
                color: nakColor,
                opacity: dim,
              }}
            >
              <NakshatraFigure svg={nak?.svg} size={20 * scale} />
              <span
                className="max-w-full truncate"
                style={{ fontSize: beltFontSize(12, scale) }}
              >
                {name}
              </span>
            </div>
          );
        }
        if (label.kind === "pada" && label.index) {
          /* Just the quarter's number, 1 to 4.
             It used to carry its नक्षत्र's name too, which meant the same name
             printed four times in a row across a strip that already sits under
             that name on the belt — 108 of them, each wide enough to run into
             its neighbour. The ticks say where the quarters are; the number
             says which one you are looking at. */
          return (
            <span
              key={label.id}
              className="tabular-nums"
              style={{
                ...labelBox(label.x, label.y, 16 * scale, -5 * scale),
                fontSize: zoomFont(9, scale),
                color: LABEL_COLOR.pada,
              }}
            >
              {digits(label.index)}
            </span>
          );
        }
        if (label.kind === "asterism" && label.index) {
          /* The name of the star group itself, sitting on the stars. Short, so
             it does not smother the figure it belongs to. */
          const nak = NAKSHATRA_SHORT[label.index - 1];
          const selected = selectedId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              onClick={() =>
                onAimLabel?.({
                  ...label,
                  text: nak?.en,
                  textNe: nak?.ne,
                })
              }
              className="truncate font-bold"
              style={{
                ...labelBox(label.x, label.y, 72 * scale, 6 * scale),
                pointerEvents: "auto",
                cursor: "pointer",
                fontSize: zoomFont(10, scale),
                color: selected ? "#fff6c8" : LABEL_COLOR.asterism,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                opacity: selected ? 1 : 0.85 * dim,
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {nak ? (lang === "en" ? nak.en : nak.ne) : ""}
            </button>
          );
        }
        if (label.kind === "culture") {
          /* राशि figures and the mythological groups — same look as
             asterism, but the name comes straight off the label rather than
             a नक्षत्र-indexed table, since these are not नक्षत्र. */
          const selected = selectedId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onAimLabel?.(label)}
              className="truncate font-bold"
              style={{
                ...labelBox(label.x, label.y, 90 * scale, 6 * scale),
                pointerEvents: "auto",
                cursor: "pointer",
                fontSize: zoomFont(10, scale),
                color: selected ? "#fff6c8" : LABEL_COLOR.asterism,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                opacity: selected ? 1 : 0.85 * dim,
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {(lang === "en" ? label.text : label.textNe) ?? ""}
            </button>
          );
        }
        if (label.kind === "star") {
          const text = lang === "en" ? label.text : label.textNe;
          if (!text) return null;
          const selected = selectedId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onAimLabel?.(label)}
              className="truncate font-semibold"
              style={{
                ...labelBox(label.x, label.y, 130 * scale, label.clear ?? 8 * scale),
                pointerEvents: "auto",
                cursor: "pointer",
                fontSize: zoomFont(selected ? 11 : 9, scale),
                color: selected ? "#fff6c8" : LABEL_COLOR.asterism,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {text}
            </button>
          );
        }
        if (label.kind === "cardinal") {
          return (
            <span
              key={label.id}
              className="text-sm font-bold"
              style={{ ...labelBox(label.x, label.y, 28, -10), color: LABEL_COLOR.cardinal }}
            >
              {label.text}
            </span>
          );
        }
        if (label.kind === "station") {
          const st = SOLAR_STATIONS.find((x) => x.id === label.text);
          return (
            <span
              key={label.id}
              className="text-[10px] font-bold"
              style={{ ...labelBox(label.x, label.y, 120, -7), color: LABEL_COLOR.station }}
            >
              {st ? (lang === "en" ? st.en : st.ne) : ""}
            </span>
          );
        }
        if (label.kind === "axis") {
          return (
            <span
              key={label.id}
              className="text-[9px] font-bold"
              style={{ ...labelBox(label.x, label.y, 120, -16), color: LABEL_COLOR.axis }}
            >
              {label.text === "earth"
                ? pick("पृथ्वीको अक्ष", "Earth's axis")
                : pick("कक्षाको लम्ब", "Orbit's perpendicular")}
            </span>
          );
        }
        if (label.kind === "obliquity") {
          return (
            <span
              key={label.id}
              className="text-[11px] font-bold"
              style={{ ...labelBox(label.x, label.y, 90, -7), color: LABEL_COLOR.tilt }}
            >
              {`${digits((label.deg ?? 23.44).toFixed(2))}°`}
            </span>
          );
        }
        if (label.kind === "polestar") {
          const star = POLE_STARS.find((p) => p.en === label.text);
          if (!star) return null;
          // index 1 marks the star the pole is nearest right now.
          const reigning = label.index === 1;
          return (
            <div
              key={label.id}
              className="flex flex-col items-center"
              style={{
                position: "absolute",
                left: label.x - 55 * scale,
                top: label.y + 8 * scale,
                width: 110 * scale,
              }}
            >
              <span
                className={cn("max-w-full truncate", reigning ? "font-bold" : "")}
                style={{
                  fontSize: zoomFont(reigning ? 11 : 9, scale),
                  color: reigning ? LABEL_COLOR.station : LABEL_COLOR.poleStar,
                  textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                }}
              >
                {lang === "en" ? star.en.replace(/\s*\(.*\)$/, "") : star.ne}
              </span>
              <span
                className="max-w-full truncate text-[8px]"
                style={{ color: LABEL_COLOR.overlayDim }}
              >
                {formatPoleYear(label.year, lang, digits)}
              </span>
            </div>
          );
        }
        if (label.kind === "vedicstar") {
          const selected = selectedId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onAimLabel?.(label)}
              className="truncate font-semibold"
              style={{
                ...labelBox(label.x, label.y, 140 * scale, label.clear ?? 8 * scale),
                pointerEvents: "auto",
                cursor: "pointer",
                fontSize: zoomFont(selected ? 11 : 9, scale),
                color: selected ? "#fff6c8" : LABEL_COLOR.vedicStar,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {(lang === "en" ? label.text : label.textNe) ?? ""}
            </button>
          );
        }
        if (label.kind === "tropic") {
          return (
            <span
              key={label.id}
              className="text-[9px]"
              style={{ ...labelBox(label.x, label.y, 110, -7), color: LABEL_COLOR.tropic }}
            >
              {label.text === "cancer"
                ? pick("कर्कट रेखा · २३.४४°उ", "Tropic of Cancer · 23.44°N")
                : pick("मकर रेखा · २३.४४°द", "Tropic of Capricorn · 23.44°S")}
            </span>
          );
        }
        if (label.kind === "azimuth") {
          return (
            <span
              key={label.id}
              className="text-[9px] tabular-nums"
              style={{ ...gridDegreeBox(label.x, label.y, label.side), color: LABEL_COLOR.azimuth }}
            >
              {digits(label.text ?? "")}
            </span>
          );
        }
        if (label.kind === "outerplanet") {
          return (
            <span
              key={label.id}
              className="font-bold"
              style={{
                ...labelBox(label.x, label.y, 90 * scale, 10 * scale),
                fontSize: zoomFont(9, scale),
                color: label.color ?? "rgba(255,255,255,0.75)",
                opacity: 0.85 * dim,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
              }}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </span>
          );
        }
        if (label.kind === "nebula") {
          const selected = selectedId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onAimLabel?.(label)}
              className="truncate font-semibold"
              style={{
                ...labelBox(label.x, label.y, 150 * scale, label.clear ?? 8 * scale),
                pointerEvents: "auto",
                cursor: "pointer",
                fontSize: zoomFont(selected ? 11 : 9, scale),
                color: selected ? "#fff6c8" : LABEL_COLOR.nebula,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
                background: "transparent",
                border: 0,
                padding: 0,
              }}
            >
              {(lang === "en" ? label.text : label.textNe) ?? ""}
            </button>
          );
        }
        if (label.kind === "graha" && label.key) {
          return (
            <span
              key={label.id}
              className="font-bold"
              style={{
                ...labelBox(label.x, label.y, 90 * scale, 10 * scale),
                fontSize: zoomFont(10, scale),
                color: GRAHA_COLOR[label.key],
                opacity: dim,
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
              }}
            >
              {lang === "en" ? GRAHA_NAME[label.key].en : GRAHA_NAME[label.key].ne}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
});

/**
 * One switch in the view panel, drawn as a picture with its name under it.
 *
 * Square and thumb-sized, unlike {@link Chip}: these are the handful you reach
 * for while looking at the sky rather than while reading the panel, so they are
 * findable by shape without reading anything.
 */
function ViewTile({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onPress}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors",
        disabled
          ? "cursor-not-allowed text-white/25"
          : active
            ? "bg-white/15 text-white"
            : "text-white/45 hover:bg-white/10 hover:text-white/80",
      )}
    >
      <span className="size-6">{icon}</span>
      <span className="w-full truncate text-center text-[10px] font-semibold leading-none">
        {label}
      </span>
    </button>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "h-[28px] shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors",
        active
          ? "border-transparent bg-white/85 text-black"
          : "border-white/20 bg-transparent text-white/60 hover:border-white/45 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

/** A transport control: icon only, with the label carried by the accessible name. */
function IconButton({
  icon,
  label,
  active,
  compact,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  /** Tighter, for the single row that floats over a fullscreen sky. */
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      title={label}
      className={cn(
        "grid shrink-0 cursor-pointer place-items-center rounded-full border backdrop-blur transition-colors",
        compact ? "size-8" : "size-9",
        active
          ? "border-white/60 bg-white/85 text-black"
          : "border-white/20 bg-black/40 text-white/80 hover:border-white/50 hover:text-white",
      )}
    >
      <span className={cn("block", compact ? "size-3.5" : "size-4")}>{icon}</span>
    </button>
  );
}

export default AakashGocharSky;
