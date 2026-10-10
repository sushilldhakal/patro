/**
 * The calendar half of the tour: वार, महिना, वर्ष, राशि, नक्षत्र, ध्रुव तारा.
 *
 * The ported Minute Labs chapters in {@link ./day-chapters} end having answered
 * one question — what a day is, and why one turn is not enough. These carry the
 * same scene onward to the units the पञ्चाङ्ग engine is actually built out of,
 * in the order they are built: seven days, then a month, then a year, then the
 * belt those months are cut from, then the one slow drift underneath all of it.
 *
 * Three things about how they are written.
 *
 * **Real numbers, not the toy year.** The day chapters run an eight-day year so
 * the extra turn is enormous and visible. Nothing here can: a month that is
 * 29 to 32 days long only has those lengths in a 365-day year, so these run the
 * real one and let the spin blur.
 *
 * **The overlay carries what the sim cannot.** A week is seven days because of
 * the होरा cycle, not because of any geometry; precession takes 25,772 years,
 * which no orbit animation can show. Both already have a diagram in the Learn
 * library, so those chapters raise it over the scene. See `overlay` in
 * {@link ./chapter-kit}.
 *
 * **Timings are placeholders for narration.** Each chapter is cut into beats at
 * round seconds with the durations a script would want.
 */

import { solarMonthStarts } from "@/lib/sky3d/day-mechanics";
import { cam, chapterState, kf, type Chapter } from "./chapter-kit";

/** The real year. Everything in this half is measured against it. */
const SOLAR_DAYS = 365;
const E = 0.0167;
const TILT = 23.439;

/** One solar day, as a fraction of the orbit the tour drives. */
const DAY = 1 / (SOLAR_DAYS + 1);

/**
 * Orbital position at the सङ्क्रान्ति that opens month `k` (0 = मेष / बैशाख).
 *
 * Not `k / 12`. A बिक्रम month is 30° of the Sun's *travel*, and the Sun does
 * not travel evenly, so these boundaries land 29 to 32 days apart.
 */
const MONTH = solarMonthStarts(E).map((d) => d / SOLAR_DAYS);

function base(partial: Parameters<typeof chapterState>[0] = {}) {
  return chapterState({
    solarDaysPerYear: SOLAR_DAYS,
    eccentricity: E,
    tiltDeg: TILT,
    ...partial,
  });
}

/* ── वार · the week ───────────────────────────────────────────────────── */

const week: Chapter = {
  id: "week",
  titleKey: "week",
  partKey: "part_week",
  defaults: base({
    cameraTarget: "planet",
    primeMeridian: true,
    solarArc: false,
    meanArc: false,
    moon: true,
    axis: true,
    hud: false,
    ...cam(-6, 18, 26, 44),
  }),
  frames: [
    kf({ orbitalPosition: 0 }, { at: 1, duration: 1 }),
    kf({ orbitalPosition: 7 * DAY }, { at: "30s", from: "2s", ease: "linear" }),
    kf({ tip: "tip_drag_earth" }, { at: "6s", duration: 1 }),
    kf({ tip: "" }, { at: "14s", duration: 1 }),
    kf({ moonTrail: true }, { at: "12s", duration: "1s" }),
    kf({ ...cam(-6, 30, 26, 30) }, { at: "20s", duration: "4s", ease: "quadInOut" }),
    kf({ overlay: "hora-weekday-cycle" }, { at: "34s", duration: 1 }),
    kf({ orbitalPosition: 14 * DAY }, { at: "58s", from: "34s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:00", from: "50s" }),
  ],
};

/* ── महिना · the months ───────────────────────────────────────────────── */

