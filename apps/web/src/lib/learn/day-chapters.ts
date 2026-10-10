/**
 * The Earth / day tour — the first part of the guided track.
 *
 * A direct port of the Minute Labs "What is a Day" lab, beat for beat, so a
 * voiceover recorded against the original locks to the same seconds. The
 * shared vocabulary lives in {@link ./chapter-kit}; this file is only the
 * script.
 *
 * The extra layers this scene already has — राशि, नक्षत्र, महिना, Moon — stay
 * available on the state so a chapter can turn them on. The ported chapters
 * leave them off, because the original had none of them; the chapters that are
 * about them are in {@link ./calendar-chapters}, and {@link ./chapter-tracks}
 * is what runs the two halves as one syllabus.
 */

import { equationOfTime, PERIHELION, VERNAL } from "@/lib/sky3d/day-mechanics";
import {
  cam,
  chapterState,
  kf,
  PI2,
  zoomToDistance,
  type Chapter,
} from "./chapter-kit";

const SOLAR_DAYS = 8;

/** Orbital fraction that puts a given solar-day count on the meridian. */
function pos(days: number, e = 0, yRad = 0) {
  const dpy = SOLAR_DAYS + 1;
  let eot = 0;
  if (e || yRad) {
    eot = equationOfTime((days / SOLAR_DAYS) * PI2 - PERIHELION, e, yRad, PERIHELION - VERNAL);
  }
  return (days - PERIHELION / PI2 - eot / PI2) / (dpy - 1);
}

/** This track's own quiet opening — the original lab's eight-day toy year. */
function base(partial: Parameters<typeof chapterState>[0]) {
  return chapterState({ solarDaysPerYear: SOLAR_DAYS, ...partial });
}

const welcome: Chapter = {
  id: "welcome",
  titleKey: "learn.chapters.welcome",
  partKey: "learn.chapters.part_day",
  defaults: base({
    handsOff: true,
    cameraTarget: "meanSun",
    planetOrbit: false,
    primeMeridian: false,
    ...cam(0, 20, 30, 30),
  }),
  frames: [
    kf(
      {
        handsOff: false,
        meanSun: true,
        planetOrbit: true,
        eotWedge: true,
        eccentricity: 0.02,
        tiltDeg: 23.4,
        meanArc: true,
        solarArc: true,
        siderealArc: true,
        axis: true,
      },
      { at: "55s", duration: "1s" },
    ),
    kf({ orbitalPosition: 4 }, { at: "01:58", from: "54s", ease: "linear" }),
    kf({ tip: "learn.chapters.tip_zoom" }, { at: "01:11", duration: 1 }),
    kf({ tip: "" }, { at: "01:20", duration: 1 }),
    kf({ handsOff: true }, { at: "01:58", duration: "1s" }),
  ],
};

