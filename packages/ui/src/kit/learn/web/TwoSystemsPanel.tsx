import type { CSSProperties } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import {
  tithiName,
  TWO_SYSTEMS_SPEEDS,
  type LunarReading,
  type SolarReading,
} from "@vedic-patro/domain/astronomy/sky3d/two-systems";
import { edPlayBtn, edRo, edRoK, edRoV, edScrubWrap } from "@vedic-patro/design-tokens/classes/learn-classes";
import { edScrub } from "@vedic-patro/design-tokens/classes/diagram-classes";
import type { TwoSystemsPanelProps } from "../contract";

const FOCUS = [
  { id: "solar", key: "learn.study.two_systems.focus_solar" },
  { id: "lunar", key: "learn.study.two_systems.focus_lunar" },
  { id: "both", key: "learn.study.two_systems.focus_both" },
] as const;

export function TwoSystemsPanel({
  focus,
  onFocus,
  speedIndex,
  onSpeed,
  playing,
  onTogglePlay,
  dayOfYear,
  onSeek,
  year,
  solar,
  lunar,
  moonLongitude,
  travelledMoon,
  travelledSun,
  distanceAu,
  lunarDone,
  playIcon,
  pauseIcon,
  fullscreen = false,
  detailsOpen,
  onToggleDetails,
  expandIcon,
  collapseIcon,
}: TwoSystemsPanelProps) {
  const { t, lang, digits } = useLocale();
  const ne = lang !== "en";
  const day = Math.min(Math.max(dayOfYear, 0), year.yearDays);
  const showDetails = !fullscreen || detailsOpen;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-white/10 bg-black/30 px-3.5 py-3 text-white",
        fullscreen && "shrink-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        fullscreen && (detailsOpen ? "max-h-[46vh]" : "max-h-none"),
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {FOCUS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onFocus(chip.id)}
            className={cn(
              "h-[30px] cursor-pointer rounded-full border px-3 text-sm font-semibold transition-colors",
              focus === chip.id
                ? "border-transparent bg-[var(--tm-gold)] text-ill-amber5"
                : "border-white/20 text-white/70 hover:border-white/50 hover:text-white",
            )}
          >
            {t(chip.key)}
          </button>
        ))}
        <span className="ml-auto flex gap-1.5">
          {TWO_SYSTEMS_SPEEDS.map((speed, index) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSpeed(index)}
              className={cn(
                "h-[30px] cursor-pointer rounded-full border px-2.5 font-num text-xs font-semibold transition-colors",
                speedIndex === index
                  ? "border-transparent bg-white/85 text-black"
                  : "border-white/20 text-white/60 hover:border-white/50",
              )}
            >
              {digits(speed)}×
            </button>
          ))}
        </span>
        {fullscreen && onToggleDetails ? (
          <button
            type="button"
            onClick={onToggleDetails}
            aria-expanded={detailsOpen}
            className="ml-1 inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/20 px-2.5 text-xs font-semibold text-white/70 hover:border-white/50 hover:text-white"
          >
            {detailsOpen ? collapseIcon : expandIcon}
            {t("learn.study.two_systems.readings")}
          </button>
        ) : null}
      </div>

      <div className={edScrubWrap}>
        <button
          type="button"
          className={cn(edPlayBtn, "border-white/25 bg-white/10 text-white hover:bg-white/20")}
          onClick={onTogglePlay}
          aria-label={playing ? t("learn.pause") : t("learn.play")}
        >
          {playing ? pauseIcon : playIcon}
        </button>
        <input
          className={edScrub}
          type="range"
          min={0}
          max={year.yearDays}
          step={0.25}
          value={day}
          style={{ "--fill": `${(day / year.yearDays) * 100}%` } as CSSProperties}
          onChange={(event) => onSeek(year.yearStartDt + Number(event.target.value))}
          aria-label={t("learn.playground.scrub_year")}
        />
        <span className="shrink-0 font-num text-xs text-white/60">
          {digits(Math.max(0, Math.floor(dayOfYear)))}/{digits(Math.round(year.yearDays))}
        </span>
      </div>

      {showDetails ? (
        <>
          <Readings
            ne={ne}
            solar={solar}
            lunar={lunar}
            moonLongitude={moonLongitude}
            travelledMoon={travelledMoon}
            travelledSun={travelledSun}
            distanceAu={distanceAu}
          />
          <DriftLadder year={year} dayOfYear={dayOfYear} lunarDone={lunarDone} ne={ne} />
        </>
      ) : null}
    </div>
  );
}

