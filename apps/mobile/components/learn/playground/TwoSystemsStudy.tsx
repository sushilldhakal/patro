/**
 * सौरमान र चान्द्रमान — one sky, scrubbed. The iOS/Android shell.
 *
 * The scene below shows the geometry; everything here is the *reading* of it,
 * and the argument the topic is making. Three chips choose what is in focus, one
 * slider runs a whole solar year, and under both sits the ladder the closing
 * paragraph is about: twelve solar months against the lunar months that do not
 * fit inside them, and the ~11-day shortfall that अधिक मास exists to absorb.
 *
 * The clock and the camera live in refs and are mutated by the render loop, so
 * neither playing nor dragging re-renders React. What React sees is a sample the
 * scene hands back a few times a second — that, and nothing else, is what the
 * readouts and the labels are drawn from.
 *
 * Every number is a display reading. It comes from the same geocentric model as
 * the 3D sky, not from the panchanga API: exact enough that a सङ्क्रान्ति lands
 * on the right day and a तिथि on the right elongation, but it does not apply the
 * sunrise rule that decides which civil day owns a तिथि. The caption says so.
 *
 * ── what differs from the web's `TwoSystemsStudy` ──
 *
 *   - **Touch, not pointers**, and no wheel — the pinch carries the zoom.
 *   - **Fullscreen is a `Modal`**, not a portal.
 *   - **The year ladder is built after first paint.** See `useYearLadders`; this
 *     is the one change that is about the platform's speed rather than its
 *     input model, and it is the only reason this file has a loading state.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Canvas } from "@/components/learn/diagrams/LearnCanvas";
import { Text } from "@/components/ui/Text";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { geocentricPointAt } from "@vedic-patro/domain/sky3d/orbital-model";
import { TwoSystemsPanel } from "@vedic-patro/ui/kit/learn";
import {
  TWO_SYSTEMS_SPEEDS,
  buildYearLadders,
  dtFromDate,
  longitudeTravelled,
  lunarReading,
  meshaSankrantiOnOrBefore,
  siderealLon,
  solarReading,
  tithiName,
  SIDEREAL_MONTH,
  SIDEREAL_YEAR,
  TITHI_ARC,
} from "@vedic-patro/domain/sky3d/two-systems";
import type { PlaygroundLabel } from "@/components/learn/playground/playground-labels";
import { PlaygroundLabelText } from "@/components/learn/playground/PlaygroundLabelText";
import PerfMeter, { type PerfSample } from "@/components/learn/playground/PerfMeter";
import Scene, {
  type CameraState,
  type Focus,
  type SceneClock,
  type SceneSample,
} from "@/components/learn/playground/TwoSystemsScene";
import { clampPitch } from "@vedic-patro/domain/learn/two-systems";

import { brand, illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
const CANVAS_BG = midnight.popover;
const CARD_HEIGHT = 320;

const MIN_DISTANCE = 9;
const MAX_DISTANCE = 34;

function clampDistance(d: number) {
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));
}

type Ladders = ReturnType<typeof buildYearLadders>;

/**
 * The year's sankranti and amavasya ladders, built off the first paint.
 *
 * ── native ── The web builds these during render and nobody notices. Here they
 * cannot be: `buildYearLadders` bisects twelve solar crossings and fourteen new
 * moons, which is a few thousand Kepler solves, and on Hermes that is long
 * enough to be a visible hitch — the article would stall part-drawn while the
 * ephemeris ran.
 *
 * Deferring it to an effect does not make it cheaper; it makes it happen *after*
 * the reader has the page, with a loader standing in for the canvas. The JS
 * thread is still blocked for that moment, which is why this is a `useEffect`
 * and not a claim to have solved it. Chunking the solve across frames would,
 * and is not worth it until the meter says so.
 */
