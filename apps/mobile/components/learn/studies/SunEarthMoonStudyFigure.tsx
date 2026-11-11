
import { StudyCaption, StudyCard, StudyControls, StudyHl, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useEffect, useRef, useState } from "react";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/panchanga/nakshatra-icons";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingualText } from "@vedic-patro/domain/locale";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@vedic-patro/domain/calendar/bs-calendar";
import { getWheelRashis } from "@vedic-patro/domain/panchanga/wheel-data";
import { SunEarthMoonOrbit } from "@/components/learn/studies/SunEarthMoonOrbitFigure";
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
} from "@/components/learn/studies/sun-earth-moon-math";

/** Scrub presets — catalogue keys, resolved at render rather than module load. */
const PRESETS = [
  { key: "learn.study.sem.preset_year_start", day: 0 },
  { key: "learn.study.sem.preset_after_3_months", day: TROPICAL_YEAR / 4 },
  { key: "learn.study.sem.preset_after_6_months", day: TROPICAL_YEAR / 2 },
  { key: "learn.study.sem.preset_year_end", day: TROPICAL_YEAR - 2 },
];

export function SunEarthMoonStudy() {
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const { digits, lang } = useLocale();
  const WHEEL_RASHIS = getWheelRashis();
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const fmt = (n: number) => digits(n);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDay((prev) => (prev + dt * 14) % TROPICAL_YEAR);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live]);

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
    <StudyCard view={studyView}>
      <SunEarthMoonOrbit
        day={day}
        onDay={(v) => {
          setPlaying(false);
          setDay(v);
        }}
      />
      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{t("learn.solar_month")}</StudyRoK>
            <StudyRoV>
              {(lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)[monthIdx]}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.sun_sign_nakshatra")}</StudyRoK>
            <StudyRoV>
              {bilingualText(lang, WHEEL_RASHIS[rashiIdx]!.ne, WHEEL_RASHIS[rashiIdx]!.en)} · {bilingualText(lang, NAKSHATRA_ICONS[nakIdx]!.ne, NAKSHATRA_ICONS[nakIdx]!.en)}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.sun_longitude")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(Math.round(sunLon))}°</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.day_of_year")}</StudyRoK>
            <StudyRoV mono={true}>
              {fmt(Math.round(day))} / {fmt(365)}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.moon_angle_paksha")}</StudyRoK>
            <StudyRoV mono={true}>
              {fmt(Math.round(E))}° · {paksha}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.lunar_months_done")}</StudyRoK>
            <StudyRoV amber={true}>
              {fmt(monthsDone)} / ~{fmt(12)} · {fmt(Math.round(daysIntoLunarMonth))}{" "}
              {t("learn.days_into_this_month")}
            </StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>
        <StudyScrubRow>
          <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
          <StudyRange min={0} max={TROPICAL_YEAR} step={0.5} value={day} onChange={(v: number) => {
              setPlaying(false);
              setDay(v);
            }} />
        </StudyScrubRow>
        <StudyPresetRow>
          {PRESETS.map((p) => (
            <StudyPresetButton key={p.key} active={Math.abs(day - p.day) < 4} onPress={() => {
                setPlaying(false);
                setDay(p.day);
              }}>
              {t(p.key)}
            </StudyPresetButton>
          ))}
        </StudyPresetRow>
      </StudyControls>
      <StudyCaption>
        {t("learn.study.sem.caption_lead", { rashis: fmt(12), nakshatras: fmt(27) })}{" "}
        <StudyHl amber>{t("learn.study.sem.caption_sun_position")}</StudyHl>{" "}
        {t("learn.study.sem.caption_drift", {
          yearDays: fmt(365),
          moonLaps: `${fmt(12)}.${fmt(4)}`,
          remainingDays: fmt(11),
        })}{" "}
        <StudyHl amber>{t("learn.study.sem.caption_adhika_masa")}</StudyHl>
        {t("learn.study.sem.caption_tail")}
      </StudyCaption>
    </StudyCard>
  );
}
