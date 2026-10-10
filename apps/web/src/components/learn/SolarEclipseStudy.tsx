import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { edBodyLabel, edScrub, hoEarthGroup, solAntumbra, solBannerType, solCorona, solEarthGlow, solEyeFrame, solEyeMoon, solEyeRim, solEyeSky, solEyeStatus, solEyeSun, solEyeTitle, solLegendLabel, solLight, solMoon, solMoonLabel, solPenumbra, solRay, solSpotAnti, solSpotPen, solSpotUmbra, solSunGlow, solUmbra } from "@/lib/diagram-classes";
import { motSliderLabel, motSliderRow, tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap, edSvg } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocaleDigits } from "@/i18n/digits";
import { EarthGlobeImage } from "./EarthGlobeImage";

/**
 * Solar-eclipse geometry: the Moon (at औंसी / new moon) passes between the
 * Sun and Earth and drops its shadow onto Earth. The umbra cone only just
 * reaches Earth — when the Moon is near (perigee) the umbra touches the surface
 * → a TOTAL eclipse; when it is far (apogee) the umbra falls short and the
 * widening antumbra reaches instead → an ANNULAR "ring of fire". The wide
 * penumbra always gives a partial eclipse to a much larger region. A time
 * control sweeps the Moon's shadow across Earth; an inset shows what an observer
 * standing under the shadow actually sees.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const VB = { W: 1240, H: 660 };
const AXIS_Y = 384;
const SUN_X = 158;
const SUN_R = 104;
const MOON_X = 716;
const MOON_R = 30;
const EARTH_X = 1016;
const EARTH_R = 112;
const XR = EARTH_X + 4; // draw cones up to Earth (its globe covers the tips)
const OFF_MAX = EARTH_R + 64; // vertical sweep range of the shadow centre

const PEN_SLOPE = 0.42; // penumbra half-width growth per px (anti-sunward)
const ANTI_SLOPE = 0.16; // antumbra half-width growth past the umbra apex

const RS = 62; // Sun radius inside the observer inset

type SolType = "total" | "annular" | "partial" | "none";

/** Circle–circle overlap area as a fraction of the first (Sun) circle's area. */
function overlapFrac(R: number, r: number, d: number): number {
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) return Math.min(1, (r * r) / (R * R));
  const R2 = R * R;
  const r2 = r * r;
  const d2 = d * d;
  const a1 = R2 * Math.acos((d2 + R2 - r2) / (2 * d * R));
  const a2 = r2 * Math.acos((d2 + r2 - R2) / (2 * d * r));
  const a3 = 0.5 * Math.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R));
  return (a1 + a2 - a3) / (Math.PI * R2);
}

interface Model {
  offset: number;
  moonY: number;
  ratio: number;
  apexX: number;
  type: SolType;
  coverage: number;
  sep: number; // Moon-centre offset over the Sun in inset units
  rM: number; // Moon radius in inset units
  distanceKm: number;
}

function computeModel(t: number, d: number): Model {
  const offset = (t - 0.5) * 2 * OFF_MAX; // sweeps top → bottom across Earth
  const moonY = AXIS_Y + offset;
  const ratio = lerp(1.06, 0.94, d); // apparent Moon / Sun size
  const apexFrac = (ratio - 0.94) / (1.06 - 0.94);
  const apexX = lerp(EARTH_X - 150, EARTH_X + 56, apexFrac);

  const rM = RS * ratio;
  const sep = clamp((offset / EARTH_R) * (RS + rM), -(RS + rM), RS + rM);
  const dsep = Math.abs(sep);
  const coverage = overlapFrac(RS, rM, dsep);

  let type: SolType = "none";
  if (dsep <= rM - RS && ratio >= 1) type = "total";
  else if (dsep <= RS - rM && ratio < 1) type = "annular";
  else if (coverage > 0.004) type = "partial";

  return { offset, moonY, ratio, apexX, type, coverage, sep, rM, distanceKm: Math.round(lerp(356500, 406700, d)) };
}