const solarMonth: Chapter = {
  id: "solar-month",
  titleKey: "solar_month",
  partKey: "part_month",
  defaults: base({
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    rashiBelt: true,
    monthRing: true,
    sightline: true,
    hud: true,
    solarArc: false,
    meanArc: false,
    primeMeridian: false,
    ...cam(0, 40, 12, 12),
  }),
  frames: [
    kf({ orbitalPosition: 0, monthRing: false, rashiBelt: false }, { at: 1, duration: 1 }),
    kf({ rashiBelt: true }, { at: "6s", duration: "1s" }),
    kf({ monthRing: true }, { at: "10s", duration: "1s" }),
    kf({ orbitalPosition: MONTH[1]! }, { at: "26s", from: "12s", ease: "linear" }),
    kf({ orbitalPosition: MONTH[3]! }, { at: "44s", from: "28s", ease: "linear" }),
    kf({ eccentricity: 0.35 }, { at: "50s", duration: "3s", ease: "quadInOut" }),
    kf({ eccentricity: E }, { at: "58s", duration: "3s", ease: "quadInOut" }),
    kf({ orbitalPosition: MONTH[9]! }, { at: "01:26", from: "01:00", ease: "linear" }),
    kf({ orbitalPosition: 1 }, { at: "01:42", from: "01:28", ease: "linear" }),
    kf({ overlay: "solar-month-lengths" }, { at: "01:46", duration: 1 }),
    kf({ handsOff: true }, { at: "01:52", from: "01:46" }),
  ],
};

