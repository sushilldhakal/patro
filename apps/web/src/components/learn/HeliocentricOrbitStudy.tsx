import { useEffect, useRef, useState } from "react";
import { edScrub } from "@/lib/diagram-classes";
import { tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { HeliocentricOrbitDiagram } from "./HeliocentricOrbitDiagram";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import {
  ORBIT_MARKERS,
  ORBIT_PRESETS,
  meanFromTrue,
  orbitFromMeanAnomaly,
} from "./orbit-math";

/** Catalogue keys for ORBIT_MARKERS / ORBIT_PRESETS, in their shared order. */
const MARKER_KEYS = [
  "learn.study.orbit.winter_solstice",
  "learn.study.orbit.vernal_equinox",
  "learn.study.orbit.summer_solstice",
  "learn.study.orbit.autumnal_equinox",
];

function nearestPreset(meanDeg: number): { index: number; diff: number } {
  return ORBIT_PRESETS.reduce(
    (best, p, index) => {
      const diff = Math.abs((((meanDeg - p.meanDeg + 180) % 360) + 360) % 360 - 180);
      return diff < best.diff ? { index, diff } : best;
    },
    { index: 0, diff: Infinity },
  );
}

function seasonKey(meanDeg: number): string {
  const { nuDeg } = orbitFromMeanAnomaly(meanDeg);
  if (nuDeg < 45 || nuDeg >= 315) return "learn.study.orbit.season_winter";
  if (nuDeg < 135) return "learn.study.orbit.season_spring";
  if (nuDeg < 225) return "learn.study.orbit.season_summer";
  return "learn.study.orbit.season_autumn";
}

function orbitEventKey(meanDeg: number): string {
  const near = nearestPreset(meanDeg);
  if (near.diff < 10) return MARKER_KEYS[near.index]!;
  return seasonKey(meanDeg);
}

export function HeliocentricOrbitStudy() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const [meanDeg, setMeanDeg] = useState(() => meanFromTrue(180));
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const fmt = (n: number) => digits(n);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setMeanDeg((prev) => (prev + dt * 10) % 360);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const orbit = orbitFromMeanAnomaly(meanDeg);
  const dayOfYear = Math.round((meanDeg / 360) * 365.25);

  return (
    <div className={tmCardPadLg}>
      <HeliocentricOrbitDiagram
        meanDeg={meanDeg}
        onMeanDeg={(v) => {
          setPlaying(false);
          setMeanDeg(v);
        }}
      />
      <p className={tmCardCap}>
        {t("learn.study.orbit.caption_lead")} <b>{t("learn.study.orbit.caption_direction")}</b>{" "}
        {t("learn.study.orbit.caption_rest", { tilt: fmt(23.5) })}
      </p>
      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.orbit.mean_angle")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(meanDeg))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.orbit.day_of_year")}</span>
            <span className={edRoV({ mono: true })}>{fmt(dayOfYear)}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.orbit.event_season")}</span>
            <span className={edRoV({ amber: true })}>{t(orbitEventKey(meanDeg))}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.orbit.distance_from_sun")}</span>
            <span className={edRoV({ mono: true })}>
              {orbit.speed > 1.02 ? t("learn.study.orbit.near_fast") : orbit.speed < 0.98 ? t("learn.study.orbit.far_slow") : t("learn.study.medium")}
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
            max={360}
            step={0.5}
            value={meanDeg}
            style={{ "--fill": `${(meanDeg / 360) * 100}%` } as React.CSSProperties}
            onChange={(e) => {
              setPlaying(false);
              setMeanDeg(+e.target.value);
            }}
          />
        </div>
        <div className={edPresets}>
          {ORBIT_MARKERS.map((m, i) => {
            const preset = ORBIT_PRESETS[i]!;
            return (
              <button
                key={m.nu}
                type="button"
                className={edPreset(
                  Math.abs((((meanDeg - preset.meanDeg + 180) % 360) + 360) % 360 - 180) < 8,
                )}
                onClick={() => {
                  setPlaying(false);
                  setMeanDeg(preset.meanDeg);
                }}
              >
                {t(MARKER_KEYS[i]!)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
