import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { illustration } from "@vedic-patro/design-tokens";
import { useTranslation } from "@vedic-patro/i18n/react";
import { bsMonthLabel } from "@vedic-patro/domain/calendar/bs-calendar";
import { getRashiList } from "@vedic-patro/domain/panchanga/rashi-i18n";
import {
  CLIMATIC_PRECESSION_YEARS,
  northernSummer,
  perihelionBsDate,
  perihelionNearestCardinal,
  perihelionSiderealLongitude,
  solsticeSunlight,
} from "@vedic-patro/domain/learn/apsidal-precession";
import { edScrub } from "@/lib/diagram-classes";
import {
  edControls,
  edPlayBtn,
  edPreset,
  edPresets,
  edReadout,
  edRo,
  edRoK,
  edRoV,
  edScrubWrap,
  edSvg,
  motSliderLabel,
  motSliderRow,
  tmCardCap,
  tmCardPadLg,
} from "@/lib/learn-classes";
import { useLocaleDigits } from "@/i18n/digits";
import { useLocale } from "@/i18n/locale";
import { EarthGlobeImage } from "./EarthGlobeImage";
import { RashiGlyph } from "./rashi-icons";
import { useSvgZoom } from "./use-svg-zoom";
import { ZoomBar } from "./ZoomBar";

/**
 * Perihelion (उपसौर) and aphelion (अपसौर) against the seasons, Sun-centred.
 *
 * The Sun sits in the middle, Earth's orbit is the first ring (an oval, its
 * shape exaggerated, with the Sun at one focus) and the sidereal rashi
 * mandala is the outer ring. Four Earths mark where Earth is at the two
 * equinoxes and two solstices; those places are set by the direction of
 * Earth's tilted axis and drift backwards with precession (~50.3″/yr). The
 * orbit's oval — and with it perihelion and aphelion — turns the other way
 * (~11.6″/yr against the stars), so the two drift through each other once in
 * ~21,000 years. Numbers come from apsidal-precession.ts (shared with the app).
 */

const RATE = 50.2879 / 3600; // precession, degrees per year
const BS_AYAN_ZERO = 342; // वि.सं. year the Lahiri ayanamsha was zero
const CE_TO_BS = 57;
/* Wide enough for the orbit's oval to turn almost twice round as it plays. */
const Y_MIN = -100000;
const Y_MAX = 100000;
/** Playback, years per second: the oval turns ~5°/s, the season Earths a lap in ~17 s. */
const SPEED = 1500;
/** Beyond this many years from today the constant-rate model is only indicative. */
const RELIABLE_YEARS = 20000;
const TILT = 23.44;
const D2R = Math.PI / 180;

/* Drawn orbit: exaggerated (Earth's real 0.017 looks round), far end inside the rashi ring. */
/* Clearly oval so the near end (perihelion) and far end (aphelion) read at a glance. */
const ORBIT_E = 0.35;
const ORBIT_A = 0.84 / (1 + ORBIT_E);

const VB = { W: 900, H: 700 };
const CX = 450;
const CY = 372;
const RX = 270;
/* Seen from well above the plane, so the orbit's oval is not flattened away. */
const RY = 196;
const ZY = 100;
const BAND_IN = 1.06;
const BAND_OUT = 1.4;

const norm360 = (a: number) => ((a % 360) + 360) % 360;
/** In-plane angle (deg) for a longitude: मेष ०° at the top, increasing anticlockwise. */
const alphaOf = (lon: number) => lon + 90;
function projPlane(alphaDeg: number, f: number): [number, number] {
  const a = alphaDeg * D2R;
  return [CX + RX * f * Math.cos(a), CY - RY * f * Math.sin(a)];
}
const orbitR = (lon: number, periLon: number) =>
  (ORBIT_A * (1 - ORBIT_E * ORBIT_E)) / (1 + ORBIT_E * Math.cos((lon - periLon) * D2R));

/** Seasons in the order the Sun reaches them from the March equinox (k × 90°). */
const SEASONS = [
  { key: "learn.study.spring_equinox" },
  { key: "learn.study.summer_solstice" },
  { key: "learn.study.autumn_equinox" },
  { key: "learn.study.equinox.hemanta_solstice" },
] as const;
/** perihelionNearestCardinal's 0–3 (December solstice first) → SEASONS index. */
const CARDINAL_TO_SEASON = [3, 0, 1, 2] as const;

