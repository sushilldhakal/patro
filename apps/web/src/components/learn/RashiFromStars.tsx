import { wheelFitScreen } from "@vedic-patro/design-tokens/classes/wheel-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { edScrub } from "@/lib/diagram-classes";
import { motSliderLabel, motSliderRow, tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap, edSvg } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocaleDigits } from "@/i18n/digits";
import { useLocale } from "@/i18n/locale";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/calendar/bs-calendar";
import { flattenSkyCulture } from "@vedic-patro/domain/astronomy/sky3d/sky-culture";
import { illustration } from "@vedic-patro/design-tokens";

/**
 * How a राशि comes out of the stars — the same wheel as [[AyanamshaWheel]],
 * told in four steps on one timeline:
 *
 *   1. the twelve zodiac star figures, each star at its real ecliptic
 *      longitude (angle) and latitude (distance from the ecliptic circle);
 *   2. the longitude each figure actually covers — ragged, unequal, with gaps;
 *   3. the 360° circle cut from निरयन ०° into twelve equal 30° slices, each
 *      named after the figure it holds;
 *   4. the Sun walking the wheel — its slice is its rashi, each crossing a
 *      सङ्क्रान्ति.
 *
 * Star positions come from the Stellarium "indian" sky culture
 * ([[sky-culture]]), J2000 ecliptic, shifted to sidereal by Lahiri's
 * ayanamsha at J2000. Stars and the sidereal zero precess together, so that
 * one constant keeps the picture right for any epoch.
 */

const AYANAMSHA_J2000 = 23.85;

/** Source-file ids of the twelve rashi figures, Mesha → Meena. */
const RASHI_FIGURE_IDS = ["Meṣa", "Vṛṣa", "Mith", "Kark", "Simh", "Kany", "Tulā", "Vṛśc", "Dhan", "Makr", "Kumbh", "Mīna"];

/** Step start times on the timeline, seconds; the last step ends at T_END. */
const STEP_START = [0, 4, 9, 14] as const;
const T_END = 28;
const T_INITIAL = STEP_START[1]; // all stars already drawn — never open on an empty wheel

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const norm = (lon: number) => ((lon % 360) + 360) % 360;

/* ---- geometry ---------------------------------------------------------- */
const VB = 640;
const CX = 320;
const CY = 320;
const R_ECL = 190; // the ecliptic itself — latitude 0
const LAT_SCALE = 2.8; // px per degree of ecliptic latitude
const R_SLICE_IN = 100;
const R_SLICE_OUT = 276;
const R_SPAN_IN = 262;
const R_SPAN_OUT = 270;
const R_OUTER_LABEL = 290;
const R_INNER_LABEL = 116;