function ConeScene({ m }: { m: Model }) {
  const { t } = useTranslation();
  const { moonY, apexX, type, offset } = m;
  const moonTop = moonY - MOON_R;
  const moonBot = moonY + MOON_R;

  // penumbra (always reaches Earth)
  const penHalf = MOON_R + (XR - MOON_X) * PEN_SLOPE;
  const penPath = `M${MOON_X},${moonTop} L${XR},${(moonY - penHalf).toFixed(1)} L${XR},${(moonY + penHalf).toFixed(1)} L${MOON_X},${moonBot} Z`;

  // umbra — converging dark cone from the Moon to its apex
  let umbraPath: string;
  if (apexX <= XR) {
    umbraPath = `M${MOON_X},${moonTop} L${MOON_X},${moonBot} L${apexX.toFixed(1)},${moonY.toFixed(1)} Z`;
  } else {
    const halfXR = (MOON_R * (apexX - XR)) / (apexX - MOON_X);
    umbraPath = `M${MOON_X},${moonTop} L${XR},${(moonY - halfXR).toFixed(1)} L${XR},${(moonY + halfXR).toFixed(1)} L${MOON_X},${moonBot} Z`;
  }

  // antumbra — the widening cone beyond the apex (only drawn when the umbra
  // falls short of Earth → annular case)
  let antumbraPath = "";
  if (apexX < XR) {
    const antiHalf = (XR - apexX) * ANTI_SLOPE;
    antumbraPath = `M${apexX.toFixed(1)},${moonY.toFixed(1)} L${XR},${(moonY - antiHalf).toFixed(1)} L${XR},${(moonY + antiHalf).toFixed(1)} Z`;
  }

  // shadow spot on Earth's sun-facing surface
  const spotOnEarth = Math.abs(offset) < EARTH_R - 4;
  const subX = EARTH_X - Math.sqrt(Math.max(0, EARTH_R * EARTH_R - offset * offset));
  let spotR: number;
  if (apexX > EARTH_X) spotR = (MOON_R * (apexX - EARTH_X)) / (apexX - MOON_X);
  else spotR = (EARTH_X - apexX) * ANTI_SLOPE;
  spotR = clamp(spotR, 4, 24);

  const sunRays = Array.from({ length: 18 }, (_, k) => {
    const a = (k / 18) * Math.PI * 2;
    const r0 = SUN_R + 4;
    const r1 = SUN_R + (k % 2 ? 14 : 24);
    return (
      <line
        key={`r${k}`}
        x1={SUN_X + r0 * Math.cos(a)}
        y1={AXIS_Y + r0 * Math.sin(a)}
        x2={SUN_X + r1 * Math.cos(a)}
        y2={AXIS_Y + r1 * Math.sin(a)}
        className={solRay}
      />
    );
  });

  return (
    <>
      {/* sunlight tint from Sun toward Earth */}
      <path
        d={`M${SUN_X},${AXIS_Y - SUN_R} L${XR},${AXIS_Y - SUN_R - 36} L${XR},${AXIS_Y + SUN_R + 36} L${SUN_X},${AXIS_Y + SUN_R} Z`}
        className={solLight}
      />

      {/* shadow cones (penumbra under, then umbra/antumbra) */}
      <path d={penPath} className={solPenumbra} />
      {antumbraPath && <path d={antumbraPath} className={solAntumbra} />}
      {umbraPath && <path d={umbraPath} className={solUmbra} />}

      {/* Sun */}
      <circle cx={SUN_X} cy={AXIS_Y} r={SUN_R + 26} className={solSunGlow} />
      {sunRays}
      <circle cx={SUN_X} cy={AXIS_Y} r={SUN_R} fill="url(#sol-sun)" />
      <text x={SUN_X} y={AXIS_Y + SUN_R + 34} className={edBodyLabel} textAnchor="middle">
        {t("grahas.sun")}
      </text>

      {/* Earth */}
      <g className={hoEarthGroup} transform={`translate(${EARTH_X} ${AXIS_Y})`}>
        <EarthGlobeImage cx={0} cy={0} r={EARTH_R} glow glowClassName={solEarthGlow} glowPad={10} />
        <text y={EARTH_R + 30} className={edBodyLabel} textAnchor="middle">
          {t("grahas.earth")}
        </text>
      </g>

      {/* shadow spot painted on Earth's surface */}
      {spotOnEarth && (
        <>
          <ellipse cx={subX + 6} cy={moonY} rx={spotR + 26} ry={spotR + 18} className={solSpotPen} />
          <ellipse
            cx={subX + 6}
            cy={moonY}
            rx={spotR}
            ry={spotR * 0.74}
            className={type === "annular" ? solSpotAnti : solSpotUmbra}
          />
        </>
      )}

      {/* Moon (drawn last so it sits in front, casting the cone) */}
      <circle cx={MOON_X} cy={moonY} r={MOON_R} className={solMoon} />
      <text x={MOON_X} y={moonY - MOON_R - 12} className={solMoonLabel} textAnchor="middle">
        {t("grahas.moon")}
      </text>
    </>
  );
}

