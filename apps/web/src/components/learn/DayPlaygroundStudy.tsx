/**
 * The Learn playground — one scene, configured per topic.
 *
 * The scene carries the geometry; this file is the instrument panel around it.
 * Which layers open, what the play button moves and where the camera starts
 * all come from {@link @/lib/learn/playground-config}, so a topic about the
 * day opens spinning the planet with its three day-arcs showing, and one about
 * sankranti opens creeping along the राशि belt with the Sun's sightline lit.
 *
 * Nothing is taken away by that. The four group chips — बर्ष · सूर्य · दिन ·
 * अक्ष झुकाव — plus the belt chips reach every layer in the scene from any
 * topic, so a reader who wants the whole picture is one press from it. The
 * config decides the opening frame, not the ceiling.
 *
 * Following {@link ./TwoSystemsStudy}: the clock and camera live in refs and
 * are mutated by the render loop, so neither playing nor dragging re-renders
 * React. What React sees is a sample the scene hands back five times a second,
 * and the HUD and labels are drawn from that and nothing else.
 */

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Focus,
  LineChart,
  Maximize2,
  Minimize2,
  Orbit,
  Pause,
  Play,
  SlidersHorizontal,
} from "lucide-react";

import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import earthToonUrl from "@/assets/graha/earth-orig.png";
import { bilingualText, useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { cn } from "@/lib/utils";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/bs-calendar";
import { getRashiList } from "@vedic-patro/domain/rashi-i18n";
import { edRo, edRoK, edRoV } from "@/lib/learn-classes";
import { edScrub } from "@/lib/diagram-classes";
import { useFullscreen } from "@/lib/use-fullscreen";
import { RashiSkyGlyph } from "@/lib/sky3d/rashi-icons";
import { NAKSHATRA_ASTERISMS, NAKSHATRA_SHORT } from "@/lib/sky3d/nakshatra-stars";
import { NakshatraIcon } from "@/components/nakshatra/NakshatraIcon";
import {
  clocks,
  dayCounts,
  equationOfTime,
  euclideanModulo,
  meanAnomalyAt,
  MESHA_FROM_PERIHELION,
  PERIHELION,
  PLANET_PRESETS,
  VERNAL,
} from "@/lib/sky3d/day-mechanics";
import { mixMeddle, type Meddle } from "@/lib/learn/chapter-player";
import { adjacentTopicMetas } from "@/lib/learn/learn-topics-meta";
import {
  resolvePlayground,
  SPEED_MULTIPLIERS,
  type PlaygroundConfig,
} from "@/lib/learn/playground-config";
import { useChapterTrack } from "@/hooks/use-chapter-track";
import {
  cameraFromChapter,
  firstActiveAt,
  togglesFromChapter,
  type Chapter,
  type ChapterSimState,
} from "@/lib/learn/chapter-kit";
import { trackFor } from "@/lib/learn/chapter-tracks";
import { DayChapterBar, DayChapterWelcome } from "./DayChapterPlayer";
import { ChapterOverlay } from "./ChapterOverlay";
import { ChapterStill, ChapterTip } from "./ChapterStill";
import EotGraph from "./EotGraph";
import Scene, {
  labelPinCss,
  type CameraState,
  type CameraTarget,
  type PlaygroundGlobe,
  type SceneLabel,
  type ScenePick,
  type SceneSample,
  type SimClock,
  type SimToggles,
} from "./DaySimScene";

const CANVAS_BG = "#04070d";
const PI2 = Math.PI * 2;
const DEG = Math.PI / 180;

/** The 1× rung in {@link SPEED_MULTIPLIERS} — where every topic opens. */
const DEFAULT_SPEED_RUNG = SPEED_MULTIPLIERS.indexOf(1);

const TONE = {
  sidereal: "#6cb6f5",
  solar: "#e6e34a",
  mean: "#f0736a",
} as const;

const GOLD = "#d8c84a";

function clampPitch(p: number) {
  return Math.max(-1.45, Math.min(1.45, p));
}

/**
 * The four group chips, and which layers each one owns.
 *
 * A group is on when every layer it owns is on, and pressing it turns the
 * whole set on or off together. This is the level a reader actually thinks at
 * — "show me the year" — while the drawer's own per-layer chips underneath
 * still let them take one thing away. Used to live as an always-on row in the
 * toolbar; now it is the first section inside the settings drawer instead, so
 * it no longer competes for space with the transport controls on a phone.
 */
const GROUPS = {
  year: ["planetOrbit", "monthRing", "rashiBelt"],
  sun: ["trueSun", "sightline", "sunOrbit"],
  day: ["siderealArc", "solarArc", "meanArc", "primeMeridian"],
  tilt: ["degrees", "sunOrbit", "grid", "eotWedge", "meanSun", "axis"],
  moon: ["moon", "moonTrail", "moonLap", "moonSightline"],
} satisfies Record<string, (keyof SimToggles)[]>;

type GroupKey = keyof typeof GROUPS;

export interface DayPlaygroundStudyProps {
  /** The topic this playground belongs to — decides its opening state. */
  slug: string;
  config: PlaygroundConfig;
}

export function DayPlaygroundStudy({ slug, config }: DayPlaygroundStudyProps) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  // Only for bilingual fields that arrive as data (topic titles); all fixed copy
  // comes from the catalogue through `t`.
  const pick = (a: string, b: string) => bilingualText(lang, a, b);
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
    daysPerSecond: config.guided
      ? 0.35
      : initial.speed * SPEED_MULTIPLIERS[DEFAULT_SPEED_RUNG]!,
  });
  const camera = useRef<CameraState>({ ...initial.camera });
  const scenePick = useRef<ScenePick | null>(null);
  const cameraMeddle = useRef<Meddle<CameraState> | null>(null);
  const earthMeddle = useRef<Meddle<number> | null>(null);
  const gestureMode = useRef<"camera" | "earth" | null>(null);
  const wheelRelax = useRef(0);
  const clockText = useRef({ sidereal: "", solar: "", mean: "" });
  /* The label spans, by id. The scene moves these directly every frame; React
     only decides which exist and what they say. */
  const labelNodes = useRef<Map<string, HTMLElement>>(new Map());

  const [playing, setPlaying] = useState(false);
  /* The 1× rung — the pace this topic was tuned for. Below it sit the two
     slow rungs for watching a single day. */
  const [speed, setSpeed] = useState(DEFAULT_SPEED_RUNG);
  const [sample, setSample] = useState<SceneSample | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  /** A Learn diagram raised over the scene by the running chapter, by id. */
  const [overlay, setOverlay] = useState("");
  /** A still picture the running chapter is holding up, as a `public/` path. */
  const [still, setStill] = useState("");

  /** Which planet preset is showing in the drawer; `""` is this topic's own. */
  const [preset, setPreset] = useState("");
  /** Earth (and the topic default) keep the Moon. Other graha do not. */
  const hasMoon = preset === "" || preset === "earth";

  const [solarDaysPerYear, setSolarDaysPerYear] = useState(initial.params.daysPerYear - 1);
  const [eccentricity, setEccentricity] = useState(initial.params.eccentricity);
  const [tiltDeg, setTiltDeg] = useState(initial.params.tilt / DEG);

  const [cameraTarget, setCameraTarget] = useState<CameraTarget>("meanSun");
  const [cameraFollow, setCameraFollow] = useState(false);
  const [toggles, setToggles] = useState<SimToggles>(initial.toggles);

  /**
   * Reader overrides on a guided chapter.
   *
   * The tour writes camera target, layers and sliders from keyframes. Without
   * this, a focus or filter click lasted one frame and then snapped back —
   * including after `handsOff`, when the instruments are meant to work.
   * A new chapter clears the bag; seeking keeps what they chose.
   */
  const controlOverride = useRef<{
    cameraTarget?: CameraTarget;
    cameraFollow?: boolean;
    graphOpen?: boolean;
    overlay?: string;
    still?: string;
    toggles?: Partial<SimToggles>;
    solarDaysPerYear?: number;
    eccentricity?: number;
    tiltDeg?: number;
    preset?: string;
  }>({});
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const { active: fullscreen, ref: overlayRef, toggle: toggleFullscreen } = useFullscreen();

  const onToggleFullscreen = useCallback(() => {
    if (!fullscreen) setDetailsOpen(window.innerHeight >= 820);
    toggleFullscreen();
  }, [fullscreen, toggleFullscreen]);

  useEffect(() => {
    if (config.guided && !freePlay) return;
    clock.current.playing = playing;
  }, [playing, config.guided, freePlay]);
  /**
   * The pace of one rotation, at the 1× rung.
   *
   * {@link MODE_SPEED} is tuned per mode against that mode's own year: the day
   * mode's 0.2 turns a second is a year in forty-five seconds *because its year
   * is nine turns long*. A guided track moves between years — the ported
   * chapters run an eight-day one, the calendar chapters the real 365 — so a
   * fixed rate is a crawl in the second half. Scaling by how long this
   * chapter's year actually is keeps an orbit taking about the same wall-clock
   * time throughout, and leaves the ported chapters at exactly their old rate.
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
   * The reader pressed the orbit icon mid-narration.
   *
   * `s.handsOff` alone only goes true in the last second or two of a chapter
   * — that is the original's own script, not something to change — so a
   * reader who wants to nudge the animation themselves the rest of the time
   * has no such moment to press into. This is that moment, made on demand:
   * folded into the local `handsOff` the frame loop already branches on
   * below, it hands the clock and camera to the reader exactly the way the
   * scripted end-of-chapter hand-back does, just triggered by a click instead
   * of a keyframe. Cleared when the chapter changes or narration resumes.
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
      const now = performance.now();
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

      const targetDay = guidedDay + handsOffOffset.current;
      const em = earthMeddle.current;
      if (em && !welcome && !handsOff) {
        const mix = mixMeddle(now, targetDay, em);
        clock.current.day = mix.value;
        clock.current.playing = false;
        if (mix.done) earthMeddle.current = null;
      } else if (!welcome && !handsOff) {
        clock.current.day = targetDay;
      }

      const cm = cameraMeddle.current;
      if (cm && !welcome && !handsOff) {
        if (cm.frozen || cm.releasedAt === null) {
          camera.current.yaw = cm.value.yaw;
          camera.current.pitch = cm.value.pitch;
          camera.current.distance = cm.value.distance;
        } else {
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
  /* Narration resuming — the reader pressed the chapter's own play button —
     is what gives the script the clock back after {@link userDriving} took
     it. Without this the reader's orbit toggle stayed stuck on, silently
     fighting the keyframes the moment narration started moving again. */
  useEffect(() => {
    if (!tourPlaying) return;
    userDriving.current = false;
    setPlaying(false);
  }, [tourPlaying]);
  const tourChapterId = tour?.chapter.id;
  /* The chapter object itself, for the reset below. Held in a ref so the reset
     stays keyed on the *id* — it must run when the chapter changes and not on
     every sampled frame. */
  const tourChapterRef = useRef<Chapter | null>(null);
  tourChapterRef.current = tour?.chapter ?? null;
  useEffect(() => {
    cameraMeddle.current = null;
    earthMeddle.current = null;
    handsOffOffset.current = 0;
    wasHandsOff.current = false;
    userDriving.current = false;
    controlOverride.current = {};
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
       highlight-driven UI from `tour.state` elsewhere, but do not stomp
       focus, filters or sliders. */
    if (tourState.handsOff) return;
    const o = controlOverride.current;
    setSolarDaysPerYear(o.solarDaysPerYear ?? tourState.solarDaysPerYear);
    setEccentricity(o.eccentricity ?? tourState.eccentricity);
    setTiltDeg(o.tiltDeg ?? tourState.tiltDeg);
    setCameraTarget(o.cameraTarget ?? tourState.cameraTarget);
    setCameraFollow(o.cameraFollow ?? tourState.cameraFollow);
    setGraphOpen(o.graphOpen ?? tourState.graphOpen);
    setOverlay(o.overlay ?? tourState.overlay);
    setStill(o.still ?? tourState.still);
    setToggles({ ...togglesFromChapter(tourState), ...o.toggles });
    setPreset(o.preset ?? (tourState.planet === "earth" ? "" : tourState.planet));
  }, [tourState, tour?.chapter.free]);

  const highlightControl = tour?.state.highlightControl ?? "";
  /**
   * The timestamp a chapter's `handsOff` flips from "not started" to "genuine
   * hand-back" — see {@link firstActiveAt}. `null` means every `handsOff` this
   * chapter samples is the real thing (it never has a driven middle).
   */
  const chapterActiveAt = useMemo(
    () => (tour ? firstActiveAt(tour.chapter) : null),
    [tour?.chapter],
  );
  /**
   * `handsOff`, but only once the chapter has actually reached that point.
   *
   * `welcome`'s own `defaults` open on `handsOff: true` — the quiet start,
   * before the 55s reveal keyframe ever runs — which is the same value a
   * chapter's *end* hand-back samples to. Reading it raw made both the
   * transport bar below and the free-running clock think the chapter had
   * already finished, frame one.
   */
  const tourHandsOff =
    Boolean(tourState?.handsOff) &&
    (chapterActiveAt === null || (tour?.time ?? 0) >= chapterActiveAt);
  /**
   * What the chrome shows during a chapter.
   *
   * The ported Minute Labs chapters want a bare scene — that is what the
   * original does, and the corner readout and the clock columns would be
   * talking over the narration. The calendar chapters want the opposite: the
   * point of watching the Sun cross a boundary is reading which महिना just
   * began, and the point of a year is the count underneath it. So a chapter
   * asks, and outside a chapter everything is on.
   *
   * "Outside a chapter" means genuinely outside a track — a topic with no
   * `guided` config at all, which is most of them, and where this chrome is
   * the only UI the playground has. The track's own free/Playground entry is
   * not that: the reference lab's `/playground` route is bare — the scene and
   * its own controls, nothing below it — so `freePlay` is excluded here the
   * same as `lesson` is, rather than falling through to "everything is on."
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
  useEffect(() => {
    if (!highlightControl) return;
    if (highlightControl === "settings") {
      setControlsOpen(true);
      setFocusOpen(false);
    } else if (
      highlightControl === "camera-target" ||
      highlightControl === "follow-orbit" ||
      highlightControl === "orbit-speed"
    ) {
      setFocusOpen(true);
      setControlsOpen(false);
    }
  }, [highlightControl]);

  /* The free sim stops too. A WebGL canvas in a hidden tab still burns the
     frame budget it is given, and an orbit that ran on for two minutes out of
     sight is not where the reader left it. */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

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
   * the length is 24h minus the day's own change in it. Both the eccentricity
   * and the tilt slider move it, which is the point of having them.
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
  const nakshatraNames = useMemo(
    () => NAKSHATRA_SHORT.map((n) => (ne ? n.ne : n.en)),
    [ne],
  );
  /* The belt is labelled with the short forms — उत्तरभाद्रपदा is wider than its
     own 13°20′ — but the icon lookup needs the full name, so it travels
     alongside on the label's index. */
  const nakshatraFullNames = useMemo(
    () => NAKSHATRA_ASTERISMS.map((a) => a.ne),
    [],
  );
  const bodyNames = useMemo(
    () => ({
      planet: t(PLANET_NAME_KEYS[preset || "earth"] ?? "grahas.earth"),
      sun: t("grahas.sun"),
      meanSun: t("learn.playground.mean_sun"),
      moon: t("grahas.moon"),
      rahu: t("grahas.rahu"),
      ketu: t("grahas.ketu"),
    }),
    [t, preset],
  );

  const setToggle = useCallback(
    (k: keyof SimToggles) => {
      if (!hasMoon && (GROUPS.moon as readonly string[]).includes(k)) return;
      setToggles((prev) => {
        const next = { ...prev, [k]: !prev[k] };
        controlOverride.current.toggles = { ...controlOverride.current.toggles, [k]: next[k] };
        return next;
      });
    },
    [hasMoon],
  );

  const groupOn = useCallback(
    (g: GroupKey) => GROUPS[g].every((k) => toggles[k]),
    [toggles],
  );
  const pressGroup = useCallback(
    (g: GroupKey) => {
      if (g === "moon" && !hasMoon) return;
      setToggles((prev) => {
        const on = GROUPS[g].every((k) => prev[k]);
        const next = { ...prev };
        const bag = { ...controlOverride.current.toggles };
        for (const k of GROUPS[g]) {
          next[k] = !on;
          bag[k] = !on;
        }
        controlOverride.current.toggles = bag;
        return next;
      });
    },
    [hasMoon],
  );

  /** Empty key means this topic's own settings — the way back from a preset. */
  const applyPreset = useCallback(
    (key: string) => {
      setPreset(key);
      controlOverride.current.preset = key;
      const p = PLANET_PRESETS.find((x) => x.key === key);
      if (!p) {
        setToggles(initial.toggles);
        setSolarDaysPerYear(initial.params.daysPerYear - 1);
        setEccentricity(initial.params.eccentricity);
        setTiltDeg(initial.params.tilt / DEG);
        controlOverride.current.solarDaysPerYear = initial.params.daysPerYear - 1;
        controlOverride.current.eccentricity = initial.params.eccentricity;
        controlOverride.current.tiltDeg = initial.params.tilt / DEG;
        controlOverride.current.toggles = { ...initial.toggles };
        return;
      }
      const days = Math.max(1, Math.min(365, Math.round(p.daysPerYear - 1)));
      setSolarDaysPerYear(days);
      setEccentricity(p.eccentricity);
      setTiltDeg(p.tilt);
      controlOverride.current.solarDaysPerYear = days;
      controlOverride.current.eccentricity = p.eccentricity;
      controlOverride.current.tiltDeg = p.tilt;
      /* A borrowed graha has no Moon, so the lunar layers go with it. */
      if (key !== "earth") {
        setToggles((prev) => {
          const next = { ...prev };
          const bag = { ...controlOverride.current.toggles };
          for (const k of GROUPS.moon) {
            next[k] = false;
            bag[k] = false;
          }
          controlOverride.current.toggles = bag;
          return next;
        });
      }
    },
    [initial],
  );

  const { prev, next } = useMemo(() => adjacentTopicMetas(slug), [slug]);

  /* ── gestures ─────────────────────────────────────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });
  /**
   * Camera-drag inertia — `OrbitControls`' `enableDamping` / `dampingFactor`
   * from the reference lab's `day-sim.vue` (`controls.enableDamping = true;
   * controls.dampingFactor = 0.1`), which this scene has no OrbitControls
   * instance of its own to inherit it from.
   *
   * Free play only: a guided chapter's camera is owned by its keyframes, and
   * a grab there already has its own release behaviour — easing back to the
   * scripted value via `cameraMeddle`/`mixMeddle` — that independent coasting
   * would fight. So `cameraGrabbed` only ever turns on when {@link
   * tourFreeRef} is true, and the reference to it stays exactly `{yaw:0,
   * pitch:0}` — inert — everywhere else.
   */
  const cameraVelocity = useRef({ yaw: 0, pitch: 0 });
  const cameraGrabbed = useRef(false);
  const dragSample = useRef({ t: 0, yaw: 0, pitch: 0 });

  const reanchor = useCallback(() => {
    gestureStart.current = { ...camera.current, pinch: 0 };
    const first = pointers.current.values().next();
    if (!first.done) dragOrigin.current = { ...first.value };
  }, []);

  const canvasWrap = useRef<HTMLDivElement | null>(null);

  const grabCamera = useCallback(() => {
    if (tourFreeRef.current) return;
    cameraMeddle.current = {
      frozen: true,
      releasedAt: null,
      value: { ...camera.current },
    };
  }, []);
  const releaseCamera = useCallback(() => {
    if (tourFreeRef.current) return;
    const slot = cameraMeddle.current;
    if (!slot) return;
    slot.frozen = false;
    slot.releasedAt = performance.now();
    slot.value = { ...camera.current };
  }, []);

  useEffect(() => {
    const el = canvasWrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      /* A wheel over an open drawer should scroll it, not zoom the camera
         underneath — same reasoning as the pointer-down bail-out above. */
      if ((e.target as HTMLElement | null)?.closest?.("[data-ui-panel]")) return;
      e.preventDefault();
      camera.current.distance = Math.min(
        130,
        Math.max(4, camera.current.distance * Math.exp(e.deltaY * 0.0012)),
      );
      grabCamera();
      window.clearTimeout(wheelRelax.current);
      wheelRelax.current = window.setTimeout(releaseCamera, 160);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelRelax.current);
    };
  }, [fullscreen, grabCamera, releaseCamera]);

  const canvasHeight = fullscreen ? "100%" : "clamp(380px, 58vh, 620px)";

  /* ── pieces ───────────────────────────────────────────────────────── */

  /** A signed gap in minutes as `+6h 18m` / `−12 min`. */
  const gapLabel = (minutes: number) => {
    /* Rounded before the sign is taken, so a gap of −0.1 min reads `0 min`
       rather than the nonsense `−0 min`. */
    const whole = Math.round(minutes);
    const sign = whole < 0 ? "−" : whole > 0 ? "+" : "";
    const abs = Math.abs(whole);
    const h = Math.floor(abs / 60);
    const m = abs - h * 60;
    return {
      sign,
      text: h > 0 ? `${h}${t("common.hour_short")} ${m}${t("common.minute_short")}` : `${m} ${t("common.minutes")}`,
    };
  };

  /** A duration in minutes as `23h 56m 04s` — seconds included because the true
      solar day only ever moves in that last column. */
  const lengthLabel = (minutes: number) => {
    const total = Math.round(minutes * 60);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total - h * 3600) / 60);
    const s = total - h * 3600 - m * 60;
    return `${h}${t("common.hour_short")} ${String(m).padStart(2, "0")}${t("common.minute_short")} ${String(s).padStart(2, "0")}${t("common.second_short")}`;
  };

  const chip = (
    active: boolean,
    label: string,
    onPress: () => void,
    key?: string,
    disabled?: boolean,
  ) => (
    <button
      key={key ?? label}
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "h-[28px] rounded-full border px-2.5 text-xs font-semibold transition-colors",
        disabled
          ? "cursor-not-allowed border-white/10 bg-transparent text-white/30"
          : active
            ? "cursor-pointer border-transparent bg-white/85 text-black"
            : "cursor-pointer border-white/20 bg-transparent text-white/60 hover:border-white/45 hover:text-white",
      )}
    >
      {label}
    </button>
  );

  /**
   * One card of layer switches, all serving the same action — "show me the
   * year," "show me the tilt." Replaces two things that used to be separate
   * and disconnected: a flat row of four bulk chips up top, and a
   * `Guides`/`Elements`/`Indicators`/`Clocks` breakdown below it grouped by
   * how a layer is *drawn* rather than what it is *for* (the grid, an
   * unrelated guide, sat next to the orbit; the Sun's own arc sat three
   * sections away from the Sun's own bulk chip). Each card now carries its
   * own bulk toggle right in its header, next to the individual layers it
   * covers — so switching a whole group and fine-tuning one layer within it
   * are the same gesture, in the same place.
   *
   * A third element in an item is the layer it rides on. The three clock
   * faces are drawn on their arcs, so a face with its arc off has nowhere to
   * sit — greyed for exactly that reason rather than letting a reader turn on
   * a clock that cannot appear.
   */
  const actionGroup = (
    g: GroupKey,
    title: string,
    items: ([keyof SimToggles, string] | [keyof SimToggles, string, keyof SimToggles])[],
  ) => (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
          {title}
        </span>
        {chip(groupOn(g), t("learn.playground.all"), () => pressGroup(g), `all-${g}`, g === "moon" && !hasMoon)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([k, label, needs]) =>
          chip(
            toggles[k],
            label,
            () => setToggle(k),
            k,
            (!hasMoon && (GROUPS.moon as readonly string[]).includes(k)) ||
              (needs !== undefined && !toggles[needs]),
          ),
        )}
      </div>
    </div>
  );

  const slider = (
    label: string,
    value: number,
    display: string,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    /* A plain block, not a flex column. `edScrub` carries `flex-1`, and a flex
       item in a column gets `min-height: auto` — the automatic minimum size,
       which pins a range input to its intrinsic 17px thumb and overrides the
       5px height outright. With no flex container there is no such minimum. */
  ) => (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
        {label}
        <span className="font-num text-xs normal-case tracking-normal tabular-nums text-white/85">
          {display}
        </span>
      </span>
      <input
        type="range"
        className={cn(edScrub, "ed-scrub-dark")}
        /* Without `--fill` the track's gradient sits at its CSS default and
           never follows the thumb — the contract every scrub in the app has. */
        style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );

  const navButton = (dir: "prev" | "next") => {
    const topic = dir === "prev" ? prev : next;
    if (!topic) return null;
    return (
      <Link
        to="/learn/$slug"
        params={{ slug: topic.slug }}
        className="flex max-w-[42vw] items-center gap-1 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur hover:border-white/50 hover:text-white"
        title={pick(topic.titleNe, topic.titleEn)}
      >
        {dir === "prev" && <ChevronLeft size={14} className="shrink-0" />}
        <span className="truncate">{pick(topic.titleNe, topic.titleEn)}</span>
        {dir === "next" && <ChevronRight size={14} className="shrink-0" />}
      </Link>
    );
  };

  const body = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--tm-border)]",
        fullscreen && "flex h-full flex-col rounded-none border-0",
      )}
      style={{ background: CANVAS_BG }}
    >
      <div
        ref={canvasWrap}
        className={cn("relative w-full touch-none", fullscreen && "min-h-0 flex-1")}
        style={fullscreen ? undefined : { height: canvasHeight }}
        onPointerDown={(e) => {
          /* `[data-ui-panel]` covers the floating drawers (controls, focus,
             graph): the canvas's own `touch-none` blocks native scrolling
             everywhere under it unless a descendant opts back in, and a
             touch landing on the drawer's padding or a section label — not
             literally a button — still needs to start a scroll instead of a
             camera drag. Bailing out here on the whole panel is what lets
             `touch-auto` on it (below) actually do anything. */
          if ((e.target as HTMLElement | null)?.closest?.("button, input, a, [data-ui-panel]")) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const rect = canvasWrap.current?.getBoundingClientRect();
          const onEarth = Boolean(
            rect && scenePick.current?.hitsPlanet(e.clientX, e.clientY, rect),
          );
          gestureMode.current = onEarth ? "earth" : "camera";
          if (onEarth) {
            if (!tourFreeRef.current) {
              earthMeddle.current = {
                frozen: true,
                releasedAt: null,
                value: clock.current.day,
              };
            }
            clock.current.playing = false;
          } else {
            grabCamera();
            if (tourFreeRef.current) {
              cameraVelocity.current = { yaw: 0, pitch: 0 };
              cameraGrabbed.current = true;
              dragSample.current = { t: performance.now(), yaw: camera.current.yaw, pitch: camera.current.pitch };
            }
          }
          reanchor();
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const live = [...pointers.current.values()];
          if (live.length >= 2) {
            const [a, b] = live;
            const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
            if (!d) return;
            if (!gestureStart.current.pinch) gestureStart.current.pinch = d;
            camera.current.distance = Math.min(
              130,
              Math.max(4, gestureStart.current.distance * (gestureStart.current.pinch / d)),
            );
            gestureMode.current = "camera";
            grabCamera();
            return;
          }
          if (gestureMode.current === "earth") {
            const rect = canvasWrap.current?.getBoundingClientRect();
            const M = rect ? scenePick.current?.anomalyAt(e.clientX, e.clientY, rect) : null;
            if (M !== null && M !== undefined) {
              const dpy = solarDaysPerYear + 1;
              const frac = euclideanModulo((M - MESHA_FROM_PERIHELION) / PI2, 1);
              const years = Math.floor(clock.current.day / dpy);
              const day = years * dpy + frac * dpy;
              clock.current.day = day;
              clock.current.playing = false;
              if (!tourFreeRef.current) {
                earthMeddle.current = { frozen: true, releasedAt: null, value: day };
              }
            }
            return;
          }
          const dx = e.clientX - dragOrigin.current.x;
          const dy = e.clientY - dragOrigin.current.y;
          camera.current.yaw = gestureStart.current.yaw - dx * 0.006;
          camera.current.pitch = clampPitch(gestureStart.current.pitch + dy * 0.005);
          if (cameraMeddle.current) {
            cameraMeddle.current.frozen = true;
            cameraMeddle.current.value = { ...camera.current };
          }
          if (cameraGrabbed.current) {
            const now = performance.now();
            const dt = (now - dragSample.current.t) / 1000;
            /* A few ms of jitter between pointer events would divide by
               near-nothing and throw the velocity to the moon; below that,
               just keep the last good reading rather than sample. */
            if (dt > 0.008) {
              /* Clamped well above anything a real drag produces — only there
                 to stop one freak sample (a tab-switch stutter between two
                 pointer events, say) from flinging the camera into a spin. */
              const clampRate = (r: number) => Math.max(-15, Math.min(15, r));
              cameraVelocity.current = {
                yaw: clampRate((camera.current.yaw - dragSample.current.yaw) / dt),
                pitch: clampRate((camera.current.pitch - dragSample.current.pitch) / dt),
              };
              dragSample.current = { t: now, yaw: camera.current.yaw, pitch: camera.current.pitch };
            }
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size === 0) {
            if (tourFreeRef.current) {
              clock.current.playing = playingStateRef.current;
            } else if (gestureMode.current === "earth" && earthMeddle.current) {
              earthMeddle.current.frozen = false;
              earthMeddle.current.releasedAt = performance.now();
              earthMeddle.current.value = clock.current.day;
            } else if (gestureMode.current === "camera") {
              releaseCamera();
              cameraGrabbed.current = false;
            }
            gestureMode.current = null;
          }
          reanchor();
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size === 0) {
            if (tourFreeRef.current) {
              clock.current.playing = playingStateRef.current;
            } else if (gestureMode.current === "earth" && earthMeddle.current) {
              earthMeddle.current.frozen = false;
              earthMeddle.current.releasedAt = performance.now();
              earthMeddle.current.value = clock.current.day;
            } else if (gestureMode.current === "camera") {
              releaseCamera();
              cameraGrabbed.current = false;
            }
            gestureMode.current = null;
          }
          reanchor();
        }}
      >
        <Canvas
          camera={{ position: [0, 40, 26], fov: 46, near: 0.1, far: 600 }}
          gl={{ antialias: true, alpha: false, depth: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(CANVAS_BG, 1);
            gl.setClearAlpha(1);
          }}
        >
          <Suspense fallback={null}>
            <Scene
              clock={clock}
              camera={camera}
              cameraVelocity={cameraVelocity}
              cameraGrabbed={cameraGrabbed}
              params={params}
              toggles={toggles}
              cameraTarget={cameraTarget}
              cameraFollow={cameraFollow}
              rashiNames={rashiNames}
              monthNames={monthNames}
              nakshatraNames={nakshatraNames}
              nakshatraFullNames={nakshatraFullNames}
              bodyNames={bodyNames}
              clockText={clockText}
              labelNodes={labelNodes}
              onSample={onSample}
              planetBody={(preset || "earth") as PlaygroundGlobe}
              pick={scenePick}
              highlight={tour?.state.highlight ?? ""}
            />
          </Suspense>
        </Canvas>

        <div className="pointer-events-none absolute inset-0">
          {sample?.labels.map((l) => (
            <Label key={l.id} label={l} nodes={labelNodes} />
          ))}
        </div>

        {tour ? <DayChapterWelcome player={tour} /> : null}

        {showHud ? (
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-white/15 bg-black/45 px-2.5 py-1.5 backdrop-blur sm:left-3 sm:top-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
              {t("learn.playground.sun_rashi_month")}
            </div>
            <div className="text-sm font-bold text-white">
              {rashiNames[rashi]} · {monthNames[rashi]}
            </div>
            <div className="mt-1 font-num text-sm font-bold tabular-nums" style={{ color: TONE.solar }}>
              {eotMinutes >= 0 ? "+" : "−"}
              {num(Math.abs(eotMinutes).toFixed(1))}
              <span className="ml-1 text-[10px] font-semibold text-white/50">
                {t("common.minutes")}
              </span>
            </div>
          </div>
        ) : null}

        {!showHud || flash === null ? null : (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-100 backdrop-blur">
            {t("learn.playground.sankranti")} · {rashiNames[flash]} · {monthNames[flash]} {num(1)}
          </div>
        )}

        <div className="absolute right-3 top-3 flex gap-2">
          {/* Live in every chapter, not only once the script hands off on its
             own: a reader who pauses mid-narration and wants to nudge the
             animation themselves needs this the whole time, not just in the
             last second before the chapter ends. Pressing it during a lesson
             pauses narration and hands the clock to {@link userDriving};
             narration resuming (the reader presses its own play button)
             hands it back. */}
          {tour ? (
            <IconButton
              onClick={() => {
                setPlaying((v) => {
                  const next = !v;
                  if (lesson) {
                    userDriving.current = next;
                    if (next) tour?.pause();
                  }
                  return next;
                });
              }}
              label={playing ? t("learn.pause") : t("learn.play")}
              active={playing}
              pulse={highlightControl === "auto-orbit"}
            >
              <Orbit size={16} />
            </IconButton>
          ) : null}
          <IconButton
            onClick={() => {
              setControlsOpen((v) => !v);
              setFocusOpen(false);
            }}
            label={t("learn.playground.controls")}
            active={controlsOpen}
            pulse={highlightControl === "settings"}
          >
            <SlidersHorizontal size={16} />
          </IconButton>
          <IconButton
            onClick={() => {
              setFocusOpen((v) => !v);
              setControlsOpen(false);
            }}
            label={t("learn.playground.focus")}
            active={focusOpen}
            pulse={
              highlightControl === "camera-target" ||
              highlightControl === "follow-orbit" ||
              highlightControl === "orbit-speed"
            }
          >
            <Focus size={16} />
          </IconButton>
          <IconButton
            onClick={() => {
              setGraphOpen((v) => {
                controlOverride.current.graphOpen = !v;
                return !v;
              });
            }}
            label={t("learn.playground.eot_graph")}
            active={graphOpen}
            pulse={highlightControl === "graph"}
          >
            <LineChart size={16} />
          </IconButton>
          <IconButton
            onClick={onToggleFullscreen}
            label={fullscreen ? t("common.exit_fullscreen") : t("common.fullscreen")}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </div>

        {/* Capped against the canvas, not the viewport: the drawer floats over
            the scene, so a 70vh panel on a short canvas would hang off the
            bottom of the thing it belongs to. */}
        {controlsOpen && (
          <div
            data-ui-panel
            className="absolute right-3 top-14 z-10 flex max-h-[calc(100%-4.5rem)] w-[min(290px,calc(100%-1.5rem))] touch-auto flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-black/85 p-3 backdrop-blur"
          >
            {/* A native select, not a grid of six buttons: on a phone that
                grid alone was two full rows before a single other layer was
                reachable, in a panel that already has to hold four sliders
                and four more sections below it. A select is one row at any
                count, and on a touch device it hands the whole picking job
                to the OS's own sheet — nothing here to fight the drawer's
                scroll the way a custom dropdown would. */}
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
                {t("learn.playground.planet")}
              </span>
              <div className="flex items-center gap-2">
                <img
                  src={
                    preset === "" || preset === "earth"
                      ? earthToonUrl
                      : GRAHA_PLANET_ICON_URL[preset as keyof typeof GRAHA_PLANET_ICON_URL]
                  }
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover"
                />
                <select
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-sm font-semibold text-white [color-scheme:dark] focus:border-white/40 focus:outline-none"
                >
                  <option value="">{t("learn.playground.back_to_topic")}</option>
                  {PLANET_PRESETS.map((p) => (
                    <option key={p.key} value={p.key} className="bg-black text-white">
                      {t(PLANET_NAME_KEYS[p.key] ?? p.key)}
                    </option>
                  ))}
                </select>
              </div>
              {/* The caveat the reference lab puts behind a "read this" modal.
                  It is two sentences and it is the difference between the
                  presets teaching something and quietly lying, so it sits
                  under the picker rather than behind another click. */}
              <p className="mt-1.5 text-[10px] leading-snug text-white/45">
                {t("learn.playground.preset_caveat")}
              </p>
            </div>

            {slider(
              t("learn.playground.solar_days_per_year"),
              solarDaysPerYear,
              num(solarDaysPerYear),
              1,
              365,
              1,
              (v) => {
                controlOverride.current.solarDaysPerYear = v;
                setSolarDaysPerYear(v);
              },
            )}
            {slider(
              t("learn.playground.eccentricity"),
              eccentricity,
              num(eccentricity.toFixed(3)),
              0,
              0.4,
              0.001,
              (v) => {
                controlOverride.current.eccentricity = v;
                setEccentricity(v);
              },
            )}
            {slider(
              t("learn.playground.axial_tilt"),
              tiltDeg,
              `${num(tiltDeg.toFixed(1))}°`,
              0,
              90,
              0.1,
              (v) => {
                controlOverride.current.tiltDeg = v;
                setTiltDeg(v);
              },
            )}

            {/* Five cards, one per action — everything that turns the year on,
                everything that turns the Sun on, and so on. Each card's own
                header chip is the bulk switch for exactly the layers listed
                under it; nothing here is a shortcut to something kept
                somewhere else. `sunOrbit` is the one layer that honestly
                belongs to two of these (the Sun's own path, and what a tilt
                exploration needs to show it moving) and appears in both. */}
            {actionGroup("year", t("learn.playground.year"), [
              ["planetOrbit", t("learn.playground.orbit")],
              ["monthRing", t("learn.playground.months")],
              ["rashiBelt", t("learn.playground.rashi")],
            ])}
            {actionGroup("sun", t("grahas.sun"), [
              ["trueSun", t("learn.playground.true_sun")],
              ["sunOrbit", t("learn.playground.sun_path")],
              ["sightline", t("learn.playground.sightline")],
            ])}
            {/* The three arcs, the meridian they're measured against, and the
                clock faces that ride them — everything about the length of a
                day in one place. */}
            {actionGroup("day", t("learn.playground.day"), [
              ["siderealArc", t("learn.playground.sidereal_arc")],
              ["solarArc", t("learn.playground.solar_arc")],
              ["meanArc", t("learn.playground.mean_arc")],
              ["primeMeridian", t("learn.playground.kathmandu_meridian")],
              ["siderealClock", t("learn.playground.sidereal_clock"), "siderealArc"],
              ["solarClock", t("learn.playground.solar_clock"), "solarArc"],
              ["meanClock", t("learn.playground.mean_clock"), "meanArc"],
            ])}
            {actionGroup("tilt", t("learn.playground.tilt"), [
              ["degrees", t("learn.playground.degrees")],
              ["grid", t("learn.playground.grid")],
              ["sunOrbit", t("learn.playground.sun_path")],
              ["eotWedge", t("learn.playground.eot_wedge")],
              ["meanSun", t("learn.playground.mean_sun")],
              ["axis", t("learn.playground.spin_axis")],
            ])}
            {actionGroup("moon", t("grahas.moon"), [
              ["moon", t("grahas.moon")],
              ["moonTrail", t("learn.playground.moon_trail")],
              ["moonLap", t("learn.playground.month_gap")],
              ["moonSightline", t("learn.playground.moon_sightline")],
              ["nakshatraBelt", t("nakshatra")],
            ])}
          </div>
        )}

        {/* Focus: which body the view is hung on, and whether the camera rides
            round with the orbit. Radio, because the scene can only be centred
            on one thing; the follow switch is a separate question about that
            same choice, so it lives with it rather than among the layers. */}
        {focusOpen && (
          <div
            data-ui-panel
            className="absolute right-3 top-14 z-10 flex w-[min(230px,calc(100%-1.5rem))] touch-auto flex-col gap-2.5 rounded-xl border border-white/15 bg-black/85 p-3.5 backdrop-blur"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
              {t("learn.playground.focus")}
            </span>
            <div className="flex flex-col gap-1">
              {(
                [
                  ["meanSun", t("learn.playground.mean_sun")],
                  ["sun", t("grahas.sun")],
                  ["planet", bodyNames.planet],
                ] as [CameraTarget, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs font-semibold text-white/70 hover:text-white",
                    highlightControl === "camera-target" && "animate-pulse bg-sky-400/25 text-white",
                  )}
                >
                  <input
                    type="radio"
                    name="playground-focus"
                    className="size-3.5 accent-white"
                    checked={cameraTarget === key}
                    onChange={() => {
                      controlOverride.current.cameraTarget = key;
                      setCameraTarget(key);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 border-t border-white/10 pt-2.5 text-xs font-semibold text-white/70 hover:text-white",
                highlightControl === "follow-orbit" && "animate-pulse text-white",
              )}
            >
              <input
                type="checkbox"
                className="size-3.5 accent-white"
                checked={cameraFollow}
                onChange={() => {
                  setCameraFollow((v) => {
                    const next = !v;
                    controlOverride.current.cameraFollow = next;
                    return next;
                  });
                }}
              />
              {t("learn.playground.follow_orbit")}
            </label>

            {/* Rate lives with focus, not with the orbit's own figures: it is
                about how the reader watches the thing, the same question the
                rest of this menu answers. */}
            <div
              className={cn(
                "border-t border-white/10 pt-2.5",
                highlightControl === "orbit-speed" && "animate-pulse",
              )}
            >
              {slider(
                t("learn.playground.orbit_speed"),
                speed,
                `${num(SPEED_MULTIPLIERS[speed]!)}×`,
                0,
                SPEED_MULTIPLIERS.length - 1,
                1,
                (v) => setSpeed(Math.round(v)),
              )}
            </div>
          </div>
        )}

        {/* The graph over the scene, not buried in the panel below it: it is
            read against the sim's own motion, so it has to be on screen at the
            same time as the thing it is describing. */}
        {graphOpen && (
          <div
            data-ui-panel
            className="absolute bottom-3 left-3 z-10 w-[min(320px,calc(100%-1.5rem))] max-h-[calc(100%-4.5rem)] touch-auto overflow-y-auto rounded-xl border border-white/15 bg-black/85 p-2.5 text-white backdrop-blur"
          >
            <EotGraph
              eccentricity={eccentricity}
              tilt={tilt}
              dayOfYear={day}
              daysPerYear={daysPerYear}
            />
          </div>
        )}

        {/* Under the corner readout, opposite the diagram panel — the three
            can all be up at once without stacking. */}
        {still ? (
          <ChapterStill
            key={still}
            src={still}
            captionKey={tourState?.stillKey || undefined}
            onClose={() => {
              controlOverride.current.still = "";
              setStill("");
            }}
          />
        ) : null}

        {tourState?.tip ? <ChapterTip key={tourState.tip} tipKey={tourState.tip} /> : null}

        {/* Opposite corner from the graph, so a chapter can raise both. */}
        {overlay ? (
          <ChapterOverlay
            id={overlay}
            onClose={() => {
              controlOverride.current.overlay = "";
              setOverlay("");
            }}
          />
        ) : null}

        {lesson || fullscreen ? null : (
          <p className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/45">
            {t("learn.playground.drag_hint")}
          </p>
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 border-t border-white/10 bg-black/30 px-3.5 py-3 text-white",
          fullscreen &&
            "shrink-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          fullscreen && (detailsOpen ? "max-h-[46vh]" : "max-h-none"),
        )}
      >
        {/* Prev / next topic. In the panel, not floating over the canvas: down
            there they landed on top of the transport controls on a phone. */}
        {fullscreen && (prev || next) && (
          <div className="flex items-center justify-between gap-2">
            {navButton("prev") ?? <span />}
            {navButton("next") ?? <span />}
          </div>
        )}

        {tour ? <DayChapterBar player={tour} /> : null}

        {showTransport && (
          <>
            <div className="flex w-full items-center gap-2.5 sm:gap-3">
              {tour ? null : (
                <button
                  type="button"
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:border-white/60 hover:bg-white/20"
                  onClick={() => setPlaying((v) => !v)}
                  aria-label={playing ? t("learn.pause") : t("learn.play")}
                >
                  {playing ? (
                    <Pause size={18} fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Play size={18} fill="currentColor" strokeWidth={0} className="ml-[2px]" />
                  )}
                </button>
              )}
              <input
                type="range"
                className={cn(edScrub, "ed-scrub-dark")}
                style={{ "--fill": `${(day / daysPerYear) * 100}%` } as React.CSSProperties}
                min={0}
                max={daysPerYear}
                step={0.001}
                value={day}
                onChange={(e) => {
                  clock.current.day = Number(e.target.value);
                  setPlaying(false);
                }}
                aria-label={t("learn.playground.scrub_year")}
              />
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 text-white/70 hover:border-white/45 hover:text-white"
                aria-label={detailsOpen ? t("learn.playground.hide_readings") : t("learn.playground.show_readings")}
              >
                {detailsOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>
            </div>
          </>
        )}

        {showReadings && detailsOpen && (
          <>
            {/* The three clock faces alone do not carry the point at speed: a
                year mode runs twelve rotations a second, so each face lands on
                a new random-looking time five times a second and the eye reads
                no pattern in them at all. What it *can* read is the gap — how
                far each clock has crept away from the mean one — because that
                only ever grows, and by year's end it is exactly the numbers the
                article is about: 24h for the sidereal clock (the extra turn),
                ±16 min for the true Sun (the equation of time). */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
              {(
                [
                  [
                    "sidereal",
                    t("learn.playground.sidereal_day"),
                    readings.sidereal,
                    /* Counted in *turns*, not days. A year holds one more turn
                       than it holds days, and calling that 366th one "day 366"
                       is what makes the sidereal system look like a calendar
                       with an extra day in it. It is not a calendar at all — it
                       is the planet's rotation count against the stars. */
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
                <div key={tone} className={edRo}>
                  <span className={edRoK} style={{ color: TONE[tone] }}>
                    {label}
                  </span>
                  <span className={cn(edRoV({ mono: true }), "!text-white")}>{num(time)}</span>
                  <span className="font-num text-xs tabular-nums text-white/45">
                    {unit} {num(count)}
                    {gap ? ` · ${gap.sign}${num(gap.text)}` : ""}
                  </span>
                  {/* The length of one such day. Every column carries one — the
                      mean day's flat 24h is what the other two are measured
                      against, so leaving it as prose said nothing. */}
                  <span
                    className="font-num text-xs font-semibold tabular-nums"
                    style={{ color: TONE[tone] }}
                  >
                    <span className="mr-1 font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">
                      {t("learn.playground.lasts")}{" "}
                    </span>
                    {num(lengthLabel(length))}
                  </span>
                </div>
              ))}
            </div>

          </>
        )}
      </div>
    </div>
  );

  if (!fullscreen) return <div className="mt-5">{body}</div>;

  /*
   * Portalled to <body>, not rendered where it sits.
   *
   * The article body is `relative z-[1]`, which opens a stacking context — and
   * a fixed layer inside one can never rise above a sibling of that context, so
   * the z-50 sticky header and the z-50 mobile bottom nav stayed on top of the
   * "fullscreen" view. Any transformed or filtered ancestor also becomes the
   * containing block for `position: fixed`, so `inset-0` covered that
   * ancestor's box rather than the viewport. A portal to <body> escapes both,
   * and z-[100] clears the app chrome. Same fix as {@link ./TwoSystemsStudy}.
   */
  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-dashed border-[var(--tm-border)] px-4 py-8 text-center text-sm text-[var(--tm-ink-faint)]">
        {t("learn.playground.fullscreen_notice")}
      </div>
      {createPortal(
        <div
          ref={overlayRef}
          /* `tm-tokens`: the overlay lives on <body>, outside the article's
             `.tm-page`, and without it every `var(--tm-*)` in here resolves to
             nothing — the scrub tracks are a gradient made of `--tm-amber`, so
             they came out as invisible 5px strips. */
          className="tm-tokens fixed inset-0 z-[100] overscroll-contain"
          style={{ background: CANVAS_BG }}
        >
          {body}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Earth plus the five graha the eye can see. No Uranus, no Neptune. */
const PLANET_NAME_KEYS: Record<string, string> = {
  earth: "grahas.earth",
  mars: "grahas.mars",
  mercury: "grahas.mercury",
  jupiter: "grahas.jupiter",
  venus: "grahas.venus",
  saturn: "grahas.saturn",
};

function IconButton({
  onClick,
  label,
  active,
  pulse,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  pulse?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 cursor-pointer place-items-center rounded-full border backdrop-blur transition-colors",
        active
          ? "border-white/60 bg-white/85 text-black"
          : "border-white/20 bg-black/40 text-white/80 hover:border-white/50 hover:text-white",
        pulse && "animate-pulse ring-2 ring-sky-300 ring-offset-2 ring-offset-black",
        disabled && "cursor-not-allowed opacity-35",
      )}
    >
      {children}
    </button>
  );
}

const Label = memo(function Label({
  label,
  nodes,
}: {
  label: SceneLabel;
  nodes: React.MutableRefObject<Map<string, HTMLElement>>;
}) {
  const isRashi = label.kind === "rashi";
  const isNak = label.kind === "nakshatra";
  const color =
    label.tone
      ? TONE[label.tone]
      : isRashi
        ? GOLD
        : label.kind === "nakshatra"
          ? "#8fb6d8"
          : label.kind === "month"
            ? "#e3d9a8"
            : label.id === "b-rahu"
              ? "#c4b5fd"
              : label.id === "b-ketu"
                ? "#fb7185"
                : "#ffffff";
  return (
    <span
      ref={(el) => {
        if (el) nodes.current.set(label.id, el);
        else nodes.current.delete(label.id);
      }}
      className={cn(
        /* No `transition`: the scene rewrites the transform every frame, and
           easing between frames would smear the text behind the bodies. */
        "absolute left-0 top-0 whitespace-nowrap font-semibold will-change-transform",
        isRashi ? "flex flex-col items-center gap-0.5 text-[11px]" : "",
        label.kind === "clock" ? "font-num text-[11px] tabular-nums" : "",
        isNak ? "flex flex-col items-center gap-0.5 text-[14px] leading-none" : "",
        label.kind === "month" || (label.kind === "body" && label.id !== "c-deg") ? "text-[11px]" : "",
        label.id === "c-deg" ? "font-num text-base font-bold tabular-nums" : "",
        /* The chapter is pointing at this reading. A ring rather than a colour
           change, because the colour is what says *which* clock it is. */
        label.hot && "rounded-md bg-white/15 px-1.5 py-0.5 ring-2 ring-white/70",
      )}
      style={{
        /* Seeded from the sample so a new label lands in the right place on
           its first paint; the frame loop owns it from then on. */
        transform: labelPinCss(label.x, label.y, label.pin),
        color,
        opacity: label.dim ? 0.4 : 1,
        textShadow: "0 1px 3px rgba(0,0,0,0.95)",
        fontSize: label.hot ? "13px" : undefined,
      }}
    >
      {isRashi && label.index ? <RashiSkyGlyph index={label.index} size={13} color={GOLD} /> : null}
      {isNak && label.full ? (
        /* `text-current` on purpose: the shared `nakshatraIcon` class sets
           `text-foreground`, which is near-black in the light theme and so
           vanishes against this canvas. tailwind-merge lets the className win,
           so the glyph inherits the label's own belt colour instead. */
        <NakshatraIcon name={label.full} size={18} strokeWidth={2.4} className="text-current" />
      ) : null}
      {label.text}
    </span>
  );
});

export default DayPlaygroundStudy;
