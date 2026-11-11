/**
 * How a राशि comes out of the stars — the app's drawing of the website's
 * `RashiFromStars`, step for step: the twelve star figures at their real
 * sidereal longitude, the ragged span each covers, the twelve equal 30°
 * slices named after them, then the Sun walking the wheel.
 *
 * Geometry, timeline and colours are the website's; only the SVG elements
 * and the controls are the app's.
 */
import { useMemo } from "react";
import { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { illustration } from "@vedic-patro/design-tokens";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/calendar/bs-calendar";
import { flattenSkyCulture } from "@vedic-patro/domain/astronomy/sky3d/sky-culture";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { StudyCaption, StudyCard, StudyPresets, StudyReadouts, StudyScrub, StudySvg, type StudyReadout } from "@/components/learn/study/StudyCard";
import { STUDY_FONT, centralY, useStudyInk } from "@/components/learn/study/study-ink";
import { useStudyClock } from "@/components/learn/study/use-study-clock";

const AYANAMSHA_J2000 = 23.85;
const RASHI_FIGURE_IDS = ["Meṣa", "Vṛṣa", "Mith", "Kark", "Simh", "Kany", "Tulā", "Vṛśc", "Dhan", "Makr", "Kumbh", "Mīna"];

const STEP_START = [0, 4, 9, 14] as const;
const T_END = 28;
const T_INITIAL = STEP_START[1];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const norm = (lon: number) => ((lon % 360) + 360) % 360;

const VB = 640;
const CX = 320;
const CY = 320;
const R_ECL = 190;
const LAT_SCALE = 2.8;
const R_SLICE_IN = 100;
const R_SLICE_OUT = 276;
const R_SPAN_IN = 262;
const R_SPAN_OUT = 270;
const R_OUTER_LABEL = 290;
const R_INNER_LABEL = 116;

function polar(r: number, lonDeg: number): [number, number] {
  const a = (lonDeg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(rOut, a0);
  const [x2, y2] = polar(rOut, a1);
  const [x3, y3] = polar(rIn, a1);
  const [x4, y4] = polar(rIn, a0);
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${rOut},${rOut} 0 ${large} 0 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${rIn},${rIn} 0 ${large} 1 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

type Figure = {
  stars: { x: number; y: number; r: number }[];
  links: [number, number][];
  from: number;
  to: number;
};

let figuresCache: Figure[] | null = null;
function figures(): Figure[] {
  if (figuresCache) return figuresCache;
  const { stars, figures: all } = flattenSkyCulture();
  figuresCache = RASHI_FIGURE_IDS.map((id) => {
    const f = all.find((g) => g.figure.id === id)!;
    const lons = f.starIndices.map((i) => norm(stars[i]!.lon - AYANAMSHA_J2000));
    const ref = lons[0]!;
    const unwrapped = lons.map((l) => ref + ((l - ref + 540) % 360) - 180);
    return {
      stars: f.starIndices.map((i, k) => {
        const s = stars[i]!;
        const [x, y] = polar(R_ECL + s.lat * LAT_SCALE, lons[k]!);
        return { x, y, r: Math.max(1.1, 3.6 - 0.55 * s.mag) };
      }),
      links: f.figure.links as [number, number][],
      from: Math.min(...unwrapped),
      to: Math.max(...unwrapped),
    };
  });
  return figuresCache;
}

export function RashiFromStarsDiagram() {
  const { t, lang, digits } = useLocale();
  const ink = useStudyInk();
  const RASHI = useMemo(() => getRashiList(lang), [lang]);
  const FIGURES = useMemo(figures, []);
  const clock = useStudyClock({ initial: T_INITIAL, step: (v, dt) => (v + dt >= T_END ? 0 : v + dt) });
  const time = clock.value;

  let step = 0;
  STEP_START.forEach((s, k) => {
    if (time > s) step = k;
  });
  const reveal = (k: number, i: number) => {
    const end = STEP_START[k + 1] ?? T_END;
    return clamp01(((time - STEP_START[k]!) / (end - STEP_START[k]!)) * 12 - i);
  };
  const sunOn = step === 3;
  const sunLon = sunOn ? ((time - STEP_START[3]) / (T_END - STEP_START[3])) * 360 : 0;
  const sunRashi = Math.min(11, Math.floor(sunLon / 30));
  const spanIdx = Math.min(11, Math.max(0, Math.ceil(((time - STEP_START[1]) / (STEP_START[2] - STEP_START[1])) * 12) - 1));
  const spanFig = FIGURES[spanIdx]!;
  const [sx, sy] = polar(R_ECL, sunLon);

  const jump = (k: number) => {
    clock.setValue(k === 0 ? 0.001 : STEP_START[k]! + 0.001);
    clock.setPlaying(true);
  };

  const readouts: StudyReadout[] = [{ k: t("learn.study.rashi_stars.step"), v: t(`learn.study.rashi_stars.step_${step + 1}`) }];
  if (step === 1) {
    readouts.push({
      k: t("learn.study.rashi_stars.span"),
      v: `${RASHI[spanIdx]} · ${digits(Math.round(spanFig.to - spanFig.from))}°`,
      mono: true,
      amber: true,
    });
  }
  if (sunOn) {
    readouts.push(
      { k: t("learn.study.rashi_stars.sun_lon"), v: `${digits(Math.floor(sunLon))}°`, mono: true },
      { k: t("learn.rashi"), v: `${RASHI[sunRashi]} · ${digits(Math.floor(sunLon - sunRashi * 30))}°`, amber: true },
      { k: t("learn.solar_month"), v: (lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)[sunRashi]! },
    );
  }

  return (
    <StudyCard view={clock.view}>
      <StudySvg w={VB} h={VB} label={t("learn.study.rashi_stars.aria")} fitScreen>
        <Defs>
          <RadialGradient id="rs-sun" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor={illustration.amber92} />
            <Stop offset="55%" stopColor={illustration.amber67} />
            <Stop offset="100%" stopColor={illustration.orange53} />
          </RadialGradient>
        </Defs>

        {RASHI.map((name, i) => {
          const op = reveal(2, i);
          if (op === 0) return null;
          const active = sunOn && sunRashi === i;
          const [lx, ly] = polar(R_OUTER_LABEL, i * 30 + 15);
          const [bx0, by0] = polar(R_SLICE_IN, i * 30);
          const [bx1, by1] = polar(R_SLICE_OUT, i * 30);
          return (
            <G key={name} opacity={op}>
              <Path
                d={sectorPath(R_SLICE_IN, R_SLICE_OUT, i * 30, i * 30 + 30)}
                fill={active ? ink.mix(ink.amber, 22) : ink.mix(ink.teal, i % 2 === 0 ? 8 : 2)}
              />
              <Line x1={bx0} y1={by0} x2={bx1} y2={by1} stroke={i === 0 ? ink.teal : ink.border} strokeWidth={i === 0 ? 2.4 : 1.2} />
              <SvgText x={lx} y={centralY(ly, 13)} fill={active ? ink.amber : ink.dim} textAnchor="middle" fontSize={13} fontFamily={STUDY_FONT.bold}>
                {name}
              </SvgText>
            </G>
          );
        })}

        <Circle cx={CX} cy={CY} r={R_ECL} fill="none" stroke={ink.amber} strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
        {Array.from({ length: 36 }, (_, k) => {
          const major = k % 3 === 0;
          const [x1, y1] = polar(R_SPAN_OUT + 2, k * 10);
          const [x2, y2] = polar(R_SPAN_OUT + (major ? 9 : 5), k * 10);
          return <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink.faint} strokeWidth={major ? 1.3 : 0.8} />;
        })}

        {FIGURES.map((f, i) => {
          const op = reveal(1, i);
          if (op === 0) return null;
          const color = i % 2 === 0 ? ink.teal : ink.amber;
          const [wx, wy] = polar(R_OUTER_LABEL, (f.from + f.to) / 2);
          return (
            <G key={i} opacity={step >= 2 ? 0.35 : op}>
              <Path d={sectorPath(R_SPAN_IN, R_SPAN_OUT, f.from, f.to)} fill={color} />
              {step === 1 ? (
                <SvgText x={wx} y={centralY(wy, 12)} fill={color} textAnchor="middle" fontSize={12} fontFamily={STUDY_FONT.bold}>
                  {`${digits(Math.round(f.to - f.from))}°`}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {FIGURES.map((f, i) => {
          const op = reveal(0, i);
          if (op === 0) return null;
          const [lx, ly] = polar(R_INNER_LABEL, (f.from + f.to) / 2);
          return (
            <G key={i} opacity={op * (step >= 2 ? 0.75 : 1)}>
              {f.links.map(([a, b], k) => (
                <Line key={k} x1={f.stars[a]!.x} y1={f.stars[a]!.y} x2={f.stars[b]!.x} y2={f.stars[b]!.y} stroke={ink.teal} strokeWidth={1} opacity={0.7} />
              ))}
              {f.stars.map((s, k) => (
                <Circle key={k} cx={s.x} cy={s.y} r={s.r} fill={ink.ink} />
              ))}
              {step < 2 ? (
                <SvgText x={lx} y={centralY(ly, 11)} fill={ink.dim} textAnchor="middle" fontSize={11} fontFamily={STUDY_FONT.semibold}>
                  {RASHI[i]}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {sunOn ? (
          <G>
            <Line x1={CX} y1={CY} x2={sx} y2={sy} stroke={ink.amber} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.85} />
            <Circle cx={sx} cy={sy} r={11} fill="url(#rs-sun)" stroke={ink.card} strokeWidth={2} />
          </G>
        ) : null}

        <Circle cx={CX} cy={CY} r={16} fill={ink.mix(ink.teal, 30, ink.card)} stroke={ink.teal} strokeWidth={1.5} />
        <SvgText x={CX} y={centralY(CY, 9.5)} fill={ink.dim} textAnchor="middle" fontSize={9.5} fontFamily={STUDY_FONT.semibold}>
          {t("grahas.earth")}
        </SvgText>
      </StudySvg>

      <StudyReadouts items={readouts} />
      <StudyScrub
        label={t("learn.study.rashi_stars.scrub")}
        value={time}
        min={0}
        max={T_END}
        step={0.05}
        playing={clock.playing}
        onToggle={clock.toggle}
        onChange={clock.scrubTo}
      />
      <StudyPresets
        items={STEP_START.map((_, k) => ({ label: t(`learn.study.rashi_stars.step_${k + 1}`), active: step === k, onPress: () => jump(k) }))}
      />
      <StudyCaption>{t(`learn.study.rashi_stars.caption_${step + 1}`)}</StudyCaption>
    </StudyCard>
  );
}