function ObserverInset({ m }: { m: Model }) {
  const { t } = useTranslation();
  const fmt = useLocaleDigits();
  const { type, rM, sep, coverage } = m;
  const x0 = 902;
  const y0 = 16;
  const w = 322;
  const h = 232;
  const cx = x0 + w / 2;
  const cy = y0 + 116;
  const sky = 96;
  const moonCx = cx + clamp(sep, -(RS + rM), RS + rM);

  const typeText =
    type === "total"
      ? t("learn.study.solar_eclipse.inset_total")
      : type === "annular"
        ? t("learn.study.solar_eclipse.inset_annular")
        : type === "partial"
          ? t("learn.study.eclipse.status_partial")
          : t("learn.study.eclipse.status_none");

  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} rx={16} className={solEyeFrame} />
      <text x={cx} y={y0 + 26} className={solEyeTitle} textAnchor="middle">
        {t("learn.study.solar_eclipse.inset_title")}
      </text>
      <clipPath id="sol-eye-clip">
        <circle cx={cx} cy={cy + 8} r={sky} />
      </clipPath>
      <g clipPath="url(#sol-eye-clip)">
        <circle cx={cx} cy={cy + 8} r={sky} className={solEyeSky} />
        {type === "total" && <circle cx={cx} cy={cy + 8} r={RS * 1.7} className={solCorona} />}
        <circle cx={cx} cy={cy + 8} r={RS} className={solEyeSun} />
        <circle cx={moonCx} cy={cy + 8} r={rM} className={solEyeMoon} />
      </g>
      <circle cx={cx} cy={cy + 8} r={sky} className={solEyeRim} />
      <text
        x={cx}
        y={y0 + h - 12}
        className={solEyeStatus(
          type === "total" || type === "annular" ? type : "default",
        )}
        textAnchor="middle"
      >
        {typeText} · {fmt(Math.round(coverage * 100))}%
      </text>
    </g>
  );
}