const stellar: Chapter = {
  id: "stellar",
  audioAliases: ["stellar-days"],
  titleKey: "learn.chapters.stellar",
  partKey: "learn.chapters.part_day",
  defaults: base({
    cameraTarget: "planet",
    siderealArc: true,
    primeMeridian: true,
    trueSun: true,
    planetOrbit: true,
    degrees: true,
    siderealClock: true,
    ...cam(-5, 20, 30, 40),
  }),
  frames: [
    kf(
      {
        orbitalPosition: 0,
        primeMeridian: false,
        siderealArc: false,
        trueSun: false,
        planetOrbit: false,
        degrees: false,
        siderealClock: false,
        highlight: "",
        eccentricity: 0,
        tiltDeg: 0,
        ...cam(-5, 20, 30, 80),
      },
      /* Copilot reaches this 1ms after play. `from: 1` keeps t=0 on the
         defaults — the original's paused opening — instead of stepping the
         booleans the instant the chapter loads. */
      { at: 1, from: 1 },
    ),
    kf({ orbitalPosition: 0.135 }, { at: "8s", from: 0, ease: "linear" }),
    kf({ ...cam(-5, 50, 30, 80) }, { at: "8s", duration: "1s", ease: "quadInOut" }),
    kf({ primeMeridian: true }, { at: "8s", duration: "1s" }),
    kf({ ...cam(-5, -50, 30, 80) }, { at: "13s", duration: "5s", ease: "sineInOut" }),
    kf(
      { orbitalPosition: 2 / (SOLAR_DAYS + 1), ...cam(0, 20, 0.1, 80) },
      { at: "14s", duration: "1s", ease: "quadInOut" },
    ),
    kf({ siderealArc: true, degrees: true }, { at: "15s", duration: "1s" }),
    kf({ orbitalPosition: 3 / (SOLAR_DAYS + 1) }, { at: "19s", from: "15s", ease: "quadInOut" }),
    kf({ siderealClock: true }, { at: "20s" }),
    kf({ highlight: "stellar-day-arc" }, { at: "29s", duration: 1 }),
    kf({ highlight: "" }, { at: "35s", duration: 1 }),
    kf({ orbitalPosition: 8 / (SOLAR_DAYS + 1) }, { at: "35s", from: "19s", ease: "linear" }),
    kf(
      { cameraDistance: zoomToDistance(20), trueSun: true, planetOrbit: true },
      { at: "56s", duration: "1s", ease: "quadInOut" },
    ),
    kf({ orbitalPosition: 1 }, { at: "01:00", from: "41s", ease: "linear" }),
    kf({ orbitalPosition: 1.5 }, { at: "01:16", from: "01:11", ease: "linear" }),
    kf({ cameraDistance: zoomToDistance(40) }, { at: "01:16", duration: "1s", ease: "quadInOut" }),
    kf({ ...cam(-5, 20, 30, 40) }, { at: "01:29", duration: "1s", ease: "sineInOut" }),
    kf({ highlight: "earth" }, { at: "01:52", duration: 1 }),
    kf({ highlight: "" }, { at: "01:58", duration: 1 }),
    kf({ highlightControl: "auto-orbit" }, { at: "01:58", duration: 1 }),
    kf({ highlightControl: "" }, { at: "02:03", duration: 1 }),
    kf({ highlightControl: "orbit-speed" }, { at: "02:04", duration: 1 }),
    kf({ highlightControl: "" }, { at: "02:08", duration: 1 }),
    kf({ highlightControl: "camera-target" }, { at: "02:12", duration: 1 }),
    kf({ highlightControl: "" }, { at: "02:17", duration: 1 }),
    kf({ highlightControl: "follow-orbit" }, { at: "02:18", duration: 1 }),
    kf({ highlightControl: "" }, { at: "02:24", duration: 1 }),
    kf({ highlightControl: "settings" }, { at: "02:31", duration: 1 }),
    kf({ highlightControl: "" }, { at: "02:36", duration: 1 }),
    kf({ handsOff: true }, { at: "03:08", from: "01:29" }),
  ],
};

const solar: Chapter = {
  id: "solar",
  audioAliases: ["solar-days"],
  titleKey: "learn.chapters.solar",
  partKey: "learn.chapters.part_day",
  defaults: base({
    siderealArc: true,
    solarArc: true,
    primeMeridian: true,
    ...cam(-5, 20, 30, 40),
  }),
  frames: [
    kf({ orbitalPosition: pos(5), degrees: false }, { at: 1, duration: 1 }),
    kf({ highlight: "solar-day-arc" }, { at: "8s", duration: 1 }),
    kf({ highlight: "" }, { at: "12s", duration: 1 }),
    kf({ orbitalPosition: pos(8) }, { at: "00:20", from: 1, ease: "linear" }),
    kf({ ...cam(0, 20, 0.1, 80) }, { at: "00:22", duration: "3s", ease: "quadInOut" }),
    kf({ degrees: true }, { at: "00:23", duration: 1 }),
    kf({ orbitalPosition: 1 + 1 / (SOLAR_DAYS + 1) }, { at: "00:30", from: "00:25", ease: "linear" }),
    kf(
      { orbitalPosition: 1 + 2 / (SOLAR_DAYS + 1), cameraDistance: zoomToDistance(60) },
      { at: "00:40", from: "00:36", ease: "linear" },
    ),
    kf({ orbitalPosition: 1 + pos(2) }, { at: "00:46", from: "00:44", ease: "linear" }),
    kf({ ...cam(0, 20, 10, 40) }, { at: "00:52", from: "00:50", ease: "quadInOut" }),
    kf({ handsOff: true }, { at: "01:10", from: "00:50" }),
  ],
};

