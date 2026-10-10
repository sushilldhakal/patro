import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { edScrub } from "@/lib/diagram-classes";
import { motSliderLabel, motSliderRow, tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap, edSvg } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocaleDigits } from "@/i18n/digits";
import { useLocale } from "@/i18n/locale";
import { getRashiList } from "@/lib/rashi-i18n";

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
 * math stays in CE; only the year readout is shown in बि.सं. */
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
    if (!playing) return;
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
  }, [playing]);

  const m = useMemo(() => computeModel(year, sys, graha), [year, sys, graha]);

  const niLon = ((m.graha % 360) + 360) % 360; // nirayana longitude = the dot's own longitude
  const saLon = (niLon + m.A) % 360; // sāyana longitude
  const niRashi = RASHI[rashiIndex(niLon)];
  const saRashi = RASHI[rashiIndex(saLon)];
  const differ = niRashi !== saRashi;

  const ink = "var(--tm-ink)";
  const dim = "var(--tm-ink-dim)";
  const faint = "var(--tm-ink-faint)";
  const teal = "var(--tm-teal)";
  const amber = "var(--tm-amber)";
  const gold = "var(--tm-gold)";
  const card = "var(--tm-card)";

  /* tropical (sāyana) zero = equinox point; sidereal (nirayana) zero = lon 0 */
  const [exX, exY] = polar(R_RIM, m.equinoxLon);
  const [gx, gy] = polar(R_PLANET, niLon);
  const arcMidLon = (360 - m.A / 2) % 360; // middle of the ayanāṁśa wedge
  const [labA, labAy] = polar(R_RIM - 26, arcMidLon);

  return (
    <div className={tmCardPadLg}>
      <svg
        viewBox={`0 0 ${VB.W} ${VB.H}`}
        className={edSvg()}
        role="img"
        aria-label={t("learn.study.ayanamsha.aria")}
      >
        <defs>
          <radialGradient id="ay-sun" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#fff6d8" />
            <stop offset="55%" stopColor="#ffd24a" />
            <stop offset="100%" stopColor="#f08a1d" />
          </radialGradient>
          <marker id="ay-arrow" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill={amber} />
          </marker>
        </defs>

        {/* faint ecliptic guide circle */}
        <circle cx={CX} cy={CY} r={R_RIM} fill="none" stroke={faint} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />

        {/* 12 fixed sidereal rāśi sectors */}
        {RASHI.map((name, i) => {
          const a0 = i * 30;
          const a1 = a0 + 30;
          const [lx, ly] = polar(R_LABEL, a0 + 15);
          return (
            <g key={name}>
              <path
                d={sectorPath(R_IN, R_OUT, a0, a1)}
                fill={i % 2 === 0 ? "color-mix(in srgb, var(--tm-teal) 9%, var(--tm-card))" : "color-mix(in srgb, var(--tm-teal) 3%, var(--tm-card))"}
                stroke="var(--tm-border)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                fill={dim}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ font: "600 13px var(--pn-font)" }}
              >
                {name}
              </text>
            </g>
          );
        })}

        {/* degree ticks every 10° */}
        {Array.from({ length: 36 }, (_, k) => {
          const a = k * 10;
          const major = k % 3 === 0;
          const [x1, y1] = polar(R_IN, a);
          const [x2, y2] = polar(R_IN - (major ? 10 : 5), a);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={faint} strokeWidth={major ? 1.4 : 0.8} />;
        })}

        {/* ── the ayanāṁśa wedge: fixed nirayana-0° → drifting equinox ── */}
        <path
          d={sectorPath(R_RIM - 30, R_RIM, m.equinoxLon, 360)}
          fill="color-mix(in srgb, var(--tm-amber) 30%, transparent)"
          stroke={amber}
          strokeWidth={1}
        />

        {/* nirayana 0° reference radius (sidereal Meṣa start) — teal */}
        <line x1={CX} y1={CY} x2={polar(R_RIM, 0)[0]} y2={polar(R_RIM, 0)[1]} stroke={teal} strokeWidth={2.4} />
        <g transform={`translate(${pt(R_OUT + 4, 0)})`}>
          <text fill={teal} textAnchor="start" dominantBaseline="central" style={{ font: "700 12px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.nirayana_zero")}
          </text>
          <text y={15} fill={faint} textAnchor="start" dominantBaseline="central" style={{ font: "500 10px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.nirayana_zero_sub")}
          </text>
        </g>

        {/* sāyana 0° = spring-equinox point — amber, with Sun glyph */}
        <line x1={CX} y1={CY} x2={exX} y2={exY} stroke={amber} strokeWidth={2.4} markerEnd="url(#ay-arrow)" />
        <g transform={`translate(${polar(R_OUT + 18, m.equinoxLon)[0].toFixed(1)} ${polar(R_OUT + 18, m.equinoxLon)[1].toFixed(1)})`}>
          <circle r={11} fill="url(#ay-sun)" />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * TAU;
            return (
              <line
                key={k}
                x1={13 * Math.cos(a)}
                y1={13 * Math.sin(a)}
                x2={17 * Math.cos(a)}
                y2={17 * Math.sin(a)}
                stroke="#f0a81d"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g transform={`translate(${polar(R_OUT + 36, m.equinoxLon)[0].toFixed(1)} ${polar(R_OUT + 36, m.equinoxLon)[1].toFixed(1)})`}>
          <text fill={amber} textAnchor="middle" dominantBaseline="central" style={{ font: "700 12px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.sayana_zero")}
          </text>
          <text y={14} fill={faint} textAnchor="middle" dominantBaseline="central" style={{ font: "500 10px var(--pn-font)" }}>
            {t("learn.study.spring_equinox")}
          </text>
        </g>

        {/* ayanāṁśa value at the wedge mid-point */}
        <g transform={`translate(${labA.toFixed(1)} ${labAy.toFixed(1)})`}>
          <rect x={-34} y={-13} width={68} height={26} rx={8} fill={card} stroke={amber} strokeWidth={1} />
          <text fill={amber} textAnchor="middle" dominantBaseline="central" style={{ font: "700 13px var(--pn-num)" }}>
            {fmtDM(m.A)}
          </text>
        </g>

        {/* graha — one sky position, two readings */}
        <line x1={CX} y1={CY} x2={gx} y2={gy} stroke={gold} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.85} />
        <circle cx={gx} cy={gy} r={8} fill={gold} stroke={card} strokeWidth={2} />
        <text
          x={polar(R_PLANET - 22, niLon)[0]}
          y={polar(R_PLANET - 22, niLon)[1]}
          fill={ink}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ font: "700 12px var(--pn-font)" }}
        >
          {t("learn.study.ayanamsha.graha")}
        </text>

        {/* centre — Earth / observer */}
        <circle cx={CX} cy={CY} r={16} fill="color-mix(in srgb, var(--tm-teal) 30%, var(--tm-card))" stroke={teal} strokeWidth={1.5} />
        <text x={CX} y={CY} fill={dim} textAnchor="middle" dominantBaseline="central" style={{ font: "600 9.5px var(--pn-font)" }}>
          {t("grahas.earth")}
        </text>

        {/* legend */}
        <g transform="translate(16 16)">
          <line x1={0} y1={6} x2={22} y2={6} stroke={teal} strokeWidth={2.4} />
          <text x={28} y={6} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.legend_nirayana")}
          </text>
          <line x1={0} y1={26} x2={22} y2={26} stroke={amber} strokeWidth={2.4} markerEnd="url(#ay-arrow)" />
          <text x={28} y={26} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.legend_sayana")}
          </text>
          <rect x={0} y={36} width={22} height={11} rx={2} fill="color-mix(in srgb, var(--tm-amber) 30%, transparent)" stroke={amber} strokeWidth={1} />
          <text x={28} y={42} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>
            {t("learn.study.ayanamsha.legend_ayanamsha")}
          </text>
        </g>
      </svg>

      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.year")}</span>
            <span className={edRoV({ mono: true })}>
              {t("learn.study.year_bs", { year: N(ceToBs(m.year)) })}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.ayanamsha.system")}</span>
            <span className={edRoV()}>{t(SYSTEMS[m.sys].key)}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("kundali.ayanamsha")}</span>
            <span className={edRoV({ mono: true, amber: true })}>{fmtDM(m.A)}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.ayanamsha.graha_rashi")}</span>
            <span className={edRoV({ amber: differ })}>
              {niRashi}
              {differ ? ` → ${saRashi}` : ""}
            </span>
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>
            {t("learn.study.ayanamsha.slider_year", {
              from: N(ceToBs(285)),
              to: N(ceToBs(2200)),
            })}
          </span>
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
              min={285}
              max={2200}
              step={1}
              value={year}
              style={{ "--fill": `${((year - 285) / (2200 - 285)) * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setYear(+e.target.value);
              }}
            />
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.ayanamsha.slider_graha")}</span>
          <input
            className={edScrub}
            type="range"
            min={0}
            max={359}
            step={1}
            value={graha}
            style={{ "--fill": `${(graha / 359) * 100}%` } as React.CSSProperties}
            onChange={(e) => setGraha(+e.target.value)}
          />
        </div>

        <div className={edPresets}>
          {(Object.keys(SYSTEMS) as SystemKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={edPreset(sys === k)}
              onClick={() => setSys(k)}
            >
              {t(SYSTEMS[k].key)}
            </button>
          ))}
          <button
            type="button"
            className={edPreset()}
            onClick={() => {
              setPlaying(false);
              setYear(2026);
              setSys("lahiri");
              setGraha(25);
            }}
          >
            {t("learn.study.ayanamsha.preset_today")}
          </button>
        </div>
      </div>

      <p className={tmCardCap}>
        {t("learn.study.ayanamsha.caption_lead")}
        <span className={cn("hl")}>{t("learn.study.ayanamsha.nirayana")}</span>
        {t("learn.study.ayanamsha.caption_wobble")}{" "}
        <span className={cn("hl-amber")}>{t("learn.study.ayanamsha.spring_equinox_point")}</span>{" "}
        {t("learn.study.ayanamsha.caption_angle")}{" "}
        {differ
          ? t("learn.study.ayanamsha.caption_differs", { nirayana: niRashi, sayana: saRashi })
          : t("learn.study.ayanamsha.caption_agrees", { nirayana: niRashi, sayana: saRashi })}
      </p>
    </div>
  );
}
