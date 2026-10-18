/**
 * सौरमान र चान्द्रमान — one sky, scrubbed.
 *
 * The scene below shows the geometry; everything here is the *reading* of it,
 * and the argument the section is making. Three chips choose what is in focus,
 * one slider runs a whole solar year, and under both sits the ladder that the
 * article's last paragraph is about: twelve solar months against the lunar
 * months that do not fit inside them, and the ~11-day shortfall that adhik
 * maas exists to absorb.
 *
 * The clock and the camera live in refs and are mutated by the render loop, so
 * neither playing nor dragging re-renders React. What React sees is a sample
 * the scene hands back a few times a second — that, and nothing else, is what
 * the HUD and the labels are drawn from.
 *
 * Every number is a display reading. It comes from the same geocentric model
 * as the 3D sky, not from the panchanga API: exact enough that a sankranti
 * lands on the right day and a tithi on the right elongation, but it does not
 * apply the sunrise rule that decides which civil day owns a tithi. The
 * caption says so.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";

import { useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/design-tokens/cn";
import { TwoSystemsPanel } from "@vedic-patro/ui/kit/learn";
import { useFullscreen } from "@/lib/use-fullscreen";
import { RashiSkyGlyph } from "@/lib/sky3d/rashi-icons";
import { geocentricPointAt } from "@vedic-patro/domain/sky3d/orbital-model";
import {
  TWO_SYSTEMS_SPEEDS,
  buildYearLadders,
  dtFromDate,
  longitudeTravelled,
  lunarReading,
  meshaSankrantiOnOrBefore,
  siderealLon,
  solarReading,
  SIDEREAL_MONTH,
  SIDEREAL_YEAR,
  TITHI_ARC,
} from "@vedic-patro/domain/sky3d/two-systems";
import Scene, {
  type CameraState,
  type Focus,
  type SceneClock,
  type SceneLabel,
  type SceneSample,
} from "./TwoSystemsScene";
import { clampPitch } from "@vedic-patro/domain/learn/two-systems";

import { effect, illustration, midnight } from "@vedic-patro/design-tokens";
const CANVAS_BG = midnight.popover;
const GOLD = illustration.amber57;

export function TwoSystemsStudy() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = useCallback((v: number | string) => (ne ? toNepaliDigits(v) : String(v)), [ne]);

  /* The year on screen: the solar year that contains today, so the reader
     recognises the months going past. Built once — the ladder costs a few
     hundred Kepler solves and never changes after that. */
  const year = useMemo(() => {
    const start = meshaSankrantiOnOrBefore(dtFromDate(new Date()));
    return buildYearLadders(start);
  }, []);

  const clock = useRef<SceneClock>({
    dt: year.yearStartDt,
    playing: false,
    daysPerSecond: TWO_SYSTEMS_SPEEDS[0]!,
  });
  const camera = useRef<CameraState>({ yaw: 0.35, pitch: 0.78, distance: 19 });

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [focus, setFocus] = useState<Focus>("both");
  const [sample, setSample] = useState<SceneSample | null>(null);
  /* A sankranti is one frame wide in the scene; the banner has to outlive it. */
  const [flash, setFlash] = useState<{ index: number } | null>(null);

  /**
   * Whether the readings and the drift ladder are showing.
   *
   * Always open inline, where the panel sits under the canvas and costs the
   * scene nothing. In fullscreen it is the scene that matters, and on a phone
   * the readings plus the ladder are taller than the animation they describe —
   * so entering fullscreen on a short viewport folds them away behind the
   * chevron, and the reader opens them when they want the numbers.
   */
  const [detailsOpen, setDetailsOpen] = useState(true);

  const { active: fullscreen, ref: overlayRef, toggle: toggleFullscreen } = useFullscreen();

  /* Decided when the button is pressed, not in an effect reacting to the flag:
     a short viewport opens fullscreen with the readings folded, a tall one
     keeps them. Leaving fullscreen by Escape or the browser's own exit needs
     no reset, because the gate below only applies while fullscreen. */
  const onToggleFullscreen = useCallback(() => {
    if (!fullscreen) setDetailsOpen(window.innerHeight >= 820);
    toggleFullscreen();
  }, [fullscreen, toggleFullscreen]);

  useEffect(() => {
    clock.current.playing = playing;
  }, [playing]);
  useEffect(() => {
    clock.current.daysPerSecond = TWO_SYSTEMS_SPEEDS[speed]!;
  }, [speed]);

  const onSample = useCallback((s: SceneSample) => {
    setSample(s);
    if (s.sankrantiIndex !== null) setFlash({ index: s.sankrantiIndex });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(id);
  }, [flash]);

  const dt = sample?.dt ?? year.yearStartDt;
  const dayOfYear = dt - year.yearStartDt;

  const solar = useMemo(() => solarReading(dt, year.solar), [dt, year.solar]);
  const lunar = useMemo(() => lunarReading(dt), [dt]);

  /** Whole lunar months that have begun since the solar year opened. */
  const lunarDone = useMemo(
    () => year.lunar.filter((m) => m.startDt >= year.yearStartDt && m.startDt <= dt).length,
    [dt, year],
  );

  /**
   * Degrees travelled, unwrapped — the readings a wrapped longitude can never
   * give. The Moon's counter runs from the amavasya that opened the current
   * lunar month, so it climbs past 360° and lands near 389° at the next one;
   * the Sun's runs from Mesha Sankranti and closes on exactly 360°.
   */
  const travelled = useMemo(() => {
    const monthStart = year.lunar.reduce(
      (best, m) => (m.startDt <= dt && m.startDt > best ? m.startDt : best),
      year.lunar[0]!.startDt,
    );
    return {
      moon: longitudeTravelled("moon", monthStart, dt, SIDEREAL_MONTH),
      sunThisMonth: longitudeTravelled("sun", monthStart, dt, SIDEREAL_YEAR),
      sunThisYear: longitudeTravelled("sun", year.yearStartDt, dt, SIDEREAL_YEAR),
    };
  }, [dt, year]);

  /** Stable identity, so the scene's prop does not change every render. */
  const lunarMonthStarts = useMemo(() => year.lunar.map((m) => m.startDt), [year]);

  /** Where the Moon's own sightline lands on the belt. */
  const moonLongitude = useMemo(() => siderealLon("moon", dt), [dt]);

  /** True Sun–Earth distance for the instant on screen — the readout's honesty. */
  const distanceAu = useMemo(() => geocentricPointAt("sun", dt).distanceAu, [dt]);

  const setDt = useCallback((v: number) => {
    clock.current.dt = v;
    clock.current.playing = false;
  }, []);

  /* ── gestures: drag orbits, wheel zooms ───────────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });

  const reanchor = useCallback(() => {
    gestureStart.current = { ...camera.current, pinch: 0 };
    const first = pointers.current.values().next();
    if (!first.done) dragOrigin.current = { ...first.value };
  }, []);

  const canvasWrap = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = canvasWrap.current;
    if (!el) return;
    /* Bound imperatively and non-passively — React's onWheel is passive, so it
       cannot stop the page scrolling under a zoom. Re-bound when fullscreen
       swaps the wrapper node out from under the old listener. */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.current.distance = Math.min(
        34,
        Math.max(9, camera.current.distance * Math.exp(e.deltaY * 0.0012)),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [fullscreen]);

  const canvasHeight = fullscreen ? "100%" : "clamp(340px, 52vh, 560px)";

  const body = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--tm-border)]",
        /* Fullscreen is a flex column, not a canvas with the panel floating
           over it: the controls take the height they need and the scene keeps
           the rest. Overlaying them covered the whole animation on a phone. */
        fullscreen && "flex h-full flex-col rounded-none border-0",
      )}
      style={{ background: CANVAS_BG }}
    >
      <div
        ref={canvasWrap}
        className={cn("relative w-full touch-none", fullscreen && "min-h-0 flex-1")}
        style={fullscreen ? undefined : { height: canvasHeight }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("button, input")) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
              34,
              Math.max(9, gestureStart.current.distance * (gestureStart.current.pinch / d)),
            );
            return;
          }
          const dx = e.clientX - dragOrigin.current.x;
          const dy = e.clientY - dragOrigin.current.y;
          /* Drag the sphere, not the camera: pulling right swings the face you
             are looking at to the right, so the camera goes the other way. */
          camera.current.yaw = gestureStart.current.yaw - dx * 0.006;
          camera.current.pitch = clampPitch(gestureStart.current.pitch + dy * 0.005);
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          reanchor();
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          reanchor();
        }}
      >
        <Canvas
          camera={{ position: [0, 12, 16], fov: 48, near: 0.1, far: 400 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(CANVAS_BG)}
        >
          <Suspense fallback={null}>
            <Scene
              clock={clock}
              camera={camera}
              focus={focus}
              anchorDt={year.yearStartDt}
              lunarMonthStarts={lunarMonthStarts}
              onSample={onSample}
            />
          </Suspense>
        </Canvas>

        {/* Labels ride over the canvas so they are real Devanagari type, placed
            from the scene's own projection of each anchor. */}
        <div className="pointer-events-none absolute inset-0">
          {sample?.labels.map((l) => (
            <Label key={l.id} label={l} />
          ))}
        </div>

        {/* The chain the section is teaching, spelled out beside the geometry. */}
        <div className="pointer-events-none absolute left-2 top-2 flex max-w-[42%] flex-col gap-1.5 text-diagram-xs leading-tight sm:left-3 sm:top-3 sm:gap-2 sm:text-xs">
          {(focus === "solar" || focus === "both") && (
            <Chain
              tone="sun"
              steps={[
                t("learn.study.two_systems.chain_sun"),
                t("learn.study.two_systems.chain_enters_rashi"),
                t("learn.study.two_systems.chain_sankranti"),
                t("learn.study.two_systems.chain_new_solar_month"),
              ]}
            />
          )}
          {(focus === "lunar" || focus === "both") && (
            <Chain
              tone="moon"
              steps={[
                t("learn.study.two_systems.chain_angular_gap"),
                t("learn.study.two_systems.chain_tithi_arc", { degrees: num(TITHI_ARC) }),
                t("learn.study.two_systems.chain_paksha"),
                t("learn.study.two_systems.chain_lunar_month"),
              ]}
            />
          )}
        </div>

        {flash && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-100 backdrop-blur">
            {t("learn.playground.sankranti")} · {ne ? year.solar[flash.index]?.nameNe : year.solar[flash.index]?.name}{" "}
            {num(1)}
          </div>
        )}

        <div className="absolute right-3 top-3 flex gap-2">
          <IconButton
            onClick={() => {
              clock.current.dt = year.yearStartDt;
              setPlaying(false);
            }}
            label={t("learn.study.two_systems.back_to_year_start")}
          >
            <RotateCcw size={16} />
          </IconButton>
          <IconButton
            onClick={onToggleFullscreen}
            label={fullscreen ? t("common.exit_fullscreen") : t("common.fullscreen")}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </div>

        <p className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/45">
          {t("learn.playground.drag_hint")}
        </p>
      </div>

      <TwoSystemsPanel
        focus={focus}
        onFocus={setFocus}
        speedIndex={speed}
        onSpeed={setSpeed}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        dayOfYear={dayOfYear}
        onSeek={setDt}
        year={year}
        solar={solar}
        lunar={lunar}
        moonLongitude={moonLongitude}
        travelledMoon={travelled.moon}
        travelledSun={travelled.sunThisYear}
        distanceAu={distanceAu}
        lunarDone={lunarDone}
        playIcon={<Play size={16} />}
        pauseIcon={<Pause size={16} />}
        fullscreen={fullscreen}
        detailsOpen={detailsOpen}
        onToggleDetails={() => setDetailsOpen((open) => !open)}
        expandIcon={<ChevronUp size={14} />}
        collapseIcon={<ChevronDown size={14} />}
      />
    </div>
  );

  if (!fullscreen) {
    return (
      <div className="mt-5">
        {body}
        <p className="mt-2 text-sm text-[var(--tm-ink-faint)]">
          {t("learn.study.two_systems.model_caveat")}
        </p>
      </div>
    );
  }

  /*
   * The overlay is portalled to <body>, not rendered where it sits.
   *
   * The article body is `relative z-[1]`, which opens a stacking context — and
   * a fixed layer inside one can never rise above a sibling of that context,
   * so the z-50 sticky header stayed on top of the "fullscreen" view and there
   * was no way back out. Worse, any transformed or filtered ancestor becomes
   * the containing block for `position: fixed`, so `inset-0` was covering that
   * ancestor's box rather than the viewport — which is why the page showed
   * through around the edges. A portal to <body> escapes both, and z-[100]
   * clears the header and the mobile bottom nav (both z-50).
   */
  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-dashed border-[var(--tm-border)] px-4 py-8 text-center text-sm text-[var(--tm-ink-faint)]">
        {t("learn.playground.fullscreen_notice")}
      </div>
      {createPortal(
        <div
          ref={overlayRef}
          /* `tm-tokens`: on <body> the overlay is outside `.tm-page`, so the
             theme variables it styles itself with would be undefined. */
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

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
    >
      {children}
    </button>
  );
}

function Chain({ tone, steps }: { tone: "sun" | "moon"; steps: string[] }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 backdrop-blur",
        tone === "sun"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
          : "border-sky-300/25 bg-sky-400/10 text-sky-100",
      )}
    >
      {steps.map((s, i) => (
        <div key={s} className={cn("font-semibold", i > 0 && "mt-0.5")}>
          {i > 0 && <span className="mr-1 opacity-50">↓</span>}
          {s}
        </div>
      ))}
    </div>
  );
}

function Label({ label }: { label: SceneLabel }) {
  const isRashi = label.kind === "rashi";
  return (
    <span
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold transition-opacity",
        isRashi ? "flex flex-col items-center gap-0.5" : "text-white",
      )}
      style={{
        left: label.x,
        top: label.y,
        color: isRashi ? GOLD : undefined,
        opacity: label.dim ? 0.42 : 1,
        textShadow: effect.labelShadowSoft,
      }}
    >
      {isRashi && label.index ? <RashiSkyGlyph index={label.index} size={14} color={GOLD} /> : null}
      {label.text}
    </span>
  );
}

export default TwoSystemsStudy;