const elliptic: Chapter = {
  id: "elliptic-orbit",
  audioAliases: ["eccentric-orbit"],
  titleKey: "learn.chapters.elliptic",
  partKey: "learn.chapters.part_day",
  defaults: base({
    cameraTarget: "sun",
    meanSun: true,
    monthRing: true,
    siderealArc: false,
    meanArc: true,
    solarArc: true,
    ...cam(0, 20, 0.1, 20),
  }),
  frames: [
    kf(
      {
        orbitalPosition: pos(5),
        meanSun: false,
        meanArc: false,
        meanClock: false,
        degrees: false,
        monthRing: false,
      },
      { at: 1, duration: 1 },
    ),
    kf({ ...cam(0, 0, 20, 20) }, { at: "00:07", from: "00:05", ease: "quadInOut" }),
    kf({ ...cam(0, 20, 0.1, 20) }, { at: "00:10", from: "00:08", ease: "quadInOut" }),
    kf({ orbitalPosition: 1 + PERIHELION / PI2 }, { at: "00:20", from: 1, ease: "linear" }),
    kf({ eccentricity: 0.4 }, { at: "23s", duration: "1s", ease: "quadInOut" }),
    kf({ eccentricity: 0 }, { at: "24s", duration: "1s", ease: "quadInOut" }),
    kf({ tiltDeg: 30 }, { at: "25s", duration: "1s", ease: "quadInOut" }),
    kf({ tiltDeg: 0 }, { at: "26s", duration: "1s", ease: "quadInOut" }),
    kf({ eccentricity: 0.5 }, { at: "00:38", duration: "2s", ease: "quadInOut" }),
    kf({ highlightControl: "settings" }, { at: "39s", duration: 1 }),
    kf({ highlightControl: "" }, { at: "44s", duration: 1 }),
    kf({ orbitalPosition: 12.15 }, { at: "02:40", from: "00:43", ease: "linear" }),
    kf({ cameraTarget: "planet", highlight: "solar-clock" }, { at: "01:21", duration: 1 }),
    kf(
      { highlight: "", trueSun: false, planetOrbit: false },
      { at: "01:25", duration: 1 },
    ),
    kf({ cameraDistance: zoomToDistance(40) }, { at: "01:30", duration: "6s", ease: "quadInOut" }),
    /* The mean arc arrives on its own, and the true Sun's goes: this is the
       beat where the two are being compared, so only one is drawn. The mean
       *Sun* does not appear until 02:44 — that is a separate beat, and turning
       it on early gave the reader the answer before the question. */
    kf(
      {
        meanArc: true,
        meanClock: true,
        solarArc: false,
        solarClock: false,
        highlight: "mean-day-arc",
      },
      { at: "02:11", duration: 1 },
    ),
    kf({ highlight: "" }, { at: "02:15", duration: 1 }),
    kf({ cameraDistance: zoomToDistance(30) }, { at: "02:29", duration: "6s", ease: "quadInOut" }),
    kf({ trueSun: true, planetOrbit: true }, { at: "02:26", duration: 1 }),
    kf({ meanSun: true, trueSun: false }, { at: "02:44", duration: 1 }),
    kf({ orbitalPosition: 13 + pos(0) }, { at: "03:02", from: "02:52", ease: "linear" }),
    kf({ trueSun: true, solarArc: true, solarClock: true }, { at: "03:02", duration: 1 }),
    kf({ eccentricity: 0 }, { at: "03:10", duration: "1s", ease: "quadInOut" }),
    kf({ eccentricity: 0.5 }, { at: "03:13", duration: "1s", ease: "quadInOut" }),
    kf({ orbitalPosition: 13 + pos(7, 0.5) }, { at: "03:26", from: "03:13", ease: "linear" }),
    kf({ eotWedge: true }, { at: "03:27", duration: 1 }),
    kf({ orbitalPosition: 13 + pos(7) }, { at: "03:39", from: "03:37", ease: "linear" }),
    kf(
      { orbitalPosition: 14 + pos(2), cameraDistance: zoomToDistance(20) },
      { at: "03:52", from: "03:49", ease: "quadInOut" },
    ),
    kf({ graphOpen: true }, { at: "04:03", duration: 1 }),
    kf({ handsOff: true }, { at: "04:38", from: "04:00" }),
  ],
};

