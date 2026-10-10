/**
 * 3D Aakash Gochar — the canvas, its gestures, the label overlay and the controls.
 *
 * The scene itself lives in {@link AakashGocharScene}; this component owns the
 * simulation clock, the camera, and everything the user can press. Both the
 * clock and the camera are held in refs so dragging or running the animation
 * never re-renders the tree — React only hears a sampled snapshot, five times a
 * second, which is also what positions the text labels over the canvas.
 */

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { GestureResponderEvent, PanResponderGestureState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons/Ionicons";
import { Canvas } from "@/components/sky3d/GeocentricSkyCanvas";
import { SheetSection } from "@/components/ui/OverlaySheet";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { Text } from "@/components/ui/Text";
import type { GocharGraha, VedicStarPosition } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import {
  adToBS,
  bsMonthLabel,
  bsToAD,
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  WEEKDAYS_SHORT_NE,
} from "@/lib/bs-calendar";
import { BsDateTimePicker } from "@/components/panchanga/BsDateTimePicker";
import { windowedBrowseYears } from "@/lib/patro-browse-years";
import { bikramFromSun } from "@/lib/sky3d/bikram-solar";
import { NAKSHATRA_SHORT } from "@/lib/sky3d/nakshatra-stars";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { formatRashiByNumber, getRashiList } from "@/lib/rashi-i18n";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { GRAHA_COLOR, normalizeDeg } from "@/lib/sky3d/geocentric-model";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { LIVE_GRAHA_KEYS, liveGrahaLabels } from "@/lib/sky3d/graha-label-live";
/* The one zoom→field-of-view mapping, shared with the scene. This file used to
   keep a hand-copy of it, which is exactly the kind of thing that drifts: the
   degrees the HUD prints have to be the degrees the camera is actually at. */
import { DEFAULT_STEP_INDEX, TIME_STEPS } from "@/lib/sky3d/time-steps";
import {
  dragScaleForZoom,
  fovForZoom,
  HORIZON_ZOOM_HOME,
  HORIZON_ZOOM_MAX,
  HORIZON_ZOOM_MIN,
} from "@/lib/sky3d/sky-zoom";
import { KATHMANDU, type Observer } from "@/lib/sky3d/horizon";
import {
  ayanamsa,
  calibrate,
  daysSinceJ2000,
  type SkyCalibration,
} from "@/lib/sky3d/orbital-model";
import { RASHI_ICONS } from "@/lib/sky3d/rashi-icons";
import { getZonedTimeParts } from "@/lib/zoned-time";
import { SOLAR_STATIONS } from "@/lib/sky3d/sky-geometry";
import { POLE_STARS } from "@/lib/sky3d/pole-stars";
import {
  SKY_BY_ID,
  SKY_KINDS,
  searchSky,
  skyTargetsOfKind,
  displayVedicStars,
  vedicStarTargets,
  type SkyTarget,
  type SkyTargetKind,
} from "@/lib/sky3d/sky-catalogue";
import {
  localFavourites,
  pushRecent,
  putFavourites,
  recents as readRecents,
  syncFavourites,
} from "@/lib/sky3d/sky-bookmarks";
import {
  AakashGocharScene,
  type SceneToggles,
  type ScreenLabel,
  type SimState,
  type SkyMode,
  type SkySample,
  type ViewState,
} from "@/components/sky3d/AakashGocharScene";
import CompassNeedle from "@/assets/compass.svg";
import { CompassControl, DIAL_SIZE } from "@/components/sky3d/CompassControl";
import { useDeviceOrientation } from "@/lib/sky3d/device-orientation";
import { CameraView, useCameraPermissions } from "expo-camera";

const Scene = memo(AakashGocharScene);

const CANVAS_BG = "#04090c";
/** Degrees → radians, for the compass heading / device pitch → camera yaw / pitch. */
const DEG_TO_RAD = Math.PI / 180;

/**
 * Overlay label colours, applied inline.
 *
 * These sit on the black canvas in both themes, so they must never inherit the
 * theme foreground — which the shared Text component otherwise applies over any
 * arbitrary `text-[#…]` class, turning them black in light mode.
 */
const LABEL_COLOR = {
  rashi: "#f4c542",
  nakshatra: "#6fe08a",
  cardinal: "#ff8a8a",
  azimuth: "#7ea9d8",
  station: "#ffd166",
  tilt: "#ffd166",
  axis: "#9fc4f0",
  poleStar: "#cfe0ff",
  pada: "#8fd6b0",
  asterism: "#e6efff",
  vedicStar: "#ffe08a",
  nebula: "#e39bff",
  tropic: "#e2d264",
  observer: "#ff6b6b",
  hud: "#ffffff",
  hudDim: "rgba(255,255,255,0.72)",
  overlayText: "rgba(236,242,244,0.88)",
  overlayDim: "rgba(236,242,244,0.62)",
} as const;

/**
 * The speed ladder, in simulated seconds per real second. Pressing a fast
 * button repeatedly climbs it; pause drops back to the first rung.
 */
/**
 * What the camera can be hung on, besides पृथ्वी.
 *
 * The seven the eye can see plus the Sun and Moon — the same nine a पञ्चाङ्ग
 * tables. राहु and केतु are left out on purpose: they are the crossings of the
 * Moon's plane, not places, so centring on one puts the camera on a point that
 * is only defined by two other things.
 */
/** The focus list, in the web's own order — पृथ्वी second, the two छाया ग्रह last. */
const FOCUS_TARGETS: { key: GrahaKey; ne: string; en: string }[] = [
  { key: "sun", ne: "सूर्य", en: "Sun" },
  { key: "moon", ne: "चन्द्र", en: "Moon" },
  { key: "mercury", ne: "बुध", en: "Mercury" },
  { key: "venus", ne: "शुक्र", en: "Venus" },
  { key: "jupiter", ne: "बृहस्पति", en: "Jupiter" },
  { key: "saturn", ne: "शनि", en: "Saturn" },
  { key: "mars", ne: "मंगल", en: "Mars" },
  { key: "rahu", ne: "राहु", en: "Rahu" },
  { key: "ketu", ne: "केतु", en: "Ketu" },
];

/**
 * Where the fast buttons pick the ladder up from a standstill: a minute a
 * second. {@link DEFAULT_STEP_INDEX} is real time, which is the right thing
 * for चलाउनु — the clock on the wall — but a fast-forward that lands on it
 * would be a fast-forward that does not speed anything up.
 */
const FIRST_FAST_STEP = 1;

/**
 * How far the back camera must be off the ground before the gyro takes the sky.
 *
 * `pitchDeg` is 0 with the phone held vertical (camera on the horizon) and +90
 * with it flat on its back (camera at the zenith), so this only rules out a
 * phone still lying screen-down with its camera at the floor. Deliberately
 * generous: the question is "has this been picked up", not "is it aimed
 * anywhere in particular" — क्षितिज has ground under it and looking down at it
 * is a thing people do.
 */
const UPRIGHT_MIN_PITCH_DEG = -20;

/** Camera distance that frames the whole system in the space view. */
const SYSTEM_DISTANCE = 26;
/**
 * Where क्षितिज opens — the same 90° framing the web opens at. It used to be
 * 45, which is ~119° and a noticeably wider first look than the web's.
 * Pinching still reaches both ends of the range: 1° in, 235° out.
 */
const HORIZON_WIDE = HORIZON_ZOOM_HOME;
/** Default zoom in the Earth-globe view — frames the globe and its ring. */
const GLOBE_VIEW = 78;

/** Where each view opens — what a drag is measured against, per {@link dragScaleForZoom}. */
const HOME_DISTANCE: Record<SkyMode, number> = {
  space: SYSTEM_DISTANCE,
  horizon: HORIZON_WIDE,
  globe: GLOBE_VIEW,
};

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
const RAD_TO_DEG = 180 / Math.PI;

/** Wide-zoom cap on the belt text's own growth — a little bigger as the ring
    shrinks, never enough to start overlapping its neighbours. */
const LABEL_SCALE_MAX = 1.3;
/** Close-zoom cap — much more room to grow once the belt has room to spare. */
const CLOSE_LABEL_SCALE_MAX = 2.8;
/** How much of the wide-zoom growth gets trimmed back off the top. */
const LABEL_WIDE_TRIM = 3;
/** Belt-label font size at `scale`, with the wide-zoom trim applied. */
const beltFontSize = (base: number, scale: number) =>
  base * scale - (LABEL_WIDE_TRIM * (scale - 1)) / (LABEL_SCALE_MAX - 1);
/** Close enough for the belt to carry its detail — a नक्षत्र's full name and
    its figure both arrive at the same pull-in, one zoom apart from nothing. */
const PADA_ZOOM = 14;
/** Camera angles the horizon view opens on — behind you, low to the ground. */
const HORIZON_YAW = Math.PI;
const HORIZON_PITCH = 0.12;

export type AakashGocharSkyProps = {
  /** Gochar rows for {@link date} — the API longitudes the model is pinned to. */
  gochar?: Record<string, GocharGraha>;
  /**
   * The named वैदिक तारा for {@link date} — server-computed sidereal positions,
   * plotted as-is. Optional: older cached responses predate the field, and the
   * search box degrades gracefully to just planets, nakshatra stars and
   * asterisms without it.
   */
  vedicStars?: VedicStarPosition[];
  /**
   * The server's Lahiri ayanamsa for {@link date}, degrees — where the sidereal
   * zero stands against the equinox. The scene pins its own fit to it.
   */
  ayanamsaDeg?: number;
  /** The date the gochar rows describe; the simulation starts here. */
  date: Date;
  /**
   * Lets the transport row's calendar button jump the page to a new date —
   * the only way to change dates once the sky is fullscreen, where the date
   * nav above the canvas is out of reach.
   */
  onDateChange?: (date: Date) => void;
  clock?: string;
  onClockChange?: (clock: string) => void;
  todayAd?: string;
  /** Where the sky is being watched from. Drives the whole horizon view. */
  observer?: Observer;
  /** The place's timezone — the clock in the HUD reads on its wall, not UTC. */
  timeZone?: string;
  height?: number;
};

export function AakashGocharSky({
  gochar,
  vedicStars,
  ayanamsaDeg,
  date,
  onDateChange,
  clock,
  onClockChange,
  todayAd,
  observer = KATHMANDU,
  timeZone = "Asia/Kathmandu",
  height = 460,
}: AakashGocharSkyProps) {
  const { lang, pick, digits } = useLocale();
  const { isDark } = useTheme();

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
  /* Opens on the globe, so these have to match the framing the पृथ्वी गोला chip
     sets — otherwise the first frame is the space camera on a globe scene. */
  const view = useRef<ViewState>({ yaw: 0.6, pitch: 0.42, distance: GLOBE_VIEW });
  /** Captured once at Canvas creation, so AR mode can clear to transparent
      instead of {@link CANVAS_BG} and let the camera behind it show through. */
  const glRef = useRef<{ setClearColor: (color: number | string, alpha?: number) => void } | null>(
    null,
  );

  /** The place the scene is standing at, for anything named after it. */
  const placeName = useMemo(
    () => timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone,
    [timeZone],
  );

  /* Opens on the space view, as on web. */
  const [mode, setMode] = useState<SkyMode>("space");
  const [playing, setPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_STEP_INDEX);
  const [reverse, setReverse] = useState(false);
  const [selectedKey, setSelectedKey] = useState<GrahaKey | null>(null);
  const [sample, setSample] = useState<SkySample | null>(null);
  /* `onSample` is handed to the scene and deliberately keeps a stable
     identity, so it reads the current view through a ref rather than closing
     over `mode`. (The web version can just list `mode` in its deps.) */
  const modeRef = useRef(mode);
  modeRef.current = mode;
  /* क्षितिज's own FOV readout — shown a moment after each real change in zoom,
     not left standing. */
  const [fovBadge, setFovBadge] = useState(false);
  const lastFov = useRef<number | null>(null);
  const fovHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(fovHideTimer.current), []);
  const [toggles, setToggles] = useState<SceneToggles>({
    rashiBelt: true,
    nakshatraBelt: true,
    monthRing: false,
    primeMeridian: true,
    grid: true,
    lockStars: true,
    lockCenter: false,
    constellations: true,
    tilt: true,
    labels: true,
    landscape: true,
    vedicStars: true,
  });
  /* Which overlay panel is open, if any. One at a time: both are anchored to
     the bottom of the canvas and would otherwise sit on top of each other. */
  const [sheet, setSheet] = useState<"layers" | "focus" | "search" | "time" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

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
  /** "फोन माथि उठाउनुहोस्" — up for the fixed window between the tap that asks
   *  for the gyro and it actually taking over. */
  const [gyroPrompt, setGyroPrompt] = useState(false);
  const sensorMode = gyroMode || arMode;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const deviceOrientation = useDeviceOrientation(sensorMode);
  const gyroPromptTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(gyroPromptTimer.current), []);

  const onCompassHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
    // The horizon camera's own yaw runs opposite true azimuth (see the
    // `cam.rotation.set` derivation in AakashGocharScene) — negate here so
    // dragging the dial to प actually turns the camera to face west instead
    // of its mirror image, east.
    view.current.yaw = -heading * DEG_TO_RAD;
  }, []);

  /** The reader's own drag — on the dial or the sky itself — taking the
      wheel back from whichever sensor was driving it. */
  const stopSensorMode = useCallback(() => {
    setGyroMode(false);
    setArMode(false);
    view.current.roll = 0;
    clearTimeout(gyroPromptTimer.current);
    setGyroPrompt(false);
  }, []);

  /** A tap on the dial while neither sensor is running: ask the reader to
      raise the phone, then switch the dial over to the device's own tilt once
      they've had the window to do it. */
  const requestGyro = useCallback(() => {
    setMode("horizon");
    setGyroPrompt(true);
    clearTimeout(gyroPromptTimer.current);
    /* A backstop, not the trigger. The handover below waits for the phone to
       actually come up; this only covers the case where the sensors never
       report at all (permission refused, no magnetometer), so the prompt
       cannot sit on screen for ever with nothing to end it. */
    gyroPromptTimer.current = setTimeout(() => {
      setGyroPrompt(false);
      setGyroMode(true);
    }, 8000);
  }, []);

  /**
   * The handover: the prompt stays up until the phone is raised into a posture
   * it can actually be used in, and the moment it is, the gyro takes the sky.
   *
   * This used to be a flat three-second timer, which is not the same question.
   * Three seconds with the phone still flat on a table handed the sky to a
   * sensor pointing at the floor; three seconds was also longer than it takes
   * someone who has already lifted the phone to wonder why nothing happened.
   *
   * "Raised" is read off the tilt the hook already computes: `pitchDeg` is 0
   * with the phone vertical and the back camera on the horizon, +90 with it
   * flat on its back looking at the zenith. Anything at or above
   * {@link UPRIGHT_MIN_PITCH_DEG} is a phone being held up to look through —
   * only a phone still lying screen-down, camera at the ground, is excluded.
   */
  useEffect(() => {
    if (!gyroPrompt) return;
    const { pitchDeg, headingDeg } = deviceOrientation;
    if (pitchDeg == null || headingDeg == null) return;
    if (pitchDeg < UPRIGHT_MIN_PITCH_DEG) return;
    clearTimeout(gyroPromptTimer.current);
    setGyroPrompt(false);
    setGyroMode(true);
  }, [gyroPrompt, deviceOrientation]);

  /** The dial's centre glyph, tapped once the gyro has already turned it into
      a lens: opens the back camera without touching the tilt that's already
      driving the view. */
  const requestCamera = useCallback(() => {
    void (async () => {
      let granted: boolean | undefined;
      try {
        granted = cameraPermission?.granted || (await requestCameraPermission())?.granted;
      } catch {
        granted = false;
      }
      // Denied, or no back camera to ask for — the dial stays a gyro-only
      // compass rather than opening onto a black rectangle.
      if (granted) setArMode(true);
    })();
  }, [cameraPermission, requestCameraPermission]);

  /** What a clean tap on the dial means depends entirely on which sensor, if
      any, is already live — see {@link CompassControl}'s own doc comment. */
  const onCompassTap = useCallback(() => {
    if (gyroMode && !arMode) {
      requestCamera();
      return;
    }
    if (!gyroMode && !arMode) requestGyro();
  }, [gyroMode, arMode, requestCamera, requestGyro]);

  // A denied camera permission drops back to gyro-only — not all the way to
  // manual. The phone pointing the sky needs no permission and is useful on
  // its own; only the passthrough behind it does. Dropping the whole thing
  // here would take away the stage that still works because the one after it
  // did not.
  useEffect(() => {
    if (arMode && cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) {
      setArMode(false);
    }
  }, [arMode, cameraPermission]);

  // The phone's own compass and tilt take the wheel while a sensor is live —
  // the same `view.current` the manual drag gesture writes to the rest of the
  // time, so the scene's camera code never has to know which one is live.
  // `onSample` below picks the new yaw back up for the dial. Left null (no
  // sensor data yet, or permission denied) simply leaves the last view alone,
  // so the reader can still drag the dial by hand rather than being frozen.
  useEffect(() => {
    if (!sensorMode) return;
    if (deviceOrientation.headingDeg != null) {
      // Negated for the same reason `onCompassHeadingChange` negates: camera
      // yaw and true azimuth run opposite each other.
      view.current.yaw = -deviceOrientation.headingDeg * DEG_TO_RAD;
    }
    if (deviceOrientation.pitchDeg != null) {
      // Same clamp the manual drag gesture uses in this view — short of true
      // vertical, where the yaw axis degenerates.
      view.current.pitch = Math.min(1.45, Math.max(-1.45, deviceOrientation.pitchDeg * DEG_TO_RAD));
    }
  }, [sensorMode, deviceOrientation.headingDeg, deviceOrientation.pitchDeg]);

  /** Camera passthrough only once the permission is actually granted — AR mode
      alone would otherwise leave a black rectangle where the lens should be. */
  const showCamera = arMode && Boolean(cameraPermission?.granted);

  // Transparent clear so the camera behind the Canvas shows through; opaque
  // otherwise. Toggled here rather than in `onCreated`, which only fires once.
  useEffect(() => {
    glRef.current?.setClearColor(CANVAS_BG, showCamera ? 0 : 1);
  }, [showCamera]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  /**
   * Where the camera has been asked to look, for anything that is not a graha.
   *
   * A graha already has a way to be centred — select it and turn on पछ्याउनुहोस्
   * — but a star has no object in the scene to select. So a fixed target is
   * passed down as a position and a nonce, and the scene aims at it the same
   * way it aims at a followed graha, for one frame.
   */
  /**
   * A press on a star, or a search pick — what the scene is being asked to
   * look at. `sidereal` marks a longitude that is already current-date rather
   * than J2000, so the scene knows which ones still need converting.
   */
  const [skyAim, setSkyAim] = useState<{
    lon: number;
    lat: number;
    nonce: number;
    sidereal?: boolean;
  } | null>(null);
  /** What the overlay names — the current selection, not a passing flash. */
  const [aimed, setAimed] = useState<SkyTarget | null>(null);
  /**
   * Whether {@link aimed} was actually *centred*, as opposed to merely named.
   *
   * The reticle is drawn at the middle of the canvas, so it only tells the
   * truth about something that was put there. A single press names a star
   * where it stands and leaves the camera alone — drawing the circle then put
   * it on empty sky, nowhere near the star it claimed to mark.
   */
  const [aimedCentered, setAimedCentered] = useState(false);
  const { user } = useAuth();
  const signedIn = !!user;

  /* Load the on-device lists once, then pull the account's favourites down and
     fold this device's in — same order the web signs in and merges. */
  useEffect(() => {
    let alive = true;
    void readRecents().then((ids) => {
      if (alive) setRecentIds(ids);
    });
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

  const catalogStars = useMemo(() => displayVedicStars(vedicStars ?? []), [vedicStars]);
  const namedStars = useMemo(() => vedicStarTargets(catalogStars), [catalogStars]);
  const [searchQuery, setSearchQuery] = useState("");
  type SearchPane =
    | { view: "home" }
    | { view: "favourites" }
    | { view: "recents" }
    | { view: "browse" }
    | { view: "kind"; kind: SkyTargetKind };
  const [searchPane, setSearchPane] = useState<SearchPane>({ view: "home" });

  /**
   * A search result was chosen: put it in the middle and mark it.
   *
   * Grahas go through the path that already exists — select it and turn on
   * पछ्याउनुहोस् — so the focus sheet and the graha's own card agree with what
   * the camera is doing. Anything fixed is handed to the scene as a position
   * instead. Either way it lands under the reticle.
   */
  const pickTarget = useCallback((target: SkyTarget) => {
    setAimed(target);
    void pushRecent(target.id).then(setRecentIds);
    if (target.at === "graha") {
      setSelectedKey(target.graha);
      setToggles((t) => ({ ...t, lockCenter: true }));
    } else {
      setSkyAim({ lon: target.lon, lat: target.lat, nonce: Date.now() });
    }
    setSheet(null);
  }, []);

  /** What the scene reports for a press on anything that is not a graha. */
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

  /**
   * यम/वरुण/अरुण were pressed in the sky. They are not चार्टको ग्रह and have no
   * catalogue entry, so they go through the fixed-sky path a star pick uses —
   * named under the reticle and centred — never `setSelectedKey`, which would
   * put a body the API knows nothing about into the graha card.
   */
  /**
   * One press on a star: *name* it, and nothing else.
   *
   * This used to also write `skyAim`, which centres the camera — so a single
   * press did what a double press is for, and there was no such thing as a
   * star merely being selected. Marking and centring are two different
   * answers, exactly as they are for a graha (`onSelect` / `onFollow`), and
   * this is the marking one. See {@link onFollowSky} for the other.
   */
  const onAimSky = useCallback((hit: SkyHit) => {
    setAimed({
      id: hit.id,
      kind: "planet",
      ne: hit.ne,
      en: hit.en,
      at: "sky",
      lon: hit.lon,
      lat: hit.lat,
    });
    setAimedCentered(false);
  }, []);

  /**
   * Every press that *asks* to centre something bumps this; the scene answers
   * it with one snap. Following holds the camera only while the clock runs, so
   * "focus this" has to be an event rather than a state — on a paused sky the
   * state alone would centre nothing.
   */
  const [focusNonce, setFocusNonce] = useState(0);
  const askFocus = useCallback(() => setFocusNonce((n) => n + 1), []);

  /** Ride your own marker on the globe, the way ग्रह पछ्याउनुहोस् rides a graha. */
  const [lockObserver, setLockObserver] = useState(false);
  const toggleObserver = useCallback(() => {
    setLockObserver((on) => !on);
    setToggles((t) => (t.lockStars ? { ...t, lockStars: false } : t));
    askFocus();
  }, [askFocus]);

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
      setSelectedKey(key);
      /* `lockStars` off, always. Following a graha means the camera rides it —
         it does not mean the sky stops. Left on, the local horizon and its
         Alt-Az grid freeze with the stars and the whole view reads as locked,
         which is not what a second press asked for. */
      setToggles((t) => ({ ...t, lockCenter: true, lockStars: false }));
      askFocus();
    },
    [askFocus],
  );

  /** A press that landed on nothing — the follow lock lets go, same as a
      press on a different graha. Selection itself is left alone: emptying it
      too was not asked for, and a stray tap should not lose your place. */
  const onEmptyPress = useCallback(() => {
    setAimed(null);
    setToggles((t) => (t.lockCenter ? { ...t, lockCenter: false } : t));
  }, []);

  /** A star pressed twice: name it *and* put it in the middle of the screen. */
  const onFollowSky = useCallback(
    (hit: SkyHit) => {
      onAimSky(hit);
      setAimedCentered(true);
      setLockObserver(false);
      /* The camera move itself. `sidereal` has to travel with it: a वैदिक तारा
         arrives already converted for the date, a catalogue star does not, and
         the scene applies precession-and-ayanamsa only to the ones that need
         it. Dropping the flag landed the aim a whole ayanamsa off the star. */
      setSkyAim({ lon: hit.lon, lat: hit.lat, nonce: Date.now(), sidereal: hit.sidereal });
      askFocus();
    },
    [askFocus, onAimSky],
  );

  /**
   * A named वैदिक तारा was pressed. Its longitude is already the server's
   * current sidereal value rather than a J2000 one, so it is flagged as such
   * on the way down — the scene converts only the ones that need converting.
   */
  const vedicStarHit = useCallback(
    (star: VedicStarPosition, index: number): SkyHit => ({
      /* `vedic:`, not `vedicstar:`. This is the id the scene matches on to
         crown the selected star (`aimedId.startsWith("vedic:")`), and the same
         one `sky-catalogue.ts` gives these targets, so a press and a search
         pick name the same thing. Under the old prefix nothing matched: the
         star was selected in state and the sky showed no sign of it, which is
         what "the star is not being selected" actually was. */
      id: `vedic:${index}`,
      ne: star.ne,
      en: star.en,
      hintNe: star.designation,
      hintEn: star.designation,
      lon: star.lon,
      lat: star.lat,
      sidereal: true,
    }),
    [],
  );
  const onSelectStar = useCallback(
    (star: VedicStarPosition, index: number) => {
      setToggles((t) => (t.vedicStars ? t : { ...t, vedicStars: true }));
      onAimSky(vedicStarHit(star, index));
    },
    [onAimSky, vedicStarHit],
  );
  const onFollowStar = useCallback(
    (star: VedicStarPosition, index: number) => {
      setToggles((t) => (t.vedicStars ? t : { ...t, vedicStars: true }));
      onFollowSky(vedicStarHit(star, index));
    },
    [onFollowSky, vedicStarHit],
  );

  /* No timeout on `aimed`, matching the web. It is the *selection*, not a
     flash of confirmation: three seconds after pressing a star the name
     vanished and nothing on screen said which one had been picked, which is
     why a single press read as having done nothing at all. It is replaced by
     the next press, and cleared by a press on empty sky. */
  /* Fullscreen only: the whole control row folds away to a single chevron, so
     the sky can have the entire screen when you just want to watch it. */
  /* The transport row's own date picker — the date nav above the canvas is
     unreachable once fullscreen, so this is the only way to jump dates there. */
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const dateBs = useMemo(() => adToBS(date), [date]);

  // Following the date nav above the canvas keeps the two in step.
  useEffect(() => {
    sim.current.timeMs = date.getTime();
  }, [date]);

  const speed = TIME_STEPS[speedIndex];

  useEffect(() => {
    sim.current.playing = playing;
    sim.current.secondsPerRealSecond = speed.seconds * (reverse ? -1 : 1);
  }, [playing, speed, reverse]);

  /**
   * A press of either fast button. Coming from a standstill or from the other
   * direction it starts at a minute a second — {@link FIRST_FAST_STEP}, the
   * first rung that is actually *fast*, real time being the one below it;
   * otherwise it climbs a rung and stops at the top.
   */
  const stepSpeed = useCallback(
    (direction: "forward" | "back") => {
      const wantReverse = direction === "back";
      const fromRest = !playing || reverse !== wantReverse;
      setSpeedIndex((i) => (fromRest ? FIRST_FAST_STEP : Math.min(TIME_STEPS.length - 1, i + 1)));
      setReverse(wantReverse);
      setPlaying(true);
    },
    [playing, reverse],
  );

  /** Pause always returns the clock to real time, running forward — so the
      next press of चलाउनु starts the sky at the rate of the clock on the wall
      rather than wherever the ladder was left. */
  const togglePlay = useCallback(() => {
    if (playing) {
      setSpeedIndex(DEFAULT_STEP_INDEX);
      setReverse(false);
    }
    setPlaying((p) => !p);
  }, [playing]);

  /* The responder is built once, so the exit has to be reachable through a
     ref rather than captured from the first render's closure. */
  const stopSensorModeRef = useRef(stopSensorMode);
  stopSensorModeRef.current = stopSensorMode;

  /** Same reasoning: the phone's own sensors own the camera in AR mode. */
  /* Also true during the "raise your phone" window: the drag is about to be
     handed to the sensors, and letting a finger move the sky in the meantime
     just fights what is a moment away from taking over. */
  const sensorModeRef = useRef(sensorMode || gyroPrompt);
  useEffect(() => {
    sensorModeRef.current = sensorMode || gyroPrompt;
  }, [sensorMode, gyroPrompt]);

  /**
   * The scene's picker, published from inside the Canvas.
   *
   * The web app binds `pointerdown`/`pointerup` to the canvas element and does
   * the whole press there. Native has no such element, and the gestures
   * already belong to the `PanResponder` below — the same recogniser that pans
   * and pinches — so it is the one thing that can tell a press from the start
   * of a drag. It measures that, and calls this with canvas-local pixels.
   */
  const pressRef = useRef<((x: number, y: number) => void) | null>(null);
  /** How far a finger may travel and still count as a press, px.
   *
   *  10, not the web's 6. A mouse click does not move; a finger on glass
   *  drifts several pixels between landing and lifting, and at 6 a fair
   *  proportion of honest taps on a star were being read as drags and
   *  silently selecting nothing. Still well under the distance at which a
   *  deliberate drag has visibly turned the sky. */
  const DRAG_SLOP = 10;

  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });
  /**
   * The last two-finger span, or 0 when no pinch is in progress.
   *
   * Zoom used to be computed as a ratio against the span the pinch *started*
   * at, which caps how far one gesture can travel: क्षितिज opens at 26 and the
   * wide end is 120, so reaching 235° needed the fingers to end 4.6× closer
   * together than they began — further than they can physically go on a phone.
   * The zoom simply stopped partway and looked like a limit. Measuring each
   * frame against the previous one instead makes it incremental, so a pinch
   * can be repeated without lifting and the range has no reach ceiling.
   */
  const pinchSpan = useRef(0);
  /**
   * How hard each move event's measured span is pulled toward the last one.
   *
   * The raw finger span jitters by a pixel or two per event even when the
   * hand is holding still, and an incremental zoom turns every one of those
   * into a small ratio it actually applies. Low-passing the span damps that
   * without adding lag anyone can feel.
   */
  const SPAN_SMOOTHING = 0.4;
  /**
   * The largest per-event zoom step taken seriously, as a ratio.
   *
   * A finger landing or lifting moves the measured span discontinuously —
   * often by half. Applied as a zoom step that is an instant jump; treated as
   * a new baseline it is invisible.
   */
  const MAX_STEP_RATIO = 1.35;
  /** Canvas height in px, kept current for the drag handler built once below. */
  const canvasHeightRef = useRef(1);
  /** Canvas width in px — the क्षितिज drag needs both, because the fisheye is
   *  quoted against the *shorter* axis (see `horizonClipPosition`), which on a
   *  portrait phone is the width and not the height. */
  const canvasWidthRef = useRef(1);
  /** Where the current one-finger drag started, in `PanResponder` accumulators —
   *  so lifting one finger out of a pinch re-bases the drag instead of jumping. */
  const dragOrigin = useRef({ dx: 0, dy: 0 });
  /**
   * Where the finger went down, in this view's own coordinates.
   *
   * Taken on *grant* and not on release. A tap produces no move events at all
   * (that is what makes it a tap), and by the time the release arrives
   * `nativeEvent.touches` is empty and `locationX`/`locationY` are whatever
   * node the release happened to be dispatched against — frequently not this
   * one, and sometimes not a number. Reading them there meant the picker was
   * being handed coordinates that pointed nowhere near the press, so nothing
   * was ever within a hit radius and nothing in the sky could be selected.
   */
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  /**
   * Whether a second finger was ever down during this gesture.
   *
   * The release test used to ask `pinchSpan`, which is the *live* span and is
   * deliberately zeroed the moment the gesture drops back to one finger. A
   * symmetric pinch barely moves its own centroid, so `g.dx`/`g.dy` stay near
   * zero too — which meant lifting the second finger and then the first ended
   * a pinch by selecting whatever the remaining finger happened to be over.
   * A latch, cleared only on grant, is the thing that actually answers "was
   * this a pinch."
   */
  const multiTouch = useRef(false);
  /**
   * The gesture view's box in window coordinates.
   *
   * `locationX`/`locationY` are relative to whichever node the touch was
   * dispatched against, and inside this view that is not reliably the view
   * itself — the GL surface and the camera backdrop are both children filling
   * the same box, and a touch landing on one of those reports against *it*.
   * When that node is not the canvas, or the value arrives undefined (it can),
   * the press had no usable coordinates and was dropped: `pressPoint` stayed
   * null and `onPanResponderRelease` returned before ever reaching the picker.
   * That is a tap that visibly does nothing.
   *
   * `pageX`/`pageY` have no such ambiguity — they are window coordinates, the
   * same for every node — so with the view's own origin measured once they
   * convert to canvas-local pixels exactly, whatever the touch landed on.
   */
  const viewRef = useRef<View>(null);
  const viewOrigin = useRef({ x: 0, y: 0 });
  const measureView = useCallback(() => {
    viewRef.current?.measureInWindow((x, y) => {
      if (typeof x === "number" && typeof y === "number") viewOrigin.current = { x, y };
    });
  }, []);
  /**
   * Where a touch landed, in canvas-local pixels.
   *
   * Tries window coordinates first (unambiguous, see {@link viewOrigin}),
   * then the gesture's own start point, then `locationX`/`locationY` as a
   * last resort. Null only if every one of those is unusable.
   */
  const pointFromEvent = useCallback(
    (e: GestureResponderEvent, g: PanResponderGestureState): { x: number; y: number } | null => {
      const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent.changedTouches?.[0];
      /* Canvas-local first — that is the frame the picker projects into, and
         when the touch landed on this view (the usual case) it is exact. */
      const locX = typeof t?.locationX === "number" ? t.locationX : e.nativeEvent.locationX;
      const locY = typeof t?.locationY === "number" ? t.locationY : e.nativeEvent.locationY;
      if (typeof locX === "number" && typeof locY === "number" && Number.isFinite(locX)) {
        return { x: locX, y: locY };
      }
      /* Otherwise window coordinates through this view's measured origin —
         unambiguous whatever node the touch was dispatched against. */
      const o = viewOrigin.current;
      const pageX = typeof t?.pageX === "number" ? t.pageX : e.nativeEvent.pageX;
      const pageY = typeof t?.pageY === "number" ? t.pageY : e.nativeEvent.pageY;
      if (typeof pageX === "number" && typeof pageY === "number") {
        return { x: pageX - o.x, y: pageY - o.y };
      }
      /* Last resort: where the gesture began, also in window coordinates. */
      if (typeof g?.x0 === "number" && typeof g?.y0 === "number" && (g.x0 !== 0 || g.y0 !== 0)) {
        return { x: g.x0 - o.x, y: g.y0 - o.y };
      }
      return null;
    },
    [],
  );

  /** Whether this gesture has already been settled — see the handlers below. */
  const settled = useRef(false);
  /**
   * The end of a gesture, decided once: was it a tap, and if so, on what.
   *
   * Held in a ref rather than closed over by the `PanResponder`, which is
   * built once, so it always sees the current `DRAG_SLOP`, picker and mode
   * without the recogniser being rebuilt mid-gesture.
   */
  const settle = useCallback(
    (e: GestureResponderEvent, g: PanResponderGestureState) => {
      if (settled.current) return;
      settled.current = true;
      /* One last look before deciding: if more than one finger is still down,
         or more than one came up together, this was never a single-finger
         gesture whatever the earlier hooks saw. */
      const endingFingers = Math.max(
        g?.numberActiveTouches ?? 0,
        e?.nativeEvent?.changedTouches?.length ?? 0,
        e?.nativeEvent?.touches?.length ?? 0,
      );
      if (endingFingers >= 2) multiTouch.current = true;
      const at = pressPoint.current ?? pointFromEvent(e, g);
      pressPoint.current = null;
      const travel = Math.hypot(g?.dx ?? 0, g?.dy ?? 0);
      /* `multiTouch` first, and unconditionally: a gesture a second finger
         ever joined is a multi-touch one for its whole life, even if it ended
         with one finger sitting still on a graha. It is never a tap, so it is
         never half of a double tap either — the double is two separate
         one-finger presses, counted in the scene. */
      const gesture = multiTouch.current
        ? ("multiTouch" as const)
        : sensorModeRef.current
          ? ("sensor" as const)
          : travel > DRAG_SLOP
            ? ("drag" as const)
            : ("tap" as const);
      if (gesture !== "tap") return;
      if (!at) return;
      pressRef.current?.(at.x, at.y);
    },
    [pointFromEvent],
  );
  /* The recogniser is built once; this keeps it pointed at the current
     `settle` without rebuilding it. */
  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  }, [settle]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        /* Claimed in every stage now. The sensors own *orientation* — they
           have nothing to say about zoom or about which star you just pressed,
           and refusing the gesture outright (which is what this did) took both
           of those away for as long as the phone was driving. */
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 2,
        /* A two-finger gesture is claimed outright, before the ScrollView this
           canvas sits inside gets a chance at it. A symmetric pinch barely
           moves its own centroid, so `g.dx`/`g.dy` stay near zero and none of
           the non-capture hooks above fire — which on a phone left the parent
           free to read the gesture as a scroll and swallow the zoom. */
        /* `?.length ?? 0`, not `.length`. `touches` is not guaranteed to be
           present on every native touch event, and reading `.length` off
           undefined throws *inside* the responder negotiation — which is not
           a crash anyone sees, it just leaves the touch half-registered. That
           is what "Ended a touch event which was not counted in
           trackedTouchCount" is reporting, and a touch RN never counted is one
           whose release it never delivers: the drag (all in `onPanResponder-
           Move`) kept working while every tap silently died at the end of the
           gesture, in every view. */
        onStartShouldSetPanResponderCapture: (e, g) =>
          g.numberActiveTouches >= 2 || (e.nativeEvent.touches?.length ?? 0) >= 2,
        onMoveShouldSetPanResponderCapture: (e, g) =>
          g.numberActiveTouches >= 2 || (e.nativeEvent.touches?.length ?? 0) >= 2,
        onPanResponderGrant: (e, g) => {
          gestureStart.current = { ...view.current, pinch: 0 };
          pinchSpan.current = 0;
          multiTouch.current = false;
          settled.current = false;
          dragOrigin.current = { dx: 0, dy: 0 };
          pressPoint.current = pointFromEvent(e, g);
        },
        /* Each additional finger landing, before anything has moved.
         *
         * The latch used to be set only from `onPanResponderMove`, which
         * means a two-finger *tap* — down, down, up, up, without a pixel of
         * travel — never latched at all, and settled as an ordinary tap that
         * picked whatever was under the first finger. Rule: two fingers never
         * select, moving or not. */
        onPanResponderStart: (e, g) => {
          const n = Math.max(g?.numberActiveTouches ?? 0, e.nativeEvent.touches?.length ?? 0);
          if (n >= 2) multiTouch.current = true;
        },
        /* Never hand the gesture back mid-pinch. The default is to say yes,
           which lets the parent ScrollView take over the moment it decides the
           movement looks like a scroll — the zoom then dies halfway through and
           the sky lurches as the gesture is torn away and re-granted. */
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          /* `numberActiveTouches`, not `touches.length`. The touches array on a
             given move event does not always carry every finger that is still
             down — a finger that did not move can be absent from it. Deciding
             on the array made a steady two-finger pinch flip into the
             one-finger drag branch on those events, which zeroed the pinch
             baseline and re-based the drag, then flipped back on the next
             event. That alternation *is* the stutter: the sky jerks between
             zooming and panning several times a second. */
          if (g.numberActiveTouches >= 2) {
            multiTouch.current = true;
            if (touches.length < 2) return;
            const [a, b] = touches;
            const raw = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            /* First frame of this pinch — take a baseline and change nothing. */
            if (!pinchSpan.current || raw <= 0) {
              pinchSpan.current = raw;
              return;
            }
            const dist = pinchSpan.current + (raw - pinchSpan.current) * SPAN_SMOOTHING;
            const step = pinchSpan.current / dist;
            /* A discontinuity, not a pinch — re-anchor rather than lurch. */
            if (step > MAX_STEP_RATIO || step < 1 / MAX_STEP_RATIO) {
              pinchSpan.current = dist;
              return;
            }
            /* Incremental: this frame against the last, applied to wherever the
               zoom already is. One clamp serves all three views, and the
               numbers line up — क्षितिज's range is exactly what `fovForZoom`
               maps, so a full pinch reaches 1° and a full spread 235°, and
               पृथ्वी गोला's own `OUTSIDE_ZOOM_MAX` is the same 120 at the wide
               end. */
            const next = view.current.distance * step;
            view.current.distance = Math.min(HORIZON_ZOOM_MAX, Math.max(HORIZON_ZOOM_MIN, next));
            pinchSpan.current = dist;
            return;
          }
          /* Down to one finger after a pinch: re-base the drag on where it is
             now, or the accumulated `g.dx`/`g.dy` from the whole two-finger
             gesture would land in one jump the moment a finger lifts. */
          if (pinchSpan.current) {
            pinchSpan.current = 0;
            gestureStart.current = { ...view.current, pinch: 0 };
            dragOrigin.current = { dx: g.dx, dy: g.dy };
          }
          /* A one-finger drag while a sensor is driving is the reader asking
             for the wheel back — so it drops the gyro (and the camera with it,
             if that was on) and becomes an ordinary drag, rather than being
             swallowed. Ignoring it, which is what this did, left the only way
             out on the dial itself: pulling at the sky did nothing at all and
             the view looked stuck.

             The re-base matters. The sensors have been writing `view.current`
             since the gesture was granted, so `gestureStart` is stale by
             however far the phone has turned; without this the sky jumps by
             that much on the first frame of the drag. */
          if (sensorModeRef.current) {
            stopSensorModeRef.current();
            /* Cleared here and now, not left to the effect that mirrors it.
               That effect only runs on the next render, so every remaining
               move event in this same gesture would see `true`, exit again,
               and re-base the drag — leaving `g.dx - dragOrigin.dx` at zero
               every frame, i.e. a drag that never moves anything. */
            sensorModeRef.current = false;
            gestureStart.current = { ...view.current, pinch: 0 };
            dragOrigin.current = { dx: g.dx, dy: g.dy };
            return;
          }
          const dx = g.dx - dragOrigin.current.dx;
          const dy = g.dy - dragOrigin.current.dy;
          if (modeRef.current === "horizon") {
            /* Grab the sky: the finger holds the point it landed on.
             *
             * Three things were wrong with turning a drag into an angle as
             * `fov / canvasHeight`:
             *
             * 1. The fisheye is normalised against the *shorter* screen axis,
             *    which on a portrait phone is the width. Dividing by the
             *    height made every drag about `height/width` (~2.2×) too
             *    small — the "pulling the sky through rubber" feel.
             * 2. `fov` is linear in θ, but the projection is stereographic,
             *    `r = 2·tan(θ/2)`. The two agree at narrow fields and diverge
             *    badly wide open: at 235° the linear figure is 1.6× short.
             * 3. Screen-horizontal motion is a turn about the camera's own up
             *    axis, and yaw is about the *world's*. The two differ by
             *    cos(pitch), so looking near the zenith a horizontal drag
             *    needed several times the yaw it was given — which is exactly
             *    the "barely moves near the top" complaint.
             *
             * So: invert the projection at the finger's own position to get
             * the angle a pixel is worth *there* (stereographic is conformal,
             * so one isotropic factor covers both axes), and divide the yaw by
             * cos(pitch). Incremental, one move event at a time, because the
             * scale is position-dependent and a from-the-start delta would be
             * measured at the wrong place.
             *
             * Both signs are "the sky follows the finger" — pull down and the
             * sky comes down with you. `pitch` counts *downward* from the
             * horizon (the camera reads it as `rotation.x = -pitch`), so
             * following the finger means subtracting dy, not adding it. */
            const ddx = dx;
            const ddy = dy;
            dragOrigin.current = { dx: g.dx, dy: g.dy };
            const w = Math.max(canvasWidthRef.current, 1);
            const h = Math.max(canvasHeightRef.current, 1);
            const minDim = Math.min(w, h);
            const halfFov =
              (fovForZoom("horizon", view.current.distance) * Math.PI) / 360;
            /* Film radius per screen pixel — `maxR` is what the shader puts at
               ±1 on the short axis, and the short axis is `minDim/2` pixels. */
            const filmPerPx = (2 * 2 * Math.tan(Math.max(halfFov, 1e-4) / 2)) / minDim;
            /* Where the finger is, in pixels from the canvas centre. Absent
               coordinates (rare, but `locationX` can arrive undefined) just
               fall back to the centre, which is the old behaviour. */
            const t = e.nativeEvent.touches?.[0];
            const px = typeof t?.locationX === "number" ? t.locationX : e.nativeEvent.locationX;
            const py = typeof t?.locationY === "number" ? t.locationY : e.nativeEvent.locationY;
            const rPx =
              typeof px === "number" && typeof py === "number"
                ? Math.hypot(px - w / 2, py - h / 2)
                : 0;
            const rFilm = rPx * filmPerPx;
            /* dθ/dr for r = 2·tan(θ/2). At the centre this is `filmPerPx`
               itself; out at the rim a pixel is worth less sky, which is what
               keeps the sky under the finger rather than sliding past it. */
            const k = filmPerPx / (1 + (rFilm * rFilm) / 4);
            /* Yaw is about the world's vertical, the drag is about the
               camera's. Floored so the zenith — where the factor runs to
               infinity — spins fast but stays finite. */
            const cosPitch = Math.max(Math.cos(view.current.pitch), 0.15);
            view.current.yaw += (ddx * k) / cosPitch;
            view.current.pitch = clampPitch(view.current.pitch - ddy * k, DOME_PITCH_MAX);
            return;
          }
          /* अन्तरिक्ष and पृथ्वी गोला drag the sphere rather than the camera:
             pulling right swings the face you are looking at to the right,
             which means the camera has to go the other way round. Scaled by
             how far in the zoom is, or a pulled-in globe skids under a finger
             that has barely moved. */
          const zoomScale = dragScaleForZoom(
            modeRef.current,
            view.current.distance,
            HOME_DISTANCE[modeRef.current],
          );
          view.current.yaw = gestureStart.current.yaw - dx * 0.006 * zoomScale;
          view.current.pitch = clampPitch(
            gestureStart.current.pitch + dy * 0.005 * zoomScale,
          );
        },
        /* Every way a gesture can finish funnels here, once.
         *
         * `onPanResponderRelease` is the documented one, but it is not the
         * only one that fires and — as the untracked-touch warnings show — it
         * is not one that can be relied on to fire at all. `onPanResponderEnd`
         * comes from a different path in the responder system and survives
         * cases release does not; `onPanResponderTerminate` is the gesture
         * being taken away, which for a finger that went down and came up
         * without moving still describes a tap. Whichever arrives first wins,
         * and `settled` stops the other two doing it again. */
        onPanResponderRelease: (e, g) => settleRef.current(e, g),
        onPanResponderEnd: (e, g) => settleRef.current(e, g),
        onPanResponderTerminate: (e, g) => settleRef.current(e, g),
      }),
    [pointFromEvent],
  );

  const onSample = useCallback((next: SkySample) => {
    setSample(next);
    // `view.current.yaw` is the one place camera facing actually lives —
    // written by the canvas drag, the view chips, a search pick's one-shot
    // aim, or (in AR mode) the device's own sensors. The dial just mirrors
    // whichever of those moved it most recently, sampled at the same ~5/s
    // cadence everything else reads the scene at. Negated for the same reason
    // {@link onCompassHeadingChange} negates going the other way — camera yaw
    // and true azimuth run opposite each other.
    setCompassHeading(normalizeDeg(-view.current.yaw / DEG_TO_RAD));
    // A brief FOV readout while क्षितिज actually zooms — a nicety only that
    // view has a field of view worth naming, and only worth showing while the
    // number is actually changing, not sitting on screen permanently.
    if (modeRef.current === "horizon") {
      const fov = fovForZoom("horizon", next.zoomDistance);
      if (lastFov.current != null && Math.abs(fov - lastFov.current) > 0.05) {
        setFovBadge(true);
        clearTimeout(fovHideTimer.current);
        fovHideTimer.current = setTimeout(() => setFovBadge(false), 1500);
      }
      lastFov.current = fov;
    }
  }, []);
  /**
   * Tapping a graha in the sky toggles it; the focus sheet names one outright.
   *
   * `null` is the sheet's पृथ्वी row — an explicit "nothing selected", which the
   * toggle behaviour could never express, since pressing पृथ्वी is not a second
   * press of whatever happened to be selected.
   */
  const onSelect = useCallback((key: GrahaKey | null) => {
    setAimed(null);
    /* A single press *names* a graha — it never rides it. ग्रह पछ्याउनुहोस् is
       the double press's job alone, so every single press puts the follow lock
       back off, including one that picks a different graha while another is
       being followed. Without this the checkbox stayed on and the camera kept
       riding the old graha while the panel named the new one. */
    setToggles((t) => (t.lockCenter ? { ...t, lockCenter: false } : t));
    setSelectedKey((prev) => (key === null ? null : prev === key ? null : key));
  }, []);

  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /* Fullscreen runs under the status bar, so the HUD and the zoom buttons have
     to start below the clock and the battery — and below the notch, which the
     insets do not always report from inside a modal. */
  const overlayTop = fullscreen ? Math.max(insets.top, 28) + 16 : 12;
  /* The two bottom corners of the sky, clear of the home indicator in
     fullscreen — where the compass dial is docked bottom-centre between them. */
  const overlayBottom = fullscreen ? Math.max(insets.bottom, 12) + 16 : 12;
  /* Fullscreen pins the view-chip strip over the sky's own bottom edge —
     bottom-left and bottom-right corner pieces (the adjust button, the date
     pill) have to clear its actual rendered height, measured from the actual
     screen edge, or sit half-buried under it. This is that height on its
     own — padding-top (8) + one compact chip row (~26) + the strip's own
     bottom safe-area inset, plus a small gap — and nothing else: adding
     `overlayBottom` on top of it (as a first pass here did) double-counted
     the safe-area inset, which is why these two sat noticeably higher than
     the strip actually needed. */
  const fullscreenStripClearance = fullscreen ? 8 + 26 + Math.max(insets.bottom, 8) + 6 : 0;
  /* Where a dropdown hangs from: just under the row of round buttons, on the
     same right edge they sit on. */
  const panelTop = overlayTop + 44;
  const panelWidth = Math.min(320, windowWidth - 48);
  /**
   * The adjust button's own footprint, bottom-left over the sky.
   *
   * The panel it opens stands on top of it, so both have to be measured from
   * the same number. They used not to be — the button sat at `overlayBottom +
   * 10` and the panel opened at `overlayBottom + 44`, which is 2px *inside* a
   * 36pt button, and in fullscreen the button moves to the strip clearance
   * while the panel stayed where it was and covered it outright.
   */
  const ADJUST_SIZE = 36;
  const ADJUST_GAP = 10;
  const adjustBottom = fullscreen ? fullscreenStripClearance : overlayBottom + 10;
  /* The compass is docked bottom-centre, between the two corner controls, so it
     has to clear the same fullscreen strip they do. */
  const compassBottom = fullscreen ? fullscreenStripClearance : 12;
  /** The FOV pill rides just above the dial, so it follows it up in fullscreen. */
  const fovBadgeBottom = compassBottom + DIAL_SIZE + 12;
  /** Where a panel hanging off the adjust button starts — clear of it. */
  const adjustPanelBottom = adjustBottom + ADJUST_SIZE + ADJUST_GAP;
  const simDate = sample ? new Date(sample.timeMs) : date;
  /* The Sun the scene has already computed — the calendar past the table's end. */
  const sunLongitude = sample?.sky.sun.longitude;

  /* The twelve राशि and the twelve बिक्रम months, which are the same twelve
     divisions read two ways — so one index serves both. */
  const rashiNames = useMemo(() => getRashiList(lang), [lang]);
  const monthNames = useMemo(
    () => (lang === "en" ? ([...BS_MONTH_NAMES] as string[]) : BS_MONTHS_NE),
    [lang],
  );
  const sunRashi =
    sunLongitude == null ? null : Math.floor(normalizeDeg(sunLongitude) / 30) % 12;

  const eclipse = sample?.eclipse ?? null;
  /*
   * अमावस्या / पूर्णिमा, within a degree of exact.
   *
   * A degree is about two hours of the Moon's own motion, so at wall-clock
   * speed the banner sits for a couple of hours of simulated time and at the
   * calendar speeds it blinks past — which is the honest shape of the thing.
   * Suppressed while an eclipse is showing, since a ग्रहण *is* a syzygy and
   * naming both at once says the same thing twice.
   */
  const syzygy = useMemo((): "amavasya" | "purnima" | null => {
    if (!sample || eclipse) return null;
    const elong = normalizeDeg(sample.sky.moon.longitude - sample.sky.sun.longitude);
    if (Math.min(elong, 360 - elong) < 1) return "amavasya";
    if (Math.abs(elong - 180) < 1) return "purnima";
    return null;
  }, [sample, eclipse]);

  /*
   * सङ्क्रान्ति, caught by watching the Sun's own rashi change.
   *
   * The scene samples a few times a second, so at the fast speeds this page
   * offers the crossing is one sample wide; the banner is held on a timer for
   * long enough to be read. The first sample after a mount is not a crossing —
   * there is nothing to have crossed *from* — hence the null guard.
   */
  const [sankranti, setSankranti] = useState<number | null>(null);
  const lastRashi = useRef<number | null>(null);
  useEffect(() => {
    if (sunRashi == null) return;
    const previous = lastRashi.current;
    lastRashi.current = sunRashi;
    if (previous === null || previous === sunRashi) return;
    setSankranti(sunRashi);
  }, [sunRashi]);
  useEffect(() => {
    if (sankranti === null) return;
    const id = setTimeout(() => setSankranti(null), 2600);
    return () => clearTimeout(id);
  }, [sankranti]);
  const sunSpeed = sample?.sky.sun.speedDegPerDay;

  /* Rashi/nakshatra text grows past its base size once the camera pulls back
     beyond the mode's own default framing — capped so it never swamps the
     screen at the very widest zoom. */
  const modeBaseline = mode === "space" ? SYSTEM_DISTANCE : mode === "globe" ? GLOBE_VIEW : HORIZON_WIDE;
  /* Names grow both ways: a little as the camera pulls back (the belt shrinks
     to a ring), and more as it pushes in (fixed type on a 1° crop reads as
     dust) — ported from the web's own two-branch formula so the belt sizes
     itself exactly the way it does there instead of growing without limit. */
  const labelScale = (() => {
    if (!sample) return 1;
    const d = sample.zoomDistance;
    if (mode === "space") {
      if (d >= SYSTEM_DISTANCE) return Math.min(LABEL_SCALE_MAX, Math.sqrt(d / SYSTEM_DISTANCE));
      return Math.min(CLOSE_LABEL_SCALE_MAX, Math.sqrt(SYSTEM_DISTANCE / Math.max(d, 10)));
    }
    const homeFov = fovForZoom(mode, modeBaseline);
    const nowFov = fovForZoom(mode, d);
    if (nowFov >= homeFov - 0.05) {
      return Math.min(LABEL_SCALE_MAX, Math.sqrt(Math.max(1, d / modeBaseline)));
    }
    return Math.min(CLOSE_LABEL_SCALE_MAX, Math.sqrt(homeFov / Math.max(nowFov, 1)));
  })();
  /**
   * नक्षत्र belt names: the short form (पू.फा, उ.भा…) until the camera has
   * pulled in past {@link PADA_ZOOM} — the same threshold the scene itself
   * uses to decide whether a नक्षत्र is close enough to carry its पाद ticks,
   * so the full name and the finer detail arrive together.
   */
  const nakshatraNamesExpanded = (sample?.zoomDistance ?? Infinity) <= PADA_ZOOM;

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
    const clock = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
      local.getUTCMinutes(),
    ).padStart(2, "0")}`;
    // 1 Jan 1970 was a Thursday, and 0 is Sunday.
    const dayIndex = Math.floor((simDate.getTime() + zoneOffsetMs) / 86400000);
    const weekday = (((dayIndex + 4) % 7) + 7) % 7;
    const place = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
    // Proleptic Gregorian throughout, as everywhere else in the app; year 0 is
    // 1 BC, so anything at or below it reads with the era spelled out.
    const adYear = y > 0 ? `${y}` : `${1 - y} BC`;

    /* The corner pill's own readout: the day in बिक्रम and the clock as a
       clock is read — twelve hours and a half-of-day word, not the 24-hour
       stamp the HUD keeps. Built for both languages, as on the web: an English
       reader of a Nepali almanac still wants "Bhadau 10" there, and the HUD
       above is already carrying the Gregorian date. */
    const bsShort = bikramFromSun(simDate, sunLongitude ?? 0, sunSpeed);
    const h24 = local.getUTCHours();
    const minute = String(local.getUTCMinutes()).padStart(2, "0");
    const h12 = h24 % 12 || 12;
    const half = lang === "en" ? (h24 < 12 ? "AM" : "PM") : h24 < 12 ? "पूर्वाह्न" : "अपराह्न";
    const short = {
      day: `${bsMonthLabel(bsShort.month, lang)} ${digits(bsShort.day)}`,
      clock: `${digits(h12)}:${digits(minute)} ${half}`,
    };

    if (lang === "en") {
      return { date: `${adYear}-${mo}-${d}`, time: `${clock} · ${place}`, short };
    }

    const adYearNe = y > 0 ? `${digits(y)} ई.` : `${digits(1 - y)} ई.पू.`;

    /* Past बि.सं. २२०० the compiled table has nothing, so the Sun becomes the
       calendar it always was — see [[bikram-solar]]. Marked with ≈ so it never
       passes for the almanac. */
    const bs = bikramFromSun(simDate, sunLongitude ?? 0, sunSpeed);
    const mark = bs.approximate ? "≈" : "";
    return {
      short,
      date: `${mark}${digits(bs.year)} ${bsMonthLabel(bs.month, "ne")} ${digits(bs.day)}, ${
        WEEKDAYS_SHORT_NE[weekday]
      }बार`,
      // Out past the table the AD year rides along, so the reading can be
      // checked against a calendar the reader already knows.
      time: `${digits(clock)} · ${place}${bs.approximate ? ` · ${adYearNe}` : ""}`,
    };
  }, [simDate, zoneOffsetMs, timeZone, lang, digits, sunLongitude, sunSpeed]);

  const isDay = mode === "horizon" && (sample?.sunAltitude ?? -90) > -0.5;


  // Fullscreen gives the sky the whole window and floats the controls over it.
  const canvasHeight = fullscreen ? windowHeight : height;
  /* The drag handler is built once and needs the *current* canvas height to
     turn pixels into degrees — see the क्षितिज branch in `onPanResponderMove`. */
  canvasHeightRef.current = canvasHeight;
  canvasWidthRef.current = windowWidth;

  /* The controls are built once and placed twice — a pinned row over the sky in
     fullscreen, a panel under it otherwise — so the two layouts can never drift
     apart in what they offer. */
  const transport = (
    <>
      <IconButton
        name="play-back"
        label={pick("पछाडि छिटो", "Faster backward")}
        active={!playing ? false : reverse && speedIndex > 0}
        overlay={fullscreen}
        compact={fullscreen}
        onPress={() => stepSpeed("back")}
      />
      <IconButton
        name={playing ? "pause" : "play"}
        label={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
        active={playing}
        overlay={fullscreen}
        compact={fullscreen}
        onPress={togglePlay}
      />
      <IconButton
        name="play-forward"
        label={pick("अगाडि छिटो", "Faster forward")}
        active={!playing ? false : !reverse && speedIndex > 0}
        overlay={fullscreen}
        compact={fullscreen}
        onPress={() => stepSpeed("forward")}
      />
      <IconButton
        name="refresh"
        label={pick("मितिमा फर्कनुहोस्", "Back to the chosen date")}
        active={false}
        overlay={fullscreen}
        compact={fullscreen}
        onPress={() => {
          /* The nav above starts on today, so with no date chosen this is
             simply "back to now". */
          sim.current.timeMs = date.getTime();
        }}
      />
      {onDateChange ? (
        <IconButton
          name="calendar-outline"
          label={pick("मिति छान्नुहोस्", "Choose a date")}
          active={datePickerOpen}
          overlay={fullscreen}
          compact={fullscreen}
          onPress={() => setDatePickerOpen(true)}
        />
      ) : null}
    </>
  );

  const viewChips = (
    <>
      <Chip
        active={mode === "space"}
        label={pick("अन्तरिक्ष", "Space")}
        onPress={() => {
          setMode("space");
          view.current = { yaw: 0.5, pitch: 0.62, distance: SYSTEM_DISTANCE };
        }}
        overlay
        compact={fullscreen}
      />
      <Chip
        active={mode === "horizon"}
        label={pick("क्षितिज", "Horizon")}
        onPress={() => {
          setMode("horizon");
          /* Standing at your own place here, so a graha-follow left over from
             another view means nothing until you pick one again. */
          setToggles((t) => (t.lockCenter && !selectedKey ? { ...t, lockCenter: false } : t));
          view.current = { yaw: HORIZON_YAW, pitch: HORIZON_PITCH, distance: HORIZON_WIDE };
        }}
        overlay
        compact={fullscreen}
      />
      <Chip
        active={mode === "globe"}
        label={pick("पृथ्वी गोला", "Earth globe")}
        onPress={() => {
          setMode("globe");
          view.current = { yaw: 0.6, pitch: 0.42, distance: GLOBE_VIEW };
        }}
        overlay
        compact={fullscreen}
      />
    </>
  );

  /** One layer switch, for use inside the sheets. */
  const sheetChip = (key: keyof SceneToggles, label: string) => (
    <Chip
      key={key}
      active={toggles[key]}
      label={label}
      onPress={() => setToggles((t) => ({ ...t, [key]: !t[key] }))}
    />
  );

  /*
   * The clock, behind the date pill in the sky's bottom-right corner.
   *
   * The web keeps the transport out of the strip under the canvas on anything
   * touch-sized (its own row is `xl:` only) and puts it here instead, one tap
   * from the stamp it is driving — so a phone reads the instant and changes it
   * in the same place rather than giving a permanent row to buttons that are
   * pressed once a session.
   */
  const timeSheet = (
    <SkyTimeSheet
      timeMs={simDate.getTime()}
      zoneOffsetMs={zoneOffsetMs}
      nepaliCal={lang !== "en"}
      digits={digits}
      pick={pick}
      speedLabel={
        playing
          ? `${reverse ? "◀◀" : "▶▶"} ${pick(speed.ne, speed.en)}`
          : pick("रोकिएको", "Paused")
      }
      playing={playing}
      /* The ladder, read as one bipolar rung: 0 is a stopped clock, the sign
         is the direction, and the magnitude is how far up the ladder it is. */
      rateValue={playing ? (reverse ? -(speedIndex + 1) : speedIndex + 1) : 0}
      rateMax={TIME_STEPS.length}
      onRate={(value) => {
        const rung = Math.round(value);
        if (rung === 0) {
          setPlaying(false);
          setSpeedIndex(DEFAULT_STEP_INDEX);
          setReverse(false);
          return;
        }
        setPlaying(true);
        setReverse(rung < 0);
        setSpeedIndex(Math.min(TIME_STEPS.length - 1, Math.abs(rung) - 1));
      }}
      onTogglePlay={togglePlay}
      onResetRate={() => {
        setSpeedIndex(DEFAULT_STEP_INDEX);
        setReverse(false);
        setPlaying(true);
      }}
      onApplyMs={(ms) => {
        sim.current.timeMs = ms;
      }}
      onClose={() => setSheet(null)}
    />
  );

  /* Guides and belts, grouped the way the web groups them. `ध्रुव तारा` and
     `अक्ष झुकाव` are only offered where they are drawn — the pole circle needs
     a sky to sit in and the obliquity marks need the Earth. */
  const layersSheet = (
    <Dropdown
      width={panelWidth}
      maxHeight={canvasHeight - adjustPanelBottom - 16}
      bottom={adjustPanelBottom}
      side="left"
    >
      {/* The four the sky is mostly read through, as tiles rather than chips —
          big enough to hit with a thumb, and each one a picture of what it
          turns on. Same four, same gating and same 3-or-4 column grid as the
          web's own drawer: भूभाग only in क्षितिज, the one view that stands on
          ground to have a hillside at all. */}
      <View className="flex-row gap-1">
        <ViewTile
          icon="grid-outline"
          label={pick("ग्रिड", "Grids")}
          active={toggles.grid}
          onPress={() => setToggles((t) => ({ ...t, grid: !t.grid }))}
        />
        <ViewTile
          icon="sparkles-outline"
          label={pick("तारापुञ्ज", "Figures")}
          active={toggles.constellations}
          onPress={() => setToggles((t) => ({ ...t, constellations: !t.constellations }))}
        />
        {mode === "horizon" ? (
          <ViewTile
            icon="triangle-outline"
            label={pick("भूभाग", "Landscape")}
            active={toggles.landscape}
            onPress={() => setToggles((t) => ({ ...t, landscape: !t.landscape }))}
          />
        ) : null}
        <ViewTile
          icon="text-outline"
          label={pick("नाम", "Labels")}
          active={toggles.labels}
          onPress={() => setToggles((t) => ({ ...t, labels: !t.labels }))}
        />
      </View>

      {/* ग्रिड is a tile above; the rest are the finer guides, which stay as
          chips because they are read before they are pressed. */}
      <SheetSection heading={pick("मार्गदर्शक", "Guides")}>
        {/* Only पृथ्वी गोला, where the Earth turning under the zodiac is the
            thing on screen and holding it still is how you read the ring
            against it. अन्तरिक्ष is already in the stars' own frame, and in
            क्षितिज a frozen sky is just a stopped clock. */}
        {mode === "globe" ? sheetChip("lockStars", pick("तारा स्थिर", "Lock to stars")) : null}
        {/* The observer's meridian is a line drawn on a globe you are looking
            *at*. Standing on the dome you are on that line, so there is
            nothing to draw and the scene never drew one. */}
        {mode === "horizon" ? null : sheetChip("primeMeridian", pick(`${placeName} रेखा`, `${placeName} meridian`))}
        {mode !== "space" ? sheetChip("vedicStars", pick("वैदिक तारा", "Vedic stars")) : null}
        {mode === "globe" ? sheetChip("tilt", pick("अक्ष झुकाव", "Tilt")) : null}
      </SheetSection>
      <SheetSection heading={pick("वलय", "Belts")}>
        {sheetChip("rashiBelt", pick("राशि", "Rashi"))}
        {sheetChip("nakshatraBelt", pick("नक्षत्र", "Nakshatra"))}
        {/* The बिक्रम month ring belongs to अन्तरिक्ष, where the wheel is the
            subject. On the dome it is a fourth band stacked over a sky already
            carrying stars and a cage; on the globe it drew nothing at all — the
            ring lives in the space-only wheel — so the chip there was a switch
            wired to nothing. */}
        {mode !== "space" ? null : sheetChip("monthRing", pick("महिना", "Months"))}
      </SheetSection>
    </Dropdown>
  );

  /*
   * What the camera is hung on.
   *
   * पृथ्वी is the way back: it clears the selection, which is also what turns
   * the follow switch off, since there is nothing left to follow. Everything
   * else selects that graha — the same thing tapping it on the sky does, so the
   * two controls cannot disagree.
   */
  const focusSheet = (
    <Dropdown width={Math.min(230, panelWidth)} maxHeight={canvasHeight - overlayTop - 56} top={panelTop}>
      <Text
        className="text-caption font-semibold uppercase tracking-[0.1em]"
        style={[nepaliTextStyle(11, { dense: true }), { color: "rgba(255,255,255,0.55)" }]}
      >
        {pick("केन्द्रविन्दु", "Focus")}
      </Text>
      {/* A one-of-these list, as on the web — radios rather than chips, because
          the camera hangs on exactly one thing and a row of pills reads like a
          set of independent switches. पृथ्वी sits second in the same order the
          web uses, and choosing anything turns the follow on in the same press:
          picking here is only ever asked for because you want to ride it. */}
      <View className="gap-0.5">
        {(
          [
            { key: "sun" as const, ne: "सूर्य", en: "Sun" },
            { key: "earth" as const, ne: "पृथ्वी", en: "Earth" },
            ...FOCUS_TARGETS.filter((t) => t.key !== "sun"),
          ]
        ).map(({ key, ne: neName, en }) => {
          const checked = key === "earth" ? !selectedKey : selectedKey === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (key === "earth") {
                  onSelect(null);
                  setToggles((t) => ({ ...t, lockCenter: false }));
                  return;
                }
                onSelect(key as GrahaKey);
                setToggles((t) => ({ ...t, lockCenter: true }));
              }}
              className="flex-row items-center gap-2 rounded-lg px-1 py-1.5 active:bg-white/10"
              accessibilityRole="radio"
              accessibilityState={{ checked }}
            >
              <View
                className="h-3.5 w-3.5 items-center justify-center rounded-full border"
                style={{ borderColor: checked ? "#ffffff" : "rgba(255,255,255,0.4)" }}
              >
                {checked ? (
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: "#ffffff" }} />
                ) : null}
              </View>
              <Text
                className="text-caption font-semibold"
                style={[nepaliTextStyle(12, { dense: true }), { color: checked ? "#ffffff" : "rgba(255,255,255,0.7)" }]}
              >
                {pick(neName, en)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The switch under the divider, exactly as the web has it: a checkbox,
          dead until something is selected — there is nothing to follow yet. */}
      <Pressable
        onPress={() => {
          if (!selectedKey) return;
          setToggles((t) => ({ ...t, lockCenter: !t.lockCenter }));
        }}
        disabled={!selectedKey}
        className="mt-1 flex-row items-center gap-2 border-t border-white/10 px-1 pt-2.5"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: toggles.lockCenter && !!selectedKey, disabled: !selectedKey }}
      >
        <View
          className="h-3.5 w-3.5 items-center justify-center rounded-[3px] border"
          style={{
            borderColor: selectedKey ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
            backgroundColor: toggles.lockCenter && selectedKey ? "#ffffff" : "transparent",
          }}
        >
          {toggles.lockCenter && selectedKey ? (
            <Ionicons name="checkmark" size={11} color="#000000" />
          ) : null}
        </View>
        <Text
          className="text-caption font-semibold"
          style={[
            nepaliTextStyle(12, { dense: true }),
            { color: selectedKey ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" },
          ]}
        >
          {pick("ग्रह पछ्याउनुहोस्", "Follow graha")}
        </Text>
      </Pressable>
    </Dropdown>
  );

  /**
   * The sky search: a box that finds anything nameable and puts it in the
   * middle of the screen.
   *
   * Ported from the web's `SkySearch.tsx`, as a sheet rather than a floating
   * panel — same three shortcuts and browse tree when nothing is typed, same
   * prefix-then-contains match once it is. `namedStars` widens both once the
   * server sends `vedic_stars`; until then the catalogue's planets, nakshatra
   * stars and asterisms already cover most of what a reader types.
   */
  const searchResults = useMemo(
    () => searchSky(searchQuery, 40, namedStars),
    [searchQuery, namedStars],
  );
  const favouritedSet = useMemo(() => new Set(favourites), [favourites]);
  const searchById = useMemo(() => {
    const map = new Map(SKY_BY_ID);
    for (const t of namedStars) map.set(t.id, t);
    return map;
  }, [namedStars]);
  const searchName = (t: SkyTarget) => pick(t.ne, t.en);
  const searchHint = (t: SkyTarget) =>
    t.hintNe || t.hintEn ? pick(t.hintNe ?? "", t.hintEn ?? "") : "";

  const searchRow = (t: SkyTarget) => (
    <View key={t.id} className="flex-row items-center gap-1">
      <Pressable
        onPress={() => pickTarget(t)}
        className="min-w-0 flex-1 flex-row items-baseline gap-2 rounded-lg px-2.5 py-2 active:bg-white/10"
      >
        <Text
          numberOfLines={1}
          className="text-body shrink font-semibold text-white/90"
          style={nepaliTextStyle(13, { dense: true })}
        >
          {searchName(t)}
        </Text>
        {searchHint(t) ? (
          <Text numberOfLines={1} className="text-caption shrink text-white/45">
            {searchHint(t)}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => toggleFavourite(t.id)}
        accessibilityLabel={pick("पसन्दमा राख्नुहोस्", "Favourite")}
        className="h-7 w-7 items-center justify-center rounded-lg active:bg-white/10"
      >
        <Ionicons
          name={favouritedSet.has(t.id) ? "star" : "star-outline"}
          size={15}
          color={favouritedSet.has(t.id) ? "#fcd34d" : "rgba(255,255,255,0.35)"}
        />
      </Pressable>
    </View>
  );

  const searchShortcut = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    count: number | null,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-lg px-2.5 py-2 active:bg-white/10"
    >
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.6)" />
      <Text className="text-body flex-1 font-semibold text-white/80" style={nepaliTextStyle(13, { dense: true })}>
        {label}
      </Text>
      {count !== null ? (
        <Text className="text-caption text-white/45">{digits(String(count))}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );

  const searchBack = (label: string, to: SearchPane) => (
    <Pressable
      onPress={() => setSearchPane(to)}
      className="mb-1 flex-row items-center gap-1 self-start px-1 py-1"
    >
      <Ionicons name="chevron-back" size={13} color="rgba(255,255,255,0.45)" />
      <Text
        className="text-caption font-bold uppercase tracking-wide"
        style={[nepaliTextStyle(10, { dense: true }), { color: "rgba(255,255,255,0.45)" }]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const searchPaneRows = (): { rows: SkyTarget[]; empty: string } => {
    switch (searchPane.view) {
      case "favourites":
        return {
          rows: favourites.map((id) => searchById.get(id)).filter((t): t is SkyTarget => !!t),
          empty: pick("अझै कुनै मनपर्ने छैन", "No favourites yet"),
        };
      case "recents":
        return {
          rows: recentIds.map((id) => searchById.get(id)).filter((t): t is SkyTarget => !!t),
          empty: pick("अझै केही हेरिएको छैन", "Nothing looked at yet"),
        };
      case "kind":
        return { rows: skyTargetsOfKind(searchPane.kind, namedStars), empty: "" };
      default:
        return { rows: [], empty: "" };
    }
  };

  const searchSheet = (
    /* Wider and taller than the other two panels. This one is a list you read
       — कोटि rows, favourites, recents — not a handful of chips, and at the
       shared `panelWidth` the names wrapped and the whole thing read as a
       column of scraps. */
    <Dropdown
      width={Math.min(400, windowWidth - 24)}
      maxHeight={canvasHeight - overlayTop - 24}
      top={panelTop}
    >
      <View className="flex-row items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5">
        <Ionicons name="search" size={17} color="rgba(255,255,255,0.5)" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={pick("ग्रह, तारा, नक्षत्र…", "Planet, star, constellation…")}
          placeholderTextColor="rgba(255,255,255,0.35)"
          /* No `autoFocus`. Opening the panel is how you browse what is up
             there; taking focus threw a keyboard over most of the list before
             anyone had said they wanted to type. Pressing the field still
             focuses it, which is when they have. */
          className="text-body min-w-0 flex-1 py-2 font-semibold text-white"
          style={nepaliTextStyle(15, { dense: true })}
        />
        <Pressable
          onPress={() => (searchQuery ? setSearchQuery("") : setSheet(null))}
          accessibilityLabel={searchQuery ? pick("खाली गर्नुहोस्", "Clear") : pick("खोज बन्द गर्नुहोस्", "Close search")}
          className="h-5 w-5 items-center justify-center"
        >
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </View>

      {searchQuery.trim() ? (
        searchResults.length ? (
          <View>{searchResults.map(searchRow)}</View>
        ) : (
          <Text className="text-caption px-2.5 py-3 text-center text-white/45">
            {pick("केही भेटिएन", "Nothing found")}
          </Text>
        )
      ) : searchPane.view === "home" ? (
        <View>
          {searchShortcut(
            "favourites",
            "star-outline",
            pick("मनपर्ने", "Favourites"),
            favourites.length,
            () => setSearchPane({ view: "favourites" }),
          )}
          {searchShortcut(
            "recents",
            "time-outline",
            pick("हालैको", "Recents"),
            recentIds.length,
            () => setSearchPane({ view: "recents" }),
          )}
          {searchShortcut("browse", "list-outline", pick("सूची", "Browse"), null, () =>
            setSearchPane({ view: "browse" }),
          )}
        </View>
      ) : searchPane.view === "browse" ? (
        <View>
          {searchBack(pick("पछाडि", "Back"), { view: "home" })}
          {SKY_KINDS.map((k) =>
            searchShortcut(
              k.kind,
              "list-outline",
              pick(k.ne, k.en),
              skyTargetsOfKind(k.kind, namedStars).length,
              () => setSearchPane({ view: "kind", kind: k.kind }),
            ),
          )}
        </View>
      ) : (
        <View>
          {searchBack(
            pick("पछाडि", "Back"),
            searchPane.view === "kind" ? { view: "browse" } : { view: "home" },
          )}
          {(() => {
            const { rows, empty } = searchPaneRows();
            return rows.length ? (
              rows.map(searchRow)
            ) : (
              <Text className="text-caption px-2.5 py-3 text-center text-white/45">{empty}</Text>
            );
          })()}
        </View>
      )}
    </Dropdown>
  );

  const body = (
    <View className={fullscreen ? "flex-1 bg-background" : "overflow-hidden rounded-2xl border border-border"}>
      {/* `touchAction: "none"` — not fullscreen: there the canvas is the whole
          screen and nothing else wants the gesture, but embedded on the page
          it sits inside `AppShell`'s own ScrollView, and on the web target
          that ScrollView is a plain scrolling `div`. The browser negotiates
          a one-finger drag natively before this view's own PanResponder ever
          sees it, so without this the page just scrolled under a reader's
          finger instead of turning the sky. This tells the browser the touch
          is this element's alone. */}
      <View
        ref={viewRef}
        onLayout={measureView}
        style={{ height: canvasHeight, backgroundColor: CANVAS_BG, touchAction: "none" }}
        {...responder.panHandlers}
      >
        {/* AR mode's backdrop: the real world, behind a transparently-cleared
            Canvas. Absolute rather than a sibling, so the GL surface layers
            directly on top of it rather than the two competing for the same
            box in a row. */}
        {showCamera ? (
          <CameraView style={{ position: "absolute", inset: 0 }} facing="back" />
        ) : null}
        {/* The GL surface, made untouchable.
         *
         * It is a native view of its own, and it claims the touch the moment a
         * finger lands on it — so the gesture recogniser on the parent was
         * never asked at touch-down. It only ever got the gesture later, once
         * a finger had *moved* far enough for the move-phase hook to take it
         * back. That is exactly the observed behaviour: dragging the sky
         * worked in all three views, and a tap — a finger that goes down and
         * comes up without moving — produced no grant, no release, no pick,
         * and no way for any of the code downstream of it to run.
         *
         * Nothing in the scene wants touches anyway: picking is done by hand
         * against the projected positions (`pressRef`), and the raycaster is
         * deliberately disabled everywhere ({@link NO_RAYCAST}). So the
         * surface can pass every touch straight through to the recogniser,
         * which is the one thing that should be reading them. The controls
         * layered over it are siblings, not children, and keep their own. */}
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <Canvas
          camera={{ position: [0, 14, 22], fov: 50, near: 0.05, far: 1200 }}
          /* A 3x phone renders 9 pixels per point at the default; capping the ratio
             at 1.5 roughly halves the fill cost with no visible loss on a star map. */
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            glRef.current = gl;
          }}
        >
          <Suspense fallback={null}>
            <Scene
              sim={sim}
              view={view}
              mode={mode}
              observer={observer}
              calibration={calibration}
              ayanamsaShift={ayanamsaShift}
              selectedKey={selectedKey}
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
              pressRef={pressRef}
              skyAim={skyAim}
              arBackground={showCamera}
              vedicStars={catalogStars}
            />
          </Suspense>
        </Canvas>
        </View>

        {/* Bottom-centre, over the canvas: drag it to turn the sky, tap it to
            hand the sky to the phone and then to the lens. See
            {@link CompassControl}. */}
        <CompassControl
          heading={compassHeading}
          onHeadingChange={onCompassHeadingChange}
          gyroMode={gyroMode}
          cameraOn={arMode}
          onTap={onCompassTap}
          onManualDrag={stopSensorMode}
          bottom={compassBottom}
          visible={mode === "horizon"}
        />

        {/* क्षितिज's field of view — named only while it is actually moving,
            the same "flashes then fades" pattern the सङ्क्रान्ति banner uses.
            Sits right over the compass dial, the one other control down here,
            rather than up with the HUD it has nothing to do with. */}
        {mode === "horizon" && fovBadge && sample ? (
          /* Two views, not one. The pill's own styling has to sit on a box
             that shrink-wraps its text; putting it on the positioning box —
             which spans `left: 0` to `right: 0` so the pill can be centred —
             painted the background clean across the whole sky. The web centres
             a shrink-wrapped pill with `left-1/2 -translate-x-1/2`; this is the
             same thing with the two jobs split between a parent and a child. */
          <View
            pointerEvents="none"
            className="absolute items-center"
            style={{ bottom: fovBadgeBottom, left: 0, right: 0 }}
          >
            <View className="rounded-full border border-white/15 bg-black/60 px-3 py-1">
              <Text className="text-caption font-bold text-white" style={nepaliTextStyle(12, { dense: true })}>
                {pick("दृश्य क्षेत्र", "FOV")}{" "}
                {digits(Math.round(fovForZoom("horizon", sample.zoomDistance)))}°
              </Text>
            </View>
          </View>
        ) : null}

        {/* "फोन माथि उठाउनुहोस्" — the window between asking for the gyro and
            it actually taking over. */}
        {gyroPrompt ? (
          <View
            pointerEvents="none"
            className="absolute items-center justify-center bg-black/40"
            style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          >
            <View className="items-center gap-3 px-6">
              <CompassNeedle width={56} height={56} color="#f4c542" />
              <Text
                className="text-display text-center font-extrabold text-white"
                style={nepaliTextStyle(24, { dense: true })}
              >
                {pick("फोन माथि उठाउनुहोस्", "Point your device up")}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Labels ride over the canvas rather than in it — real Devanagari type,
            positioned from the scene's own projection of each anchor. */}
        {toggles.labels ? <LiveGrahaNames /> : null}
        {toggles.labels && sample ? (
          <SkyLabels
            labels={sample.labels}
            scale={labelScale}
            namesExpanded={nakshatraNamesExpanded}
          />
        ) : null}

        {/* HUD — the simulated instant, which drifts away from the nav once it runs. */}
        <View
          pointerEvents="none"
          className="absolute left-3 rounded-lg bg-black/45 px-2.5 py-1.5"
          style={{ top: overlayTop }}
        >
          <Text className="text-caption font-bold" style={[nepaliTextStyle(11, { dense: true }), { color: LABEL_COLOR.hud }]}>
            {simStamp.date}
          </Text>
          <Text className="text-caption" style={[nepaliTextStyle(10, { dense: true }), { color: LABEL_COLOR.hudDim }]}>
            {simStamp.time}
          </Text>
          <Text className="text-caption" style={[nepaliTextStyle(10, { dense: true }), { color: LABEL_COLOR.hudDim }]}>
            {mode === "horizon"
              ? `${pick("क्षितिज", "Horizon")} · ${digits(observer.lat.toFixed(2))}°, ${digits(observer.lon.toFixed(2))}° · ${
                  isDay ? pick("दिन", "day") : pick("रात", "night")
                }`
              : mode === "globe"
                ? pick("पृथ्वी गोला · क्रान्तिवृत्त वलय", "Earth globe · ecliptic ring")
                : pick("अन्तरिक्षबाट", "From space")}
          </Text>
          {/* The rate, since the speed buttons no longer carry a caption. */}
          <Text className="text-caption" style={[nepaliTextStyle(10, { dense: true }), { color: LABEL_COLOR.hudDim }]}>
            {playing
              ? `${reverse ? "◀◀" : "▶▶"} ${pick(speed.ne, speed.en)}`
              : pick("⏸ रोकिएको", "⏸ paused")}
          </Text>
        </View>

        {/* The four view buttons, in the sky's own top-right corner — the same
            row, in the same order, as the web's: search, back to the chosen
            date, focus, fullscreen. Zoom has no button on either platform;
            pinch is the gesture here and the wheel is there. */}
        <View className="absolute right-3 flex-row gap-2" style={{ top: overlayTop }}>
          <IconButton
            name="search"
            label={pick("आकाशमा खोज्नुहोस्", "Search the sky")}
            active={sheet === "search"}
            overlay
            onPress={() =>
              setSheet((v) => {
                if (v === "search") return null;
                setSearchQuery("");
                setSearchPane({ view: "home" });
                return "search";
              })
            }
          />
          <IconButton
            name="refresh"
            label={pick("मितिमा फर्कनुहोस्", "Back to the chosen date")}
            active={false}
            overlay
            onPress={() => {
              /* The nav above starts on today, so with no date chosen this is
                 simply "back to now". */
              sim.current.timeMs = date.getTime();
            }}
          />
          <IconButton
            name="scan-outline"
            label={pick("केन्द्रविन्दु", "Focus")}
            active={sheet === "focus"}
            overlay
            onPress={() => setSheet((v) => (v === "focus" ? null : "focus"))}
          />
          <IconButton
            name={fullscreen ? "contract" : "expand"}
            label={fullscreen ? pick("सामान्य दृश्य", "Exit fullscreen") : pick("पूर्ण स्क्रिन", "Fullscreen")}
            active={fullscreen}
            overlay
            onPress={() => setFullscreen((f) => !f)}
          />
        </View>

        {/* सङ्क्रान्ति — the Sun crossing into the next राशि, which is also the
            first day of the next बिक्रम month. One frame wide in the scene, so
            the banner outlives it on a timer. */}
        {sankranti !== null ? (
          <View pointerEvents="none" className="absolute inset-x-0 items-center" style={{ top: overlayTop }}>
            <View className="rounded-full border border-amber-400/60 bg-amber-500/25 px-3 py-1">
              <Text
                className="text-caption font-bold"
                style={[nepaliTextStyle(12, { dense: true }), { color: "#fde68a", fontSize: 15 }]}
              >
                {`${pick("सङ्क्रान्ति", "Sankranti")} · ${rashiNames[sankranti]} · ${
                  monthNames[sankranti]
                } ${digits(1)}`}
              </Text>
            </View>
          </View>
        ) : null}

        {/*
          ग्रहण and the two syzygies, named as they pass.

          Not on a timer like the सङ्क्रान्ति banner: an eclipse is a *state*
          that lasts while the alignment holds, so it shows for exactly as long
          as the scene says one is happening. The अमावस्या / पूर्णिमा line is
          the same idea one step weaker — a syzygy with no node, which is the
          fortnightly case an eclipse is the rare exception to.
        */}
        {eclipse || syzygy ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 items-center"
            style={{ top: overlayTop + (sankranti !== null ? 34 : 0) }}
          >
            <View
              className="rounded-full border px-3 py-1"
              style={
                eclipse
                  ? { borderColor: "rgba(248,113,113,0.6)", backgroundColor: "rgba(127,29,29,0.5)" }
                  : { borderColor: "rgba(148,163,184,0.5)", backgroundColor: "rgba(15,23,42,0.6)" }
              }
            >
              <Text
                className="text-caption font-bold"
                style={[
                  nepaliTextStyle(12, { dense: true }),
                  { color: eclipse ? "#fecaca" : "#e2e8f0", fontSize: 15 },
                ]}
              >
                {eclipse
                  ? eclipse.kind === "solar"
                    ? pick("सूर्यग्रहण · चन्द्र सूर्यलाई ढाक्छ", "Solar eclipse · Moon covers the Sun")
                    : pick(
                        "चन्द्रग्रहण · पृथ्वीको छाया चन्द्रमा",
                        "Lunar eclipse · Earth's shadow on the Moon",
                      )
                  : syzygy === "amavasya"
                    ? pick("औंसी · चन्द्र सूर्य–पृथ्वीको बीचमा", "Amavasya · Moon between Sun and Earth")
                    : pick("पूर्णिमा · पृथ्वी सूर्य–चन्द्रको बीचमा", "Purnima · Earth between Sun and Moon")}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Bottom-left, in the sky's own corner — the same button the web
            keeps there. The view chips stay in the strip under the canvas,
            exactly where the web's own drawer leaves them; this floats alone. */}
        <View className="absolute left-3" style={{ bottom: adjustBottom }}>
          <IconButton
            name="options"
            label={pick("दृश्य नियन्त्रण", "View controls")}
            active={sheet === "layers"}
            overlay
            onPress={() => setSheet((v) => (v === "layers" ? null : "layers"))}
          />
        </View>

        {/* Bottom-right: the instant the sky is actually showing, and the way
            into changing it — the clock runs away from the date nav above the
            canvas the moment it is playing, and in fullscreen that nav is not
            reachable at all. */}
        {sheet === "time" ? null : (
          <Pressable
            onPress={() => setSheet("time")}
            className="absolute right-3 items-end rounded-xl border border-white/15 px-2.5 py-1.5 active:opacity-70"
            style={{
              bottom: fullscreen ? fullscreenStripClearance : overlayBottom,
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
            accessibilityRole="button"
            accessibilityLabel={pick("समय नियन्त्रण", "Time controls")}
          >
            <Text className="text-caption font-bold" style={[nepaliTextStyle(13, { dense: true }), { color: "#ffffff" }]}>
              {simStamp.short.day}
            </Text>
            <Text className="text-caption font-semibold" style={[nepaliTextStyle(11, { dense: true }), { color: "rgba(255,255,255,0.7)" }]}>
              {simStamp.short.clock}
            </Text>
          </Pressable>
        )}

        {/* A press anywhere else in the sky is the same "I'm done with this"
            the web reads off a `pointerdown` outside the panel — closes
            whichever of these three is open. Rendered before the panel itself
            so the panel, painted after it, stays on top and keeps taking its
            own presses; the backdrop only catches what lands outside it. Not
            used for the time card, which already carries its own full-screen
            backdrop the same way. */}
        {sheet === "layers" || sheet === "focus" || sheet === "search" ? (
          <Pressable
            onPress={() => setSheet(null)}
            accessibilityLabel={pick("बन्द गर्नुहोस्", "Close")}
            style={{ position: "absolute", inset: 0 }}
          />
        ) : null}
        {sheet === "time" ? timeSheet : null}
        {sheet === "layers" ? layersSheet : null}
        {sheet === "focus" ? focusSheet : null}
        {sheet === "search" ? searchSheet : null}

        {/* The reticle: what the camera has just been aimed at, named for the
            few seconds after a search pick lands. Four ticks with the middle
            left open, so the mark never covers the thing it names. */}
        {/* Drawn at the middle of the canvas, so it may only appear for
            something that was actually put there — a double press or a search
            pick. A single press names a star where it stands and leaves the
            camera alone; drawing this then planted a circle on empty sky
            nowhere near the star it claimed to be marking. The selection
            itself shows through `aimedId`, which the scene uses to pick that
            star's own name out on the sky. */}
        {aimed && aimedCentered ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View
              className="items-center justify-center rounded-full border"
              style={{ width: 48, height: 48, borderColor: "rgba(252,211,77,0.5)" }}
            >
              <Text
                className="text-caption absolute whitespace-nowrap rounded-full border px-2 py-0.5 font-bold"
                style={[
                  nepaliTextStyle(11, { dense: true }),
                  {
                    top: 56,
                    color: "#fef3c7",
                    borderColor: "rgba(252,211,77,0.4)",
                    backgroundColor: "rgba(0,0,0,0.7)",
                  },
                ]}
              >
                {lang === "en" ? aimed.en : aimed.ne}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* The strip under the sky, exactly where the web keeps it: the view
          chips, and nothing else — the transport row the web pairs them with
          is `xl:` only there (a pointer-driven screen has room for it beside
          the chips; a touch one already has play/pause/rate one tap away in
          the time card), so it never appears here either. The three stay up
          at all times — no collapse, no chevron — the same permanent row the
          web keeps under a fullscreen sky. */}
      <View
        className={
          fullscreen
            ? "dark absolute inset-x-0 bottom-0 px-2 pt-2"
            : "px-2 pb-2 pt-2"
        }
        style={
          fullscreen
            ? [
                nativeWindThemeVars("dark"),
                { backgroundColor: "rgba(4, 9, 12, 0.62)", paddingBottom: Math.max(insets.bottom, 8) },
              ]
            : /* In flow, below the canvas — the sky's own black so a light
                 card is never sitting right under a night sky. */
              [nativeWindThemeVars("dark"), { backgroundColor: "rgba(4, 9, 12, 0.62)" }]
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-1.5 pr-1"
        >
          {viewChips}
        </ScrollView>
      </View>

      {/* An in-tree overlay, not its own Modal: a second RN-Web Modal stacked on
          top of the fullscreen one let taps punch through to whatever sat at the
          same screen position underneath (Done landing on the ✕ button or a view
          chip beneath it). Living inside `body` instead, it shares the
          fullscreen modal's own theme context, so nothing needs re-applying. */}
      {datePickerOpen ? (
        <View
          className="absolute inset-0 items-center justify-center bg-black/60 px-4"
          style={{ zIndex: 50 }}
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => setDatePickerOpen(false)}
            accessibilityLabel={pick("बन्द गर्नुहोस्", "Close")}
          />
          <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-4">
            <BsDateTimePicker
              year={dateBs.year}
              month={dateBs.month}
              day={dateBs.day}
              yearOptions={windowedBrowseYears("bs", dateBs.year)}
              todayAd={todayAd}
              onSelectDate={(y, m, d) => onDateChange?.(bsToAD(y, m, d))}
              monthAriaLabel={pick("महिना", "Month")}
              yearAriaLabel={pick("वर्ष", "Year")}
              clock={clock}
              onClockChange={onClockChange}
              hourAriaLabel={pick("घण्टा", "Hour")}
              minuteAriaLabel={pick("मिनेट", "Minute")}
              showTime={Boolean(onClockChange)}
              onDone={() => setDatePickerOpen(false)}
            />
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!fullscreen) return body;

  return (
    <Modal
      visible
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={() => setFullscreen(false)}
    >
      {/* A modal renders outside the provider tree, so the theme tokens have to
          be re-applied here or every chip loses its colours. The scene is
          remounted too, but its textures come back out of the loader cache. */}
      <View
        className={cn("flex-1 bg-background", isDark && "dark")}
        style={nativeWindThemeVars(isDark ? "dark" : "light")}
      >
        {body}
      </View>
    </Modal>
  );
}

/**
 * The text over the canvas. Memoised, and fed an array the scene only replaces
 * when a label has actually moved a pixel: the HUD clock ticks five times a
 * second, and re-rendering fifty Devanagari labels alongside it would stutter
 * the very animation they are labelling.
 */
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
    return year < 0 ? `${Math.abs(year).toLocaleString("en-US")} BC` : `AD ${year.toLocaleString("en-US")}`;
  }
  const bs = year + 57;
  const abs = digits(Math.abs(bs).toLocaleString("en-US"));
  return bs < 0 ? `${abs} बि.सं. पूर्व` : `${abs} बि.सं.`;
}

/** One graha's name, riding its disc: position comes from shared values, not React state. */
function LiveGrahaName({ grahaKey }: { grahaKey: GrahaKey }) {
  const { lang } = useLocale();
  const live = liveGrahaLabels[grahaKey];
  const style = useAnimatedStyle(() => ({
    opacity: live.on.value,
    transform: [{ translateX: live.x.value - 45 }, { translateY: live.y.value + 10 }],
  }));
  return (
    <Animated.Text
      numberOfLines={1}
      className="text-caption font-bold"
      style={[
        { position: "absolute", left: 0, top: 0, width: 90, textAlign: "center", color: GRAHA_COLOR[grahaKey] },
        nepaliTextStyle(10, { dense: true }),
        style,
      ]}
    >
      {lang === "en" ? GRAHA_NAME[grahaKey].en : GRAHA_NAME[grahaKey].ne}
    </Animated.Text>
  );
}

function LiveGrahaNames() {
  return (
    <View style={{ position: "absolute", inset: 0 }} pointerEvents="none">
      {LIVE_GRAHA_KEYS.map((key) => (
        <LiveGrahaName key={key} grahaKey={key} />
      ))}
    </View>
  );
}

const SkyLabels = memo(function SkyLabels({
  labels,
  scale = 1,
  namesExpanded = false,
}: {
  labels: ScreenLabel[];
  /** Grows the rashi/nakshatra belt text as the camera pulls back — a fixed
      pixel size reads fine close up but disappears against the wider view
      once the belt has shrunk to a small ring in the middle of the screen. */
  scale?: number;
  /** नक्षत्र belt names only: full (उत्तरभाद्रपदा) once the camera has pulled
      in past this mode's own default view, short (उ.भा) at or beyond it. */
  namesExpanded?: boolean;
}) {
  const { lang, pick, digits } = useLocale();

  return (
    <View style={{ position: "absolute", inset: 0 }} pointerEvents="none">
      {labels.map((label) => {
        if (label.kind === "month" && label.index) {
          /* Inside the राशि band, and dimmed off the Sun: a बिक्रम month *is* a
             solar rashi, so the one lit is whichever sign the Sun stands in. No
             glyph — the राशि label just outside already carries it. */
          const boxWidth = 64 * scale;
          return (
            <Text
              key={label.id}
              numberOfLines={1}
              className="absolute font-semibold"
              style={[
                nepaliTextStyle(11 * scale, { dense: true }),
                {
                  left: label.x - boxWidth / 2,
                  top: label.y - 7 * scale,
                  width: boxWidth,
                  textAlign: "center",
                  color: "#e3d9a8",
                  opacity: label.dim ? 0.45 : 1,
                },
              ]}
            >
              {bsMonthLabel(label.index, lang)}
            </Text>
          );
        }
        if (label.kind === "rashi" && label.index) {
          const Icon = RASHI_ICONS[label.index - 1];
          /* Icon holds its own size — only the text gets the wide-zoom trim,
             same split the web draws (`RashiSkyGlyph size={iconSize}` next to
             a `beltFontSize` span): an icon shrinks cleanly at any size, a
             string of type does not, so the trim is spent where it is needed. */
          const iconSize = Math.min(28, 22 * scale);
          const boxWidth = 76 * scale;
          const fontSize = beltFontSize(14, scale);
          return (
            <View
              key={label.id}
              style={{ position: "absolute", left: label.x - boxWidth / 2, top: label.y - 12 * scale, width: boxWidth }}
              className="items-center"
            >
              <Icon width={iconSize} height={iconSize} color="#f4c542" />
              <Text
                className="font-bold"
                style={[nepaliTextStyle(fontSize, { dense: true }), { color: LABEL_COLOR.rashi }]}
                numberOfLines={1}
              >
                {formatRashiByNumber(label.index, lang)}
              </Text>
            </View>
          );
        }
        if (label.kind === "nakshatra" && label.index) {
          const nak = NAKSHATRA_ICONS[label.index - 1];
          /* Zoomed out, all 27 crowd a 13°20′ span each — उत्तरभाद्रपदा
             overruns its own neighbours before it overruns the screen. Pull
             in and the same span has room to spare, so the short form (पू.फा,
             उ.भा…) gives way to the name it stands for. `scale` is already how
             far past this mode's own default view the camera has pulled back
             — 1 at or inside it, growing toward 2.4 further out — so the same
             number that grows the text also decides which text to grow. */
          const short = NAKSHATRA_SHORT[label.index - 1];
          const named = namesExpanded ? nak : short;
          const boxWidth = (namesExpanded ? 90 : 56) * scale;
          const fontSize = beltFontSize(12, scale);
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - boxWidth / 2, top: label.y - 6 * scale, width: boxWidth, textAlign: "center", color: LABEL_COLOR.nakshatra },
                nepaliTextStyle(fontSize, { dense: true }),
              ]}
              numberOfLines={1}
            >
              {named ? (lang === "en" ? named.en : named.ne) : ""}
            </Text>
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
            <Text
              key={label.id}
              style={{
                position: "absolute",
                left: label.x - 8 * scale,
                top: label.y - 5 * scale,
                width: 16 * scale,
                textAlign: "center",
                fontSize: 15 * scale,
                color: LABEL_COLOR.pada,
              }}
            >
              {digits(label.index)}
            </Text>
          );
        }
        if (label.kind === "asterism" && label.index) {
          /* The name of the star group itself, sitting on the stars. Short, so
             it does not smother the figure it belongs to. */
          const nak = NAKSHATRA_SHORT[label.index - 1];
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 30, top: label.y + 6, width: 60, textAlign: "center", color: LABEL_COLOR.asterism },
                nepaliTextStyle(10, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={1}
            >
              {nak ? (lang === "en" ? nak.en : nak.ne) : ""}
            </Text>
          );
        }
        if (label.kind === "vedicstar") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 65, top: label.y + (label.clear ?? 8), width: 130, textAlign: "center", color: LABEL_COLOR.vedicStar },
                nepaliTextStyle(11, { dense: true }),
              ]}
              className="text-caption font-semibold"
              numberOfLines={1}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </Text>
          );
        }
        if (label.kind === "culture") {
          /* राशि figures and the mythological groups — same look as
             asterism, but the name comes straight off the label rather than
             a नक्षत्र-indexed table, since these are not नक्षत्र. */
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 45, top: label.y + 6, width: 90, textAlign: "center", color: LABEL_COLOR.asterism },
                nepaliTextStyle(10, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={1}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </Text>
          );
        }
        if (label.kind === "star") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 65, top: label.y + (label.clear ?? 8), width: 130, textAlign: "center", color: LABEL_COLOR.asterism },
                nepaliTextStyle(9, { dense: true }),
              ]}
              className="text-caption font-semibold"
              numberOfLines={1}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </Text>
          );
        }
        if (label.kind === "nebula") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 75, top: label.y + (label.clear ?? 6), width: 150, textAlign: "center", color: LABEL_COLOR.nebula },
                nepaliTextStyle(9, { dense: true }),
              ]}
              className="text-caption font-semibold"
              numberOfLines={1}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </Text>
          );
        }
        if (label.kind === "cardinal") {
          return (
            <Text
              key={label.id}
              style={{ position: "absolute", left: label.x - 14, top: label.y - 10, width: 28, textAlign: "center", color: LABEL_COLOR.cardinal }}
              className="text-body font-bold"
            >
              {label.text}
            </Text>
          );
        }
        if (label.kind === "station") {
          const st = SOLAR_STATIONS.find((x) => x.id === label.text);
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 60, top: label.y - 7, width: 120, textAlign: "center", color: LABEL_COLOR.station },
                nepaliTextStyle(10, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={2}
            >
              {st ? (lang === "en" ? st.en : st.ne) : ""}
            </Text>
          );
        }
        if (label.kind === "axis") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 60, top: label.y - 16, width: 120, textAlign: "center", color: LABEL_COLOR.axis },
                nepaliTextStyle(9, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={2}
            >
              {label.text === "earth"
                ? pick("पृथ्वीको अक्ष", "Earth's axis")
                : pick("कक्षाको लम्ब", "Orbit's perpendicular")}
            </Text>
          );
        }
        if (label.kind === "obliquity") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 45, top: label.y - 7, width: 90, textAlign: "center", color: LABEL_COLOR.tilt },
                nepaliTextStyle(11, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={1}
            >
              {`${digits((label.deg ?? 23.44).toFixed(2))}°`}
            </Text>
          );
        }
        if (label.kind === "polestar") {
          const star = POLE_STARS.find((p) => p.en === label.text);
          if (!star) return null;
          // index 1 marks the star the pole is nearest right now.
          const reigning = label.index === 1;
          return (
            <View
              key={label.id}
              style={{ position: "absolute", left: label.x - 55, top: label.y + 8, width: 110 }}
              className="items-center"
            >
              <Text
                style={[
                  { color: reigning ? LABEL_COLOR.station : LABEL_COLOR.poleStar },
                  nepaliTextStyle(reigning ? 11 : 9, { dense: true }),
                ]}
                className={reigning ? "text-caption font-bold" : "text-caption"}
                numberOfLines={1}
              >
                {lang === "en" ? star.en.replace(/\s*\(.*\)$/, "") : star.ne}
              </Text>
              <Text
                style={[{ color: LABEL_COLOR.overlayDim }, nepaliTextStyle(8, { dense: true })]}
                className="text-caption"
                numberOfLines={1}
              >
                {formatPoleYear(label.year, lang, digits)}
              </Text>
            </View>
          );
        }
        if (label.kind === "tropic") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 55, top: label.y - 7, width: 110, textAlign: "center", color: LABEL_COLOR.tropic },
                nepaliTextStyle(9, { dense: true }),
              ]}
              className="text-caption"
              numberOfLines={1}
            >
              {label.text === "cancer"
                ? pick("कर्कट रेखा · २३.४४°उ", "Tropic of Cancer · 23.44°N")
                : pick("मकर रेखा · २३.४४°द", "Tropic of Capricorn · 23.44°S")}
            </Text>
          );
        }
        /* The observer's place carries no overlay label, matching the web: a
           text node cannot be nailed to a spinning sphere the way the marker
           mesh is — it is re-projected every sixth frame and always trails the
           dot it belongs to — so the dot is left to say it on its own. */
        if (label.kind === "azimuth") {
          return (
            <Text
              key={label.id}
              style={{ position: "absolute", left: label.x - 16, top: label.y - 6, width: 32, textAlign: "center", color: LABEL_COLOR.azimuth }}
              className="text-caption"
            >
              {label.text}
            </Text>
          );
        }
        if (label.kind === "outerplanet") {
          return (
            <Text
              key={label.id}
              style={[
                { position: "absolute", left: label.x - 45, top: label.y + 10, width: 90, textAlign: "center", color: label.color ?? "rgba(255,255,255,0.75)", opacity: 0.85 },
                nepaliTextStyle(9, { dense: true }),
              ]}
              className="text-caption font-bold"
              numberOfLines={1}
            >
              {lang === "en" ? label.text : (label.textNe ?? label.text)}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
});

function Chip({
  active,
  label,
  onPress,
  overlay,
  compact,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  /**
   * This chip floats directly on the sky rather than on a panel, so it carries
   * its own backdrop.
   *
   * It used to mean "force light text" and did nothing, because the component
   * below forces light text for every chip regardless. What it has to mean is
   * this: an unpressed chip is otherwise `transparent`, which over the bright
   * hills of the भूभाग photo leaves a hairline outline and dim grey type on a
   * sunlit ridge. The web has `backdrop-blur` here; native has no backdrop
   * filter, so a solid disc is how the same job gets done.
   */
  overlay?: boolean;
  /** Tighter, for the single row that floats over a fullscreen sky. */
  compact?: boolean;
}) {
  /* The web's own chip, colour for colour: pressed reads as a solid white pill
     with black type, unpressed as a hairline outline on the sky's black. The
     theme tokens are deliberately not used — every chip in this scene floats
     over a night sky, whatever the app theme is doing. */
  return (
    <Pressable
      onPress={onPress}
      className={`shrink-0 rounded-full border active:opacity-70 ${
        compact ? "px-2.5 py-1" : "px-3 py-1.5"
      }`}
      style={{
        borderColor: active
          ? "transparent"
          : overlay
            ? "rgba(255,255,255,0.45)"
            : "rgba(255,255,255,0.2)",
        backgroundColor: active
          ? "rgba(255,255,255,0.85)"
          : overlay
            ? "rgba(0,0,0,0.88)"
            : "transparent",
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`font-semibold ${compact ? "text-caption" : "text-caption"}`}
        numberOfLines={1}
        style={[
          nepaliTextStyle(compact ? 10 : 11, { dense: true }),
          {
            color: active
              ? "#000000"
              : overlay
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.6)",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A transport control: icon only, with the label carried by accessibility. */
/**
 * A panel that drops out of the button that opened it — the web's own shape for
 * these three: a rounded card pinned under the button that opened it, sized to
 * its contents, with the sky still readable around it. The clock keeps a
 * bottom sheet of its own ({@link SkyTimeSheet}) — that one is a full-width
 * control strip rather than a list, and the web draws it the same way.
 */
function Dropdown({
  width,
  maxHeight,
  top,
  bottom,
  side = "right",
  children,
}: {
  width: number;
  maxHeight: number;
  /** Hangs from the button's own bottom edge — search and focus, top-right. */
  top?: number;
  /** Grows upward from the button's own top edge — layers, bottom-left, the
      same way the web's own drawer stands on its corner. */
  bottom?: number;
  /** Which edge the button that opened it sits on. */
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  /* No title, no X — the same plain padded card the web's own drawer and
     focus panel are: a press outside is how every one of them closes there,
     and a button that repeats what the outside-tap already does is a button
     nobody needs. */
  return (
    <View
      className={`absolute rounded-xl border border-white/15 ${side === "left" ? "left-3" : "right-3"}`}
      style={{ top, bottom, width, maxHeight, backgroundColor: "rgba(4, 7, 13, 0.95)" }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-3.5">
        {children}
      </ScrollView>
    </View>
  );
}

/** A drawer tile: an icon over its name, for the switches read at a glance. */
function ViewTile({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center gap-1 rounded-lg px-1 py-1.5 active:opacity-70 ${
        active ? "bg-white/15" : ""
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? "#ffffff" : "rgba(255,255,255,0.45)"}
      />
      <Text
        numberOfLines={1}
        className="text-caption w-full text-center font-semibold"
        style={[
          nepaliTextStyle(10, { dense: true }),
          { color: active ? "#ffffff" : "rgba(255,255,255,0.45)" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function IconButton({
  name,
  label,
  active,
  overlay,
  compact,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  overlay?: boolean;
  /** Tighter, for the single row that floats over a fullscreen sky. */
  compact?: boolean;
  onPress: () => void;
}) {
  /* Same two states the web's round buttons have — a white disc with a black
     glyph when the thing behind it is open, a dark disc with a hairline ring
     when it is not.

     `overlay` is the one that floats directly on the sky rather than on a
     panel. The web gets away with `bg-black/40` there because it also has
     `backdrop-blur`, which frosts whatever is behind it; React Native has no
     backdrop filter, so at 40% this button simply disappeared into the bright
     hills of the भूभाग photo. Solid black instead — the blur's job done the
     only way native can do it. */
  return (
    <Pressable
      onPress={onPress}
      className={`shrink-0 items-center justify-center rounded-full border active:opacity-70 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      }`}
      style={{
        borderColor: active
          ? "rgba(255,255,255,0.6)"
          : overlay
            ? "rgba(255,255,255,0.45)"
            : "rgba(255,255,255,0.2)",
        backgroundColor: active
          ? "rgba(255,255,255,0.85)"
          : overlay
            ? "rgba(0,0,0,0.88)"
            : "rgba(0,0,0,0.4)",
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={name}
        size={compact ? 15 : 17}
        color={active ? "#000000" : "rgba(255,255,255,0.8)"}
      />
    </Pressable>
  );
}

/**
 * Zoom and fullscreen, sitting on top of the sky. Double the old 32pt: against a
 * star field a small dark disc reads as scenery, and on a tablet the scene is
 * now tall enough that 32pt vanished into it entirely.
 */

export default AakashGocharSky;