/** longitude (deg, CCW, 0 = 3 o'clock) → screen point at radius r */
function polar(r: number, lonDeg: number): [number, number] {
  const a = (lonDeg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

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

type Figure = {
  stars: { x: number; y: number; r: number }[];
  links: [number, number][];
  /** Sidereal longitude span, unwrapped so `to > from` even across 0°. */
  from: number;
  to: number;
};

function buildFigures(): Figure[] {
  const { stars, figures } = flattenSkyCulture();
  return RASHI_FIGURE_IDS.map((id) => {
    const f = figures.find((g) => g.figure.id === id)!;
    const lons = f.starIndices.map((i) => norm(stars[i].lon - AYANAMSHA_J2000));
    const ref = lons[0];
    const unwrapped = lons.map((l) => ref + ((l - ref + 540) % 360) - 180);
    return {
      stars: f.starIndices.map((i, k) => {
        const s = stars[i];
        const [x, y] = polar(R_ECL + s.lat * LAT_SCALE, lons[k]);
        return { x, y, r: Math.max(1.1, 3.6 - 0.55 * s.mag) };
      }),
      links: f.figure.links,
      from: Math.min(...unwrapped),
      to: Math.max(...unwrapped),
    };
  });
}

/** Static star data — built once, on first import. */
const FIGURES = buildFigures();

export function RashiFromStars() {
  const { t } = useTranslation();
  const N = useLocaleDigits();
  const { lang } = useLocale();
  const RASHI = useMemo(() => getRashiList(lang), [lang]);

  const [time, setTime] = useState<number>(T_INITIAL);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((v) => (v + dt >= T_END ? 0 : v + dt));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const step = Math.max(0, STEP_START.findLastIndex((s) => time > s));
  /* each step reveals its twelve items one after another */
  const reveal = (k: number, i: number) => {
    const end = STEP_START[k + 1] ?? T_END;
    return clamp01(((time - STEP_START[k]) / (end - STEP_START[k])) * 12 - i);
  };
  const starOp = (i: number) => reveal(0, i);
  const spanOp = (i: number) => reveal(1, i);
  const sliceOp = (i: number) => reveal(2, i);
  const sunOn = step === 3;
  const sunLon = sunOn ? ((time - STEP_START[3]) / (T_END - STEP_START[3])) * 360 : 0;
  const sunRashi = Math.min(11, Math.floor(sunLon / 30));

  /* the figure step 2 is currently drawing, for the readout */
  const spanIdx = Math.min(11, Math.max(0, Math.ceil(((time - STEP_START[1]) / (STEP_START[2] - STEP_START[1])) * 12) - 1));
  const spanFig = FIGURES[spanIdx];

  const ink = "var(--tm-ink)";
  const dim = "var(--tm-ink-dim)";
  const faint = "var(--tm-ink-faint)";
  const teal = "var(--tm-teal)";
  const amber = "var(--tm-amber)";
  const card = "var(--tm-card)";

  const jump = (k: number) => {
    setPlaying(false);
    setTime(k === 0 ? 0.001 : STEP_START[k] + 0.001);
    setPlaying(true);
  };

  const [sx, sy] = polar(R_ECL, sunLon);

  return (
    <div className={tmCardPadLg}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className={cn(edSvg(), wheelFitScreen)}
        role="img"
        aria-label={t("learn.study.rashi_stars.aria")}
      >
        <defs>
          <radialGradient id="rs-sun" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor={illustration.amber92} />
            <stop offset="55%" stopColor={illustration.amber67} />
            <stop offset="100%" stopColor={illustration.orange53} />
          </radialGradient>
        </defs>

        {/* step 3: twelve equal slices, from nirayana 0° */}
        {RASHI.map((name, i) => {
          const op = sliceOp(i);
          if (op === 0) return null;
          const active = sunOn && sunRashi === i;
          const [lx, ly] = polar(R_OUTER_LABEL, i * 30 + 15);
          const [bx0, by0] = polar(R_SLICE_IN, i * 30);
          const [bx1, by1] = polar(R_SLICE_OUT, i * 30);
          return (
            <g key={name} opacity={op}>
              <path
                d={sectorPath(R_SLICE_IN, R_SLICE_OUT, i * 30, i * 30 + 30)}
                fill={
                  active
                    ? "color-mix(in srgb, var(--tm-amber) 22%, transparent)"
                    : i % 2 === 0
                      ? "color-mix(in srgb, var(--tm-teal) 8%, transparent)"
                      : "color-mix(in srgb, var(--tm-teal) 2%, transparent)"
                }
              />
              <line x1={bx0} y1={by0} x2={bx1} y2={by1} stroke={i === 0 ? teal : "var(--tm-border)"} strokeWidth={i === 0 ? 2.4 : 1.2} />
              <text
                x={lx}
                y={ly}
                fill={active ? amber : dim}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ font: "700 13px var(--pn-font)" }}
              >
                {name}
              </text>
            </g>
          );
        })}

        {/* the ecliptic and its 10° ticks */}
        <circle cx={CX} cy={CY} r={R_ECL} fill="none" stroke={amber} strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
        {Array.from({ length: 36 }, (_, k) => {
          const major = k % 3 === 0;
          const [x1, y1] = polar(R_SPAN_OUT + 2, k * 10);
          const [x2, y2] = polar(R_SPAN_OUT + (major ? 9 : 5), k * 10);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={faint} strokeWidth={major ? 1.3 : 0.8} />;
        })}

        {/* step 2: the longitude each figure really covers */}
        {FIGURES.map((f, i) => {
          const op = spanOp(i);
          if (op === 0) return null;
          const color = i % 2 === 0 ? teal : amber;
          const [wx, wy] = polar(R_OUTER_LABEL, (f.from + f.to) / 2);
          return (
            <g key={i} opacity={step >= 2 ? 0.35 : op}>
              <path d={sectorPath(R_SPAN_IN, R_SPAN_OUT, f.from, f.to)} fill={color} />
              {step === 1 && (
                <text x={wx} y={wy} fill={color} textAnchor="middle" dominantBaseline="central" style={{ font: "700 12px var(--pn-num)" }}>
                  {N(Math.round(f.to - f.from))}°
                </text>
              )}
            </g>
          );
        })}

        {/* step 1: the star figures themselves */}
        {FIGURES.map((f, i) => {
          const op = starOp(i);
          if (op === 0) return null;
          const [lx, ly] = polar(R_INNER_LABEL, (f.from + f.to) / 2);
          return (
            <g key={i} opacity={op * (step >= 2 ? 0.75 : 1)}>
              {f.links.map(([a, b], k) => (
                <line key={k} x1={f.stars[a].x} y1={f.stars[a].y} x2={f.stars[b].x} y2={f.stars[b].y} stroke={teal} strokeWidth={1} opacity={0.7} />
              ))}
              {f.stars.map((s, k) => (
                <circle key={k} cx={s.x} cy={s.y} r={s.r} fill={ink} />
              ))}
              {step < 2 && (
                <text x={lx} y={ly} fill={dim} textAnchor="middle" dominantBaseline="central" style={{ font: "600 11px var(--pn-font)" }}>
                  {RASHI[i]}
                </text>
              )}
            </g>
          );
        })}

        {/* step 4: the Sun on the ecliptic */}
        {sunOn && (
          <>
            <line x1={CX} y1={CY} x2={sx} y2={sy} stroke={amber} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.85} />
            <circle cx={sx} cy={sy} r={11} fill="url(#rs-sun)" stroke={card} strokeWidth={2} />
          </>
        )}

        {/* centre — Earth / observer */}
        <circle cx={CX} cy={CY} r={16} fill="color-mix(in srgb, var(--tm-teal) 30%, var(--tm-card))" stroke={teal} strokeWidth={1.5} />
        <text x={CX} y={CY} fill={dim} textAnchor="middle" dominantBaseline="central" style={{ font: "600 9.5px var(--pn-font)" }}>
          {t("grahas.earth")}
        </text>
      </svg>

      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.rashi_stars.step")}</span>
            <span className={edRoV()}>{t(`learn.study.rashi_stars.step_${step + 1}`)}</span>
          </div>
          {step === 1 && (
            <div className={edRo}>
              <span className={edRoK}>{t("learn.study.rashi_stars.span")}</span>
              <span className={edRoV({ mono: true, amber: true })}>
                {RASHI[spanIdx]} · {N(Math.round(spanFig.to - spanFig.from))}°
              </span>
            </div>
          )}
          {sunOn && (
            <>
              <div className={edRo}>
                <span className={edRoK}>{t("learn.study.rashi_stars.sun_lon")}</span>
                <span className={edRoV({ mono: true })}>{N(Math.floor(sunLon))}°</span>
              </div>
              <div className={edRo}>
                <span className={edRoK}>{t("learn.rashi")}</span>
                <span className={edRoV({ amber: true })}>
                  {RASHI[sunRashi]} · {N(Math.floor(sunLon - sunRashi * 30))}°
                </span>
              </div>
              <div className={edRo}>
                <span className={edRoK}>{t("learn.solar_month")}</span>
                <span className={edRoV()}>{(lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)[sunRashi]}</span>
              </div>
            </>
          )}
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.rashi_stars.scrub")}</span>
          <div className={edScrubWrap}>
            <button
              type="button"
              className={edPlayBtn}
              onClick={() => setPlaying((p) => !p)}
              title={playing ? t("learn.pause") : t("learn.play")}
              aria-label={playing ? t("learn.pause") : t("learn.play")}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              className={edScrub}
              type="range"
              min={0}
              max={T_END}
              step={0.05}
              value={time}
              style={{ "--fill": `${(time / T_END) * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setTime(+e.target.value);
              }}
            />
          </div>
        </div>

        <div className={edPresets}>
          {STEP_START.map((_, k) => (
            <button key={k} type="button" className={edPreset(step === k)} onClick={() => jump(k)}>
              {t(`learn.study.rashi_stars.step_${k + 1}`)}
            </button>
          ))}
        </div>
      </div>

      <p className={tmCardCap}>{t(`learn.study.rashi_stars.caption_${step + 1}`)}</p>
    </div>
  );
}
