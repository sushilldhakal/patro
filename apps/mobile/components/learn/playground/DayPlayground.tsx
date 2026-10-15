/**
 * The Learn playground — one scene, configured per topic, on iOS and Android.
 *
 * The scene carries the geometry; this file is the instrument panel around it.
 * Which layers open, what the play button moves and where the camera starts all
 * come from `lib/learn/playground-config`, so a topic about the day opens
 * spinning the planet with its three day-arcs showing, and one about sankranti
 * opens creeping along the राशि belt with the Sun's sightline lit.
 *
 * Nothing is taken away by that. The group chips — बर्ष · सूर्य · दिन · अक्ष
 * झुकाव — plus the belt chips reach every layer in the scene from any topic, so
 * a reader who wants the whole picture is one press from it. The config decides
 * the opening frame, not the ceiling.
 *
 * The clock and camera live in refs and are mutated by the render loop, so
 * neither playing nor dragging re-renders React. What React sees is a sample
 * the scene hands back a few times a second, and the readouts are drawn from
 * that and nothing else.
 *
 * ── what this file does differently from the web's `DayPlaygroundStudy` ──
 *
 *   - **Touch, not pointers.** A `PanResponder` on the canvas wrapper, the same
 *     one the other 3D diagrams use: one finger orbits, two pinch the camera
 *     distance. There is no wheel to zoom with, so the pinch has to carry it.
 *   - **Panels are sheets, not popovers.** A 290px drawer floating over a phone
 *     canvas covers the thing it is adjusting. The controls and the focus menu
 *     open as bottom sheets over the whole card instead, which is the pattern
 *     the rest of this app already uses for its own pickers.
 *   - **Fullscreen is a `Modal`.** No portal and no Fullscreen API on a phone —
 *     and a modal is better here anyway, since it takes the status bar and the
 *     tab bar with it.
 *   - **`<select>` becomes chips.** The planet presets are a scrolling row, and
 *     the focus radio group a segmented row, because neither has a native
 *     dropdown worth reaching for at this size.
 */

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons/Ionicons";
import Slider from "@react-native-community/slider";

import { Canvas } from "@/components/learn/diagrams/LearnCanvas";
import { OverlaySheet } from "@/components/ui/OverlaySheet";
import { Text } from "@/components/ui/Text";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/bs-calendar";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { NAKSHATRA_SHORT } from "@vedic-patro/domain/sky3d/nakshatra-stars";
import {
  clocks,
  dayCounts,
  equationOfTime,
  meanAnomalyAt,
  PERIHELION,
  PLANET_PRESETS,
  VERNAL,
} from "@vedic-patro/domain/sky3d/day-mechanics";
import {
  resolvePlayground,
  SPEED_MULTIPLIERS,
  type PlaygroundConfig,
} from "@vedic-patro/domain/learn/playground-config";
import { useChapterTrack } from "@/lib/learn/use-chapter-track";
import { mixMeddle, type Meddle } from "@vedic-patro/domain/learn/chapter-player";
import {
  cameraFromChapter,
  firstActiveAt,
  togglesFromChapter,
  type Chapter,
  type ChapterSimState,
} from "@vedic-patro/domain/learn/chapter-kit";
import { trackFor } from "@vedic-patro/domain/learn/chapter-tracks";
import { DayChapterBar, DayChapterWelcome } from "@/components/learn/playground/DayChapterPlayer";
import { ChapterOverlay } from "@/components/learn/playground/ChapterOverlay";
import { ChapterStill, ChapterTip } from "@vedic-patro/ui/kit/learn";
import EotGraph from "@/components/learn/playground/EotGraph";
import PerfMeter, { type PerfSample } from "@/components/learn/playground/PerfMeter";
import type { PlaygroundLabel } from "@/components/learn/playground/playground-labels";
import {
  LABEL_TONE as TONE,
  PlaygroundLabelText,
} from "@/components/learn/playground/PlaygroundLabelText";
import Scene, {
  type CameraState,
  type CameraTarget,
  type PlaygroundGlobe,
  type SceneSample,
  type SimClock,
  type SimToggles,
} from "@/components/learn/playground/DaySimScene";

import { brand, illustration, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { lazyPair } from "@vedic-patro/i18n/runtime";
const CANVAS_BG = wheel.sky2;
const PI2 = Math.PI * 2;
const DEG = Math.PI / 180;

/** The 1× rung in {@link SPEED_MULTIPLIERS} — where every topic opens. */
const DEFAULT_SPEED_RUNG = SPEED_MULTIPLIERS.indexOf(1);

/** Card height. Fullscreen always takes the window. */
const CARD_HEIGHT = 340;

const MIN_DISTANCE = 4;
const MAX_DISTANCE = 130;
const PITCH_LIMIT = 1.45;

function clampPitch(p: number) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
}

function clampDistance(d: number) {
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));
}

/**
 * The group chips, and which layers each one owns.
 *
 * A group is on when every layer it owns is on, and pressing it turns the whole
 * set on or off together. This is the level a reader actually thinks at — "show
 * me the year" — while the sheet underneath still exposes each layer on its own
 * for when they want to take one thing away.
 */
const GROUPS = {
  year: ["planetOrbit", "monthRing", "rashiBelt"],
  sun: ["trueSun", "sightline", "sunOrbit"],
  day: ["siderealArc", "solarArc", "meanArc", "primeMeridian"],
  tilt: ["degrees", "sunOrbit", "grid", "eotWedge", "meanSun", "axis"],
  moon: ["moon", "moonTrail", "moonLap", "moonSightline"],
} satisfies Record<string, (keyof SimToggles)[]>;

type GroupKey = keyof typeof GROUPS;

/** Earth plus the five graha the eye can see. No Uranus, no Neptune. */
const PLANET_NAMES: Record<string, [string, string]> = {
  earth: lazyPair("vastu.element.earth"),
  mars: lazyPair("grahas.mars"),
  mercury: lazyPair("kundali.graha_name_mercury"),
  jupiter: lazyPair("kundali.graha_name_jupiter"),
  venus: lazyPair("kundali.graha_name_venus"),
  saturn: lazyPair("kundali.graha_name_saturn"),
};

export interface DayPlaygroundProps {
  /** The topic this playground belongs to — decides its opening state. */
  config: PlaygroundConfig;
  /** Heading over the card. Falls back to the playground's own name. */
  title?: string;
}

