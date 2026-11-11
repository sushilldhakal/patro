import { Circle, Defs, G, Line, Marker, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { STUDY_FONT, useTm } from "@/components/learn/study/study-ink";
import { StudyCaption, StudyCard, StudyControls, StudyHl, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow, StudySliderLabel, StudySliderRow, StudySvg } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocaleDigits } from "@/components/learn/study/study-digits";
import { useLocale } from "@vedic-patro/i18n/react";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";

import { illustration } from "@vedic-patro/design-tokens";
/**
 * Ayanāṁśa (अयनांश) study — why the *sāyana* (tropical) and *nirayana*
 * (sidereal) zodiacs disagree, and by how much.
 *
 * The 12 rāśi sectors here are drawn against the FIXED stars (nirayana). Earth's
 * axis slowly wobbles (precession of the equinoxes, ~50.3″/yr ≈ 1° every 72
 * years), so the spring-equinox point — the start of the *tropical* zodiac —
 * drifts backwards through those fixed stars. The angle between the fixed
 * sidereal Meṣa-0° and the drifting equinox IS the ayanāṁśa. A year slider
 * sweeps the precession; preset buttons swap the three common systems (Lahiri,
 * Raman, KP), which place the sidereal zero slightly differently; a graha slider
 * shows how one and the same sky position is read as two different rāśi.
 */

const TAU = Math.PI * 2;

/* precession rate, degrees / year (≈ 50.2879″) */
const RATE = 50.2879 / 3600;

/* CE → बिक्रम सम्वत् (Vikram Sambat runs ≈ 57 years ahead). Internal ayanāṁśa
 * math stays in CE; only the year readout is shown in वि.सं. */
const ceToBs = (ce: number) => Math.round(ce) + 57;

/* each system's ayanāṁśa at year 2000 CE (degrees) */
const SYSTEMS = {
  lahiri: { key: "learn.study.ayanamsha.system_lahiri", base2000: 23.85 },
  raman: { key: "learn.study.ayanamsha.system_raman", base2000: 22.5 },
  kp: { key: "learn.study.ayanamsha.system_kp", base2000: 23.71 },
} as const;
type SystemKey = keyof typeof SYSTEMS;

function ayanamsha(year: number, sys: SystemKey): number {
  return Math.max(0, SYSTEMS[sys].base2000 + (year - 2000) * RATE);
}

const rashiIndex = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);

/* ---- geometry ---------------------------------------------------------- */
const VB = { W: 640, H: 640 };
const CX = 320;
const CY = 318;
const R_OUT = 250; // outer edge of the rāśi band
const R_IN = 206; // inner edge of the rāśi band
const R_LABEL = 228; // rāśi names
const R_RIM = 196; // where reference radii / arcs live
const R_PLANET = 150; // graha dot circle

