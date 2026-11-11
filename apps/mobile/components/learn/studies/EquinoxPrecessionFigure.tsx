import { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { STUDY_FONT, useTm } from "@/components/learn/study/study-ink";
import { StudyCaption, StudyCard, StudyControls, StudyHl, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow, StudySliderLabel, StudySliderRow, StudySvg } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocaleDigits } from "@/components/learn/study/study-digits";
import { useLocale } from "@vedic-patro/i18n/react";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { RashiGlyph } from "@/components/learn/studies/rashi-icon-figures";

import { illustration } from "@vedic-patro/design-tokens";
/**
 * अयन चलन — how the *tropical* spring-equinox point (सायन ०°, "Point 0") slowly
 * regresses through the FIXED *sidereal* zodiac (निरयन राशि), and why that is the
 * real reason the ऋतु drift against the वि.सं. months.
 *
 * The scene is a pseudo-3D view of the ecliptic plane seen from slightly above:
 *   • a tilted ring of the 12 sidereal राशि (FIXED — anchored to the stars)
 *   • the yellow ecliptic circle (the राशि plane, z = 0)
 *   • the blue celestial equator — the same circle tilted by the obliquity ε
 *     (≈ 23°26′) about the equinox line, so the two cross exactly at the equinoxes
 *   • Earth at the centre with its tilted N–S axis
 *   • the red विषुव/अयनान्त cross (Spring/Fall equinox + Summer/Winter solstice)
 *
 * The cross + equator rotate with the year slider (वि.सं. ० → +26,000) at the
 * precession rate (≈ 50.29″/yr ≈ 1° / 72 yr); the राशि ring stays put. Watch the
 * spring equinox slide from राशि to राशि — one full lap ≈ 25,772 years.
 */

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/* precession rate, degrees / year (≈ 50.2879″) */
const RATE = 50.2879 / 3600;
/* obliquity of the ecliptic (axial tilt) */
const EPS = 23.4367;
/* one full precession lap (years) */
const CYCLE = Math.round(360 / RATE); // ≈ 25,772
/* वि.सं. year where Lahiri ayanāṁśa = 0 (≈ 285 CE) → equinox at मेष ०° */
const BS_AYAN_ZERO = 342;
/* slider runs from the very start of वि.सं. to one full lap later */
const Y_MIN = 0;
const Y_MAX = CYCLE;

const rashiIndex = (lon: number) => Math.floor((((lon % 360) + 360) % 360) / 30);
const norm360 = (a: number) => ((a % 360) + 360) % 360;

/* ---- geometry ---------------------------------------------------------- */
const VB = { W: 900, H: 560 };
const CX = 450;
const CY = 268;
const RX = 300; // ecliptic horizontal radius
const RY = 134; // ecliptic vertical radius (perspective squash)
const ZY = 104; // screen rise per unit of ecliptic-north (out-of-plane)

/** in-plane angle (deg): sidereal longitude λ → screen direction (मेष ०° at top). */
const alphaOf = (lonSid: number) => lonSid + 90;

/** project an ecliptic-plane direction (z = 0) at in-plane angle α, scaled by f. */
function projPlane(alphaDeg: number, f: number): [number, number] {
  const a = alphaDeg * D2R;
  return [CX + RX * f * Math.cos(a), CY - RY * f * Math.sin(a)];
}

/** project a full 3-vector (unit-ish) to screen. +z = ecliptic north (up). */
function proj3(x: number, y: number, z: number, f = 1): [number, number] {
  return [CX + RX * f * x, CY - RY * f * y - ZY * f * z];
}
const fmtPt = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/**
 * The four cardinal points of the tropical year, anticlockwise from the spring
 * equinox. `gloss` is the small English caption printed under the Nepali name,
 * so it is its own key — the English bundle is loaded on demand and cannot be
 * read while the app is in Nepali.
 */