const axial: Chapter = {
  id: "axial-tilt",
  titleKey: "learn.chapters.axial",
  partKey: "learn.chapters.part_day",
  defaults: base({
    meanSun: true,
    monthRing: true,
    siderealArc: false,
    meanArc: true,
    solarArc: true,
    axis: true,
    ...cam(0, 20, 0.1, 20),
  }),
  frames: [
    kf(
      { orbitalPosition: 0, solarArc: true, meanArc: true, solarClock: false, meanClock: false },
      { at: 1, duration: 1 },
    ),
    kf({ ...cam(0, 0, 20, 20) }, { at: "00:05", duration: "4s", ease: "quadInOut" }),
    kf({ tiltDeg: 40, axis: true }, { at: "00:07", duration: "2s", ease: "quadInOut" }),
    kf({ cameraTarget: "meanSun" }, { at: "00:20", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "00:34", from: "00:24", ease: "linear" }),
    kf({ ...cam(0, 10, 40, 20) }, { at: "00:38", duration: "2s", ease: "quadInOut" }),
    kf({ orbitalPosition: 1.45 }, { at: "52s", from: "00:50", ease: "quadInOut" }),
    kf({ orbitalPosition: 1.22, grid: true }, { at: "01:00", duration: "2s", ease: "quadInOut" }),
    kf({ orbitalPosition: 1.72 }, { at: "01:09", duration: "2s", ease: "quadInOut" }),
    kf(
      { eotWedge: true, ...cam(0, 20, 40, 40), grid: false },
      { at: "01:13", duration: "2s", ease: "quadInOut" },
    ),
    kf({ orbitalPosition: 2 + pos(6) }, { at: "01:30", from: "01:10", ease: "linear" }),
    kf({ ...cam(0, 40, 0.1, 40) }, { at: "01:36", duration: "2s", ease: "quadInOut" }),
    kf({ cameraTarget: "planet" }, { at: "01:38", duration: 1 }),
    kf({ orbitalPosition: 2 + pos(7) }, { at: "01:46", from: "01:42", ease: "linear" }),
    kf({ planetOrbit: false, sunOrbit: true }, { at: "01:52", duration: 1 }),
    kf({ orbitalPosition: 4 }, { at: "02:25", from: "01:57", ease: "linear" }),
    kf({ ...cam(0, 20, 40, 40) }, { at: "02:00", duration: "2s", ease: "quadInOut" }),
    kf({ ...cam(0, 40, 0.1, 40) }, { at: "02:31", duration: "2s", ease: "quadInOut" }),
    kf({ orbitalPosition: 4.1 }, { at: "02:35", from: "02:30", ease: "linear" }),
    kf({ ...cam(0, 0, 40, 40) }, { at: "02:38", duration: "1s", ease: "quadInOut" }),
    kf({ orbitalPosition: 4.3 }, { at: "02:44", from: "02:35", ease: "quadInOut" }),
    kf({ ...cam(0, 40, 0.1, 40) }, { at: "02:44", duration: "1s", ease: "quadInOut" }),
    kf({ ...cam(0.2, 40, 0.1, 40) }, { at: "02:49", duration: "3s", ease: "quadInOut" }),
    kf({ orbitalPosition: 4 + pos(3, 0, 40 * (Math.PI / 180)) }, { at: "02:54", from: "02:49", ease: "quadInOut" }),
    kf({ ...cam(40, 0.1, 0.1, 40) }, { at: "03:03", duration: "2s", ease: "quadInOut" }),
    kf({ orbitalPosition: 4 + pos(5, 0, 40 * (Math.PI / 180)) }, { at: "03:10", from: "03:04", ease: "quadInOut" }),
    kf({ ...cam(0.2, 40, 0.1, 40) }, { at: "03:10", duration: "2s", ease: "quadInOut" }),
    kf({ solarClock: true, meanClock: true }, { at: "03:20", duration: 1 }),
    kf({ handsOff: true }, { at: "03:31", from: "03:20" }),
  ],
};