/** longitude (deg, CCW, 0 = 3 o'clock) → screen point at radius r */
function polar(r: number, lonDeg: number): [number, number] {
  const a = (lonDeg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}
const pt = (r: number, l: number) => polar(r, l).map((n) => n.toFixed(2)).join(",");

/** annular sector from a0 → a1 (CCW, a1 > a0). */
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

interface Model {
  year: number;
  sys: SystemKey;
  A: number; // ayanāṁśa, deg
  graha: number; // sidereal longitude of the sample graha, deg
  equinoxLon: number; // sidereal longitude of the spring-equinox point
}

function computeModel(year: number, sys: SystemKey, graha: number): Model {
  const A = ayanamsha(year, sys);
  return { year, sys, A, graha, equinoxLon: (360 - (A % 360)) % 360 };
}

export function AyanamshaWheel() {
  const tm = useTm();
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const N = useLocaleDigits();
  const { lang } = useLocale();
  const RASHI = useMemo(() => getRashiList(lang), [lang]);

  /** "DD°MM′" in locale digits. */
  const fmtDM = (a: number): string => {
    let d = Math.floor(a);
    let m = Math.round((a - d) * 60);
    if (m === 60) { d += 1; m = 0; }
    return `${N(d)}°${N(String(m).padStart(2, "0"))}′`;
  };

  const [year, setYear] = useState(2026);
  const [sys, setSys] = useState<SystemKey>("lahiri");
  const [graha, setGraha] = useState(25);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setYear((y) => {
        const next = y + dt * 70; // ~70 years / second
        return next > 2200 ? 285 : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live]);

  const m = useMemo(() => computeModel(year, sys, graha), [year, sys, graha]);

  const niLon = ((m.graha % 360) + 360) % 360; // nirayana longitude = the dot's own longitude
  const saLon = (niLon + m.A) % 360; // sāyana longitude
  const niRashi = RASHI[rashiIndex(niLon)];
  const saRashi = RASHI[rashiIndex(saLon)];
  const differ = niRashi !== saRashi;

  const ink = tm("var(--tm-ink)");
  const dim = tm("var(--tm-ink-dim)");
  const faint = tm("var(--tm-ink-faint)");
  const teal = tm("var(--tm-teal)");
  const amber = tm("var(--tm-amber)");
  const gold = tm("var(--tm-gold)");
  const card = tm("var(--tm-card)");

  /* tropical (sāyana) zero = equinox point; sidereal (nirayana) zero = lon 0 */
  const [exX, exY] = polar(R_RIM, m.equinoxLon);
  const [gx, gy] = polar(R_PLANET, niLon);
  const arcMidLon = (360 - m.A / 2) % 360; // middle of the ayanāṁśa wedge
  const [labA, labAy] = polar(R_RIM - 26, arcMidLon);

  return (
    <StudyCard view={studyView}>
      <StudySvg w={VB.W} h={VB.H} label={t("learn.study.ayanamsha.aria")} fitScreen>
        <Defs>
          <RadialGradient id="ay-sun" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor={illustration.amber92} />
            <Stop offset="55%" stopColor={illustration.amber67} />
            <Stop offset="100%" stopColor={illustration.orange53} />
          </RadialGradient>
          <Marker id="ay-arrow" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto">
            <Path d="M0,0 L7,3 L0,6 Z" fill={amber} />
          </Marker>
        </Defs>

        {/* faint ecliptic guide circle */}
        <Circle cx={CX} cy={CY} r={R_RIM} fill="none" stroke={faint} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />

        {/* 12 fixed sidereal rāśi sectors */}
        {RASHI.map((name, i) => {
          const a0 = i * 30;
          const a1 = a0 + 30;
          const [lx, ly] = polar(R_LABEL, a0 + 15);
          return (
            <G key={name}>
              <Path
                d={sectorPath(R_IN, R_OUT, a0, a1)}
                fill={i % 2 === 0 ? tm("color-mix(in srgb, var(--tm-teal) 9%, var(--tm-card))") : tm("color-mix(in srgb, var(--tm-teal) 3%, var(--tm-card))")}
                stroke={tm("var(--tm-border)")}
                strokeWidth={1}
              />
              <SvgText
                x={lx}
                y={ly}
                fill={dim}
                textAnchor="middle"
                alignmentBaseline="central"
                fontSize={13} fontFamily={STUDY_FONT.semibold}
              >
                {name}
              </SvgText>
            </G>
          );
        })}

        {/* degree ticks every 10° */}
        {Array.from({ length: 36 }, (_, k) => {
          const a = k * 10;
          const major = k % 3 === 0;
          const [x1, y1] = polar(R_IN, a);
          const [x2, y2] = polar(R_IN - (major ? 10 : 5), a);
          return <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={faint} strokeWidth={major ? 1.4 : 0.8} />;
        })}

        {/* ── the ayanāṁśa wedge: fixed nirayana-0° → drifting equinox ── */}
        <Path
          d={sectorPath(R_RIM - 30, R_RIM, m.equinoxLon, 360)}
          fill={tm("color-mix(in srgb, var(--tm-amber) 30%, transparent)")}
          stroke={amber}
          strokeWidth={1}
        />

        {/* nirayana 0° reference radius (sidereal Meṣa start) — teal */}
        <Line x1={CX} y1={CY} x2={polar(R_RIM, 0)[0]} y2={polar(R_RIM, 0)[1]} stroke={teal} strokeWidth={2.4} />
        <G transform={`translate(${pt(R_OUT + 4, 0)})`}>
          <SvgText fill={teal} textAnchor="start" alignmentBaseline="central" fontSize={12} fontFamily={STUDY_FONT.bold}>
            {t("learn.study.ayanamsha.nirayana_zero")}
          </SvgText>
          <SvgText y={15} fill={faint} textAnchor="start" alignmentBaseline="central" fontSize={10} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.ayanamsha.nirayana_zero_sub")}
          </SvgText>
        </G>

        {/* sāyana 0° = spring-equinox point — amber, with Sun glyph */}
        <Line x1={CX} y1={CY} x2={exX} y2={exY} stroke={amber} strokeWidth={2.4} markerEnd="url(#ay-arrow)" />
        <G transform={`translate(${polar(R_OUT + 18, m.equinoxLon)[0].toFixed(1)} ${polar(R_OUT + 18, m.equinoxLon)[1].toFixed(1)})`}>
          <Circle r={11} fill="url(#ay-sun)" />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * TAU;
            return (
              <Line
                key={k}
                x1={13 * Math.cos(a)}
                y1={13 * Math.sin(a)}
                x2={17 * Math.cos(a)}
                y2={17 * Math.sin(a)}
                stroke={illustration.orange53b}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            );
          })}
        </G>
        <G transform={`translate(${polar(R_OUT + 36, m.equinoxLon)[0].toFixed(1)} ${polar(R_OUT + 36, m.equinoxLon)[1].toFixed(1)})`}>
          <SvgText fill={amber} textAnchor="middle" alignmentBaseline="central" fontSize={12} fontFamily={STUDY_FONT.bold}>
            {t("learn.study.ayanamsha.sayana_zero")}
          </SvgText>
          <SvgText y={14} fill={faint} textAnchor="middle" alignmentBaseline="central" fontSize={10} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.spring_equinox")}
          </SvgText>
        </G>

        {/* ayanāṁśa value at the wedge mid-point */}
        <G transform={`translate(${labA.toFixed(1)} ${labAy.toFixed(1)})`}>
          <Rect x={-34} y={-13} width={68} height={26} rx={8} fill={card} stroke={amber} strokeWidth={1} />
          <SvgText fill={amber} textAnchor="middle" alignmentBaseline="central" fontSize={13} fontFamily={STUDY_FONT.bold}>
            {fmtDM(m.A)}
          </SvgText>
        </G>

        {/* graha — one sky position, two readings */}
        <Line x1={CX} y1={CY} x2={gx} y2={gy} stroke={gold} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.85} />
        <Circle cx={gx} cy={gy} r={8} fill={gold} stroke={card} strokeWidth={2} />
        <SvgText
          x={polar(R_PLANET - 22, niLon)[0]}
          y={polar(R_PLANET - 22, niLon)[1]}
          fill={ink}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={12} fontFamily={STUDY_FONT.bold}
        >
          {t("learn.study.ayanamsha.graha")}
        </SvgText>

        {/* centre — Earth / observer */}
        <Circle cx={CX} cy={CY} r={16} fill={tm("color-mix(in srgb, var(--tm-teal) 30%, var(--tm-card))")} stroke={teal} strokeWidth={1.5} />
        <SvgText x={CX} y={CY} fill={dim} textAnchor="middle" alignmentBaseline="central" fontSize={9.5} fontFamily={STUDY_FONT.semibold}>
          {t("grahas.earth")}
        </SvgText>

        {/* legend */}
        <G transform="translate(16 16)">
          <Line x1={0} y1={6} x2={22} y2={6} stroke={teal} strokeWidth={2.4} />
          <SvgText x={28} y={6} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.ayanamsha.legend_nirayana")}
          </SvgText>
          <Line x1={0} y1={26} x2={22} y2={26} stroke={amber} strokeWidth={2.4} markerEnd="url(#ay-arrow)" />
          <SvgText x={28} y={26} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.ayanamsha.legend_sayana")}
          </SvgText>
          <Rect x={0} y={36} width={22} height={11} rx={2} fill={tm("color-mix(in srgb, var(--tm-amber) 30%, transparent)")} stroke={amber} strokeWidth={1} />
          <SvgText x={28} y={42} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.ayanamsha.legend_ayanamsha")}
          </SvgText>
        </G>
      </StudySvg>

      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{t("learn.study.year")}</StudyRoK>
            <StudyRoV mono={true}>
              {t("learn.study.year_bs", { year: N(ceToBs(m.year)) })}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.ayanamsha.system")}</StudyRoK>
            <StudyRoV>{t(SYSTEMS[m.sys].key)}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("kundali.ayanamsha")}</StudyRoK>
            <StudyRoV mono={true} amber={true}>{fmtDM(m.A)}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.ayanamsha.graha_rashi")}</StudyRoK>
            <StudyRoV amber={differ}>
              {niRashi}
              {differ ? ` → ${saRashi}` : ""}
            </StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>

        <StudySliderRow>
          <StudySliderLabel>
            {t("learn.study.ayanamsha.slider_year", {
              from: N(ceToBs(285)),
              to: N(ceToBs(2200)),
            })}
          </StudySliderLabel>
          <StudyScrubRow>
            <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
            <StudyRange min={285} max={2200} step={1} value={year} onChange={(v: number) => {
                setPlaying(false);
                setYear(v);
              }} />
          </StudyScrubRow>
        </StudySliderRow>

        <StudySliderRow>
          <StudySliderLabel>{t("learn.study.ayanamsha.slider_graha")}</StudySliderLabel>
          <StudyRange min={0} max={359} step={1} value={graha} onChange={(v: number) => setGraha(v)} />
        </StudySliderRow>

        <StudyPresetRow>
          {(Object.keys(SYSTEMS) as SystemKey[]).map((k) => (
            <StudyPresetButton key={k} active={sys === k} onPress={() => setSys(k)}>
              {t(SYSTEMS[k].key)}
            </StudyPresetButton>
          ))}
          <StudyPresetButton onPress={() => {
              setPlaying(false);
              setYear(2026);
              setSys("lahiri");
              setGraha(25);
            }}>
            {t("learn.study.ayanamsha.preset_today")}
          </StudyPresetButton>
        </StudyPresetRow>
      </StudyControls>

      <StudyCaption>
        {t("learn.study.ayanamsha.caption_lead")}
        <StudyHl>{t("learn.study.ayanamsha.nirayana")}</StudyHl>
        {t("learn.study.ayanamsha.caption_wobble")}{" "}
        <StudyHl amber>{t("learn.study.ayanamsha.spring_equinox_point")}</StudyHl>{" "}
        {t("learn.study.ayanamsha.caption_angle")}{" "}
        {differ
          ? t("learn.study.ayanamsha.caption_differs", { nirayana: niRashi, sayana: saRashi })
          : t("learn.study.ayanamsha.caption_agrees", { nirayana: niRashi, sayana: saRashi })}
      </StudyCaption>
    </StudyCard>
  );
}