const CARDINALS = [
  { key: "learn.study.spring_equinox", gloss: null, point0: true },
  { key: "learn.study.summer_solstice", gloss: "learn.study.equinox.gloss_summer_solstice", point0: false },
  { key: "learn.study.autumn_equinox", gloss: "learn.study.equinox.gloss_fall_equinox", point0: false },
  { key: "learn.study.equinox.hemanta_solstice", gloss: "learn.study.equinox.gloss_winter_solstice", point0: false },
] as const;

export function EquinoxPrecession() {
  const tm = useTm();
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const N = useLocaleDigits();
  const { lang } = useLocale();
  const RASHI = useMemo(() => getRashiList(lang), [lang]);
  const fmtDeg = (a: number) =>
    `${N(Math.floor(a))}°${N(String(Math.round((a - Math.floor(a)) * 60)).padStart(2, "0"))}′`;

  const nowBs = new Date().getFullYear() + 57; // ≈ current वि.सं.
  const [year, setYear] = useState(nowBs);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setYear((y) => {
        const next = y + dt * 320; // ~320 वि.सं. years / second
        return next > Y_MAX ? Y_MIN : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live]);

  const model = useMemo(() => {
    // sidereal longitude of the spring equinox at this वि.सं. year
    const eqSid = norm360((BS_AYAN_ZERO - year) * RATE);
    const ayanamsha = (year - BS_AYAN_ZERO) * RATE; // shift from मेष ०°
    const sinceBs0 = year * RATE; // shift since वि.सं. ०
    const alphaEq = alphaOf(eqSid);

    // celestial equator polyline: ecliptic circle tilted by ε about the equinox axis
    const ce = Math.cos(EPS * D2R);
    const se = Math.sin(EPS * D2R);
    const aEqR = alphaEq * D2R;
    const cAeq = Math.cos(aEqR);
    const sAeq = Math.sin(aEqR);
    const eqPoint = (phiDeg: number): [number, number, number] => {
      const a = (alphaEq + phiDeg) * D2R;
      const cphi = Math.cos(phiDeg * D2R);
      const sphi = Math.sin(phiDeg * D2R);
      return [
        Math.cos(a) * ce + cAeq * cphi * (1 - ce),
        Math.sin(a) * ce + sAeq * cphi * (1 - ce),
        sphi * se,
      ];
    };
    const equatorPath = Array.from({ length: 73 }, (_, k) => {
      const [x, y, z] = eqPoint(k * 5);
      return `${k === 0 ? "M" : "L"}${fmtPt(proj3(x, y, z))}`;
    }).join(" ");

    // Earth's axis (celestial north pole) = ecliptic north tilted ε about equinox axis
    const poleVec: [number, number, number] = [sAeq * se, -cAeq * se, ce];

    return { eqSid, ayanamsha, sinceBs0, alphaEq, equatorPath, poleVec };
  }, [year]);

  const eqRashi = RASHI[rashiIndex(model.eqSid)];

  const amber = tm("var(--tm-amber)");
  const gold = tm("var(--tm-gold)");
  const dim = tm("var(--tm-ink-dim)");
  const faint = tm("var(--tm-ink-faint)");
  const card = tm("var(--tm-card)");
  const red = illustration.red56;

  const bandOuter = 1.30;
  const bandInner = 0.92;
  const ICON = 40;
  const sun = projPlane(model.alphaEq, bandInner);
  const solsticeEcl = projPlane(model.alphaEq + 90, 1);
  const solsticeEqu = proj3(...((): [number, number, number] => {
    const a = (model.alphaEq + 90) * D2R;
    const ce = Math.cos(EPS * D2R), se = Math.sin(EPS * D2R);
    return [Math.cos(a) * ce, Math.sin(a) * ce, se];
  })());
  const [pnX, pnY] = proj3(...model.poleVec, 0.42);
  const [psX, psY] = proj3(-model.poleVec[0], -model.poleVec[1], -model.poleVec[2], 0.42);

  return (
    <StudyCard view={studyView}>
      <StudySvg w={VB.W} h={VB.H} label={t("learn.study.equinox.aria")}>
        <Defs>
          <RadialGradient id="ep-earth" cx="42%" cy="38%" r="65%">
            <Stop offset="0%" stopColor={illustration.sky86} />
            <Stop offset="45%" stopColor={illustration.sky51} />
            <Stop offset="100%" stopColor={illustration.sky22} />
          </RadialGradient>
          <RadialGradient id="ep-sun" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor={illustration.amber92} />
            <Stop offset="55%" stopColor={illustration.amber67} />
            <Stop offset="100%" stopColor={illustration.orange53} />
          </RadialGradient>
        </Defs>

        {/* ── zodiac band (FIXED sidereal राशि) ── */}
        <Ellipse cx={CX} cy={CY} rx={RX * bandOuter} ry={RY * bandOuter} fill={tm("color-mix(in srgb, var(--tm-teal) 14%, var(--tm-card))")} stroke={tm("var(--tm-border)")} strokeWidth={1} />
        <Ellipse cx={CX} cy={CY} rx={RX * bandInner} ry={RY * bandInner} fill={card} stroke={tm("var(--tm-border)")} strokeWidth={1} />
        {RASHI.map((name, i) => {
          const a0 = i * 30;
          const [ix, iy] = projPlane(alphaOf(a0), bandInner);
          const [ox, oy] = projPlane(alphaOf(a0), bandOuter);
          const [lx, ly] = projPlane(alphaOf(a0 + 15), (bandInner + bandOuter) / 2);
          const here = i === rashiIndex(model.eqSid);
          const col = here ? amber : dim;
          return (
            <G key={name}>
              <Line x1={ix} y1={iy} x2={ox} y2={oy} stroke={tm("var(--tm-border)")} strokeWidth={1} />
              <RashiGlyph index={i} size={ICON} cx={lx} cy={ly - 11} color={col} opacity={here ? 1 : 0.85} title={name} />
              <SvgText x={lx} y={ly + 19} fill={col} textAnchor="middle" alignmentBaseline="central"
                fontSize={12.5} fontFamily={here ? STUDY_FONT.bold : STUDY_FONT.semibold}>
                {name}
              </SvgText>
            </G>
          );
        })}

        {/* ── yellow ecliptic (राशि plane) ── */}
        <Ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={gold} strokeWidth={2.4} />
        {/* ── blue celestial equator (tilted by ε) ── */}
        <Path d={model.equatorPath} fill="none" stroke={illustration.sky51} strokeWidth={2.4} />

        {/* ── red विषुव / अयनान्त cross (rotates with precession) ── */}
        {[0, 1].map((d) => {
          const a = model.alphaEq + d * 90;
          const [x1, y1] = projPlane(a, bandOuter);
          const [x2, y2] = projPlane(a + 180, bandOuter);
          return <Line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={red} strokeWidth={1.8} strokeDasharray="3 5" strokeLinecap="round" />;
        })}
        {CARDINALS.map((c, k) => {
          const [lx, ly] = projPlane(model.alphaEq + k * 90, bandOuter + 0.13);
          return (
            <G key={c.key}>
              <SvgText x={lx} y={ly - 5} fill={red} textAnchor="middle" alignmentBaseline="central" fontSize={11.5} fontFamily={STUDY_FONT.bold}>
                {t(c.key)}
              </SvgText>
              <SvgText x={lx} y={ly + 8} fill={dim} textAnchor="middle" alignmentBaseline="central" fontSize={9.5} fontFamily={STUDY_FONT.regular}>
                {c.point0
                  ? t("learn.study.equinox.point_zero")
                  : lang === "en"
                    ? ""
                    : t(c.gloss)}
              </SvgText>
            </G>
          );
        })}

        {/* obliquity ε marker at the solstice colure */}
        <Line x1={solsticeEcl[0]} y1={solsticeEcl[1]} x2={solsticeEqu[0]} y2={solsticeEqu[1]} stroke={faint} strokeWidth={1.2} />
        <SvgText x={(solsticeEcl[0] + solsticeEqu[0]) / 2 + 8} y={(solsticeEcl[1] + solsticeEqu[1]) / 2} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.semibold}>
          ε {fmtDeg(EPS)}
        </SvgText>

        {/* Earth + tilted axis */}
        <Line x1={psX} y1={psY} x2={pnX} y2={pnY} stroke={dim} strokeWidth={1.6} />
        <SvgText x={pnX} y={pnY - 8} fill={dim} textAnchor="middle" fontSize={11} fontFamily={STUDY_FONT.bold}>N</SvgText>
        <SvgText x={psX} y={psY + 14} fill={dim} textAnchor="middle" fontSize={11} fontFamily={STUDY_FONT.bold}>S</SvgText>
        <Circle cx={CX} cy={CY} r={17} fill="url(#ep-earth)" stroke={illustration.sky19} strokeWidth={1} />

        {/* Sun glyph at the spring equinox */}
        <G transform={`translate(${sun[0].toFixed(1)} ${sun[1].toFixed(1)})`}>
          <Circle r={9} fill="url(#ep-sun)" />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * TAU;
            return <Line key={k} x1={11 * Math.cos(a)} y1={11 * Math.sin(a)} x2={15 * Math.cos(a)} y2={15 * Math.sin(a)} stroke={illustration.orange53b} strokeWidth={1.5} strokeLinecap="round" />;
          })}
        </G>

        {/* legend */}
        <G transform="translate(14 14)">
          <Line x1={0} y1={6} x2={22} y2={6} stroke={gold} strokeWidth={2.4} />
          <SvgText x={28} y={6} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.equinox.legend_ecliptic")}
          </SvgText>
          <Line x1={0} y1={24} x2={22} y2={24} stroke={illustration.sky51} strokeWidth={2.4} />
          <SvgText x={28} y={24} fill={dim} alignmentBaseline="central" fontSize={11} fontFamily={STUDY_FONT.regular}>
            {t("learn.study.equinox.legend_equator")}
          </SvgText>
        </G>
      </StudySvg>

      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{t("learn.study.year")}</StudyRoK>
            <StudyRoV mono={true}>
              {t("learn.study.year_bs", { year: N(Math.round(year)) })}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.equinox.equinox_now")}</StudyRoK>
            <StudyRoV amber={true}>{eqRashi}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.equinox.shift_since_bs0")}</StudyRoK>
            <StudyRoV mono={true} amber={true}>{fmtDeg(model.sinceBs0)}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.equinox.ayanamsha_from_mesha")}</StudyRoK>
            <StudyRoV mono={true}>{model.ayanamsha < 0 ? `−${fmtDeg(-model.ayanamsha)}` : fmtDeg(model.ayanamsha)}</StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>

        <StudySliderRow>
          <StudySliderLabel>
            {t("learn.study.equinox.slider", {
              from: N(Y_MIN),
              to: N(Y_MAX),
              cycle: N(CYCLE),
            })}
          </StudySliderLabel>
          <StudyScrubRow>
            <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
            <StudyRange min={Y_MIN} max={Y_MAX} step={1} value={Math.round(year)} onChange={(v: number) => { setPlaying(false); setYear(v); }} />
          </StudyScrubRow>
        </StudySliderRow>

        <StudyPresetRow>
          <StudyPresetButton onPress={() => { setPlaying(false); setYear(0); }}>
            {t("learn.study.equinox.preset_bs_start")}
          </StudyPresetButton>
          <StudyPresetButton onPress={() => { setPlaying(false); setYear(nowBs); }}>
            {t("learn.study.equinox.preset_now")}
          </StudyPresetButton>
        </StudyPresetRow>
      </StudyControls>

      <StudyCaption>
        {t("learn.study.equinox.caption_lead")}{" "}
        <StudyHl>{t("learn.study.equinox.caption_fixed")}</StudyHl>{" "}
        {t("learn.study.equinox.caption_wobble")}{" "}
        <StudyHl amber>{t("learn.study.equinox.caption_point_zero")}</StudyHl>{" "}
        {t("learn.study.equinox.caption_tail", { years: N(72), rashi: eqRashi })}
      </StudyCaption>
    </StudyCard>
  );
}
