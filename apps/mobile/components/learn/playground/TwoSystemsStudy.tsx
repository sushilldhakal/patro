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
import Slider from "@react-native-community/slider";

import { Canvas } from "@/components/learn/diagrams/LearnCanvas";
import { Text } from "@/components/ui/Text";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@/lib/utils";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { geocentricPointAt } from "@/lib/sky3d/orbital-model";
import {
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
} from "@/lib/sky3d/two-systems";
import type { PlaygroundLabel } from "@/components/learn/playground/playground-labels";
import { PlaygroundLabelText } from "@/components/learn/playground/PlaygroundLabelText";
import PerfMeter, { type PerfSample } from "@/components/learn/playground/PerfMeter";
import Scene, {
  type CameraState,
  type Focus,
  type SceneClock,
  type SceneSample,
} from "@/components/learn/playground/TwoSystemsScene";

const CANVAS_BG = "#050a10";
const CARD_HEIGHT = 320;

/** Days of simulated time per real second, per speed rung. */
const SPEEDS = [2, 8, 30];

/** Rashi names, indexed from मेष — matching the belt labels in the scene. */
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

const FOCUS_CHIPS: { id: Focus; ne: string; en: string }[] = [
  { id: "solar", ne: "☀️ सौरमान", en: "☀️ Sauramāna" },
  { id: "lunar", ne: "🌙 चान्द्रमान", en: "🌙 Chāndramāna" },
  { id: "both", ne: "☀️🌙 दुवै", en: "☀️🌙 Both" },
];

const MIN_DISTANCE = 9;
const MAX_DISTANCE = 34;

