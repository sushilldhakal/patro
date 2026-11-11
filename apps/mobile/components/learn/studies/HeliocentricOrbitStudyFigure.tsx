
import { StudyB, StudyCaption, StudyCard, StudyControls, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useEffect, useRef, useState } from "react";
import { HeliocentricOrbitDiagram } from "@/components/learn/studies/HeliocentricOrbitDiagramFigure";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale } from "@vedic-patro/i18n/react";
import {
  ORBIT_MARKERS,
  ORBIT_PRESETS,
  meanFromTrue,
  orbitFromMeanAnomaly,
} from "@/components/learn/studies/orbit-math";

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
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const { digits } = useLocale();
  const [meanDeg, setMeanDeg] = useState(() => meanFromTrue(180));
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const fmt = (n: number) => digits(n);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setMeanDeg((prev) => (prev + dt * 10) % 360);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live]);

  const orbit = orbitFromMeanAnomaly(meanDeg);
  const dayOfYear = Math.round((meanDeg / 360) * 365.25);

  return (
    <StudyCard view={studyView}>
      <HeliocentricOrbitDiagram
        meanDeg={meanDeg}
        onMeanDeg={(v) => {
          setPlaying(false);
          setMeanDeg(v);
        }}
      />
      <StudyCaption>
        {t("learn.study.orbit.caption_lead")} <StudyB>{t("learn.study.orbit.caption_direction")}</StudyB>{" "}
        {t("learn.study.orbit.caption_rest", { tilt: fmt(23.5) })}
      </StudyCaption>
      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{t("learn.study.orbit.mean_angle")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(Math.round(meanDeg))}°</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.orbit.day_of_year")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(dayOfYear)}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.orbit.event_season")}</StudyRoK>
            <StudyRoV amber={true}>{t(orbitEventKey(meanDeg))}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.orbit.distance_from_sun")}</StudyRoK>
            <StudyRoV mono={true}>
              {orbit.speed > 1.02 ? t("learn.study.orbit.near_fast") : orbit.speed < 0.98 ? t("learn.study.orbit.far_slow") : t("learn.study.medium")}
            </StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>
        <StudyScrubRow>
          <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
          <StudyRange min={0} max={360} step={0.5} value={meanDeg} onChange={(v: number) => {
              setPlaying(false);
              setMeanDeg(v);
            }} />
        </StudyScrubRow>
        <StudyPresetRow>
          {ORBIT_MARKERS.map((m, i) => {
            const preset = ORBIT_PRESETS[i]!;
            return (
              <StudyPresetButton key={m.nu} active={Math.abs((((meanDeg - preset.meanDeg + 180) % 360) + 360) % 360 - 180) < 8} onPress={() => {
                  setPlaying(false);
                  setMeanDeg(preset.meanDeg);
                }}>
                {t(MARKER_KEYS[i]!)}
              </StudyPresetButton>
            );
          })}
        </StudyPresetRow>
      </StudyControls>
    </StudyCard>
  );
}