const lunarMonth: Chapter = {
  id: "lunar-month",
  titleKey: "lunar_month",
  partKey: "part_month",
  defaults: base({
    cameraTarget: "planet",
    planetOrbit: true,
    trueSun: true,
    moon: true,
    nakshatraBelt: true,
    primeMeridian: false,
    hud: false,
    ...cam(0, 34, 16, 26),
  }),
  frames: [
    kf({ orbitalPosition: 0, nakshatraBelt: false }, { at: 1, duration: 1 }),
    kf({ moonTrail: true }, { at: "8s", duration: "1s" }),
    kf({ orbitalPosition: 14 * DAY }, { at: "24s", from: "4s", ease: "linear" }),
    kf({ nakshatraBelt: true, moonSightline: true }, { at: "26s", duration: "1s" }),
    kf({ moonLap: true }, { at: "34s", duration: "1s" }),
    kf({ orbitalPosition: 30 * DAY }, { at: "01:00", from: "28s", ease: "linear" }),
    kf({ overlay: "lunar-solar-gap" }, { at: "01:04", duration: 1 }),
    kf({ orbitalPosition: 60 * DAY }, { at: "01:28", from: "01:06", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:32", from: "01:24" }),
  ],
};

/* ── वर्ष · the year ──────────────────────────────────────────────────── */

const year: Chapter = {
  id: "year",
  titleKey: "year",
  partKey: "part_year",
  defaults: base({
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    meanSun: true,
    siderealArc: true,
    solarArc: true,
    meanArc: true,
    primeMeridian: true,
    axis: true,
    readings: true,
    hud: true,
    ...cam(0, 36, 18, 16),
  }),
  frames: [
    kf({ orbitalPosition: 0 }, { at: 1, duration: 1 }),
    kf({ orbitalPosition: 0.5 }, { at: "34s", from: "4s", ease: "linear" }),
    kf({ eotWedge: true, graphOpen: true }, { at: "38s", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "01:10", from: "40s", ease: "linear" }),
    kf({ graphOpen: false }, { at: "01:12", duration: 1 }),
    kf({ overlay: "year-length-ladder" }, { at: "01:16", duration: 1 }),
    kf({ handsOff: true }, { at: "01:24", from: "01:16" }),
  ],
};

/* ── राशि र नक्षत्र · the two belts ───────────────────────────────────── */

const rashiBelt: Chapter = {
  id: "rashi-belt",
  titleKey: "rashi_belt",
  partKey: "part_belts",
  defaults: base({
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    sightline: true,
    hud: true,
    primeMeridian: false,
    ...cam(0, 40, 14, 12),
  }),
  frames: [
    kf({ orbitalPosition: 0, rashiBelt: false, sightline: false }, { at: 1, duration: 1 }),
    kf({ sightline: true }, { at: "8s", duration: "1s" }),
    kf({ rashiBelt: true }, { at: "14s", duration: "1s" }),
    kf({ still: "illustrations/aries.png", stillKey: "still_mesha" }, { at: "16s", duration: 1 }),
    kf({ still: "" }, { at: "30s", duration: 1 }),
    kf({ ...cam(0, 8, 40, 13) }, { at: "24s", duration: "4s", ease: "quadInOut" }),
    kf({ orbitalPosition: MONTH[3]! }, { at: "40s", from: "20s", ease: "linear" }),
    kf({ ...cam(0, 40, 14, 12) }, { at: "44s", duration: "3s", ease: "quadInOut" }),
    kf({ monthRing: true }, { at: "50s", duration: "1s" }),
    kf({ orbitalPosition: 1 }, { at: "01:20", from: "48s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

const nakshatraBelt: Chapter = {
  id: "nakshatra-belt",
  titleKey: "nakshatra_belt",
  partKey: "part_belts",
  defaults: base({
    cameraTarget: "planet",
    planetOrbit: true,
    trueSun: true,
    rashiBelt: true,
    moon: true,
    primeMeridian: false,
    hud: false,
    ...cam(0, 38, 14, 18),
  }),
  frames: [
    kf({ orbitalPosition: 0, nakshatraBelt: false, moonSightline: false }, { at: 1, duration: 1 }),
    kf({ nakshatraBelt: true }, { at: "10s", duration: "1s" }),
    kf({ moonSightline: true }, { at: "18s", duration: "1s" }),
    kf({ still: "illustrations/mRgashIrSha.png", stillKey: "still_mrigashira" }, { at: "22s", duration: 1 }),
    kf({ still: "" }, { at: "40s", duration: 1 }),
    kf({ orbitalPosition: 14 * DAY }, { at: "48s", from: "20s", ease: "linear" }),
    kf({ rashiBelt: false }, { at: "52s", duration: "1s" }),
    kf({ orbitalPosition: 28 * DAY }, { at: "01:20", from: "52s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

/* ── ध्रुव तारा · the pole star ───────────────────────────────────────── */

const poleStar: Chapter = {
  id: "pole-star",
  titleKey: "pole_star",
  partKey: "part_pole",
  defaults: base({
    cameraTarget: "planet",
    planetOrbit: true,
    trueSun: true,
    rashiBelt: true,
    axis: true,
    grid: true,
    primeMeridian: false,
    hud: false,
    ...cam(0, 6, 40, 26),
  }),
  frames: [
    kf({ orbitalPosition: 0, grid: false, axis: false }, { at: 1, duration: 1 }),
    kf({ axis: true }, { at: "8s", duration: "1s" }),
    kf({ grid: true }, { at: "14s", duration: "1s" }),
    kf({ tiltDeg: 45 }, { at: "24s", duration: "3s", ease: "quadInOut" }),
    kf({ tiltDeg: TILT }, { at: "30s", duration: "3s", ease: "quadInOut" }),
    kf({ orbitalPosition: 0.5 }, { at: "48s", from: "32s", ease: "linear" }),
    kf({ still: "illustrations/ursa-major.png", stillKey: "still_saptarshi" }, { at: "36s", duration: 1 }),
    kf({ still: "illustrations/shimshumAra.png", stillKey: "still_shishumara" }, { at: "50s", duration: 1 }),
    kf({ overlay: "precession-cone" }, { at: "52s", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "01:20", from: "54s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

/* ── पञ्चाङ्ग · what the engine actually computes ─────────────────────── */

const tithi: Chapter = {
  id: "tithi",
  titleKey: "tithi",
  partKey: "part_panchanga",
  defaults: base({
    cameraTarget: "planet",
    planetOrbit: true,
    trueSun: true,
    moon: true,
    sightline: true,
    moonSightline: true,
    rashiBelt: true,
    primeMeridian: false,
    hud: false,
    ...cam(0, 36, 14, 22),
  }),
  frames: [
    kf({ orbitalPosition: 0, sightline: false, moonSightline: false }, { at: 1, duration: 1 }),
    kf({ sightline: true }, { at: "8s", duration: "1s" }),
    kf({ moonSightline: true }, { at: "12s", duration: "1s" }),
    kf({ overlay: "tithi-elongation" }, { at: "18s", duration: 1 }),
    kf({ orbitalPosition: 15 * DAY }, { at: "52s", from: "20s", ease: "linear" }),
    kf({ tip: "tip_scrub" }, { at: "56s", duration: 1 }),
    kf({ tip: "" }, { at: "01:04", duration: 1 }),
    kf({ orbitalPosition: 30 * DAY }, { at: "01:24", from: "56s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:30", from: "01:22" }),
  ],
};

const paksha: Chapter = {
  id: "paksha",
  titleKey: "paksha",
  partKey: "part_panchanga",
  defaults: base({
    cameraTarget: "planet",
    planetOrbit: true,
    trueSun: true,
    moon: true,
    moonTrail: true,
    sightline: true,
    moonSightline: true,
    primeMeridian: false,
    hud: false,
    ...cam(0, 30, 18, 24),
  }),
  frames: [
    kf({ orbitalPosition: 0 }, { at: 1, duration: 1 }),
    kf({ overlay: "moon-phases" }, { at: "10s", duration: 1 }),
    kf({ orbitalPosition: 15 * DAY }, { at: "44s", from: "12s", ease: "linear" }),
    kf({ orbitalPosition: 30 * DAY }, { at: "01:16", from: "46s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:22", from: "01:14" }),
  ],
};

const adhikMaas: Chapter = {
  id: "adhik-maas",
  titleKey: "adhik_maas",
  partKey: "part_panchanga",
  defaults: base({
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    rashiBelt: true,
    monthRing: true,
    sightline: true,
    moon: true,
    moonLap: true,
    hud: true,
    primeMeridian: false,
    ...cam(0, 40, 14, 12),
  }),
  frames: [
    kf({ orbitalPosition: 0, moonLap: false }, { at: 1, duration: 1 }),
    kf({ moonLap: true }, { at: "12s", duration: "1s" }),
    kf({ orbitalPosition: MONTH[6]! }, { at: "50s", from: "14s", ease: "linear" }),
    kf({ overlay: "adhik-maas" }, { at: "54s", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "01:26", from: "56s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:32", from: "01:24" }),
  ],
};

const fiveLimbs: Chapter = {
  id: "five-limbs",
  titleKey: "five_limbs",
  partKey: "part_panchanga",
  defaults: base({
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    meanSun: true,
    rashiBelt: true,
    nakshatraBelt: true,
    monthRing: true,
    sightline: true,
    moon: true,
    moonSightline: true,
    axis: true,
    hud: true,
    readings: true,
    primeMeridian: true,
    ...cam(0, 38, 16, 13),
  }),
  frames: [
    kf({ orbitalPosition: 0 }, { at: 1, duration: 1 }),
    kf({ overlay: "calendar-hierarchy" }, { at: "12s", duration: 1 }),
    kf({ orbitalPosition: MONTH[1]! }, { at: "48s", from: "14s", ease: "linear" }),
    kf({ tip: "tip_layers" }, { at: "52s", duration: 1 }),
    kf({ tip: "" }, { at: "01:00", duration: 1 }),
    kf({ handsOff: true }, { at: "01:06", from: "50s" }),
  ],
};

/* ── the free stop ───────────────────────────────────────────────────── */

const playground: Chapter = {
  id: "playground",
  titleKey: "playground",
  partKey: "part_free",
  free: true,
  defaults: base({
    handsOff: true,
    orbitalPosition: 0,
    cameraTarget: "meanSun",
    planetOrbit: true,
    trueSun: true,
    meanSun: true,
    eotWedge: true,
    siderealArc: false,
    solarArc: true,
    meanArc: true,
    primeMeridian: true,
    axis: true,
    rashiBelt: true,
    monthRing: true,
    sightline: true,
    moon: true,
    hud: true,
    readings: true,
    ...cam(0, 36, 18, 14),
  }),
  frames: [],
};

/** The calendar half, in order. Appended to the day tour by {@link ./chapter-tracks}. */
export const CALENDAR_CHAPTERS: Chapter[] = [
  week,
  solarMonth,
  lunarMonth,
  year,
  rashiBelt,
  nakshatraBelt,
  poleStar,
  tithi,
  paksha,
  adhikMaas,
  fiveLimbs,
];

export const FREE_PLAYGROUND: Chapter = playground;