function Readings({
  ne,
  solar,
  lunar,
  moonLongitude,
  travelledMoon,
  travelledSun,
  distanceAu,
}: {
  ne: boolean;
  solar: SolarReading;
  lunar: LunarReading;
  moonLongitude: number;
  travelledMoon: number;
  travelledSun: number;
  distanceAu: number;
}) {
  const { t, lang, digits } = useLocale();
  const moonRashi = Math.floor(moonLongitude / 30) % 12;
  const lapDone = travelledMoon >= 360;
  return (
    <div className="text-white">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 calendar:grid-cols-5">
        <div className={edRo}>
          <span className={edRoK}>{t("learn.study.two_systems.solar_month_gate")}</span>
          <span className={edRoV({ amber: true })}>
            {ne ? solar.monthNameNe : solar.monthName} {digits(solar.gate)}
          </span>
        </div>
        <div className={edRo}>
          <span className={edRoK}>{t("learn.study.two_systems.sun_in_rashi")}</span>
          <span className={edRoV()}>
            {digits(Math.floor(solar.longitude))}° · {t("dainik.sign")} {digits(solar.rashiIndex + 1)}
          </span>
        </div>
        <div className={edRo}>
          <span className={edRoK}>{t("learn.study.two_systems.moon_in_rashi")}</span>
          <span className={edRoV()}>
            {getRashiName(moonRashi + 1, lang)} · {digits(Math.floor(moonLongitude))}°
          </span>
        </div>
        <div className={edRo}>
          <span className={edRoK}>{t("learn.study.two_systems.moon_sun_angle")}</span>
          <span className={edRoV({ mono: true })}>{digits(lunar.elongation.toFixed(1))}°</span>
        </div>
        <div className={edRo}>
          <span className={edRoK}>{t("learn.study.two_systems.tithi_paksha")}</span>
          <span className={edRoV()}>
            {tithiName(lunar)} · {lunar.shukla ? t("learn.shukla") : t("learn.krishna")}
          </span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-xs sm:grid-cols-2">
        <div>
          <div className="font-semibold text-sky-200">{t("learn.study.two_systems.moon_travelled")}</div>
          <div className="mt-0.5 font-num text-base font-bold text-white">
            {digits(travelledMoon.toFixed(1))}°
            <span className={cn("ml-1.5 rounded px-1.5 py-0.5 text-diagram-xs font-bold", lapDone ? "bg-emerald-400/25 text-emerald-100" : "bg-white/10 text-white/60")}>
              {lapDone
                ? t("learn.study.two_systems.sidereal_lap_done", { degrees: digits((travelledMoon - 360).toFixed(1)) })
                : t("learn.study.two_systems.sidereal_lap_remaining", { degrees: digits((360 - travelledMoon).toFixed(1)) })}
            </span>
          </div>
          <div className="mt-0.5 leading-snug text-white/55">{t("learn.study.two_systems.sidereal_vs_synodic")}</div>
        </div>
        <div>
          <div className="font-semibold text-amber-200">{t("learn.study.two_systems.sun_travelled")}</div>
          <div className="mt-0.5 font-num text-base font-bold text-white">
            {digits(travelledSun.toFixed(1))}°
            <span className="ml-1.5 text-xs font-normal text-white/50">/ {digits(360)}°</span>
            <span className="ml-2 text-xs font-normal text-sky-200/80">
              {t("learn.study.two_systems.from_sun")} {digits(distanceAu.toFixed(4))} AU
            </span>
          </div>
          <div className="mt-0.5 leading-snug text-white/55">{t("learn.study.two_systems.belt_pinned_to_stars")}</div>
        </div>
      </div>
    </div>
  );
}

