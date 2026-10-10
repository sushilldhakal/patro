import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { edScrub } from "@/lib/diagram-classes";
import { motSliderLabel, motSliderRow, tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocaleDigits } from "@/i18n/digits";
import { EclipseGeometry } from "./EclipseGeometry";
import {
  ECL_RANGE_DAYS,
  ECLIPSE_YEAR,
  NODE_PLAY_SPEED,
  SYNODIC_MONTH,
  findEclipses,
  geoFromDay,
  isSolarAlignment,
  lunarEclipseStatus,
} from "./eclipse-math";

const RANGE = Math.round(ECL_RANGE_DAYS);
/** Simulated days per real second for Moon / Earth animation. */
const MOON_PLAY_SPEED = 9;

function phaseKey(E: number): string {
  if (E < 12 || E > 348) return "learn.aunsi";
  if (Math.abs(E - 180) < 12) return "learn.purnima";
  return E < 180 ? "learn.study.eclipse.shukla_paksha" : "learn.study.eclipse.krishna_paksha";
}

export function EclipseStudy() {
  const { t } = useTranslation();
  const fmt = useLocaleDigits();
  const [day, setDay] = useState(18);
  const [precDays, setPrecDays] = useState(18);
  const [playing, setPlaying] = useState(true);
  const [playingNodes, setPlayingNodes] = useState(false);
  const rafMoon = useRef(0);
  const rafNode = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDay((prev) => (prev + dt * MOON_PLAY_SPEED) % RANGE);
      rafMoon.current = requestAnimationFrame(tick);
    };
    rafMoon.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafMoon.current);
  }, [playing]);

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
    <div className={tmCardPadLg}>
      <EclipseGeometry u={u} omega={omega} omegaInertial={omegaInertial} earthLon={earthLon} />
      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.day_lunar_month")}</span>
            <span className={edRoV({ mono: true })}>
              {fmt(Math.round(day))} · {fmt(monthNo)}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.moon_phase")}</span>
            <span className={edRoV()}>{t(phaseKey(g.E))}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.node_angle")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(omegaInertial))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.node_cycle")}</span>
            <span className={edRoV({ mono: true })}>
              {t("learn.study.eclipse.node_cycle_value", {
                days: fmt(Math.round(precDays)),
                percent: fmt(Math.round(nodeCyclePct * 100)),
              })}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.study.eclipse.state")}</span>
            <span className={edRoV({ amber: status === "total" || status === "partial" })}>
              {statusText}
            </span>
          </div>
        </div>
        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.eclipse.slider_moon")}</span>
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
              max={RANGE}
              step={0.5}
              value={day}
              style={{ "--fill": `${(day / RANGE) * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setDay(+e.target.value);
              }}
            />
          </div>
        </div>
        <div className={motSliderRow}>
          <span className={motSliderLabel}>{t("learn.study.eclipse.slider_nodes")}</span>
          <div className={edScrubWrap}>
            <button
              type="button"
              className={edPlayBtn}
              onClick={() => setPlayingNodes((p) => !p)}
              title={playingNodes ? t("learn.pause") : t("learn.study.eclipse.play_nodes")}
              aria-label={playingNodes ? t("learn.pause") : t("learn.study.eclipse.play_nodes")}
            >
              {playingNodes ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              className={edScrub}
              type="range"
              min={0}
              max={ECLIPSE_YEAR}
              step={0.5}
              value={precDays}
              style={{ "--fill": `${(precDays / ECLIPSE_YEAR) * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlayingNodes(false);
                setPrecDays(+e.target.value);
              }}
            />
          </div>
        </div>
        <div className={edPresets}>
          <button type="button" className={edPreset()} onClick={() => jumpNext("lunar")}>
            {t("learn.study.eclipse.next_lunar")}
          </button>
          <button type="button" className={edPreset()} onClick={() => jumpNext("solar")}>
            {t("learn.study.eclipse.next_solar")}
          </button>
          <button
            type="button"
            className={edPreset()}
            onClick={() => {
              setPlaying(false);
              setPlayingNodes(false);
              setDay(0);
              setPrecDays(0);
            }}
          >
            {t("learn.study.eclipse.to_start")}
          </button>
        </div>
      </div>
      <p className={tmCardCap}>
        {t("learn.study.eclipse.caption_moon_pace", { days: fmt(27) })}{" "}
        <span className={cn("hl-amber")}>{t("learn.study.eclipse.rahu_ketu")}</span>{" "}
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
      </p>
    </div>
  );
}
