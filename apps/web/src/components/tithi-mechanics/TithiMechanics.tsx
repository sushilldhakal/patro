import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Pause, Play } from "lucide-react";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { moonIllumination, WHEEL_TITHIS, tithiIndexFromElongation, tithiNum, tithiPaksha, tithiPakshaEn } from "@vedic-patro/domain/tithi-wheel-data";
import { ElongationDiagram, EARTH_ARC_SYNODIC, earthOrbitDegFromLunarDay } from "./ElongationDiagram";
import { SYNODIC_MONTH } from "@/components/learn/sun-earth-moon-math";
import { cn } from "@vedic-patro/design-tokens/cn";
import { edScrub } from "@/lib/diagram-classes";
import { AdhikMassDiagram, SunriseTimeline } from "./tithi-mechanics-diagrams";
import { useLocale, bilingualText } from "@/i18n/locale";
import { tmCardCap, tmCardPadLg, tmFcard, tmFormula, tmHero, tmHeroEyebrow, tmHeroSub, tmHeroTitle, tmKey, tmKeys, tmLede, tmNote, tmPageShell, tmSecEn, tmSecHead, tmSecKicker, tmSecTitle, tmSection, tmWrap, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap } from "@/lib/learn-classes";
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
    if (!playing) return;
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
  }, [playing, animSpan]);

  const idx = tithiIndexFromElongation(E);
  const wheelTithi = WHEEL_TITHIS[idx]!;
  const paksha = bilingualText(lang, tithiPaksha(idx), tithiPakshaEn(idx));
  const tno = tithiNum(idx);
  const illum = moonIllumination(E);
  const tithiLabel = wheelTithi.moon === "full" ? t("learn.purnima") : wheelTithi.moon === "new" ? t("learn.aunsi") : bilingualText(lang, wheelTithi.ne, wheelTithi.en);
  const earthArc = earthOrbitDegFromLunarDay(lunarDay);
  const monthStart = Math.floor(lunarDay / SYNODIC_MONTH) * SYNODIC_MONTH;

  return (
    <div className={tmCardPadLg}>
      <ElongationDiagram
        E={E}
        lunarDay={lunarDay}
        earthPathMonths={pathMonths}
        onE={(v) => {
          setPlaying(false);
          setLunarDay(lunarDayFromElongation(v, monthStart));
        }}
      />
      <div className={edControls}>
        <div className={edReadout}>
          {animMonths > 1 && (
            <div className={edRo}>
              <span className={edRoK}>{t("learn.total_days_2_lunar_months")}</span>
              <span className={edRoV({ mono: true })}>
                {fmt(Math.round(lunarDay * 10) / 10)} / ~{fmt(Math.round(animSpan))}
              </span>
            </div>
          )}
          <div className={edRo}>
            <span className={edRoK}>
              {animMonths > 1
                ? t("learn.lunar_month_day")
                : t("learn.day_of_lunar_month")}
            </span>
            <span className={edRoV({ amber: animMonths > 1 && lunarMonthNum === 2 })}>
              {animMonths > 1
                ? `${fmt(lunarMonthNum)} · ${fmt(Math.round(dayInMonth * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`
                : `${fmt(Math.round(lunarDay * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.elongation")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(E))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.month_paksha")}</span>
            <span className={edRoV()}>{t("learn.ashadh")} {paksha}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.tithi")}</span>
            <span className={edRoV({ amber: true })}>
              {tithiLabel} · {fmt(tno)}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.illumination")}</span>
            <span className={edRoV({ mono: true })}>{fmt(illum)}%</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.earth_arc")}</span>
            <span className={edRoV({ mono: true })}>
              {fmt(Math.round(earthArc))}° / ~{fmt(Math.round(EARTH_ARC_SYNODIC * pathMonths))}°
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
            max={animSpan}
            step={0.05}
            value={lunarDay}
            style={{ "--fill": `${(lunarDay / animSpan) * 100}%` } as React.CSSProperties}
            onChange={(e) => {
              setPlaying(false);
              setLunarDay(+e.target.value);
            }}
          />
        </div>
        <div className={edPresets}>
          {PRESETS.map((p) => (
            <button
              key={p.ne}
              type="button"
              className={edPreset(Math.abs(lunarDay - p.day) < 0.8 || Math.abs(lunarDay - (p.day + SYNODIC_MONTH)) < 0.8)}
              onClick={() => {
                setPlaying(false);
                setLunarDay(p.day);
              }}
            >
              {bilingualText(lang, p.ne, p.en)}
            </button>
          ))}
          {animMonths > 1 && (
            <button
              type="button"
              className={edPreset(Math.abs(lunarDay - SYNODIC_MONTH) < 0.8)}
              onClick={() => {
                setPlaying(false);
                setLunarDay(SYNODIC_MONTH);
              }}
            >
              {t("learn.month_2_aaushi")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TithiMechanics() {
  return (
    <div className={cn(tmPageShell, "rounded-2xl border border-border overflow-hidden")}>
      <div className={tmWrap}>
        <header className={tmHero}>
          <div className={tmHeroEyebrow}>{tFor(undefined, "ui.tithi_mechanics.x_f88f5709")}</div>
          <h2 className={tmHeroTitle}>
            {tFor(undefined, "ui.tithi_mechanics.x_f4c576c6")}<b>{tFor(undefined, "ui.tithi_mechanics.x_6942a040")}</b>
          </h2>
          <p className={tmHeroSub}>
            {tFor(undefined, "ui.tithi_mechanics.x_6ea902dd")}<b>{tFor(undefined, "ui.tithi_mechanics.x_acf8fcc7")}</b>{tFor(undefined, "ui.tithi_mechanics.x_88b1e63b")}
          </p>
        </header>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>{tFor(undefined, "ui.tithi_mechanics.x_bcb9ab5e")}</span>
            <h3 className={tmSecTitle}>{tFor(undefined, "ui.tithi_mechanics.x_68b80d92")}</h3>
          </div>
          <p className={tmLede}>
            {tFor(undefined, "ui.tithi_mechanics.x_2f2bb5c1")}<span className={cn("hl")}>{tFor(undefined, "ui.tithi_mechanics.x_5d278368")}</span>{tFor(undefined, "ui.tithi_mechanics.x_80aa8f40")}<b>{tFor(undefined, "ui.tithi_mechanics.x_913f369e")}</b>{tFor(undefined, "ui.tithi_mechanics.x_45cbe500")}{" "}
            <span className={cn("hl-amber")}>{tFor(undefined, "learn.aunsi")}</span>{tFor(undefined, "ui.tithi_mechanics.x_67f222da")}<b>{tFor(undefined, "ui.tithi_mechanics.x_0df195b8")}</b>{tFor(undefined, "ui.tithi_mechanics.x_73a2e4c1")}<span className={cn("hl-amber")}>{tFor(undefined, "learn.purnima")}</span>{tFor(undefined, "ui.tithi_mechanics.x_804e4a49")}
          </p>
          <ElongationStudy animMonths={1} />

          <div className={tmFormula}>
            <div className={tmFcard}>
              <div className={cn("big")}>
                {toNepaliDigits(12)}
                <span className={cn("u")}>°</span>
              </div>
              <div className={cn("lbl")}>{tFor(undefined, "ui.tithi_mechanics.x_417c5e77")}</div>
              <div className={cn("desc")}>{tFor(undefined, "ui.tithi_mechanics.x_15793647")}</div>
            </div>
            <div className={tmFcard}>
              <div className={cn("big")}>
                ~{toNepaliDigits(12)}
                <span className={cn("u")}>{tFor(undefined, "ui.tithi_mechanics.x_82929384")}</span>
              </div>
              <div className={cn("lbl")}>{tFor(undefined, "ui.tithi_mechanics.x_eb231874")}</div>
              <div className={cn("desc")}>
                {tFor(undefined, "ui.tithi_mechanics.x_bddc9020")}
              </div>
            </div>
            <div className={tmFcard}>
              <div className={cn("big")}>{tFor(undefined, "panchanga.wheel.sunrise")}</div>
              <div className={cn("lbl")}>{tFor(undefined, "ui.tithi_mechanics.x_984f4787")}</div>
              <div className={cn("desc")}>
                {tFor(undefined, "ui.tithi_mechanics.x_d06e2c1f")}<b>{tFor(undefined, "ui.tithi_mechanics.x_e855eb08")}</b>{tFor(undefined, "ui.tithi_mechanics.x_c5a15ced")}
              </div>
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>{tFor(undefined, "ui.tithi_mechanics.x_9fa3c929")}</span>
            <h3 className={tmSecTitle}>{tFor(undefined, "ui.tithi_mechanics.x_6ae40563")}</h3>
            <span className={tmSecEn}>Repeated tithi</span>
          </div>
          <p className={tmLede}>
            {tFor(undefined, "ui.tithi_mechanics.x_85d930d7")}<span className={cn("hl")}>{tFor(undefined, "ui.tithi_mechanics.x_ff5562b2")}</span>{tFor(undefined, "ui.tithi_mechanics.x_57bf6775")}<b>{tFor(undefined, "ui.tithi_mechanics.x_bae2d920")}</b>{tFor(undefined, "ui.tithi_mechanics.x_f7724611")}<span className={cn("hl-amber")}>{tFor(undefined, "ui.tithi_mechanics.x_2d985120")}</span>{tFor(undefined, "ui.tithi_mechanics.x_416a4fb5")}
          </p>
          <div className={tmCardPadLg}>
            <SunriseTimeline mode="vriddhi" />
            <div className={tmCardCap}>
              {tFor(undefined, "ui.tithi_mechanics.x_9776509b")}
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>{tFor(undefined, "ui.tithi_mechanics.x_cfd118d4")}</span>
            <h3 className={tmSecTitle}>{tFor(undefined, "ui.tithi_mechanics.x_0a3f3885")}</h3>
            <span className={tmSecEn}>Skipped tithi</span>
          </div>
          <p className={tmLede}>
            {tFor(undefined, "ui.tithi_mechanics.x_8a8cc924")}<span className={cn("hl")}>{tFor(undefined, "ui.tithi_mechanics.x_3e037cb2")}</span>{tFor(undefined, "ui.tithi_mechanics.x_dcc53455")}<b>{tFor(undefined, "ui.tithi_mechanics.x_3cca62ad")}</b>{tFor(undefined, "ui.tithi_mechanics.x_82cbe54f")}<span className={cn("hl-amber")}>{tFor(undefined, "ui.tithi_mechanics.x_71db6576")}</span>{tFor(undefined, "ui.tithi_mechanics.x_b52ab797")}
          </p>
          <div className={tmCardPadLg}>
            <SunriseTimeline mode="kshaya" />
            <div className={tmCardCap}>
              {tFor(undefined, "ui.tithi_mechanics.x_d46d2ef1")}
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>{tFor(undefined, "ui.tithi_mechanics.x_0c9dbd72")}</span>
            <h3 className={tmSecTitle}>{tFor(undefined, "ui.tithi_mechanics.x_6b282619")}</h3>
            <span className={tmSecEn}>Extra month</span>
          </div>
          <p className={tmLede}>
            {tFor(undefined, "ui.tithi_mechanics.x_0cbb14c4")}<b>{tFor(undefined, "learn.diagrams.hierarchy_step_lunar_month")}</b>{tFor(undefined, "ui.tithi_mechanics.x_1a013320")}<b>{tFor(undefined, "ui.tithi_mechanics.x_32ec504d")}</b>{tFor(undefined, "ui.tithi_mechanics.x_d13b4791")}<span className={cn("hl")}>{tFor(undefined, "ui.tithi_mechanics.x_fd0282e1")}</span>{tFor(undefined, "ui.tithi_mechanics.x_2d6d0b83")}{" "}
            <span className={cn("hl-amber")}>{tFor(undefined, "learn.study.sem.caption_adhika_masa")}</span>{tFor(undefined, "ui.tithi_mechanics.x_2983b24f")}
          </p>
          <div className={tmCardPadLg}>
            <AdhikMassDiagram />
            <div className={tmCardCap}>
              {tFor(undefined, "ui.tithi_mechanics.x_9e5a2850")}
            </div>
          </div>
          <div className={tmKeys}>
            <div className={tmKey}>
              <h4>{tFor(undefined, "ui.tithi_mechanics.x_ea92eee6")}</h4>
              <p>
                {tFor(undefined, "ui.tithi_mechanics.x_ca6c88cd")}
              </p>
            </div>
            <div className={tmKey}>
              <h4>{tFor(undefined, "ui.tithi_mechanics.x_35718df5")}</h4>
              <p>
                {tFor(undefined, "ui.tithi_mechanics.x_bf0a0109")}
              </p>
            </div>
            <div className={tmKey}>
              <h4>{tFor(undefined, "ui.tithi_mechanics.x_5e66ef8c")}</h4>
              <p>
                {tFor(undefined, "ui.tithi_mechanics.x_b471c637")}
              </p>
            </div>
          </div>
        </section>

        <p className={tmNote}>
          {tFor(undefined, "ui.tithi_mechanics.x_2c6a9775")}
        </p>
      </div>
    </div>
  );
}