export function ApsidesOrbit() {
  const { t } = useTranslation();
  const N = useLocaleDigits();
  const { lang } = useLocale();
  const RASHI = useMemo(() => getRashiList(lang), [lang]);

  const nowBs = new Date().getFullYear() + CE_TO_BS;
  const [year, setYear] = useState(nowBs);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoom = useSvgZoom(svgRef, VB.W, VB.H);

  /* Start playing the first time the diagram scrolls into view, so the orbit is seen moving. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setYear((y) => {
        const next = y + dt * SPEED;
        return next > Y_MAX ? Y_MIN : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const yearCe = year - CE_TO_BS;
  const ayan = (year - BS_AYAN_ZERO) * RATE;
  /** Sidereal longitude of the Sun at the March equinox. */
  const eqSid = norm360(-ayan);
  /* The rashi mandala is the stars and never moves; the season Earths and the orbit move against it. */
  /** Earth's heliocentric longitude is the Sun's geocentric one + 180°. */
  const earthAt = (sunLon: number) => sunLon + 180;

  const periSun = perihelionSiderealLongitude(yearCe, ayan);
  const periLon = earthAt(periSun);
  const periBs = perihelionBsDate(yearCe, ayan);
  const season = perihelionNearestCardinal(yearCe);
  const seasonName = t(SEASONS[CARDINAL_TO_SEASON[season.point]].key);
  const seasonText =
    season.days === 0
      ? t("learn.apsides.on_point", { point: seasonName })
      : t(season.days > 0 ? "learn.apsides.days_after" : "learn.apsides.days_before", {
          point: seasonName,
          days: N(Math.abs(season.days)),
        });
  const summerSun = solsticeSunlight(yearCe).june;
  const summer = northernSummer(yearCe);

  /* Earth's axis keeps one direction in space: its north end leans toward where the Sun is at the June solstice. */
  const axisA = alphaOf(eqSid + 90) * D2R;
  const axisVec = (len: number): [number, number] => [
    RX * len * Math.sin(TILT * D2R) * Math.cos(axisA),
    -RY * len * Math.sin(TILT * D2R) * Math.sin(axisA) - ZY * len * Math.cos(TILT * D2R),
  ];

  const ovalPath = (pLon: number) =>
    Array.from({ length: 121 }, (_, k) => {
      const lon = k * 3;
      const [x, y] = projPlane(alphaOf(lon), orbitR(lon, pLon));
      return `${k === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  const orbitPath = ovalPath(periLon);
  /* Today's orbit, faint, so you can see how far the oval has turned. */
  const todayPeriLon = earthAt(perihelionSiderealLongitude(nowBs - CE_TO_BS, (nowBs - BS_AYAN_ZERO) * RATE));
  const showToday = Math.abs(year - nowBs) > 200;

  /* The gap from the nearest equinox/solstice Earth to perihelion, along the orbit. */
  const cardLon = earthAt(eqSid + CARDINAL_TO_SEASON[season.point] * 90);
  const gap = (((periLon - cardLon) % 360) + 540) % 360 - 180;
  const gapSteps = Math.max(2, Math.ceil(Math.abs(gap) / 2));
  const gapPath = Array.from({ length: gapSteps + 1 }, (_, k) => {
    const lon = cardLon + (gap * k) / gapSteps;
    const [x, y] = projPlane(alphaOf(lon), orbitR(lon, periLon));
    return `${k === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const dim = "var(--tm-ink-dim)";
  const card = "var(--tm-card)";
  const red = illustration.red56;
  const peri = illustration.orange53;
  const aph = illustration.violet65;
  const orbitCol = illustration.sky51;

  const presets = [
    { key: "learn.apsides.preset_prev_cycle", bs: Math.round(nowBs - CLIMATIC_PRECESSION_YEARS) },
    { key: "learn.apsides.preset_ice", bs: -9000 + CE_TO_BS },
    { key: "learn.apsides.preset_aligned", bs: 1250 + CE_TO_BS },
    { key: "learn.apsides.preset_today", bs: nowBs },
    { key: "learn.apsides.preset_future", bs: 11750 + CE_TO_BS },
    { key: "learn.apsides.preset_next_cycle", bs: Math.round(nowBs + CLIMATIC_PRECESSION_YEARS) },
  ];

  const apsis = (lon: number, color: string, r: number, nameKey: string, glossKey: string) => {
    const f = orbitR(lon, periLon);
    const [x, y] = projPlane(alphaOf(lon), f);
    /* Name outside the orbit, so it clears a season Earth sitting right beside the dot. */
    const [lx, ly] = projPlane(alphaOf(lon), f + 0.21);
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} stroke={card} strokeWidth={2} />
        <text x={lx} y={ly - 6} fill={color} textAnchor="middle" dominantBaseline="central" style={{ font: "700 12px var(--pn-font)" }}>
          {t(nameKey)}
        </text>
        <text x={lx} y={ly + 8} fill={dim} textAnchor="middle" dominantBaseline="central" style={{ font: "500 10px var(--pn-font)" }}>
          {t(glossKey)}
        </text>
      </g>
    );
  };

  return (
    <div className={tmCardPadLg}>
      <svg ref={svgRef} viewBox={zoom.viewBox} className={edSvg()} role="img" aria-label={t("learn.apsides.aria")} {...zoom.bind}>
        <defs>
          <radialGradient id="ao-sun" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor={illustration.amber92} />
            <stop offset="55%" stopColor={illustration.amber67} />
            <stop offset="100%" stopColor={illustration.orange53} />
          </radialGradient>
        </defs>

        {/* ── outer ring: the rashi mandala, fixed to the stars ── */}
        <ellipse cx={CX} cy={CY} rx={RX * BAND_OUT} ry={RY * BAND_OUT} fill="color-mix(in srgb, var(--tm-teal) 14%, var(--tm-card))" stroke="var(--tm-border)" strokeWidth={1} />
        <ellipse cx={CX} cy={CY} rx={RX * BAND_IN} ry={RY * BAND_IN} fill={card} stroke="var(--tm-border)" strokeWidth={1} />
        {RASHI.map((name, i) => {
          const a0 = i * 30;
          const [ix, iy] = projPlane(alphaOf(a0), BAND_IN);
          const [ox, oy] = projPlane(alphaOf(a0), BAND_OUT);
          const [lx, ly] = projPlane(alphaOf(a0 + 15), (BAND_IN + BAND_OUT) / 2);
          return (
            <g key={name}>
              <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="var(--tm-border)" strokeWidth={1} />
              <RashiGlyph index={i} size={34} cx={lx} cy={ly - 10} color={dim} opacity={0.85} title={name} />
              <text x={lx} y={ly + 16} fill={dim} textAnchor="middle" dominantBaseline="central" style={{ font: "600 12px var(--pn-font)" }}>
                {name}
              </text>
            </g>
          );
        })}

        {/* ── first ring: Earth's orbit, turned by the orbit itself ── */}
        {showToday ? <path d={ovalPath(todayPeriLon)} fill="none" stroke={orbitCol} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.45} /> : null}
        <path d={orbitPath} fill={orbitCol} fillOpacity={0.05} stroke={orbitCol} strokeWidth={2.4} />
        {(() => {
          const [px, py] = projPlane(alphaOf(periLon), orbitR(periLon, periLon));
          const [qx, qy] = projPlane(alphaOf(periLon + 180), orbitR(periLon + 180, periLon));
          return <line x1={px} y1={py} x2={qx} y2={qy} stroke={peri} strokeWidth={1.5} strokeDasharray="7 5" opacity={0.6} />;
        })()}
        {Math.abs(season.days) >= 1 ? (
          /* The day count is in the readout ("…को १३ दिनपछि"); a label here would sit on the Earth's. */
          <path d={gapPath} fill="none" stroke={peri} strokeWidth={9} strokeLinecap="round" opacity={0.3} />
        ) : null}

        {/* ── the Sun at the centre (a focus of the orbit) ── */}
        <g transform={`translate(${CX} ${CY})`}>
          <circle r={24} fill="url(#ao-sun)" />
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return <line key={k} x1={28 * Math.cos(a)} y1={28 * Math.sin(a)} x2={35 * Math.cos(a)} y2={35 * Math.sin(a)} stroke={illustration.orange53b} strokeWidth={2} strokeLinecap="round" />;
          })}
        </g>

        {/* ── perihelion and aphelion — the near and far ends of the orbit (under the Earths, so a name is never covered) ── */}
        {apsis(periLon, peri, 9, "learn.apsides.perihelion", "learn.apsides.perihelion_gloss")}
        {apsis(periLon + 180, aph, 6.5, "learn.apsides.aphelion", "learn.apsides.aphelion_gloss")}

        {/* ── four Earths at the equinoxes and solstices — set by the axis ── */}
        {SEASONS.map((s, k) => {
          const lon = earthAt(eqSid + k * 90);
          const f = orbitR(lon, periLon);
          const [ex, ey] = projPlane(alphaOf(lon), f);
          const lx = ex;
          const ly = ey + 25;
          const [vx, vy] = axisVec(0.15);
          /* Lean the globe image the way the drawn axis leans on screen. */
          const lean = Math.atan2(vx, -vy) / D2R;
          return (
            <g key={s.key}>
              <line x1={ex - vx} y1={ey - vy} x2={ex + vx} y2={ey + vy} stroke={dim} strokeWidth={1.5} />
              <EarthGlobeImage cx={ex} cy={ey} r={13} tilt={lean} />
              <text x={ex + vx} y={ey + vy - 5} fill={dim} textAnchor="middle" style={{ font: "700 9px var(--pn-font)" }}>N</text>
              <text x={lx} y={ly} fill={red} textAnchor="middle" dominantBaseline="central" style={{ font: "700 11.5px var(--pn-font)" }}>
                {t(s.key)}
              </text>
            </g>
          );
        })}


        {/* legend */}
        <g transform="translate(14 14)">
          <line x1={0} y1={6} x2={22} y2={6} stroke={orbitCol} strokeWidth={2.4} />
          <text x={28} y={6} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>{t("learn.apsides.legend_orbit")}</text>
          <EarthGlobeImage cx={11} cy={24} r={6} tilt={0} />
          <text x={28} y={24} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>{t("learn.apsides.legend_earths")}</text>
          <circle cx={6} cy={42} r={5} fill={peri} />
          <circle cx={18} cy={42} r={3.5} fill={aph} />
          <text x={28} y={42} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>{t("learn.apsides.legend_apsides")}</text>
          {showToday ? (
            <>
              <line x1={0} y1={60} x2={22} y2={60} stroke={orbitCol} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.6} />
              <text x={28} y={60} fill={dim} dominantBaseline="central" style={{ font: "500 11px var(--pn-font)" }}>{t("learn.apsides.legend_today")}</text>
            </>
          ) : null}
        </g>
      </svg>
      <ZoomBar zoom={zoom} hint={t("learn.zoom_hint")} labels={{ in: t("ui.learn.zoom_in"), out: t("ui.learn.zoom_out"), reset: t("ui.learn.reset_view") }} />

      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.year")}</span>
            <span className={edRoV({ mono: true })}>{t("learn.study.year_bs", { year: N(Math.round(year)) })}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.perihelion_bs")}</span>
            <span className={edRoV({ amber: true })}>
              {t("learn.apsides.bs_date", { month: bsMonthLabel(periBs.month, lang), day: N(periBs.day) })}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.vs_season")}</span>
            <span className={edRoV()}>{seasonText}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.apsides.north_summer")}</span>
            <span className={edRoV({ amber: summer === "intense" })}>
              {t(`learn.apsides.${summer}`)} · {t("learn.apsides.summer_sun")} {summerSun >= 0 ? "+" : "−"}{N(Math.abs(summerSun).toFixed(1))}%
            </span>
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.apsides.slider", { from: N(Y_MIN), to: N(Y_MAX) })}</span>
          <div className={edScrubWrap}>
            <button type="button" className={edPlayBtn} onClick={() => setPlaying((p) => !p)}
              title={playing ? t("learn.pause") : t("learn.play")} aria-label={playing ? t("learn.pause") : t("learn.play")}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input className={edScrub} type="range" min={Y_MIN} max={Y_MAX} step={1} value={Math.round(year)}
              aria-label={t("learn.study.year")}
              style={{ "--fill": `${((year - Y_MIN) / (Y_MAX - Y_MIN)) * 100}%` } as React.CSSProperties}
              onChange={(e) => { setPlaying(false); setYear(+e.target.value); }} />
          </div>
        </div>

        <div className={edPresets}>
          {presets.map((p) => (
            <button key={p.key} type="button" className={edPreset(Math.abs(year - p.bs) < 150)} onClick={() => { setPlaying(false); setYear(p.bs); }}>
              {t(p.key)}
            </button>
          ))}
        </div>
      </div>

      {Math.abs(yearCe - 2026) > RELIABLE_YEARS ? (
        <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">{t("learn.apsides.far_note")}</p>
      ) : null}
      <p className={tmCardCap}>{t("learn.apsides.caption")}</p>
    </div>
  );
}