function clampPitch(p: number) {
  /* North of the ecliptic only — from the south side the zodiac runs backwards
     and every rashi reads in reverse order, which is never worth showing. */
  return Math.min(1.45, Math.max(0.12, p));
}

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
  const { lang, pick } = useLocale();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const ne = lang !== "en";
  const num = useCallback(
    (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v)),
    [ne],
  );

  const year = useYearLadders();

  const clock = useRef<SceneClock>({ dt: 0, playing: false, daysPerSecond: SPEEDS[0]! });
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
    clock.current.daysPerSecond = SPEEDS[speed]!;
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
  const moonRashi = Math.floor(moonLongitude / 30) % 12;

  /** True Sun–Earth distance for the instant on screen — the readout's honesty. */
  const distanceAu = geocentricPointAt("sun", dt).distanceAu;

  const chip = (active: boolean, label: string, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "rounded-full border px-2.5 py-1",
        active ? "border-transparent" : "border-white/25",
      )}
      style={active ? { backgroundColor: "#d8c84a" } : undefined}
    >
      <Text
        className="text-caption font-semibold"
        style={[
          nepaliTextStyle(11),
          { color: active ? "#1a1500" : "rgba(255,255,255,0.7)", fontSize: 15 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const readout = (k: string, v: string, tone?: string) => (
    <View key={k} className="rounded-lg border border-white/15 px-2.5 py-1.5">
      <Text
        className="text-caption font-bold uppercase tracking-wide"
        style={[nepaliTextStyle(9), { color: "rgba(255,255,255,0.5)", fontSize: 15 }]}
      >
        {k}
      </Text>
      <Text
        className="text-caption font-bold"
        style={[nepaliTextStyle(13), { color: tone ?? "#ffffff", fontSize: 15 }]}
      >
        {v}
      </Text>
    </View>
  );

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
            {title ?? pick("सौरमान र चान्द्रमान", "Sauramāna and Chāndramāna")}
          </Text>
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(10)}>
            {pick("घुमाउन तान्नुहोस्", "Drag to rotate")}
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
                  pick("☀️ सूर्य", "☀️ Sun"),
                  pick("राशिमा प्रवेश", "enters a rashi"),
                  pick("सङ्क्रान्ति", "sankranti"),
                  pick("नयाँ सौर महिना", "new solar month"),
                ]}
              />
            ) : null}
            {focus === "lunar" || focus === "both" ? (
              <Chain
                tone="moon"
                steps={[
                  pick("☀️🌙 कोणीय दूरी", "☀️🌙 angular gap"),
                  pick(`हरेक ${num(TITHI_ARC)}° = १ तिथि`, `every ${TITHI_ARC}° = 1 tithi`),
                  pick("शुक्ल / कृष्ण पक्ष", "shukla / krishna paksha"),
                  pick("चान्द्र मास", "lunar month"),
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
                  style={[nepaliTextStyle(12), { color: "#fde68a", fontSize: 15 }]}
                >
                  {`${pick("सङ्क्रान्ति", "Sankranti")} · ${
                    ne ? year.solar[flash.index]?.nameNe : year.solar[flash.index]?.name
                  } ${num(1)}`}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="absolute right-2.5 gap-2" style={{ top: overlayTop }}>
            <RoundButton
              icon="refresh"
              label={pick("वर्षारम्भमा फर्कनुहोस्", "Back to year start")}
              onPress={() => {
                clock.current.dt = year.yearStartDt;
                setPlaying(false);
              }}
            />
            <RoundButton
              icon="add"
              label={pick("नजिक", "Zoom in")}
              onPress={() => {
                camera.current.distance = clampDistance(camera.current.distance * 0.85);
              }}
            />
            <RoundButton
              icon="remove"
              label={pick("टाढा", "Zoom out")}
              onPress={() => {
                camera.current.distance = clampDistance(camera.current.distance * 1.18);
              }}
            />
            <RoundButton
              icon="speedometer"
              label={pick("फ्रेम दर", "Frame rate")}
              active={perfOpen}
              onPress={() => setPerfOpen((v) => !v)}
            />
            <RoundButton
              icon={fullscreen ? "close" : "expand"}
              label={
                fullscreen
                  ? pick("बन्द गर्नुहोस्", "Exit fullscreen")
                  : pick("पूरा स्क्रिन", "Fullscreen")
              }
              onPress={() => setFullscreen((f) => !f)}
            />
          </View>

          {perfOpen && perf ? (
            <View
              pointerEvents="none"
              className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2 py-1"
            >
              <Text className="text-caption font-bold" style={{ color: "#f1f5f9", fontSize: 15 }}>
                {`${perf.fps.toFixed(0)} fps · worst ${perf.worstMs.toFixed(0)} ms`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        className={
          fullscreen
            ? "absolute inset-x-0 bottom-0 gap-2 px-3 pt-2"
            : "gap-2 border-t border-border/60 px-3 py-2.5"
        }
        style={
          fullscreen
            ? {
                backgroundColor: "rgba(5, 10, 16, 0.88)",
                paddingBottom: Math.max(insets.bottom, 10),
                maxHeight: windowHeight * (detailsOpen ? 0.5 : 0.22),
              }
            : { backgroundColor: "rgba(5, 10, 16, 0.94)" }
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-1.5"
        >
          {FOCUS_CHIPS.map((c) => chip(focus === c.id, pick(c.ne, c.en), () => setFocus(c.id), c.id))}
          <View className="mx-0.5 h-4 w-px bg-white/20" />
          {SPEEDS.map((s, i) => chip(speed === i, `${num(s)}×`, () => setSpeed(i), `s-${s}`))}
        </ScrollView>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
            className="h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10"
          >
            <Ionicons name={playing ? "pause" : "play"} size={16} color="#f1f5f9" />
          </Pressable>
          <Slider
            style={{ flex: 1, height: 34 }}
            value={Math.min(Math.max(dayOfYear, 0), year.yearDays)}
            minimumValue={0}
            maximumValue={year.yearDays}
            onValueChange={(v) => {
              clock.current.dt = year.yearStartDt + v;
              clock.current.playing = false;
              setPlaying(false);
            }}
            minimumTrackTintColor="#d8c84a"
            maximumTrackTintColor="rgba(148, 163, 184, 0.45)"
            thumbTintColor="#d8c84a"
            accessibilityLabel={pick("वर्षभरि सार्नुहोस्", "Scrub through the year")}
          />
          <Text
            className="text-caption"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}
          >
            {`${num(Math.max(0, Math.floor(dayOfYear)))}/${num(Math.round(year.yearDays))}`}
          </Text>
          <Pressable
            onPress={() => setDetailsOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              detailsOpen ? pick("लुकाउनुहोस्", "Hide readings") : pick("देखाउनुहोस्", "Show readings")
            }
            className="h-8 w-8 items-center justify-center rounded-full border border-white/20"
          >
            <Ionicons
              name={detailsOpen ? "chevron-down" : "chevron-up"}
              size={14}
              color="rgba(255,255,255,0.75)"
            />
          </Pressable>
        </View>

        {detailsOpen ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="items-stretch gap-2"
            >
              {readout(
                pick("सौर महिना · गते", "Solar month · gate"),
                `${ne ? solar.monthNameNe : solar.monthName} ${num(solar.gate)}`,
                "#f8b53c",
              )}
              {readout(
                pick("सूर्य राशिमा", "Sun in rashi"),
                `${num(Math.floor(solar.longitude))}° · ${num(solar.rashiIndex + 1)}`,
              )}
              {readout(
                pick("चन्द्र राशिमा", "Moon in rashi"),
                `${RASHI_NE[moonRashi]} · ${num(Math.floor(moonLongitude))}°`,
              )}
              {readout(
                pick("चन्द्र–सूर्य कोण", "Moon–Sun angle"),
                `${num(lunar.elongation.toFixed(1))}°`,
              )}
              {readout(
                pick("तिथि · पक्ष", "Tithi · paksha"),
                `${tithiName(lunar)} · ${
                  lunar.shukla ? pick("शुक्ल", "Shukla") : pick("कृष्ण", "Krishna")
                }`,
              )}
            </ScrollView>

            {/* The counters that make a month's worth of degrees legible. A
                longitude wraps at 360° and so can never show that the Moon needs
                more than one turn; these do not wrap. */}
            <View className="gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
              <View>
                <Text
                  className="text-caption font-semibold"
                  style={[nepaliTextStyle(11), { color: "#bae6fd", fontSize: 15 }]}
                >
                  {pick("औंसीदेखि चन्द्र हिँडेको", "Moon travelled since amavasya")}
                </Text>
                <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
                  <Text
                    className="text-body font-bold"
                    style={{ color: "#ffffff", fontSize: 18 }}
                  >
                    {`${num(travelled.moon.toFixed(1))}°`}
                  </Text>
                  <View
                    className="rounded px-1.5 py-0.5"
                    style={{
                      backgroundColor:
                        travelled.moon >= 360 ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text
                      className="text-caption font-bold"
                      style={[
                        nepaliTextStyle(10),
                        {
                          color: travelled.moon >= 360 ? "#d1fae5" : "rgba(255,255,255,0.6)",
                          fontSize: 15,
                        },
                      ]}
                    >
                      {travelled.moon >= 360
                        ? pick(
                            `नक्षत्र मास पूरा +${num((travelled.moon - 360).toFixed(1))}°`,
                            `sidereal lap done +${(travelled.moon - 360).toFixed(1)}°`,
                          )
                        : pick(
                            `३६०° सम्म ${num((360 - travelled.moon).toFixed(1))}° बाँकी`,
                            `${(360 - travelled.moon).toFixed(1)}° to the 360° lap`,
                          )}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-caption mt-0.5"
                  style={[nepaliTextStyle(11), { color: "rgba(255,255,255,0.55)", fontSize: 15 }]}
                >
                  {pick(
                    "एक फेरो — नक्षत्र मास — ठ्याक्कै ३६०°, २७.३ दिन। तर त्यतिन्जेल पृथ्वी सूर्यवरिपरि ~२९° सरिसक्छ, त्यसैले चन्द्र फेरि सूर्यको छेउमा पुग्दैन; भेट्न अझै ~२९° चाहिन्छ। त्यही हो चान्द्र मास: ~३८९°, २९.५ दिन। कक्षमा पहिलो फेरो भित्री रेखा, त्यसपछिको बढी भाग बाहिरी हरियो चापमा देखिन्छ।",
                    "One lap — the sidereal month — is exactly 360° in 27.3 days. By then Earth has moved ~29° around the Sun, so the Moon is not beside the Sun again; it needs ~29° more to catch up. That is the synodic month: ~389° in 29.5 days. On the orbit, the first lap is the inner line and the overshoot is the outer green arc.",
                  )}
                </Text>
              </View>

              <View className="border-t border-white/10 pt-2">
                <Text
                  className="text-caption font-semibold"
                  style={[nepaliTextStyle(11), { color: "#fde68a", fontSize: 15 }]}
                >
                  {pick("यो वर्षमा सूर्य हिँडेको", "Sun travelled this year")}
                </Text>
                <Text
                  className="text-body mt-0.5 font-bold"
                  style={{ color: "#ffffff", fontSize: 18 }}
                >
                  {`${num(travelled.sunThisYear.toFixed(1))}° / ${num(360)}°  ·  ${pick(
                    "सूर्यबाट",
                    "from Sun",
                  )} ${num(distanceAu.toFixed(4))} AU`}
                </Text>
                <Text
                  className="text-caption mt-0.5"
                  style={[nepaliTextStyle(11), { color: "rgba(255,255,255,0.55)", fontSize: 15 }]}
                >
                  {pick(
                    "राशि पट्टी ताराहरूमा गाडिएको छ, त्यसैले बि.सं.को वर्ष ठ्याक्कै ३६०° — ३६५.२६ दिनको नाक्षत्र वर्ष। कक्ष वृत्त होइन, दीर्घवृत्त हो: दूरी ०.९८३–१.०१७ AU (३.४%), र नजिक हुँदा सूर्य छिटो हिँड्छ — त्यसैले सौर महिना २९ देखि ३२ दिनसम्मको हुन्छ। दृश्यमा यो अन्तर ६ गुणा बढाइएको छ, नत्र आँखाले देख्दैन।",
                    "The rashi belt is pinned to the stars, so a BS year is exactly 360° — the 365.26-day sidereal year. The orbit is an ellipse, not a circle: 0.983–1.017 AU (3.4%), and the Sun moves fastest when nearest — which is why a solar month runs 29 to 32 days. The scene exaggerates that gap 6× so the eye can see it.",
                  )}
                </Text>
              </View>
            </View>

            <DriftLadder
              year={year}
              dayOfYear={dayOfYear}
              lunarDone={lunarDone}
              ne={ne}
              num={num}
              pick={pick}
            />
          </ScrollView>
        ) : null}
      </View>
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
          {pick(
            "यी अङ्क यही दृश्यको खगोलीय मोडेलबाट आउँछन् — सङ्क्रान्ति र तिथिको कोण सही, तर कुन तिथि कुन दिनको भन्ने सूर्योदय नियम यहाँ लागू हुँदैन। दैनिक पञ्चाङ्ग नै आधिकारिक हो।",
            "These readings come from this view's own astronomical model — the sankranti and the tithi angle are right, but the sunrise rule that assigns a tithi to a civil day is not applied here. The daily panchanga remains authoritative.",
          )}
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
        borderColor: sun ? "rgba(251,191,36,0.3)" : "rgba(125,211,252,0.25)",
        backgroundColor: sun ? "rgba(245,158,11,0.14)" : "rgba(56,189,248,0.14)",
      }}
    >
      {steps.map((s, i) => (
        <Text
          key={s}
          className="text-caption font-semibold"
          style={[
            nepaliTextStyle(10),
            { color: sun ? "#fde68a" : "#bae6fd", fontSize: 15, marginTop: i > 0 ? 2 : 0 },
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
function DriftLadder({
  year,
  dayOfYear,
  lunarDone,
  ne,
  num,
  pick,
}: {
  year: Ladders;
  dayOfYear: number;
  lunarDone: number;
  ne: boolean;
  num: (v: number | string) => string;
  pick: (a: string, b: string) => string;
}) {
  const span = year.yearDays;
  const pct = (days: number) => `${(days / span) * 100}%` as const;
  const playhead = Math.min(Math.max(dayOfYear, 0), span);
  const shortfall = year.lunarShortfall;

  return (
    <View className="gap-1">
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-3">
        <Text
          className="text-caption"
          style={[nepaliTextStyle(11), { color: "rgba(255,255,255,0.6)", fontSize: 15 }]}
        >
          {pick("एउटै समयरेखा", "One shared timeline")}
        </Text>
        <Text
          className="text-caption"
          style={[nepaliTextStyle(10), { color: "rgba(255,255,255,0.6)", fontSize: 15 }]}
        >
          {pick(
            `सौर वर्ष ${num(span.toFixed(0))} दिन · १२ चान्द्र मास ${num(
              year.twelveLunarDays.toFixed(0),
            )} दिन → ~${num(shortfall.toFixed(0))} दिनको खाडल`,
            `Solar year ${span.toFixed(0)} d · 12 lunar months ${year.twelveLunarDays.toFixed(
              0,
            )} d → a ~${shortfall.toFixed(0)} day gap`,
          )}
        </Text>
      </View>

      <View>
        {/* Solar months */}
        <View className="h-6 w-full flex-row overflow-hidden rounded-md">
          {year.solar.map((m, i) => (
            <View
              key={m.index}
              className="items-center justify-center overflow-hidden"
              style={{
                width: pct(m.days),
                backgroundColor: i % 2 ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.22)",
                borderRightWidth: i === 11 ? 0 : 1,
                borderRightColor: "rgba(0,0,0,0.4)",
              }}
            >
              <Text
                numberOfLines={1}
                className="text-caption font-semibold"
                style={[nepaliTextStyle(9), { color: "#fffbeb", fontSize: 15 }]}
              >
                {ne ? m.nameNe : m.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Lunar months, clipped to the same span so the overhang is visible. */}
        <View className="mt-1 h-5 w-full overflow-hidden rounded-md bg-white/5">
          {year.lunar.map((m, i) => {
            const from = m.startDt - year.yearStartDt;
            if (from >= span) return null;
            return (
              <View
                key={m.index}
                className="absolute top-0 h-full items-center justify-center"
                style={{
                  left: pct(Math.max(0, from)),
                  width: pct(Math.min(m.days, span - from)),
                  backgroundColor:
                    i === 12
                      ? "rgba(52,211,153,0.45)"
                      : i % 2
                        ? "rgba(56,189,248,0.35)"
                        : "rgba(56,189,248,0.22)",
                  borderRightWidth: 1,
                  borderRightColor: "rgba(0,0,0,0.4)",
                }}
              >
                <Text
                  numberOfLines={1}
                  className="text-caption font-semibold"
                  style={{ color: "#f0f9ff", fontSize: 15 }}
                >
                  {num(i + 1)}
                </Text>
              </View>
            );
          })}
        </View>

        {/*
          The measurement, stated plainly: twelve whole lunar months laid off
          from the year's own start, and what is left of the year afterwards. It
          is a ruler rather than a calendar row — the lunar months above run on
          their real dates, which begin mid-cycle, so the comparison of *lengths*
          has to be drawn separately or it is not a comparison.
        */}
        <View className="mt-1 h-4 w-full overflow-hidden rounded-md bg-white/5">
          <View
            className="absolute inset-y-0 left-0 items-center justify-center"
            style={{
              width: pct(year.twelveLunarDays),
              backgroundColor: "rgba(56,189,248,0.3)",
              borderRightWidth: 1,
              borderRightColor: "rgba(0,0,0,0.4)",
            }}
          >
            <Text
              numberOfLines={1}
              className="text-caption px-1 font-semibold"
              style={[nepaliTextStyle(9), { color: "#f0f9ff", fontSize: 15 }]}
            >
              {pick(
                `१२ चान्द्र मास = ${num(year.twelveLunarDays.toFixed(0))} दिन`,
                `12 lunar months = ${year.twelveLunarDays.toFixed(0)} d`,
              )}
            </Text>
          </View>
          {shortfall > 0 ? (
            <View
              className="absolute inset-y-0 right-0 items-center justify-center"
              style={{ width: pct(shortfall), backgroundColor: "rgba(52,211,153,0.35)" }}
            >
              <Text className="text-caption font-bold" style={{ color: "#ecfdf5", fontSize: 15 }}>
                {num(shortfall.toFixed(0))}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          className="absolute bottom-0 w-px bg-white"
          style={{ left: pct(playhead), top: -4 }}
        />
      </View>

      <View className="mt-1 gap-1">
        <LadderKey color="rgba(245,158,11,0.6)">
          {pick("सौर महिना — सङ्क्रान्तिबाट सङ्क्रान्ति", "Solar months — sankranti to sankranti")}
        </LadderKey>
        <LadderKey color="rgba(56,189,248,0.6)">
          {pick(
            `चान्द्र मास — औंसीबाट औंसी · वर्षभित्र अहिलेसम्म ${num(lunarDone)}`,
            `Lunar months — amavasya to amavasya · ${lunarDone} begun so far this year`,
          )}
        </LadderKey>
        <LadderKey color="rgba(52,211,153,0.7)">
          {pick("बाँकी खाडल — अधिक मासले पुर्छ", "The remaining gap — what an adhik maas fills")}
        </LadderKey>
      </View>
    </View>
  );
}

function LadderKey({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text
        className="text-caption flex-1"
        style={[nepaliTextStyle(10), { color: "rgba(255,255,255,0.55)", fontSize: 15 }]}
      >
        {children}
      </Text>
    </View>
  );
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
        backgroundColor: active ? "rgba(255,255,255,0.85)" : "rgba(6, 11, 20, 0.55)",
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.7)" : "rgba(148,163,184,0.35)",
      }}
    >
      <Ionicons name={icon} size={15} color={active ? "#04070d" : "#f1f5f9"} />
    </Pressable>
  );
}

export default TwoSystemsStudy;