const reality: Chapter = {
  id: "reality",
  titleKey: "learn.chapters.reality",
  partKey: "learn.chapters.part_day",
  defaults: base({
    cameraTarget: "meanSun",
    meanSun: true,
    monthRing: true,
    siderealArc: false,
    meanArc: true,
    solarArc: true,
    ...cam(0, 20, 20, 20),
  }),
  frames: [
    kf(
      { orbitalPosition: 0, solarClock: false, meanClock: false },
      { at: 1, duration: 1 },
    ),
    kf({ eccentricity: 0.0167, eotWedge: true }, { at: "00:18", duration: "1s", ease: "quadInOut" }),
    kf({ tiltDeg: 23.439, axis: true }, { at: "00:21", duration: "1s", ease: "quadInOut" }),
    kf({ graphOpen: true }, { at: "00:26", duration: 1 }),
    kf({ orbitalPosition: 2 + 356 / 365 }, { at: "00:40", from: 1, ease: "linear" }),
    kf(
      { ...cam(20, 30, 0.1, 30), cameraFollow: true },
      { at: "00:43", duration: "2s", ease: "quadInOut" },
    ),
    kf({ orbitalPosition: 3 + 356 / 365 }, { at: "01:08", from: "00:42", ease: "linear" }),
    kf({ orbitalPosition: 3 + 259 / 365 }, { at: "01:15", duration: "4s", ease: "quadInOut" }),
    kf({ cameraFollow: false }, { at: "01:21", duration: 1 }),
    kf({ ...cam(0.1, 30, 20, 20) }, { at: "01:22", duration: "1s", ease: "quadInOut" }),
    kf({ orbitalPosition: 5 }, { at: "02:00", from: "01:20", ease: "linear" }),
    kf({ graphOpen: false }, { at: "02:00", duration: 1 }),
    kf({ cameraFollow: true }, { at: "02:03", duration: 1 }),
    /* `solarDaysPerYear: 0` stops the spin dead — the original's `daysPerYear:
       0`. The subject for the next minute is the shape of the orbit, and a
       globe turning nine times across it is a strobe over the top of that. The
       two faces are already off, so nothing is left reading a frozen clock. */
    kf(
      { ...cam(20, 0.1, 0.1, 40), planetOrbit: false, eotWedge: false, solarDaysPerYear: 0 },
      { at: "02:07", duration: "2s", ease: "quadInOut" },
    ),
    kf({ orbitalPosition: 8 }, { at: "02:39", from: "02:12", ease: "linear" }),
    kf({ eccentricity: 0.0934, tiltDeg: 25.19, planet: "mars" }, { at: "02:42", duration: "1s" }),
    kf({ orbitalPosition: 10 }, { at: "03:00", from: "02:42", ease: "linear" }),
    kf(
      {
        ...cam(0, 30, 20, 30),
        cameraFollow: false,
        planetOrbit: true,
        eotWedge: true,
        planet: "earth",
        eccentricity: 0.0167,
        tiltDeg: 23.439,
        solarDaysPerYear: SOLAR_DAYS,
        solarClock: true,
        meanClock: true,
      },
      { at: "03:02", duration: "2s", ease: "quadInOut" },
    ),
    kf({ handsOff: true }, { at: "03:45", from: "03:02" }),
  ],
};

/**
 * The original lab's own `/playground` — free camera, no snap-back.
 *
 * Kept for a track that stops at the day. The full syllabus ends on the
 * calendar half's free stop instead, which opens with the belts and the Moon
 * already showing because by then they have all been introduced.
 */
export const DAY_PLAYGROUND: Chapter = {
  id: "playground",
  titleKey: "learn.chapters.playground",
  partKey: "learn.chapters.part_free",
  free: true,
  defaults: base({
    handsOff: true,
    orbitalPosition: 1,
    solarDaysPerYear: 9,
    eccentricity: 0.0167,
    tiltDeg: 23.439,
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    meanSun: true,
    eotWedge: true,
    siderealArc: false,
    solarArc: true,
    meanArc: true,
    primeMeridian: true,
    ...cam(0, 20, 0.1, 20),
  }),
  frames: [],
};

/** The ported chapters, in order. The free stop is composed on separately. */
export const DAY_CHAPTERS: Chapter[] = [welcome, stellar, solar, elliptic, axial, reality];