export function DayPlayground({ config, title }: DayPlaygroundProps) {
  const { t, lang } = useLocale();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const ne = lang !== "en";
  const num = (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v));

  const track = useMemo(() => trackFor(config.guided), [config.guided]);
  const tour = useChapterTrack(track);
  const freePlay = Boolean(tour?.chapter.free);
  const lesson = Boolean(tour) && !freePlay;

  const initial = useMemo(() => {
    const resolved = resolvePlayground(config);
    const opening = track?.chapters[0];
    if (!opening) return resolved;
    const welcome = opening.defaults;
    return {
      ...resolved,
      toggles: togglesFromChapter(welcome),
      params: {
        daysPerYear: welcome.solarDaysPerYear + 1,
        eccentricity: welcome.eccentricity,
        tilt: welcome.tiltDeg * DEG,
      },
      camera: cameraFromChapter(welcome),
    };
  }, [config, track]);

  const clock = useRef<SimClock>({
    day: 0,
    playing: Boolean(config.guided),
    daysPerSecond: config.guided ? 0.35 : initial.speed * SPEED_MULTIPLIERS[DEFAULT_SPEED_RUNG]!,
  });
  const camera = useRef<CameraState>({ ...initial.camera });
  /**
   * A reader's manual drag/pinch/zoom-button grab on the camera, while a
   * chapter's keyframes are also driving it.
   *
   * Without this, a touch during a guided beat lasted one frame before the
   * next keyframe sample snapped the view straight back — the tour fighting
   * the reader for the wheel. Frozen while held, it eases back to the
   * guided path over `MEDDLE_RELAX_DELAY_MS` + `MEDDLE_RELAX_DURATION_MS`
   * after release — see `chapter-player.ts`'s `mixMeddle`.
   */
  const cameraMeddle = useRef<Meddle<CameraState> | null>(null);
  const clockText = useRef({ sidereal: "", solar: "", mean: "" });

  const [playing, setPlaying] = useState(false);
  /* The 1× rung — the pace this topic was tuned for. Below it sit the two slow
     rungs for watching a single day. */
  const [speed, setSpeed] = useState(DEFAULT_SPEED_RUNG);
  const [sample, setSample] = useState<SceneSample | null>(null);
  const [labels, setLabels] = useState<PlaygroundLabel[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [sheet, setSheet] = useState<"controls" | "focus" | null>(null);
  const [graphOpen, setGraphOpen] = useState(false);
  /** A Learn diagram raised over the scene by the running chapter, by id. */
  const [overlay, setOverlay] = useState("");
  /** A still picture the running chapter is holding up, as a web-app path. */
  const [still, setStill] = useState("");
  /* Off by default and reachable only from the controls sheet — see PerfMeter
     for why it is not gated on `__DEV__`. */
  const [perfOpen, setPerfOpen] = useState(false);
  const [perf, setPerf] = useState<PerfSample | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  /** Which planet preset is showing; `""` is this topic's own. */
  const [preset, setPreset] = useState("");
  /**
   * The globe on screen. `""` (this topic's own settings) is Earth's —
   * every other value is a `PLANET_PRESETS` key, and those are already this
   * same union.
   */
  const planetBody = (preset || "earth") as PlaygroundGlobe;

  const [solarDaysPerYear, setSolarDaysPerYear] = useState(initial.params.daysPerYear - 1);
  const [eccentricity, setEccentricity] = useState(initial.params.eccentricity);
  const [tiltDeg, setTiltDeg] = useState(initial.params.tilt / DEG);

  const [cameraTarget, setCameraTarget] = useState<CameraTarget>("meanSun");
  const [cameraFollow, setCameraFollow] = useState(false);
  const [toggles, setToggles] = useState<SimToggles>(initial.toggles);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  /* The canvas is torn down and rebuilt when it moves into the modal, so the
     labels from the old one would otherwise hang over the new frame. */
  useEffect(() => {
    setLabels([]);
    setReady(false);
  }, [fullscreen]);

  useEffect(() => {
    if (config.guided && !freePlay) return;
    clock.current.playing = playing;
  }, [playing, config.guided, freePlay]);

  /**
   * The pace of one rotation, at the 1× rung.
   *
   * {@link MODE_SPEED} is tuned per mode against that mode's own year: the day
   * mode's 0.2 turns a second is a year in forty-five seconds *because its
   * year is nine turns long*. A guided track moves between years — the ported
   * chapters run an eight-day one, the calendar chapters the real 365 — so a
   * fixed rate is a crawl in the second half. Scaling by how long this
   * chapter's year actually is keeps an orbit taking about the same
   * wall-clock time throughout, and leaves the ported chapters at exactly
   * their old rate.
   */
  const basePace = config.guided
    ? (initial.speed * (solarDaysPerYear + 1)) / initial.params.daysPerYear
    : initial.speed;
  const basePaceRef = useRef(basePace);
  basePaceRef.current = basePace;

  useEffect(() => {
    if (config.guided && !freePlay) return;
    clock.current.daysPerSecond = basePace * SPEED_MULTIPLIERS[speed]!;
  }, [speed, basePace, config.guided, freePlay]);

  /* Guided tour: camera + orbit every frame, layers on the React tick. */
  const setTourFrame = tour?.setOnFrame;
  const tourWelcomeRef = useRef(true);
  const tourFreeRef = useRef(false);
  const playingStateRef = useRef(false);
  const handsOffOffset = useRef(0);
  const wasHandsOff = useRef(false);
  /**
   * The reader pressed the orbit button mid-narration. `s.handsOff` alone only
   * goes true at the very end of a chapter, so a reader who wants to nudge the
   * animation themselves the rest of the time has no such moment. This is that
   * moment on demand: folded into the `handsOff` the frame loop branches on, it
   * hands the clock and camera to the reader. Cleared when the chapter changes
   * or narration resumes.
   */
  const userDriving = useRef(false);
  tourWelcomeRef.current = Boolean(tour?.showWelcome);
  tourFreeRef.current = freePlay;
  playingStateRef.current = playing;
  useEffect(() => {
    if (!setTourFrame) return;
    setTourFrame((s: ChapterSimState) => {
      if (tourFreeRef.current) return;
      const dpy = s.solarDaysPerYear + 1;
      const guidedDay = s.orbitalPosition * dpy;
      const welcome = tourWelcomeRef.current;
      const handsOff = s.handsOff || userDriving.current;

      if (welcome || handsOff) {
        clock.current.playing = welcome ? true : playingStateRef.current;
        clock.current.daysPerSecond = welcome
          ? 0.35
          : basePaceRef.current * SPEED_MULTIPLIERS[speedRef.current]!;
        handsOffOffset.current = clock.current.day - guidedDay;
        wasHandsOff.current = true;
      } else {
        if (wasHandsOff.current) {
          handsOffOffset.current = clock.current.day - guidedDay;
          wasHandsOff.current = false;
        }
        clock.current.playing = false;
      }

      if (!welcome && !handsOff) {
        clock.current.day = guidedDay + handsOffOffset.current;
      }

      const cm = cameraMeddle.current;
      if (cm && !welcome && !handsOff) {
        if (cm.frozen || cm.releasedAt === null) {
          camera.current.yaw = cm.value.yaw;
          camera.current.pitch = cm.value.pitch;
          camera.current.distance = cm.value.distance;
        } else {
          const now = performance.now();
          const yaw = mixMeddle(now, s.cameraYaw, { ...cm, value: cm.value.yaw }, true);
          const pitch = mixMeddle(now, s.cameraPitch, { ...cm, value: cm.value.pitch });
          const dist = mixMeddle(now, s.cameraDistance, { ...cm, value: cm.value.distance });
          camera.current.yaw = yaw.value;
          camera.current.pitch = pitch.value;
          camera.current.distance = dist.value;
          if (yaw.done && pitch.done && dist.done) cameraMeddle.current = null;
        }
      } else if (!welcome && !handsOff && !cm) {
        camera.current.yaw = s.cameraYaw;
        camera.current.pitch = s.cameraPitch;
        camera.current.distance = s.cameraDistance;
      }
    });
  }, [setTourFrame]);

  const tourState = tour?.state;
  const tourPlaying = tour?.playing;
  /* Narration resuming is what gives the script the clock back after
     {@link userDriving} took it; without this the orbit toggle stayed stuck on
     and fought the keyframes the moment narration moved again. */
  useEffect(() => {
    if (!tourPlaying) return;
    userDriving.current = false;
    setPlaying(false);
  }, [tourPlaying]);
  const tourChapterId = tour?.chapter.id;
  /* The chapter object itself, for the reset below. Held in a ref so the
     reset stays keyed on the *id* — it must run when the chapter changes and
     not on every sampled frame. */
  const tourChapterRef = useRef<Chapter | null>(null);
  tourChapterRef.current = tour?.chapter ?? null;
  useEffect(() => {
    cameraMeddle.current = null;
    handsOffOffset.current = 0;
    wasHandsOff.current = false;
    userDriving.current = false;
    const ch = tourChapterRef.current;
    if (!ch) return;
    const s = ch.defaults;
    camera.current = cameraFromChapter(s);
    clock.current.day = s.orbitalPosition * (s.solarDaysPerYear + 1);
    if (!ch.free) return;
    setSolarDaysPerYear(s.solarDaysPerYear);
    setEccentricity(s.eccentricity);
    setTiltDeg(s.tiltDeg);
    setCameraTarget(s.cameraTarget);
    setCameraFollow(s.cameraFollow);
    setGraphOpen(false);
    setOverlay("");
    setStill("");
    setToggles(togglesFromChapter(s));
    setPreset(s.planet === "earth" ? "" : s.planet);
    clock.current.playing = false;
    setPlaying(false);
  }, [tourChapterId]);

  useEffect(() => {
    if (!tourState || tour?.chapter.free) return;
    /* Hands-off: the chapter has given the panel back. Keep writing graph /
       overlay-driven UI from `tour.state` elsewhere, but do not stomp focus,
       filters or sliders. */
    if (tourState.handsOff) return;
    setSolarDaysPerYear(tourState.solarDaysPerYear);
    setEccentricity(tourState.eccentricity);
    setTiltDeg(tourState.tiltDeg);
    setCameraTarget(tourState.cameraTarget);
    setCameraFollow(tourState.cameraFollow);
    setGraphOpen(tourState.graphOpen);
    setOverlay(tourState.overlay);
    setStill(tourState.still);
    setToggles(togglesFromChapter(tourState));
    setPreset(tourState.planet === "earth" ? "" : tourState.planet);
  }, [tourState, tour?.chapter.free]);

  /* Where `handsOff` flips from "not started" to a genuine hand-back. The
     welcome chapter opens on `handsOff: true` (its quiet start), the same value
     a chapter's end samples to; read raw, that made the free-running clock think
     the chapter had already finished on frame one. */
  const chapterActiveAt = useMemo(
    () => (tour ? firstActiveAt(tour.chapter) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tour?.chapter],
  );
  const tourHandsOff =
    Boolean(tourState?.handsOff) && (chapterActiveAt === null || (tour?.time ?? 0) >= chapterActiveAt);
  /**
   * What the chrome shows during a chapter.
   *
   * The ported Minute Labs chapters want a bare scene — the corner readout
   * and the clock columns would be talking over the narration. The calendar
   * chapters want the opposite: the point of watching the Sun cross a
   * boundary is reading which महिना just began. So a chapter asks, and
   * outside a chapter everything is on.
   *
   * The transport is a third question again. A year scrubber while keyframes
   * are driving the orbit is a control that does nothing, so it waits for
   * the chapter to hand the instruments back.
   */
  const showHud = (!lesson && !freePlay) || Boolean(tourState?.hud);
  const showReadings = (!lesson && !freePlay) || Boolean(tourState?.readings);
  const showTransport = !lesson && !freePlay;
  const wasTourHandsOff = useRef(false);
  useEffect(() => {
    const on = Boolean(lesson && tourHandsOff);
    if (on && !wasTourHandsOff.current) setPlaying(true);
    wasTourHandsOff.current = on;
  }, [lesson, tourHandsOff]);

  const onSample = useCallback((s: SceneSample) => {
    setSample(s);
    if (s.sankranti !== null) setFlash(s.sankranti);
  }, []);

  useEffect(() => {
    if (flash === null) return;
    const id = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(id);
  }, [flash]);

  const daysPerYear = solarDaysPerYear + 1;
  const tilt = tiltDeg * DEG;

  const params = useMemo(
    () => ({ daysPerYear, eccentricity, tilt }),
    [daysPerYear, eccentricity, tilt],
  );

  const day = sample?.day ?? 0;
  const rashi = sample?.rashi ?? 0;

  const meanAnomaly = meanAnomalyAt(day / daysPerYear);
  const eot = equationOfTime(meanAnomaly, eccentricity, tilt, PERIHELION - VERNAL);
  const eotMinutes = (eot * 24 * 60) / PI2;

  /* How far the sidereal clock has crept ahead of the mean one: a turn a year
     spread evenly, so it opens at zero and closes on a full 24h. This is the
     one reading that grows monotonically, which is what makes it legible while
     the clock faces themselves are spinning past too fast to compare. */
  const siderealGainMinutes = (day / daysPerYear) * 24 * 60;

  /**
   * How long one of each kind of day actually lasts, in minutes of mean time.
   *
   * This is where the difference is a plain number rather than a gap you have
   * to watch accumulate — the mean day is 24h by definition, the sidereal day
   * is shorter by the orbit's own share of a turn, and the true solar day is
   * the only one whose length changes from day to day.
   *
   * The true one is measured, not derived: apparent noon comes a little early
   * or late depending on which way the equation of time is moving that week, so
   * the length is 24h minus the day's own change in it.
   */
  const dayLengths = useMemo(() => {
    const eotMinAt = (d: number) =>
      (equationOfTime(meanAnomalyAt(d / daysPerYear), eccentricity, tilt, PERIHELION - VERNAL) *
        24 *
        60) /
      PI2;
    return {
      sidereal: 1440 * (1 - 1 / daysPerYear),
      mean: 1440,
      solar: 1440 - (eotMinAt(day + 0.5) - eotMinAt(day - 0.5)),
    };
  }, [day, daysPerYear, eccentricity, tilt]);

  const readings = useMemo(() => clocks(day, daysPerYear, eot), [day, daysPerYear, eot]);
  const counts = useMemo(() => dayCounts(day, daysPerYear, eot), [day, daysPerYear, eot]);

  useEffect(() => {
    clockText.current = readings;
  }, [readings]);

  /* ── Nepali belts. The app already owns all three name lists. ─────── */
  const rashiNames = useMemo(() => getRashiList(lang), [lang]);
  const monthNames = useMemo(
    () => (ne ? BS_MONTHS_NE : ([...BS_MONTH_NAMES] as string[])),
    [ne],
  );
  const nakshatraNames = useMemo(() => NAKSHATRA_SHORT.map((n) => (ne ? n.ne : n.en)), [ne]);
  const bodyNames = useMemo(
    () => ({
      planet: t("vastu.element.earth"),
      sun: t("kundali.report.meta_sun"),
      meanSun: t("learn.playground.mean_sun"),
      moon: t("kundali.graha_name_moon"),
      rahu: t("ui.learn.r_hu"),
      ketu: t("grahas.ketu"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const setToggle = useCallback(
    (k: keyof SimToggles) => {
      if (planetBody !== "earth" && (GROUPS.moon as readonly string[]).includes(k)) return;
      setToggles((t) => ({ ...t, [k]: !t[k] }));
    },
    [planetBody],
  );

  const groupOn = useCallback((g: GroupKey) => GROUPS[g].every((k) => toggles[k]), [toggles]);
  const pressGroup = useCallback(
    (g: GroupKey) => {
      // A borrowed graha has no Moon to switch on — the chip is disabled for
      // this too, but a stray press (or a stale re-render) should still be a
      // no-op rather than turning on toggles the scene is ignoring.
      if (g === "moon" && planetBody !== "earth") return;
      setToggles((t) => {
        const on = GROUPS[g].every((k) => t[k]);
        const next = { ...t };
        for (const k of GROUPS[g]) next[k] = !on;
        return next;
      });
    },
    [planetBody],
  );

  /** Empty key means this topic's own settings — the way back from a preset. */
  const applyPreset = useCallback(
    (key: string) => {
      setPreset(key);
      const p = PLANET_PRESETS.find((x) => x.key === key);
      if (!p) {
        setToggles(initial.toggles);
        setSolarDaysPerYear(initial.params.daysPerYear - 1);
        setEccentricity(initial.params.eccentricity);
        setTiltDeg(initial.params.tilt / DEG);
        return;
      }
      setSolarDaysPerYear(Math.max(1, Math.min(365, Math.round(p.daysPerYear - 1))));
      setEccentricity(p.eccentricity);
      setTiltDeg(p.tilt);
      /* A borrowed graha has no Moon, so the lunar layers go with it. */
      if (key !== "earth") {
        setToggles((t) => {
          const next = { ...t };
          for (const k of GROUPS.moon) next[k] = false;
          return next;
        });
      }
    },
    [initial],
  );

  /* ── gestures ─────────────────────────────────────────────────────── */
  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });

  /**
   * Freeze the camera meddle at its current value — a grab has started.
   * A no-op during free explore: there the camera already fully belongs to
   * the reader, with no keyframes to ease back to.
   */
  const grabCamera = useCallback(() => {
    if (tourFreeRef.current) return;
    cameraMeddle.current = { frozen: true, releasedAt: null, value: { ...camera.current } };
  }, []);
  /** Let go — starts the hold-then-ease-back timer in `mixMeddle`. */
  const releaseCamera = useCallback(() => {
    if (tourFreeRef.current) return;
    const slot = cameraMeddle.current;
    if (!slot) return;
    slot.frozen = false;
    slot.releasedAt = performance.now();
    slot.value = { ...camera.current };
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 2,
        onPanResponderGrant: () => {
          gestureStart.current = { ...camera.current, pinch: 0 };
          grabCamera();
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            if (!a || !b) return;
            const spread = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!spread) return;
            /* Anchored on the spread at the moment the second finger landed, so
               the zoom is absolute rather than accumulating drift over a long
               pinch. */
            if (!gestureStart.current.pinch) gestureStart.current.pinch = spread;
            camera.current.distance = clampDistance(
              gestureStart.current.distance * (gestureStart.current.pinch / spread),
            );
            if (cameraMeddle.current) {
              cameraMeddle.current.frozen = true;
              cameraMeddle.current.value = { ...camera.current };
            }
            return;
          }
          /* Drag the system, not the camera — pull right and the far side swings
             right, which means the camera itself travels the other way. */
          camera.current.yaw = gestureStart.current.yaw - g.dx * 0.006;
          camera.current.pitch = clampPitch(gestureStart.current.pitch + g.dy * 0.005);
          if (cameraMeddle.current) {
            cameraMeddle.current.frozen = true;
            cameraMeddle.current.value = { ...camera.current };
          }
        },
        onPanResponderRelease: releaseCamera,
        onPanResponderTerminate: releaseCamera,
      }),
    [grabCamera, releaseCamera],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      camera.current.distance = clampDistance(camera.current.distance * factor);
      /* A tap, not a hold — grab and release in the same beat so the same
         hold-then-ease-back timing as a drag kicks in immediately. */
      grabCamera();
      releaseCamera();
    },
    [grabCamera, releaseCamera],
  );

  const resetView = useCallback(() => {
    camera.current.yaw = initial.camera.yaw;
    camera.current.pitch = initial.camera.pitch;
    camera.current.distance = initial.camera.distance;
    grabCamera();
    releaseCamera();
  }, [initial, grabCamera, releaseCamera]);

  const canvasHeight = fullscreen ? windowHeight : CARD_HEIGHT;
  const overlayTop = fullscreen ? Math.max(insets.top, 24) + 12 : 10;

  /* ── formatting ───────────────────────────────────────────────────── */

  /** A signed gap in minutes as `+6h 18m` / `−12 min`. */
  const gapLabel = (minutes: number) => {
    /* Rounded before the sign is taken, so a gap of −0.1 min reads `0 min`
       rather than the nonsense `−0 min`. */
    const whole = Math.round(minutes);
    const sign = whole < 0 ? "−" : whole > 0 ? "+" : "";
    const abs = Math.abs(whole);
    const h = Math.floor(abs / 60);
    const m = abs - h * 60;
    return `${sign}${num(
      h > 0 ? `${h}${t("common.hour_short")} ${m}${t("common.minute_short")}` : `${m} ${t("common.minutes")}`,
    )}`;
  };

  /**
   * A duration in minutes as `23h 56m 04s` — seconds included because the true
   * solar day only ever moves in that last column.
   */
  const lengthLabel = (minutes: number) => {
    const total = Math.round(minutes * 60);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total - h * 3600) / 60);
    const s = total - h * 3600 - m * 60;
    return num(
      `${h}${t("common.hour_short")} ${String(m).padStart(2, "0")}${t("common.minute_short")} ${String(s).padStart(
        2,
        "0",
      )}${t("common.second_short")}`,
    );
  };

  /* ── pieces ───────────────────────────────────────────────────────── */

  const chip = (
    active: boolean,
    label: string,
    onPress: () => void,
    key?: string,
    disabled?: boolean,
  ) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className={cn(
        "rounded-full border px-2.5 py-1",
        active ? "border-transparent bg-white/85" : "border-white/25 bg-transparent",
        disabled && "opacity-40",
      )}
    >
      <Text
        className="text-caption font-semibold"
        style={[
          nepaliTextStyle(11),
          { color: active ? wheel.sky2 : withAlpha(neutral.white, 0.65) },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  /** One titled section of layer switches in the controls sheet. */
  const layerGroup = (
    heading: string,
    items: ([keyof SimToggles, string] | [keyof SimToggles, string, keyof SimToggles])[],
  ) => (
    <View className="gap-1.5" key={heading}>
      <Text
        className="text-caption font-bold uppercase tracking-wide"
        style={[nepaliTextStyle(10), { color: withAlpha(neutral.white, 0.55) }]}
      >
        {heading}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {items.map(([k, label, needs]) =>
          chip(
            toggles[k],
            label,
            () => setToggle(k),
            k,
            (planetBody !== "earth" && (GROUPS.moon as readonly string[]).includes(k)) ||
              (needs !== undefined && !toggles[needs]),
          ),
        )}
      </View>
    </View>
  );

  const slider = (
    label: string,
    value: number,
    display: string,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ) => (
    <View className="gap-1" key={label}>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text
          className="text-caption font-bold uppercase tracking-wide"
          style={[nepaliTextStyle(10), { color: withAlpha(neutral.white, 0.55) }]}
        >
          {label}
        </Text>
        <Text
          className="text-caption font-semibold"
          style={[nepaliTextStyle(11), { color: withAlpha(neutral.white, 0.9) }]}
        >
          {display}
        </Text>
      </View>
      <Slider
        style={{ width: "100%", height: 32 }}
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={illustration.amber61}
        maximumTrackTintColor={withAlpha(illustration.sky65, 0.45)}
        thumbTintColor={illustration.amber61}
      />
    </View>
  );

  /** The filter row: four groups, then the three belts and the Moon. */
  const filterChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="items-center gap-1.5"
    >
      {chip(groupOn("year"), t("learn.playground.year"), () => pressGroup("year"), "g-year")}
      {chip(groupOn("sun"), t("kundali.report.meta_sun"), () => pressGroup("sun"), "g-sun")}
      {chip(groupOn("day"), t("panchanga.view_day"), () => pressGroup("day"), "g-day")}
      {chip(groupOn("tilt"), t("learn.playground.tilt"), () => pressGroup("tilt"), "g-tilt")}
      <View className="mx-0.5 h-4 w-px bg-white/20" />
      {chip(toggles.rashiBelt, t("panchanga.wheel.rashi"), () => setToggle("rashiBelt"), "t-rashi")}
      {chip(
        toggles.nakshatraBelt,
        t("nakshatra"),
        () => setToggle("nakshatraBelt"),
        "t-nak",
      )}
      {chip(toggles.monthRing, t("learn.playground.months"), () => setToggle("monthRing"), "t-month")}
      {chip(
        groupOn("moon"),
        t("kundali.graha_name_moon"),
        () => pressGroup("moon"),
        "t-moon",
        planetBody !== "earth",
      )}
    </ScrollView>
  );

  const controlsSheet = (
    <OverlaySheet
      title={t("learn.playground.controls")}
      onClose={() => setSheet(null)}
      maxHeight={canvasHeight * 0.82}
    >
      {/* A world to borrow. Chips rather than a dropdown: six of them fit one
          scrolling row, and a picker wheel for a one-press choice is worse. */}
      <View className="gap-1.5">
        <Text
          className="text-caption font-bold uppercase tracking-wide"
          style={[nepaliTextStyle(10), { color: withAlpha(neutral.white, 0.55) }]}
        >
          {t("learn.playground.planet")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-1.5"
        >
          {chip(preset === "", t("ui.learn.this_topic"), () => applyPreset(""), "p-none")}
          {PLANET_PRESETS.map((p) =>
            chip(preset === p.key, PLANET_NAMES[p.key]![ne ? 0 : 1], () => applyPreset(p.key), p.key),
          )}
        </ScrollView>
      </View>

      {slider(
        t("learn.playground.solar_days_per_year"),
        solarDaysPerYear,
        num(solarDaysPerYear),
        1,
        365,
        1,
        setSolarDaysPerYear,
      )}
      {slider(
        t("learn.playground.eccentricity"),
        eccentricity,
        num(eccentricity.toFixed(3)),
        0,
        0.4,
        0.001,
        setEccentricity,
      )}
      {slider(
        t("learn.playground.axial_tilt"),
        tiltDeg,
        `${num(tiltDeg.toFixed(1))}°`,
        0,
        90,
        0.1,
        setTiltDeg,
      )}

      {/* Grouped as the scene groups them — guides, then the bodies, then the
          things that measure them — rather than one flat run of fifteen chips.
          Every layer stays individually reachable; the toolbar's group chips are
          a shortcut, not a replacement. */}
      {layerGroup(t("learn.playground.guides"), [
        ["degrees", t("learn.playground.degrees")],
        ["grid", t("learn.playground.grid")],
        ["planetOrbit", t("learn.playground.orbit")],
        ["sunOrbit", t("learn.playground.sun_path")],
        ["primeMeridian", t("learn.playground.kathmandu_meridian")],
        ["axis", t("learn.playground.spin_axis")],
      ])}
      {layerGroup(t("learn.playground.elements"), [
        ["trueSun", t("learn.playground.true_sun")],
        ["meanSun", t("learn.playground.mean_sun")],
        ["moon", t("kundali.graha_name_moon")],
        ["eotWedge", t("learn.playground.eot_wedge")],
      ])}
      {layerGroup(t("learn.playground.indicators"), [
        ["siderealArc", t("learn.playground.sidereal_arc")],
        ["solarArc", t("learn.playground.solar_arc")],
        ["meanArc", t("learn.playground.mean_arc")],
        ["siderealClock", t("learn.playground.sidereal_clock"), "siderealArc"],
        ["solarClock", t("learn.playground.solar_clock"), "solarArc"],
        ["meanClock", t("learn.playground.mean_clock"), "meanArc"],
        ["sightline", t("learn.playground.sightline")],
        ["moonSightline", t("learn.playground.moon_sightline")],
        ["moonTrail", t("learn.playground.moon_trail")],
        ["moonLap", t("learn.playground.month_gap")],
      ])}

      {/* Last, and its own section rather than a layer: it does not change what
          the scene shows, it reports what the scene costs. `docs/learn-playground.md`
          says what to do with the numbers. */}
      <View className="gap-1.5 border-t border-white/10 pt-2.5">
        <Text
          className="text-caption font-bold uppercase tracking-wide"
          style={[nepaliTextStyle(10), { color: withAlpha(neutral.white, 0.55) }]}
        >
          {t("ui.learn.measure")}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {chip(
            perfOpen,
            t("ui.learn.frame_rate"),
            () => setPerfOpen((v) => !v),
            "perf",
          )}
        </View>
      </View>
    </OverlaySheet>
  );

  /* Focus: which body the view is hung on, and whether the camera rides round
     with the orbit. One of three, because the scene can only be centred on one
     thing; the follow switch is a separate question about that same choice, so
     it lives with it rather than among the layers. */
  const focusSheet = (
    <OverlaySheet
      title={t("learn.playground.focus")}
      onClose={() => setSheet(null)}
      maxHeight={canvasHeight * 0.82}
    >
      <View className="flex-row flex-wrap gap-1.5">
        {(
          [
            ["meanSun", t("learn.playground.mean_sun")],
            ["sun", t("kundali.report.meta_sun")],
            ["planet", t("vastu.element.earth")],
          ] as [CameraTarget, string][]
        ).map(([key, label]) => chip(cameraTarget === key, label, () => setCameraTarget(key), key))}
      </View>
      <View className="flex-row flex-wrap gap-1.5 border-t border-white/10 pt-2.5">
        {chip(
          cameraFollow,
          t("learn.playground.follow_orbit"),
          () => setCameraFollow((v) => !v),
          "follow",
        )}
      </View>

      {/* Rate lives with focus, not with the orbit's own figures: it is about
          how the reader watches the thing, the same question the rest of this
          sheet answers. */}
      <View className="border-t border-white/10 pt-2.5">
        {slider(
          t("learn.playground.orbit_speed"),
          speed,
          `${num(SPEED_MULTIPLIERS[speed]!)}×`,
          0,
          SPEED_MULTIPLIERS.length - 1,
          1,
          (v) => setSpeed(Math.round(v)),
        )}
      </View>
    </OverlaySheet>
  );

  const body = (
    <View
      className={
        fullscreen
          ? "flex-1"
          : "my-3 overflow-hidden rounded-2xl border border-border bg-card"
      }
      style={{ backgroundColor: fullscreen ? CANVAS_BG : undefined }}
    >
      {!fullscreen ? (
        <View className="flex-row items-center justify-between border-b border-border/60 px-3 py-2">
          <Text
            className="text-caption flex-1 font-bold uppercase tracking-wide text-secondary"
            style={nepaliTextStyle(11)}
          >
            {title ?? t("ui.learn.sky_playground")}
          </Text>
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(10)}>
            {t("ui.learn.drag_to_rotate")}
          </Text>
        </View>
      ) : null}

      {/* The gesture view holds only the canvas and the things drawn over it
          that never take a touch. The panels below it are siblings rather than
          children on purpose: a `PanResponder` parent is consulted on every
          move a child has not already claimed, and a `Slider` inside it loses
          its drag to the camera about one time in three. Outside it, the sheets
          keep their own touches. */}
      <View style={{ height: canvasHeight }}>
      <View
        style={{ height: canvasHeight, backgroundColor: CANVAS_BG }}
        {...responder.panHandlers}
      >
        <Canvas
          camera={{ position: [0, 40, 26], fov: 46, near: 0.1, far: 600 }}
          gl={{ antialias: true, alpha: false, depth: true }}
          /* Capped: a 3× phone screen does not need a 3× framebuffer for a
             scene of lines and a few spheres, and fill rate is what costs
             battery here. Same cap the other learn diagrams use. */
          dpr={[1, 1.75]}
          onCreated={({ gl }) => gl.setClearColor(CANVAS_BG, 1)}
        >
          <Suspense fallback={null}>
            <Scene
              clock={clock}
              camera={camera}
              params={params}
              toggles={toggles}
              cameraTarget={cameraTarget}
              cameraFollow={cameraFollow}
              rashiNames={rashiNames}
              monthNames={monthNames}
              nakshatraNames={nakshatraNames}
              bodyNames={bodyNames}
              clockText={clockText}
              onLabels={setLabels}
              onSample={onSample}
              planetBody={planetBody}
            />
            <SceneReady onReady={() => setReady(true)} />
            {/* Last in the tree on purpose: `useFrame` runs in mount order, so
                this counts the sim's own work rather than racing it. */}
            {perfOpen ? <PerfMeter onSample={setPerf} /> : null}
          </Suspense>
        </Canvas>

        {/* Real Devanagari over the canvas, placed from the scene's own
            projection — see `playground-labels.ts`. */}
        <View pointerEvents="none" className="absolute inset-0">
          {labels.map((label) => (
            <PlaygroundLabelText key={label.id} label={label} />
          ))}
        </View>

        {!ready ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <VedicPatroLoader />
          </View>
        ) : null}

        {tour ? <DayChapterWelcome player={tour} /> : null}

        {/* Latin digits and a fixed-width feel on purpose: this is an
            instrument, not a reading, and a number that changes script with the
            app's language is harder to compare against a note in a doc. */}
        {perfOpen && perf ? (
          <View
            pointerEvents="none"
            className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2 py-1"
          >
            <Text className="text-caption font-bold" style={{ color: perfTone(perf) }}>
              {`${perf.fps.toFixed(0)} fps · worst ${perf.worstMs.toFixed(0)} ms`}
            </Text>
            <Text
              className="text-caption"
              style={{ color: withAlpha(neutral.white, 0.55) }}
            >
              {`${perf.drawCalls} draws · ${(perf.triangles / 1000).toFixed(1)}k tris`}
            </Text>
          </View>
        ) : null}

        {/* सूर्यको राशि, its बिक्रम month, and the equation of time. Off during
            a lesson unless the running chapter asks for it — see `showHud`. */}
        {showHud ? (
          <View
            pointerEvents="none"
            className="absolute left-2.5 rounded-lg bg-black/50 px-2.5 py-1.5"
            style={{ top: overlayTop }}
          >
            <Text
              className="text-caption font-bold uppercase tracking-wide"
              style={[nepaliTextStyle(9), { color: withAlpha(neutral.white, 0.5) }]}
            >
              {t("learn.playground.sun_rashi_month")}
            </Text>
            <Text
              className="text-caption font-bold"
              style={[nepaliTextStyle(13), { color: neutral.white }]}
            >
              {`${rashiNames[rashi]} · ${monthNames[rashi]}`}
            </Text>
            <Text
              className="text-caption font-bold"
              style={[nepaliTextStyle(13), { color: TONE.solar }]}
            >
              {`${eotMinutes >= 0 ? "+" : "−"}${num(Math.abs(eotMinutes).toFixed(1))} ${t("common.minutes")}`}
            </Text>
          </View>
        ) : null}

        {showHud && flash !== null ? (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 items-center"
            style={{ top: overlayTop }}
          >
            <View className="rounded-full border border-amber-400/60 bg-amber-500/25 px-3 py-1">
              <Text
                className="text-caption font-bold"
                style={[nepaliTextStyle(12), { color: illustration.amber77 }]}
              >
                {`${t("learn.playground.sankranti")} · ${rashiNames[flash]} · ${
                  monthNames[flash]
                } ${num(1)}`}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="absolute right-2.5 gap-2" style={{ top: overlayTop }}>
          <RoundButton
            icon="options"
            label={t("learn.playground.controls")}
            active={sheet === "controls"}
            onPress={() => setSheet((s) => (s === "controls" ? null : "controls"))}
          />
          {/* Focus has its own button rather than a section of the sheet: it is
              the control a reader reaches for while watching, and digging past
              four sliders for it every time was the wrong trade. */}
          <RoundButton
            icon="locate"
            label={t("learn.playground.focus")}
            active={sheet === "focus"}
            onPress={() => setSheet((s) => (s === "focus" ? null : "focus"))}
          />
          <RoundButton
            icon="stats-chart"
            label={t("learn.playground.eot_graph")}
            active={graphOpen}
            onPress={() => setGraphOpen((v) => !v)}
          />
          <RoundButton icon="add" label={t("ui.learn.zoom_in")} onPress={() => zoomBy(0.8)} />
          <RoundButton
            icon="remove"
            label={t("ui.learn.zoom_out")}
            onPress={() => zoomBy(1.25)}
          />
          <RoundButton icon="refresh" label={t("ui.learn.reset_view")} onPress={resetView} />
          <RoundButton
            icon={fullscreen ? "close" : "expand"}
            label={
              fullscreen ? t("ui.learn.exit_fullscreen") : t("ui.learn.fullscreen")
            }
            onPress={() => setFullscreen((f) => !f)}
          />
        </View>

        {/* The graph over the scene, not below it: it is read against the sim's
            own motion, so it has to be on screen at the same time as the thing
            it describes. */}
      </View>

      {graphOpen ? (
        <View
          className="absolute bottom-2.5 left-2.5 max-h-[70%] overflow-hidden rounded-xl border border-white/15 bg-black/85 p-2.5"
          style={{ width: "92%", maxWidth: 340 }}
        >
          <EotGraph
            eccentricity={eccentricity}
            tilt={tilt}
            dayOfYear={day}
            daysPerYear={daysPerYear}
          />
        </View>
      ) : null}

      {/* Under the corner readout, opposite the diagram panel — the three can
          all be up at once without stacking. */}
      {still ? (
        <ChapterStill key={still} src={still} captionKey={tourState?.stillKey || undefined} onClose={() => setStill("")} />
      ) : null}

      {tourState?.tip ? <ChapterTip key={tourState.tip} tipKey={tourState.tip} /> : null}

      {/* Opposite corner from the graph, so a chapter can raise both. */}
      {overlay ? <ChapterOverlay id={overlay} onClose={() => setOverlay("")} /> : null}

      {sheet === "controls" ? controlsSheet : null}
      {sheet === "focus" ? focusSheet : null}
      </View>

      <View
        className={
          fullscreen ? "absolute inset-x-0 bottom-0 gap-2 px-3 pt-2" : "gap-2 border-t border-border/60 px-3 py-2.5"
        }
        style={
          fullscreen
            ? {
                backgroundColor: withAlpha(wheel.sky2, 0.86),
                paddingBottom: Math.max(insets.bottom, 10),
              }
            : { backgroundColor: withAlpha(wheel.sky2, 0.92) }
        }
      >
        {tour ? (
          <DayChapterBar
            player={tour}
            orbitPlaying={playing}
            onOrbitToggle={() => {
              setPlaying((v) => {
                const next = !v;
                if (lesson) {
                  userDriving.current = next;
                  if (next) tour?.pause();
                }
                return next;
              });
            }}
          />
        ) : null}

        {filterChips}

        {showTransport ? (
          <View className="flex-row items-center gap-2">
            {tour ? null : (
              <Pressable
                onPress={() => setPlaying((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={playing ? t("panchanga.hora.pause") : t("panchanga.hora.play")}
                className="h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10"
              >
                <Ionicons name={playing ? "pause" : "play"} size={16} color={brand.offWhite} />
              </Pressable>
            )}
            <Slider
              style={{ flex: 1, height: 34 }}
              value={day}
              minimumValue={0}
              maximumValue={daysPerYear}
              onValueChange={(v) => {
                clock.current.day = v;
                setPlaying(false);
              }}
              minimumTrackTintColor={illustration.amber61}
              maximumTrackTintColor={withAlpha(illustration.sky65, 0.45)}
              thumbTintColor={illustration.amber61}
              accessibilityLabel={t("learn.playground.scrub_year")}
            />
            <Pressable
              onPress={() => setDetailsOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                detailsOpen ? t("learn.playground.hide_readings") : t("learn.playground.show_readings")
              }
              className="h-8 w-8 items-center justify-center rounded-full border border-white/20"
            >
              <Ionicons
                name={detailsOpen ? "chevron-down" : "chevron-up"}
                size={14}
                color={withAlpha(neutral.white, 0.75)}
              />
            </Pressable>
          </View>
        ) : null}

        {/* The three clock faces alone do not carry the point at speed: a year
            mode runs twelve rotations a second, so each face lands on a new
            random-looking time several times a second and the eye reads no
            pattern in them. What it *can* read is the gap — how far each clock
            has crept away from the mean one — because that only ever grows, and
            by year's end it is exactly the numbers the article is about: 24h for
            the sidereal clock (the extra turn), ±16 min for the true Sun (the
            equation of time). */}
        {showReadings && detailsOpen ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-stretch gap-2"
          >
            {(
              [
                [
                  "sidereal",
                  t("learn.playground.sidereal_day"),
                  readings.sidereal,
                  /* Counted in *turns*, not days. A year holds one more turn
                     than it holds days, and calling that 366th one "day 366" is
                     what makes the sidereal system look like a calendar with an
                     extra day in it. It is not a calendar at all — it is the
                     planet's rotation count against the stars. */
                  t("learn.playground.turn"),
                  counts.sidereal,
                  gapLabel(siderealGainMinutes),
                  dayLengths.sidereal,
                ],
                [
                  "solar",
                  t("learn.playground.true_solar_day"),
                  readings.solar,
                  t("common.day"),
                  counts.solar,
                  gapLabel(eotMinutes),
                  dayLengths.solar,
                ],
                [
                  "mean",
                  t("learn.playground.mean_solar_day"),
                  readings.mean,
                  t("common.day"),
                  counts.mean,
                  null,
                  dayLengths.mean,
                ],
              ] as const
            ).map(([tone, label, time, unit, count, gap, length]) => (
              <View key={tone} className="gap-0.5 rounded-lg border border-white/15 px-2.5 py-1.5">
                <Text
                  className="text-caption font-bold uppercase tracking-wide"
                  style={[nepaliTextStyle(9), { color: TONE[tone] }]}
                >
                  {label}
                </Text>
                <Text
                  className="text-caption font-bold"
                  style={[nepaliTextStyle(13), { color: neutral.white }]}
                >
                  {num(time)}
                </Text>
                <Text
                  className="text-caption"
                  style={[
                    nepaliTextStyle(10),
                    { color: withAlpha(neutral.white, 0.45) },
                  ]}
                >
                  {`${unit} ${num(count)}${gap ? ` · ${gap}` : ""}`}
                </Text>
                {/* The length of one such day. Every column carries one — the
                    mean day's flat 24h is what the other two are measured
                    against, so leaving it as prose said nothing. */}
                <Text
                  className="text-caption font-semibold"
                  style={[nepaliTextStyle(10), { color: TONE[tone] }]}
                >
                  {`${t("learn.playground.lasts")} ${lengthLabel(length)}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
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
      {/* Outside the provider tree — the theme tokens have to be re-applied or
          every chip in the control bar loses its colours. */}
      <View
        className={cn("flex-1", isDark && "dark")}
        style={[nativeWindThemeVars(isDark ? "dark" : "light"), { backgroundColor: CANVAS_BG }]}
      >
        {body}
      </View>
    </Modal>
  );
}

/**
 * A panel over the canvas, anchored to its bottom.
 *
 * The web floats a 290px drawer beside the scene. At phone width that is most
 * of the canvas, and it covers the part of the picture the sliders are
 * adjusting — so on this platform the panel takes the bottom of the card
 * instead, where the scene above it stays visible while a layer is switched.
 */
/**
 * Green / amber / red on the reading that actually decides whether it feels
 * broken — the worst frame, not the average.
 *
 * 20ms is about three frames at 60Hz and is where a stall starts to be visible
 * as a hitch; 40ms is where it reads as a stutter. The average has to be poor
 * *as well* to earn amber, so a scene holding 55fps with one 45ms frame still
 * shows red — which is the point, because that is exactly the shape a periodic
 * label pass would make.
 */
function perfTone(p: PerfSample): string {
  if (p.worstMs > 40) return illustration.red68;
  if (p.worstMs > 20 || p.fps < 45) return illustration.amber60;
  return illustration.green67b;
}

/** Mounts once the scene's textures have resolved — drops the loader. */
function SceneReady({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    onReady();
  }, [onReady]);
  return null;
}

function RoundButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      className="h-8 w-8 items-center justify-center rounded-full"
      style={{
        backgroundColor: active ? withAlpha(neutral.white, 0.85) : withAlpha(illustration.sky5, 0.55),
        borderWidth: 1,
        borderColor: active ? withAlpha(neutral.white, 0.7) : withAlpha(illustration.sky65, 0.35),
      }}
    >
      <Ionicons name={icon} size={15} color={active ? wheel.sky2 : brand.offWhite} />
    </Pressable>
  );
}

export default DayPlayground;
