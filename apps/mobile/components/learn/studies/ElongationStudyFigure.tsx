
import { StudyCard, StudyControls, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { moonIllumination, WHEEL_TITHIS, tithiIndexFromElongation, tithiNum, tithiPaksha, tithiPakshaEn } from "@vedic-patro/domain/panchanga/tithi-wheel-data";
import { ElongationDiagram, EARTH_ARC_SYNODIC, earthOrbitDegFromLunarDay } from "@/components/learn/studies/ElongationDiagramFigure";
import { SYNODIC_MONTH } from "@/components/learn/studies/sun-earth-moon-math";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingualText } from "@vedic-patro/domain/locale";
import { tFor } from "@vedic-patro/i18n/runtime";

const PRESETS = [
  { get ne() { return tFor("ne", "ui.tithi_mechanics.aaushi"); }, get en() { return tFor("en", "ui.tithi_mechanics.aaushi"); }, day: 0 },
  { get ne() { return tFor("ne", "ui.tithi_mechanics.shukla_ashtami"); }, get en() { return tFor("en", "ui.tithi_mechanics.shukla_ashtami"); }, day: (90 / 360) * SYNODIC_MONTH },
  { get ne() { return tFor("ne", "learn.purnima"); }, get en() { return tFor("en", "learn.purnima"); }, day: (174 / 360) * SYNODIC_MONTH },
  { get ne() { return tFor("ne", "ui.tithi_mechanics.krishna_ashtami"); }, get en() { return tFor("en", "ui.tithi_mechanics.krishna_ashtami"); }, day: (270 / 360) * SYNODIC_MONTH },
];

/** One simulated day per second — full two-month run ~60 s. */
const LUNAR_DAYS_PER_SEC = 1;

function elongationFromLunarDay(day: number): number {
  return ((day % SYNODIC_MONTH) / SYNODIC_MONTH) * 360;
}

function lunarDayFromElongation(E: number, monthStart: number): number {
  return monthStart + ((((E % 360) + 360) % 360) / 360) * SYNODIC_MONTH;
}

/** ~30 fps — smooth motion without React choking on 60 full SVG rebuilds/sec. */
const ANIM_FRAME_MS = 33;

export interface ElongationStudyProps {
  /** How many synodic months to play before looping (default 2 for solar-system). */
  animMonths?: number;
  /** Dashed Earth guide arc span in lunar months (default matches animMonths). */
  earthPathMonths?: number;
}

export function ElongationStudy({ animMonths = 2, earthPathMonths }: ElongationStudyProps) {
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const pathMonths = earthPathMonths ?? animMonths;
  const { lang, digits } = useLocale();
  const [lunarDay, setLunarDay] = useState((87 / 360) * SYNODIC_MONTH);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const animDayRef = useRef(lunarDay);
  const fmt = (n: number) => digits(n);
  const animSpan = SYNODIC_MONTH * animMonths;
  const E = elongationFromLunarDay(lunarDay);
  const lunarMonthNum = Math.floor(lunarDay / SYNODIC_MONTH) + 1;
  const dayInMonth = lunarDay % SYNODIC_MONTH;

  useEffect(() => {
    animDayRef.current = lunarDay;
  }, [lunarDay]);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    let lastPaint = last;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      animDayRef.current = (animDayRef.current + dt * LUNAR_DAYS_PER_SEC) % animSpan;
      if (now - lastPaint >= ANIM_FRAME_MS) {
        lastPaint = now;
        setLunarDay(animDayRef.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live, animSpan]);

  const idx = tithiIndexFromElongation(E);
  const wheelTithi = WHEEL_TITHIS[idx]!;
  const paksha = bilingualText(lang, tithiPaksha(idx), tithiPakshaEn(idx));
  const tno = tithiNum(idx);
  const illum = moonIllumination(E);
  const tithiLabel = wheelTithi.moon === "full" ? t("learn.purnima") : wheelTithi.moon === "new" ? t("learn.aunsi") : bilingualText(lang, wheelTithi.ne, wheelTithi.en);
  const earthArc = earthOrbitDegFromLunarDay(lunarDay);
  const monthStart = Math.floor(lunarDay / SYNODIC_MONTH) * SYNODIC_MONTH;

  return (
    <StudyCard view={studyView}>
      <ElongationDiagram
        E={E}
        lunarDay={lunarDay}
        earthPathMonths={pathMonths}
        onE={(v) => {
          setPlaying(false);
          setLunarDay(lunarDayFromElongation(v, monthStart));
        }}
      />
      <StudyControls>
        <StudyReadoutGrid>
          {animMonths > 1 && (
            <StudyRo>
              <StudyRoK>{t("learn.total_days_2_lunar_months")}</StudyRoK>
              <StudyRoV mono={true}>
                {fmt(Math.round(lunarDay * 10) / 10)} / ~{fmt(Math.round(animSpan))}
              </StudyRoV>
            </StudyRo>
          )}
          <StudyRo>
            <StudyRoK>
              {animMonths > 1
                ? t("learn.lunar_month_day")
                : t("learn.day_of_lunar_month")}
            </StudyRoK>
            <StudyRoV amber={animMonths > 1 && lunarMonthNum === 2}>
              {animMonths > 1
                ? `${fmt(lunarMonthNum)} · ${fmt(Math.round(dayInMonth * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`
                : `${fmt(Math.round(lunarDay * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.elongation")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(Math.round(E))}°</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.month_paksha")}</StudyRoK>
            <StudyRoV>{t("learn.ashadh")} {paksha}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.tithi")}</StudyRoK>
            <StudyRoV amber={true}>
              {tithiLabel} · {fmt(tno)}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.illumination")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(illum)}%</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.earth_arc")}</StudyRoK>
            <StudyRoV mono={true}>
              {fmt(Math.round(earthArc))}° / ~{fmt(Math.round(EARTH_ARC_SYNODIC * pathMonths))}°
            </StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>
        <StudyScrubRow>
          <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
          <StudyRange min={0} max={animSpan} step={0.05} value={lunarDay} onChange={(v: number) => {
              setPlaying(false);
              setLunarDay(v);
            }} />
        </StudyScrubRow>
        <StudyPresetRow>
          {PRESETS.map((p) => (
            <StudyPresetButton key={p.ne} active={Math.abs(lunarDay - p.day) < 0.8 || Math.abs(lunarDay - (p.day + SYNODIC_MONTH)) < 0.8} onPress={() => {
                setPlaying(false);
                setLunarDay(p.day);
              }}>
              {bilingualText(lang, p.ne, p.en)}
            </StudyPresetButton>
          ))}
          {animMonths > 1 && (
            <StudyPresetButton active={Math.abs(lunarDay - SYNODIC_MONTH) < 0.8} onPress={() => {
                setPlaying(false);
                setLunarDay(SYNODIC_MONTH);
              }}>
              {t("learn.month_2_aaushi")}
            </StudyPresetButton>
          )}
        </StudyPresetRow>
      </StudyControls>
    </StudyCard>
  );
}