export function SolarEclipseStudy() {
  const { t } = useTranslation();
  const fmt = useLocaleDigits();
  const [sweep, setSweep] = useState(0.5);
  const [d, setD] = useState(0.18);
  const [playing, setPlaying] = useState(true);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setSweep((p) => (p + dt * 0.16) % 1);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const m = useMemo(() => computeModel(sweep, d), [sweep, d]);

  const typeText =
    m.type === "total"
      ? t("learn.study.solar_eclipse.total")
      : m.type === "annular"
        ? t("learn.study.solar_eclipse.annular")
        : m.type === "partial"
          ? t("learn.study.eclipse.status_partial")
          : t("learn.study.eclipse.status_none");

  const distLabel =
    d < 0.4
      ? t("learn.study.solar_eclipse.dist_perigee")
      : d > 0.6
        ? t("learn.study.solar_eclipse.dist_apogee")
        : t("learn.study.medium");

  return (
    <div className={tmCardPadLg}>
      <svg viewBox={`0 0 ${VB.W} ${VB.H}`} className={edSvg("sol")} role="img">
        <defs>
          <radialGradient id="sol-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6d8" />
            <stop offset="40%" stopColor="#ffd24a" />
            <stop offset="80%" stopColor="#f08a1d" />
            <stop offset="100%" stopColor="#d65b12" />
          </radialGradient>
          <radialGradient id="sol-coronaGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8e6" stopOpacity={0.95} />
            <stop offset="46%" stopColor="#fbe7b0" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#fbe7b0" stopOpacity={0} />
          </radialGradient>
        </defs>

        {m.type !== "none" && (
          <text x={VB.W / 2} y={40} className={solBannerType(m.type)} textAnchor="middle">
            {m.type === "total"
              ? t("learn.study.solar_eclipse.banner_total")
              : m.type === "annular"
                ? t("learn.study.solar_eclipse.banner_annular")
                : t("learn.study.solar_eclipse.banner_partial")}
          </text>
        )}

        <ConeScene m={m} />

        {/* legend (top-left empty sky) */}
        <g transform="translate(30 26)">
          <rect x={0} y={0} width={26} height={15} className={solUmbra} />
          <text x={34} y={12} className={solLegendLabel}>
            {t("learn.study.solar_eclipse.legend_umbra")}
          </text>
          <rect x={0} y={26} width={26} height={15} className={solAntumbra} />
          <text x={34} y={38} className={solLegendLabel}>
            {t("learn.study.solar_eclipse.legend_antumbra")}
          </text>
          <rect x={0} y={52} width={26} height={15} className={solPenumbra} />
          <text x={34} y={64} className={solLegendLabel}>
            {t("learn.study.solar_eclipse.legend_penumbra")}
          </text>
        </g>

        <ObserverInset m={m} />
      </svg>

      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.type")}</span>
            <span className={edRoV({ amber: m.type === "total" || m.type === "annular" })}>{typeText}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.solar_eclipse.coverage")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(m.coverage * 100))}%</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.solar_eclipse.moon_distance")}</span>
            <span className={edRoV({ mono: true })}>{fmt(m.distanceKm.toLocaleString("en-US"))} km</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.state")}</span>
            <span className={edRoV()}>{distLabel}</span>
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.solar_eclipse.slider_time")}</span>
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
              max={1}
              step={0.005}
              value={sweep}
              style={{ "--fill": `${sweep * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setSweep(+e.target.value);
              }}
            />
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.solar_eclipse.slider_distance")}</span>
          <input
            className={edScrub}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={d}
            style={{ "--fill": `${d * 100}%` } as React.CSSProperties}
            onChange={(e) => setD(+e.target.value)}
          />
        </div>

        <div className={edPresets}>
          <button type="button" className={edPreset()} onClick={() => { setPlaying(false); setSweep(0.5); setD(0.12); }}>
            {t("learn.study.solar_eclipse.preset_total")}
          </button>
          <button type="button" className={edPreset()} onClick={() => { setPlaying(false); setSweep(0.5); setD(0.9); }}>
            {t("learn.study.solar_eclipse.preset_annular")}
          </button>
          <button type="button" className={edPreset()} onClick={() => { setPlaying(false); setSweep(0.78); setD(0.4); }}>
            {t("learn.study.solar_eclipse.preset_partial")}
          </button>
        </div>
      </div>

      <p className={tmCardCap}>
        {t("learn.study.solar_eclipse.caption_lead")}{" "}
        <span className={cn("hl-amber")}>{t("learn.study.solar_eclipse.term_umbra")}</span>{" "}
        {t("learn.study.solar_eclipse.caption_umbra")}{" "}
        <span className={cn("hl")}>{t("learn.study.solar_eclipse.term_antumbra")}</span>{" "}
        {t("learn.study.solar_eclipse.caption_antumbra")}{" "}
        <span className={cn("hl")}>{t("learn.study.solar_eclipse.term_penumbra")}</span>{" "}
        {t("learn.study.solar_eclipse.caption_penumbra")}
      </p>
    </div>
  );
}
