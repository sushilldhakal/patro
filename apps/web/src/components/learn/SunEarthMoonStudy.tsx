import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { edScrub } from "@/lib/diagram-classes";
import { tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { useLocale, bilingualText } from "@/i18n/locale";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { getWheelRashis } from "@/lib/wheel-data";
import { SunEarthMoonOrbit } from "./SunEarthMoonOrbit";
import {
  SYNODIC_MONTH,
  TROPICAL_YEAR,
  earthOrbitFromMeanAnomaly,
  elongationFromDay,
  lunarMonthsCompleted,
  nakshatraIndexFromLon,
  rashiIndexFromLon,
  sunSiderealLonFromEarthNu,
  yearAngleFromDay,
} from "./sun-earth-moon-math";

/** Scrub presets — catalogue keys, resolved at render rather than module load. */
const PRESETS = [
  { key: "learn.study.sem.preset_year_start", day: 0 },
  { key: "learn.study.sem.preset_after_3_months", day: TROPICAL_YEAR / 4 },
  { key: "learn.study.sem.preset_after_6_months", day: TROPICAL_YEAR / 2 },
  { key: "learn.study.sem.preset_year_end", day: TROPICAL_YEAR - 2 },
];

export function SunEarthMoonStudy() {
  const { t } = useTranslation();
  const { digits, lang } = useLocale();
  const WHEEL_RASHIS = getWheelRashis();
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const fmt = (n: number) => digits(n);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDay((prev) => (prev + dt * 14) % TROPICAL_YEAR);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const yearAngle = yearAngleFromDay(day);
  const { nuDeg } = earthOrbitFromMeanAnomaly(yearAngle);
  const sunLon = sunSiderealLonFromEarthNu(nuDeg);
  const rashiIdx = rashiIndexFromLon(sunLon);
  const nakIdx = nakshatraIndexFromLon(sunLon);
  const E = elongationFromDay(day);
  const monthIdx = rashiIdx;
  const monthsDone = lunarMonthsCompleted(day);
  const paksha = E < 180 ? t("learn.shukla") : t("learn.krishna");
  const daysIntoLunarMonth = day - monthsDone * SYNODIC_MONTH;

  return (
    <div className={tmCardPadLg}>
      <SunEarthMoonOrbit
        day={day}
        onDay={(v) => {
          setPlaying(false);
          setDay(v);
        }}
      />
      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.solar_month")}</span>
            <span className={edRoV()}>
              {(lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)[monthIdx]}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.sun_sign_nakshatra")}</span>
            <span className={edRoV()}>
              {bilingualText(lang, WHEEL_RASHIS[rashiIdx]!.ne, WHEEL_RASHIS[rashiIdx]!.en)} · {bilingualText(lang, NAKSHATRA_ICONS[nakIdx]!.ne, NAKSHATRA_ICONS[nakIdx]!.en)}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.sun_longitude")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(sunLon))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.day_of_year")}</span>
            <span className={edRoV({ mono: true })}>
              {fmt(Math.round(day))} / {fmt(365)}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.moon_angle_paksha")}</span>
            <span className={edRoV({ mono: true })}>
              {fmt(Math.round(E))}° · {paksha}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.lunar_months_done")}</span>
            <span className={edRoV({ amber: true })}>
              {fmt(monthsDone)} / ~{fmt(12)} · {fmt(Math.round(daysIntoLunarMonth))}{" "}
              {t("learn.days_into_this_month")}
            </span>
          </div>
        </div>
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
            max={TROPICAL_YEAR}
            step={0.5}
            value={day}
            style={{ "--fill": `${(day / TROPICAL_YEAR) * 100}%` } as React.CSSProperties}
            onChange={(e) => {
              setPlaying(false);
              setDay(+e.target.value);
            }}
          />
        </div>
        <div className={edPresets}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={edPreset(Math.abs(day - p.day) < 4)}
              onClick={() => {
                setPlaying(false);
                setDay(p.day);
              }}
            >
              {t(p.key)}
            </button>
          ))}
        </div>
      </div>
      <p className={tmCardCap}>
        {t("learn.study.sem.caption_lead", { rashis: fmt(12), nakshatras: fmt(27) })}{" "}
        <span className={cn("hl-amber")}>{t("learn.study.sem.caption_sun_position")}</span>{" "}
        {t("learn.study.sem.caption_drift", {
          yearDays: fmt(365),
          moonLaps: `${fmt(12)}.${fmt(4)}`,
          remainingDays: fmt(11),
        })}{" "}
        <span className={cn("hl-amber")}>{t("learn.study.sem.caption_adhika_masa")}</span>
        {t("learn.study.sem.caption_tail")}
      </p>
    </div>
  );
}