function DriftLadder({
  year,
  dayOfYear,
  lunarDone,
  ne,
}: {
  year: TwoSystemsPanelProps["year"];
  dayOfYear: number;
  lunarDone: number;
  ne: boolean;
}) {
  const { t, digits } = useLocale();
  const span = year.yearDays;
  const pct = (days: number) => `${(days / span) * 100}%`;
  const playhead = Math.min(Math.max(dayOfYear, 0), span);
  const shortfall = year.lunarShortfall;
  return (
    <div className="select-none">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-white/60">
        <span>{t("learn.study.two_systems.one_timeline")}</span>
        <span className="font-num">
          {t("learn.study.two_systems.ladder_summary", {
            solarDays: digits(span.toFixed(0)),
            lunarDays: digits(year.twelveLunarDays.toFixed(0)),
            gapDays: digits(shortfall.toFixed(0)),
          })}
        </span>
      </div>
      <div className="relative">
        <div className="relative flex h-6 w-full overflow-hidden rounded-md">
          {year.solar.map((month, index) => (
            <div
              key={month.index}
              className={cn(
                "flex items-center justify-center overflow-hidden border-r border-black/40 text-diagram-xs font-semibold text-amber-50 last:border-r-0",
                index % 2 ? "bg-amber-500/35" : "bg-amber-500/22",
              )}
              style={{ width: pct(month.days) }}
            >
              <span className="truncate px-0.5">{ne ? month.nameNe : month.name}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-1 h-5 w-full overflow-hidden rounded-md bg-white/5">
          {year.lunar.map((month, index) => {
            const from = month.startDt - year.yearStartDt;
            if (from >= span) return null;
            return (
              <div
                key={month.index}
                className={cn(
                  "absolute top-0 flex h-full items-center justify-center border-r border-black/40 text-diagram-xs font-semibold text-sky-50",
                  index % 2 ? "bg-sky-400/35" : "bg-sky-400/22",
                  index === 12 && "bg-emerald-400/45",
                )}
                style={{ left: pct(Math.max(0, from)), width: pct(Math.min(month.days, span - from)) }}
              >
                <span className="truncate px-0.5">{digits(index + 1)}</span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-1 h-4 w-full overflow-hidden rounded-md bg-white/5">
          <div
            className="absolute inset-y-0 left-0 flex items-center justify-center border-r border-black/40 bg-sky-400/30 text-diagram-xs font-semibold text-sky-50"
            style={{ width: pct(year.twelveLunarDays) }}
          >
            <span className="truncate px-1">
              {t("learn.study.two_systems.twelve_lunar_months_days", { days: digits(year.twelveLunarDays.toFixed(0)) })}
            </span>
          </div>
          {shortfall > 0 ? (
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-center bg-emerald-400/35 text-diagram-xs font-bold text-emerald-50"
              style={{ width: pct(shortfall) }}
              title={t("learn.study.two_systems.adhik_maas_gap")}
            >
              <span className="truncate px-0.5">{digits(shortfall.toFixed(0))}</span>
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none absolute -top-1 bottom-0 w-px bg-white" style={{ left: pct(playhead) }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500/60 align-middle" />
          {t("learn.study.two_systems.legend_solar_months")}
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-400/60 align-middle" />
          {t("learn.study.two_systems.legend_lunar_months", { begun: digits(lunarDone) })}
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400/70 align-middle" />
          {t("learn.study.two_systems.legend_remaining_gap")}
        </span>
      </div>
    </div>
  );
}