function useYearLadders(): Ladders | null {
  const [year, setYear] = useState<Ladders | null>(null);
  useEffect(() => {
    let live = true;
    /* A tick, so the first paint commits before the ephemeris takes the thread. */
    const id = setTimeout(() => {
      const built = buildYearLadders(meshaSankrantiOnOrBefore(dtFromDate(new Date())));
      if (live) setYear(built);
    }, 0);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, []);
  return year;
}

export function TwoSystemsStudy({ title }: { title?: string }) {
  const { t, lang, pick } = useLocale();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const ne = lang !== "en";
  const num = useCallback(
    (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v)),
    [ne],
  );

  const year = useYearLadders();

  const clock = useRef<SceneClock>({ dt: 0, playing: false, daysPerSecond: TWO_SYSTEMS_SPEEDS[0]! });
  const camera = useRef<CameraState>({ yaw: 0.35, pitch: 0.78, distance: 19 });
  /* The clock cannot be seeded until the ladder names the year's start. */
  const seeded = useRef(false);
  if (year && !seeded.current) {
    seeded.current = true;
    clock.current.dt = year.yearStartDt;
  }

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [focus, setFocus] = useState<Focus>("both");
  const [sample, setSample] = useState<SceneSample | null>(null);
  const [labels, setLabels] = useState<PlaygroundLabel[]>([]);
  /* A sankranti is one frame wide in the scene; the banner has to outlive it. */
  const [flash, setFlash] = useState<{ index: number } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perf, setPerf] = useState<PerfSample | null>(null);

  /* The canvas is torn down and rebuilt when it moves into the modal. */
  useEffect(() => {
    setLabels([]);
  }, [fullscreen]);

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

  /* ── gestures ─────────────────────────────────────────────────────── */
  const gestureStart = useRef({ yaw: 0, pitch: 0, distance: 0, pinch: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 2,
        onPanResponderGrant: () => {
          gestureStart.current = { ...camera.current, pinch: 0 };
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            if (!a || !b) return;
            const spread = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!spread) return;
            if (!gestureStart.current.pinch) gestureStart.current.pinch = spread;
            camera.current.distance = clampDistance(
              gestureStart.current.distance * (gestureStart.current.pinch / spread),
            );
            return;
          }
          /* Drag the sphere, not the camera: pulling right swings the face you
             are looking at to the right, so the camera goes the other way. */
          camera.current.yaw = gestureStart.current.yaw - g.dx * 0.006;
          camera.current.pitch = clampPitch(gestureStart.current.pitch + g.dy * 0.005);
        },
      }),
    [],
  );

  const canvasHeight = fullscreen ? windowHeight : CARD_HEIGHT;
  const overlayTop = fullscreen ? Math.max(insets.top, 24) + 12 : 10;

  if (!year) {
    return (
      <View
        className="my-3 items-center justify-center overflow-hidden rounded-2xl border border-border"
        style={{ height: CARD_HEIGHT, backgroundColor: CANVAS_BG }}
      >
        <VedicPatroLoader />
      </View>
    );
  }

  const dt = sample?.dt ?? year.yearStartDt;
  const dayOfYear = dt - year.yearStartDt;

  const solar = solarReading(dt, year.solar);
  const lunar = lunarReading(dt);

  /** Whole lunar months that have begun since the solar year opened. */
  const lunarDone = year.lunar.filter(
    (m) => m.startDt >= year.yearStartDt && m.startDt <= dt,
  ).length;

  /**
   * Degrees travelled, unwrapped — the readings a wrapped longitude can never
   * give. The Moon's counter runs from the amavasya that opened the current
   * lunar month, so it climbs past 360° and lands near 389° at the next one;
   * the Sun's runs from मेष सङ्क्रान्ति and closes on exactly 360°.
   */
  const monthStart = year.lunar.reduce(
    (best, m) => (m.startDt <= dt && m.startDt > best ? m.startDt : best),
    year.lunar[0]!.startDt,
  );
  const travelled = {
    moon: longitudeTravelled("moon", monthStart, dt, SIDEREAL_MONTH),
    sunThisYear: longitudeTravelled("sun", year.yearStartDt, dt, SIDEREAL_YEAR),
  };

  /** Stable identity, so the scene's prop does not change every render. */
  const lunarMonthStarts = year.lunar.map((m) => m.startDt);

  /** Where the Moon's own sightline lands on the belt. */
  const moonLongitude = siderealLon("moon", dt);

  /** True Sun–Earth distance for the instant on screen — the readout's honesty. */
  const distanceAu = geocentricPointAt("sun", dt).distanceAu;

  const body = (
    <View
      className={
        fullscreen ? "flex-1" : "my-3 overflow-hidden rounded-2xl border border-border bg-card"
      }
      style={{ backgroundColor: fullscreen ? CANVAS_BG : undefined }}
    >
      {!fullscreen ? (
        <View className="flex-row items-center justify-between border-b border-border/60 px-3 py-2">
          <Text
            className="text-caption flex-1 font-bold uppercase tracking-wide text-secondary"
            style={nepaliTextStyle(11)}
          >
            {title ?? t("ui.learn.sauram_na_and_ch_ndram_na")}
          </Text>
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(10)}>
            {t("ui.learn.drag_to_rotate")}
          </Text>
        </View>
      ) : null}

      <View style={{ height: canvasHeight }}>
        <View
          style={{ height: canvasHeight, backgroundColor: CANVAS_BG }}
          {...responder.panHandlers}
        >
          <Canvas
            camera={{ position: [0, 12, 16], fov: 48, near: 0.1, far: 400 }}
            gl={{ antialias: true }}
            dpr={[1, 1.75]}
            onCreated={({ gl }) => gl.setClearColor(CANVAS_BG)}
          >
            <Suspense fallback={null}>
              <Scene
                clock={clock}
                camera={camera}
                focus={focus}
                anchorDt={year.yearStartDt}
                lunarMonthStarts={lunarMonthStarts}
                onLabels={setLabels}
                onSample={onSample}
              />
              {perfOpen ? <PerfMeter onSample={setPerf} /> : null}
            </Suspense>
          </Canvas>

          {/* Labels ride over the canvas so they are real Devanagari type,
              placed from the scene's own projection of each anchor. */}
          <View pointerEvents="none" className="absolute inset-0">
            {labels.map((label) => (
              <PlaygroundLabelText key={label.id} label={label} />
            ))}
          </View>

          {/* The chain the topic is teaching, spelled out beside the geometry. */}
          <View
            pointerEvents="none"
            className="absolute left-2.5 gap-1.5"
            style={{ top: overlayTop, maxWidth: "46%" }}
          >
            {focus === "solar" || focus === "both" ? (
              <Chain
                tone="sun"
                steps={[
                  t("learn.study.two_systems.chain_sun"),
                  t("learn.study.two_systems.chain_enters_rashi"),
                  t("learn.study.two_systems.chain_sankranti"),
                  t("learn.study.two_systems.chain_new_solar_month"),
                ]}
              />
            ) : null}
            {focus === "lunar" || focus === "both" ? (
              <Chain
                tone="moon"
                steps={[
                  t("learn.study.two_systems.chain_angular_gap"),
                  pick(tFor(undefined, "ui.learn.x_d321b519", { v0: num(TITHI_ARC) }), `every ${TITHI_ARC}° = 1 tithi`),
                  t("learn.study.two_systems.chain_paksha"),
                  t("learn.study.two_systems.chain_lunar_month"),
                ]}
              />
            ) : null}
          </View>

          {flash ? (
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
                  {`${t("learn.playground.sankranti")} · ${
                    ne ? year.solar[flash.index]?.nameNe : year.solar[flash.index]?.name
                  } ${num(1)}`}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="absolute right-2.5 gap-2" style={{ top: overlayTop }}>
            <RoundButton
              icon="refresh"
              label={t("learn.study.two_systems.back_to_year_start")}
              onPress={() => {
                clock.current.dt = year.yearStartDt;
                setPlaying(false);
              }}
            />
            <RoundButton
              icon="add"
              label={t("ui.learn.zoom_in")}
              onPress={() => {
                camera.current.distance = clampDistance(camera.current.distance * 0.85);
              }}
            />
            <RoundButton
              icon="remove"
              label={t("ui.learn.zoom_out")}
              onPress={() => {
                camera.current.distance = clampDistance(camera.current.distance * 1.18);
              }}
            />
            <RoundButton
              icon="speedometer"
              label={t("ui.learn.frame_rate")}
              active={perfOpen}
              onPress={() => setPerfOpen((v) => !v)}
            />
            <RoundButton
              icon={fullscreen ? "close" : "expand"}
              label={
                fullscreen
                  ? t("ui.learn.exit_fullscreen")
                  : t("ui.learn.fullscreen")
              }
              onPress={() => setFullscreen((f) => !f)}
            />
          </View>

          {perfOpen && perf ? (
            <View
              pointerEvents="none"
              className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2 py-1"
            >
              <Text className="text-caption font-bold" style={{ color: brand.offWhite }}>
                {`${perf.fps.toFixed(0)} fps · worst ${perf.worstMs.toFixed(0)} ms`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <TwoSystemsPanel
        focus={focus}
        onFocus={setFocus}
        speedIndex={speed}
        onSpeed={setSpeed}
        playing={playing}
        onTogglePlay={() => setPlaying((value) => !value)}
        dayOfYear={dayOfYear}
        onSeek={(day) => {
          clock.current.dt = day;
          clock.current.playing = false;
          setPlaying(false);
        }}
        year={year}
        solar={solar}
        lunar={lunar}
        moonLongitude={moonLongitude}
        travelledMoon={travelled.moon}
        travelledSun={travelled.sunThisYear}
        distanceAu={distanceAu}
        lunarDone={lunarDone}
        playIcon={<Ionicons name="play" size={16} color={brand.offWhite} />}
        pauseIcon={<Ionicons name="pause" size={16} color={brand.offWhite} />}
        fullscreen={fullscreen}
        detailsOpen={detailsOpen}
        onToggleDetails={() => setDetailsOpen((value) => !value)}
        expandIcon={<Ionicons name="chevron-up" size={14} color={brand.offWhite} />}
        collapseIcon={<Ionicons name="chevron-down" size={14} color={brand.offWhite} />}
      />
    </View>
  );

  if (!fullscreen) {
    return (
      <View>
        {body}
        <Text
          className="text-caption text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {t("learn.study.two_systems.model_caveat")}
        </Text>
      </View>
    );
  }

  return (
    <Modal
      visible
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={() => setFullscreen(false)}
    >
      <View
        className={cn("flex-1", isDark && "dark")}
        style={[nativeWindThemeVars(isDark ? "dark" : "light"), { backgroundColor: CANVAS_BG }]}
      >
        {body}
      </View>
    </Modal>
  );
}

function Chain({ tone, steps }: { tone: "sun" | "moon"; steps: string[] }) {
  const sun = tone === "sun";
  return (
    <View
      className="rounded-lg border px-2 py-1.5"
      style={{
        borderColor: sun ? withAlpha(illustration.amber56, 0.3) : withAlpha(illustration.sky75, 0.25),
        backgroundColor: sun ? withAlpha(illustration.orange50, 0.14) : withAlpha(illustration.teal60, 0.14),
      }}
    >
      {steps.map((s, i) => (
        <Text
          key={s}
          className="text-caption font-semibold"
          style={[
            nepaliTextStyle(10),
            { color: sun ? illustration.amber77 : illustration.sky86, marginTop: i > 0 ? 2 : 0 },
          ]}
        >
          {i > 0 ? "↓ " : ""}
          {s}
        </Text>
      ))}
    </View>
  );
}

/**
 * The two ladders on one timeline — the picture the topic's closing paragraph
 * describes. Solar months on top, lunar months below, both starting at मेष
 * सङ्क्रान्ति. By the twelfth lunar month the lower ladder has fallen about
 * eleven days short of the upper one, and the marked overhang is the gap an
 * अधिक मास is inserted to close.
 */
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

export default TwoSystemsStudy;
