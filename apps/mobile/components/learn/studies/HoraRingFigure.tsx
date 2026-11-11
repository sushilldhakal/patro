/**
 * One week of unbroken horas — the website's `HoraRing`, as the Hora chapter
 * shows it with today's panchanga.
 *
 * The ring, its segments, arc labels, compass marks, hub and the moving marker
 * are the website's geometry (`hora-data.ts` is its file, copied as is). What
 * changed for the app: the scrub rail is a slider under the ring rather than a
 * vertical rail beside it (a phone has no width to spare), fullscreen is a
 * modal, and the position is not kept between visits.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText, TextPath } from "react-native-svg";
import type { PanchangaDay } from "@/lib/api";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingualText } from "@vedic-patro/domain/locale";
import { tFor } from "@vedic-patro/i18n/runtime";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@vedic-patro/domain/calendar/zoned-time";
import { buildWheelDetail } from "@vedic-patro/read-models/panchanga/wheel-data";
import { horaCompassEn, horaCompassNep, horaHubDay, horaHubNum, horaHubRom, horaHubRuler, horaRoundBtn, horaStatusBox, horaTickline, horaWeekHead } from "@vedic-patro/design-tokens/classes/hora-classes";
import { illustration, neutral, space, withAlpha } from "@vedic-patro/design-tokens";
import { GrahaPlanetIcon } from "@vedic-patro/ui/kit/panchanga";
import { StudyCard, StudyPlayButton, StudyRange, StudyScrubRow } from "@/components/learn/study/StudyCard";
import { STUDY_FONT, useStudyInk, useSvgClass, useTm } from "@/components/learn/study/study-ink";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import {
  HORA_CX,
  HORA_CY,
  HORA_DEVA,
  HORA_NRINGS,
  HORA_PLANETS,
  HORA_R_HUB,
  HORA_R_OUT0,
  HORA_SEG,
  HORA_TOTAL,
  HORA_WEEK,
  HORA_WEEK_MS,
  horaPad,
  horaPol,
  horaProgFromRingHora,
  horaRingFromJsDay,
  horaRingInner,
  horaRingMid,
  horaRingOuter,
  horaRingSeq,
  horaRulerAt,
  horaSegPath,
  horaTextArc,
  type HoraPlanetKey,
} from "./hora-data";

const PROG_STEPS = 10_000;

const HORA_TO_GRAHA = {
  ravi: "sun",
  soma: "moon",
  mangala: "mars",
  budha: "mercury",
  guru: "jupiter",
  shukra: "venus",
  shani: "saturn",
} as const satisfies Record<HoraPlanetKey, string>;

interface HoraCell {
  order: number;
  planet: HoraPlanetKey;
  pathD: string;
  tick: { x1: number; y1: number; x2: number; y2: number };
  label?: { pathId: string; pathD: string; name: string; fontSize: number; fill: string };
}

function CompassMarker({ deg, nep, en }: { deg: number; nep: string; en: string }) {
  const sc = useSvgClass();
  const r = HORA_R_OUT0 + 34;
  const [x, y] = horaPol(r, deg);
  const [nx0, ny0] = horaPol(HORA_R_OUT0 + 4, deg);
  const [nx1, ny1] = horaPol(HORA_R_OUT0 + 14, deg);
  return (
    <G>
      <SvgText x={x} y={y - 2} textAnchor="middle" {...sc(horaCompassNep)} fontStyle="italic">
        {nep}
      </SvgText>
      <SvgText x={x} y={y + 15} textAnchor="middle" {...sc(horaCompassEn)}>
        {en.toUpperCase()}
      </SvgText>
      <Line x1={nx0} y1={ny0} x2={nx1} y2={ny1} stroke={withAlpha(neutral.white, 0.3)} strokeWidth={1.4} />
    </G>
  );
}

export function HoraRing({ p, isToday, timezone }: { p: PanchangaDay; isToday?: boolean; timezone?: string }) {
  const { lang, digits } = useLocale();
  const sc = useSvgClass();
  const tm = useTm();
  const ink = useStudyInk();
  const insets = useSafeAreaInsets();
  const { view: studyView, live } = useStudyLive();
  const det = useMemo(() => buildWheelDetail(p), [p]);
  const tz = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());

  const scrubG = useMemo(() => {
    const mins = minutesSinceMidnightInTimezone(now, tz, true);
    let g = (mins - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    return Math.max(0, Math.min(60, g));
  }, [now, det.sunriseMin, tz]);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const [prog, setProg] = useState(() => {
    if (isToday) {
      const ring = horaRingFromJsDay(new Date().getDay());
      const horaIdx = Math.min(23, Math.floor((scrubG / 60) * 24));
      return horaProgFromRingHora(ring, horaIdx);
    }
    return 0;
  });
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cells = useMemo(() => {
    const out: HoraCell[] = [];
    for (let r = 0; r < HORA_NRINGS; r++) {
      const rO = horaRingOuter(r);
      const rI = horaRingInner(r);
      const rM = horaRingMid(r);
      const seq = horaRingSeq(r);
      for (let i = 0; i < 24; i++) {
        const planet = seq[i]!;
        const P = HORA_PLANETS[planet];
        const a0 = i * HORA_SEG + 1.1 / 2;
        const a1 = (i + 1) * HORA_SEG - 1.1 / 2;
        const mid = (a0 + a1) / 2;
        const flip = mid > 90 && mid < 270;
        const [tx0, ty0] = horaPol(rI, a0 - 1.1 / 2);
        const [tx1, ty1] = horaPol(rO, a0 - 1.1 / 2);
        const name = HORA_DEVA[planet];
        const arcLen = (2 * Math.PI * rM * (HORA_SEG - 1.1)) / 360;
        let fs = arcLen / (name.length * 0.62);
        let label: HoraCell["label"];
        if (fs >= 8 || i === 0) {
          fs = Math.max(8, Math.min(13.5, fs));
          label = { pathId: `hora-tp-${r}-${i}`, pathD: horaTextArc(rM, a0, a1, flip), name, fontSize: fs, fill: P.text };
        }
        out.push({ order: r * 24 + i, planet, pathD: horaSegPath(rO, rI, a0, a1), tick: { x1: tx0, y1: ty0, x2: tx1, y2: ty1 }, label });
      }
    }
    return out;
  }, []);

  const gHora = prog * HORA_TOTAL;
  let gr = Math.floor(gHora / 24);
  if (gr > HORA_NRINGS - 1) gr = HORA_NRINGS - 1;
  const gi = gHora - gr * 24;
  const gii = Math.min(23, Math.floor(gi));
  const leadOrder = Math.min(HORA_TOTAL - 1, Math.floor(gHora));
  const week = HORA_WEEK[gr]!;
  const rulerKey = horaRulerAt(gr, gii);
  const ruler = HORA_PLANETS[rulerKey];
  const [mx, my] = horaPol(horaRingOuter(gr) + 5, gi * HORA_SEG);
  const [dx0, dy0] = horaPol(HORA_R_HUB, 0);
  const [dx1, dy1] = horaPol(HORA_R_OUT0 + 12, 0);
  const progStep = Math.min(PROG_STEPS - 1, Math.round(prog * PROG_STEPS));

  /* Today follows the clock unless the reader is playing or scrubbing. */
  useEffect(() => {
    if (!isToday || scrubbing || playing) return;
    const ring = horaRingFromJsDay(new Date().getDay());
    const horaIdx = Math.min(23, Math.floor((scrubG / 60) * 24));
    setProg(horaProgFromRingHora(ring, horaIdx));
  }, [scrubG, isToday, playing, scrubbing]);

  useEffect(() => {
    if (!playing || (!live && !expanded)) return;
    let last = performance.now();
    let frame = 0;
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      setProg((prev) => {
        const next = prev + dt / HORA_WEEK_MS;
        return next >= 1 ? next - 1 : next;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, live, expanded]);

  const onScrub = useCallback((v: number) => {
    setScrubbing(true);
    setPlaying(false);
    setProg(Math.min(0.99999, Math.max(0, v / PROG_STEPS)));
  }, []);

  const statusLabel = { color: ink.faint };
  const ringNode = (
    <View className="w-full items-center gap-2">
      <View className={horaStatusBox} style={{ borderColor: ink.border, backgroundColor: ink.card }}>
        {[
          { k: tFor(lang, "panchanga.hora.day"), v: bilingualText(lang, week.day, week.en) },
          { k: tFor(lang, "panchanga.hora.hora"), v: `${horaPad(gii + 1)} / 24` },
          { k: tFor(lang, "panchanga.wheel.lord"), v: bilingualText(lang, HORA_DEVA[rulerKey], ruler.en), color: ruler.color },
        ].map((cell) => (
          <View key={cell.k} className="flex-1 items-center">
            <Text className="text-xs font-semibold uppercase tracking-wide" style={[nepaliTextStyle(11), statusLabel]}>
              {cell.k}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-sm font-bold leading-tight" style={[nepaliTextStyle(14), { color: cell.color ?? ink.ink }]}>
              {cell.v}
            </Text>
          </View>
        ))}
      </View>

      <View className="w-full max-w-[640px]" style={{ aspectRatio: 960 / 900 }}>
        <Svg viewBox="0 0 960 900" width="100%" height="100%">
          <Defs>
            <RadialGradient id="hora-hubSun" cx="42%" cy="38%" r="68%">
              <Stop offset="0%" stopColor={illustration.amber81} />
              <Stop offset="55%" stopColor={illustration.orange60} />
              <Stop offset="100%" stopColor={illustration.orange47} />
            </RadialGradient>
            <RadialGradient id="hora-hubHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={illustration.orange55} stopOpacity={0.5} />
              <Stop offset="55%" stopColor={illustration.orange55} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={illustration.orange55} stopOpacity={0} />
            </RadialGradient>
            {cells
              .filter((c) => c.label)
              .map((c) => (
                <Path key={c.label!.pathId} id={c.label!.pathId} d={c.label!.pathD} fill="none" />
              ))}
          </Defs>

          <Line x1={dx0} y1={dy0} x2={dx1} y2={dy1} stroke={withAlpha(illustration.amber52, 0.32)} strokeWidth={1.2} strokeDasharray="3 4" />

          {cells.map((c) => {
            const passed = gHora >= c.order;
            const active = c.order === leadOrder;
            const P = HORA_PLANETS[c.planet];
            return (
              <G key={c.order}>
                <Path d={c.pathD} fill={P.color} opacity={passed ? 1 : 0.07} stroke={active ? withAlpha(neutral.white, 0.55) : undefined} strokeWidth={active ? 2 : 0} />
                <Line {...sc(horaTickline)} x1={c.tick.x1} y1={c.tick.y1} x2={c.tick.x2} y2={c.tick.y2} opacity={0.3} />
                {c.label && passed ? (
                  <SvgText textAnchor="middle" fill={c.label.fill} fontSize={c.label.fontSize} fontFamily={STUDY_FONT.semibold} alignmentBaseline="middle">
                    <TextPath href={`#${c.label.pathId}`} startOffset="50%">
                      {c.label.name}
                    </TextPath>
                  </SvgText>
                ) : null}
              </G>
            );
          })}

          <CompassMarker deg={0} nep="Sūryodaya" en="Sunrise" />
          <CompassMarker deg={90} nep="Madhyāhna" en="Midday" />
          <CompassMarker deg={180} nep="Sūryāsta" en="Sunset" />
          <CompassMarker deg={270} nep="Madhyarāta" en="Midnight" />

          <G>
            <Circle cx={HORA_CX} cy={HORA_CY - 30} r={98} fill="url(#hora-hubHalo)" />
            <G stroke={illustration.orange53b} strokeWidth={2.4} strokeLinecap="round" opacity={0.85}>
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                const r1 = 32;
                const r2 = 40;
                const cy = HORA_CY - 50;
                return <Line key={i} x1={HORA_CX + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={HORA_CX + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} />;
              })}
            </G>
            <Circle cx={HORA_CX} cy={HORA_CY - 50} r={27} fill="url(#hora-hubSun)" />
          </G>

          <SvgText {...sc(horaHubDay)} x={HORA_CX} y={HORA_CY + 2} textAnchor="middle">
            {bilingualText(lang, week.day, week.en)}
          </SvgText>
          <SvgText {...sc(horaHubRom)} x={HORA_CX} y={HORA_CY + 20} textAnchor="middle">
            {bilingualText(lang, week.rom, ruler.en).toUpperCase()}
          </SvgText>
          <SvgText {...sc(horaHubNum)} x={HORA_CX} y={HORA_CY + 42} textAnchor="middle">
            {`HORĀ ${horaPad(gii + 1)} / 24`}
          </SvgText>
          <SvgText {...sc(horaHubRuler)} x={HORA_CX} y={HORA_CY + 78} textAnchor="middle" fill={ruler.color}>
            {bilingualText(lang, HORA_DEVA[rulerKey], ruler.en)}
          </SvgText>

          <Circle cx={mx} cy={my} r={15} fill={tm("var(--brand-gold)")} opacity={0.3} />
          <Circle cx={mx} cy={my} r={10} fill="none" stroke={tm("var(--brand-gold)")} strokeWidth={2.4} />
          <Circle cx={mx} cy={my} r={6} fill={neutral.white} />
        </Svg>
      </View>

      <View className="w-full max-w-[640px] gap-1">
        <StudyScrubRow>
          <StudyPlayButton playing={playing} onPress={() => setPlaying((v) => !v)} />
          <StudyRange min={0} max={PROG_STEPS - 1} step={1} value={progStep} onChange={onScrub} onSlidingComplete={() => setScrubbing(false)} />
          <Text className="font-num text-sm font-semibold" style={{ color: ink.faint }}>
            {digits(gr + 1)}/7
          </Text>
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? tFor(lang, "common.exit_fullscreen") : tFor(lang, "common.fullscreen")}
            className={horaRoundBtn}
            style={{ borderColor: ink.border }}
          >
            <Ionicons name={expanded ? "contract" : "expand"} size={16} color={ink.ink} />
          </Pressable>
        </StudyScrubRow>
      </View>
    </View>
  );

  const weekList = (
    <View className="w-full max-w-[440px] self-center">
      <Text className={horaWeekHead} style={[nepaliTextStyle(14), { color: ink.faint }]}>
        {tFor(lang, "panchanga.hora.seven_days")}
      </Text>
      {HORA_WEEK.map((w, i) => {
        const P = HORA_PLANETS[w.ruler];
        return (
          <View key={w.day} className="flex-row items-center gap-2.5 py-1.5">
            <Text className="w-5 text-center text-sm font-semibold" style={{ color: ink.faint }}>
              {digits(i + 1)}
            </Text>
            <GrahaPlanetIcon graha={HORA_TO_GRAHA[w.ruler]} size={30} />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold" style={[nepaliTextStyle(15), { color: ink.ink }]}>
                {bilingualText(lang, w.day, w.en)}
              </Text>
              <Text className="text-sm" style={[nepaliTextStyle(13), { color: ink.faint }]}>
                {bilingualText(lang, `${w.rom} · ${HORA_DEVA[w.ruler]} ${P.nep}`, `${P.en} · ${P.nep}`)}
              </Text>
            </View>
            <View className="h-2 w-10 rounded-full" style={{ backgroundColor: P.color }} />
          </View>
        );
      })}
    </View>
  );

  return (
    <StudyCard view={studyView}>
      {ringNode}
      {weekList}
      {expanded ? (
        <Modal visible animationType="fade" supportedOrientations={["portrait", "landscape"]} onRequestClose={() => setExpanded(false)}>
          <View className={ink.isDark ? "dark flex-1" : "flex-1"} style={[nativeWindThemeVars(ink.isDark ? "dark" : "light"), { backgroundColor: ink.card }]}>
            <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: Math.max(insets.top, space.md), paddingBottom: Math.max(insets.bottom, space.md), gap: space.lg }}>
              {ringNode}
              {weekList}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </StudyCard>
  );
}
