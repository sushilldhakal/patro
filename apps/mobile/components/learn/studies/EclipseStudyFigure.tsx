
import { StudyCaption, StudyCard, StudyControls, StudyHl, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow, StudySliderLabel, StudySliderRow } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocaleDigits } from "@/components/learn/study/study-digits";
import { EclipseGeometry } from "@/components/learn/studies/EclipseGeometryFigure";
import {
  ECL_RANGE_DAYS,
  ECLIPSE_YEAR,
  NODE_PLAY_SPEED,
  SYNODIC_MONTH,
  findEclipses,
  geoFromDay,
  isSolarAlignment,
  lunarEclipseStatus,
} from "@/components/learn/studies/eclipse-math";

const RANGE = Math.round(ECL_RANGE_DAYS);
/** Simulated days per real second for Moon / Earth animation. */
const MOON_PLAY_SPEED = 9;

function phaseKey(E: number): string {
  if (E < 12 || E > 348) return "learn.aunsi";
  if (Math.abs(E - 180) < 12) return "learn.purnima";
  return E < 180 ? "learn.study.eclipse.shukla_paksha" : "learn.study.eclipse.krishna_paksha";
}

export function EclipseStudy() {
  const { view: studyView, live } = useStudyLive();
  const { t } = useTranslation();
  const fmt = useLocaleDigits();
  const [day, setDay] = useState(18);
  const [precDays, setPrecDays] = useState(18);
  const [playing, setPlaying] = useState(true);
  const [playingNodes, setPlayingNodes] = useState(false);
  const rafMoon = useRef(0);
  const rafNode = useRef(0);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDay((prev) => (prev + dt * MOON_PLAY_SPEED) % RANGE);
      rafMoon.current = requestAnimationFrame(tick);
    };
    rafMoon.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafMoon.current);
  }, [playing, live]);

  useEffect(() => {
    if (!playingNodes) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPrecDays((prev) => (prev + dt * NODE_PLAY_SPEED) % ECLIPSE_YEAR);
      rafNode.current = requestAnimationFrame(tick);
    };
    rafNode.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafNode.current);
  }, [playingNodes]);

  const events = useMemo(() => findEclipses(RANGE), []);

  const { u, omega, omegaInertial, earthLon, g } = geoFromDay(day, precDays);
  const status = lunarEclipseStatus(g);
  const solar = isSolarAlignment(g);
  const monthNo = Math.floor(day / SYNODIC_MONTH) + 1;
  const nodeCyclePct = precDays / ECLIPSE_YEAR;

  const next = useMemo(() => {
    const after = events.filter((e) => e.t > day + 0.5);
    const list = after.length ? after : events;
    return list[0] ?? null;
  }, [events, day]);

  const jumpNext = (kind: "lunar" | "solar") => {
    const after = events.filter((e) => e.kind === kind && e.t > day + 0.5);
    const target = (after.length ? after : events.filter((e) => e.kind === kind))[0];
    if (target) {
      setPlaying(false);
      setPlayingNodes(false);
      setDay(target.t);
      setPrecDays(target.t);
    }
  };

  const statusText =
    status === "total"
      ? t("learn.study.eclipse.status_total")
      : status === "partial"
        ? t("learn.study.eclipse.status_partial")
        : status === "penumbral"
          ? t("learn.study.eclipse.status_penumbral")
          : solar
            ? t("learn.study.eclipse.status_solar")
            : t("learn.study.eclipse.status_none");

  const lunarCount = events.filter((e) => e.kind === "lunar").length;
  const solarCount = events.filter((e) => e.kind === "solar").length;

  return (
    <StudyCard view={studyView}>
      <EclipseGeometry u={u} omega={omega} omegaInertial={omegaInertial} earthLon={earthLon} />
      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{t("learn.study.eclipse.day_lunar_month")}</StudyRoK>
            <StudyRoV mono={true}>
              {fmt(Math.round(day))} · {fmt(monthNo)}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.eclipse.moon_phase")}</StudyRoK>
            <StudyRoV>{t(phaseKey(g.E))}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.eclipse.node_angle")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(Math.round(omegaInertial))}°</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.eclipse.node_cycle")}</StudyRoK>
            <StudyRoV mono={true}>
              {t("learn.study.eclipse.node_cycle_value", {
                days: fmt(Math.round(precDays)),
                percent: fmt(Math.round(nodeCyclePct * 100)),
              })}
            </StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{t("learn.study.eclipse.state")}</StudyRoK>
            <StudyRoV amber={status === "total" || status === "partial"}>
              {statusText}
            </StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>
        <StudySliderRow>
          <StudySliderLabel>{t("learn.study.eclipse.slider_moon")}</StudySliderLabel>
          <StudyScrubRow>
            <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
            <StudyRange min={0} max={RANGE} step={0.5} value={day} onChange={(v: number) => {
                setPlaying(false);
                setDay(v);
              }} />
          </StudyScrubRow>
        </StudySliderRow>
        <StudySliderRow>
          <StudySliderLabel>{t("learn.study.eclipse.slider_nodes")}</StudySliderLabel>
          <StudyScrubRow>
            <StudyPlayButton playing={playing} onPress={() => setPlayingNodes((p) => !p)} />
            <StudyRange min={0} max={ECLIPSE_YEAR} step={0.5} value={precDays} onChange={(v: number) => {
                setPlayingNodes(false);
                setPrecDays(v);
              }} />
          </StudyScrubRow>
        </StudySliderRow>
        <StudyPresetRow>
          <StudyPresetButton onPress={() => jumpNext("lunar")}>
            {t("learn.study.eclipse.next_lunar")}
          </StudyPresetButton>
          <StudyPresetButton onPress={() => jumpNext("solar")}>
            {t("learn.study.eclipse.next_solar")}
          </StudyPresetButton>
          <StudyPresetButton onPress={() => {
              setPlaying(false);
              setPlayingNodes(false);
              setDay(0);
              setPrecDays(0);
            }}>
            {t("learn.study.eclipse.to_start")}
          </StudyPresetButton>
        </StudyPresetRow>
      </StudyControls>
      <StudyCaption>
        {t("learn.study.eclipse.caption_moon_pace", { days: fmt(27) })}{" "}
        <StudyHl amber>{t("learn.study.eclipse.rahu_ketu")}</StudyHl>{" "}
        {t("learn.study.eclipse.caption_nodes_drift", {
          perYear: fmt(19),
          years: fmt(19),
          factor: fmt(250),
        })}{" "}
        {t("learn.study.eclipse.caption_controls")}{" "}
        {t("learn.study.eclipse.caption_when", {
          lunar: fmt(lunarCount),
          solar: fmt(solarCount),
        })}
        {next
          ? ` ${t("learn.study.eclipse.caption_next", {
              days: fmt(Math.max(0, Math.round(next.t - day))),
            })}`
          : ""}
      </StudyCaption>
    </StudyCard>
  );
}
