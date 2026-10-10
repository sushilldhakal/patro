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
 * real one and let the spin blur. The globe's rotation stopped being the
 * subject the moment the day was finished.
 *
 * **The overlay carries what the sim cannot.** A week is seven days because of
 * the होरा cycle, not because of any geometry; precession takes 25,772 years,
 * which no orbit animation can show. Both already have a diagram in the Learn
 * library, so those chapters raise it over the scene rather than pretending the
 * 3D view is making the point. See `overlay` in {@link ./chapter-kit}.
 *
 * **Timings are placeholders for narration.** Each chapter is cut into beats at
 * round seconds with the durations a script would want. Record over them and
 * retime here; the player locks to the audio the moment a file exists at the
 * path {@link ./chapter-kit#chapterAudioSources} names.
 */

import { solarMonthStarts } from "@/lib/sky3d/day-mechanics";
import { cam, chapterState, kf, type Chapter } from "./chapter-kit";

/** The real year. Everything in this half is measured against it. */
const SOLAR_DAYS = 365;
const DPY = SOLAR_DAYS + 1;
const E = 0.0167;
const TILT = 23.439;

/** One solar day, as a fraction of the orbit the tour drives. */
const DAY = 1 / DPY;

/**
 * Orbital position at the सङ्क्रान्ति that opens month `k` (0 = मेष / बैशाख).
 *
 * Not `k / 12`. A बिक्रम month is 30° of the Sun's *travel*, and the Sun does
 * not travel evenly, so these boundaries land 29 to 32 days apart — which is
 * the whole subject of the महिना chapter. Asking the same function the सङ्क्रान्ति
 * engine asks is what keeps the animation honest about it.
 */
const MONTH = solarMonthStarts(E).map((d) => d / SOLAR_DAYS);

/** Day of the year month `k` opens, rounded — for writing beats against. */
export const MONTH_DAY = solarMonthStarts(E).map((d) => Math.round(d));

function base(partial: Parameters<typeof chapterState>[0] = {}) {
  return chapterState({
    solarDaysPerYear: SOLAR_DAYS,
    eccentricity: E,
    tiltDeg: TILT,
    ...partial,
  });
}

/* ── वार · the week ───────────────────────────────────────────────────── */

/**
 * Seven days — and the admission that seven is not an astronomical number.
 *
 * The scene shows what a week *is*: the globe turning seven times while the
 * Moon covers a quarter of its round, which is where the length came from. The
 * हो­रा diagram over it shows where the *order* came from — 24 hours dealt out
 * round the seven ग्रह in speed order, landing three seats along each dawn.
 * Neither half is the whole answer, which is why both are on screen.
 */
const week: Chapter = {
  id: "week",
  titleKey: "learn.chapters.week",
  partKey: "learn.chapters.part_week",
  defaults: base({
    cameraTarget: "planet",
    primeMeridian: true,
    /* No day-arcs. In a real 365-day year the extra turn is about one degree,
       so all three arcs are slivers sitting on top of each other — the day
       chapters had to shrink the year to eight days to make them readable.
       Here the meridian and the degree readout do the counting instead. */
    solarArc: false,
    meanArc: false,
    degrees: true,
    moon: true,
    axis: true,
    hud: false,
    ...cam(-6, 18, 26, 44),
  }),
  frames: [
    kf({ orbitalPosition: 0 }, { at: 1, duration: 1 }),
    /* Seven turns, one every four seconds — slow enough to count aloud. */
    kf({ orbitalPosition: 7 * DAY }, { at: "30s", from: "2s", ease: "linear" }),
    kf({ tip: "learn.chapters.tip_drag_earth" }, { at: "6s", duration: 1 }),
    kf({ tip: "" }, { at: "14s", duration: 1 }),
    kf({ moonTrail: true }, { at: "12s", duration: "1s" }),
    kf({ ...cam(-6, 30, 26, 30) }, { at: "20s", duration: "4s", ease: "quadInOut" }),
    /* Quarter of a lunation is 7.4 days: near enough that a quarter-Moon is
       what a week was originally counted to. */
    kf({ overlay: "hora-weekday-cycle" }, { at: "34s", duration: 1 }),
    kf({ orbitalPosition: 14 * DAY }, { at: "58s", from: "34s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:00", from: "50s" }),
  ],
};

/* ── महिना · the months ───────────────────────────────────────────────── */

/**
 * सङ्क्रान्ति to सङ्क्रान्ति — why a बिक्रम month is 29 to 32 days.
 *
 * The month ring and the राशि belt are the same twelve divisions seen twice:
 * बैशाख *is* मेष. The sightline reads which one the Sun is standing in, and
 * the corner readout names it, so a boundary crossing is something you watch
 * happen rather than something you are told about.
 */
const solarMonth: Chapter = {
  id: "solar-month",
  titleKey: "learn.chapters.solar_month",
  partKey: "learn.chapters.part_month",
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
    /* बैशाख: 31 days. Slowly, because this is the one boundary crossing the
       reader is being taught to recognise. */
    kf({ orbitalPosition: MONTH[1]! }, { at: "26s", from: "12s", ease: "linear" }),
    /* जेठ · असार — the long ones, near aphelion where the Sun crawls. */
    kf({ orbitalPosition: MONTH[3]! }, { at: "44s", from: "28s", ease: "linear" }),
    kf({ eccentricity: 0.35 }, { at: "50s", duration: "3s", ease: "quadInOut" }),
    kf({ eccentricity: E }, { at: "58s", duration: "3s", ease: "quadInOut" }),
    /* Round to पुष · माघ, the short ones, and on to the year's end. */
    kf({ orbitalPosition: MONTH[9]! }, { at: "01:26", from: "01:00", ease: "linear" }),
    kf({ orbitalPosition: 1 }, { at: "01:42", from: "01:28", ease: "linear" }),
    kf({ overlay: "solar-month-lengths" }, { at: "01:46", duration: 1 }),
    kf({ handsOff: true }, { at: "01:52", from: "01:46" }),
  ],
};

/**
 * The Moon's two months — 27.3 days round the sky, 29.5 from new moon to new.
 *
 * `moonLap` draws exactly that gap: one sidereal lap in one colour, and the
 * extra arc a synodic month still needs in another. It is the same shape as the
 * extra turn a solar day needed in the stellar chapter, one level up — which is
 * the point worth making, and why this chapter follows that one's camera.
 */
const lunarMonth: Chapter = {
  id: "lunar-month",
  titleKey: "learn.chapters.lunar_month",
  partKey: "learn.chapters.part_month",
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
    /* Past 27.3 days — the lap closes — and on to 29.5, where the phase does. */
    kf({ orbitalPosition: 30 * DAY }, { at: "01:00", from: "28s", ease: "linear" }),
    kf({ overlay: "lunar-solar-gap" }, { at: "01:04", duration: 1 }),
    kf({ orbitalPosition: 60 * DAY }, { at: "01:28", from: "01:06", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:32", from: "01:24" }),
  ],
};

/* ── वर्ष · the year ──────────────────────────────────────────────────── */

/**
 * 365 days, 366 turns — the stellar chapter's four minutes, banked for a year.
 *
 * The readings panel is open for this one. At this speed the three clock faces
 * are a blur, but the *gap* underneath each is not: the sidereal column climbs
 * steadily to a full 24h by the year's end, which is the extra turn arriving as
 * a number instead of as an argument.
 */
const year: Chapter = {
  id: "year",
  titleKey: "learn.chapters.year",
  partKey: "learn.chapters.part_year",
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

/**
 * Where the twelve राशि come from: one circle, cut in twelve.
 *
 * Nothing about the belt is arbitrary except the number. The *plane* is the
 * Sun's own road — turn the tilt up and watch the belt lean away from the
 * equator, which is the reason the two zero points of the zodiac disagree at
 * all — and the divisions are equal 30° steps from a fixed start.
 */
const rashiBelt: Chapter = {
  id: "rashi-belt",
  titleKey: "learn.chapters.rashi_belt",
  partKey: "learn.chapters.part_belts",
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
    /* The plate for the division the year opens in — the belt's names are
       pictures in the sky before they are arcs on a diagram. */
    kf(
      { still: "illustrations/aries.png", stillKey: "learn.chapters.still_mesha" },
      { at: "16s", duration: 1 },
    ),
    kf({ still: "" }, { at: "30s", duration: 1 }),
    /* Down onto the plane: the belt is a ring in space, not a band on a chart. */
    kf({ ...cam(0, 8, 40, 13) }, { at: "24s", duration: "4s", ease: "quadInOut" }),
    kf({ orbitalPosition: MONTH[3]! }, { at: "40s", from: "20s", ease: "linear" }),
    kf({ ...cam(0, 40, 14, 12) }, { at: "44s", duration: "3s", ease: "quadInOut" }),
    kf({ monthRing: true }, { at: "50s", duration: "1s" }),
    kf({ orbitalPosition: 1 }, { at: "01:20", from: "48s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

/**
 * The same circle, cut in twenty-seven — and why that number, not twelve.
 *
 * A नक्षत्र is a day's travel for the *Moon*, the way a राशि is a month's for
 * the Sun: 27 divisions because the Moon crosses one a night. So this chapter
 * hangs the sightline on the Moon rather than the Sun, which is also how a
 * पञ्चाङ्ग names the नक्षत्र of a date.
 */
const nakshatraBelt: Chapter = {
  id: "nakshatra-belt",
  titleKey: "learn.chapters.nakshatra_belt",
  partKey: "learn.chapters.part_belts",
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
    kf(
      { still: "illustrations/mRgashIrSha.png", stillKey: "learn.chapters.still_mrigashira" },
      { at: "22s", duration: 1 },
    ),
    kf({ still: "" }, { at: "40s", duration: 1 }),
    /* One night per नक्षत्र: 27 of them in a sidereal month. */
    kf({ orbitalPosition: 14 * DAY }, { at: "48s", from: "20s", ease: "linear" }),
    kf({ rashiBelt: false }, { at: "52s", duration: "1s" }),
    kf({ orbitalPosition: 28 * DAY }, { at: "01:20", from: "52s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

/* ── ध्रुव तारा · the pole star ───────────────────────────────────────── */

/**
 * The one motion this scene cannot animate, and how we know about it anyway.
 *
 * A year of orbit is thirty seconds here; a precession cycle is 25,772 years,
 * so at the same rate it would take nine days to watch. What the sim *can*
 * show is the geometry the drift acts on — a tilted axis, a spinning top's
 * worth of lean against the belt's own plane — and the cone diagram over it
 * carries the 25,772 years, the ध्रुव तारा's turn in the seat, and the equinox
 * sliding through the राशि that makes the अयनांश the engine actually applies.
 */
const poleStar: Chapter = {
  id: "pole-star",
  titleKey: "learn.chapters.pole_star",
  partKey: "learn.chapters.part_pole",
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
    /* The lean, exaggerated and returned — a top's wobble is about the axis
       staying tilted while the direction it leans in goes round. */
    kf({ tiltDeg: 45 }, { at: "24s", duration: "3s", ease: "quadInOut" }),
    kf({ tiltDeg: TILT }, { at: "30s", duration: "3s", ease: "quadInOut" }),
    kf({ orbitalPosition: 0.5 }, { at: "48s", from: "32s", ease: "linear" }),
    /* How anyone knew, before instruments: सप्तर्षि point at the pole, and the
       शिंशुमार coiled round it held the seat four thousand years earlier. */
    kf(
      { still: "illustrations/ursa-major.png", stillKey: "learn.chapters.still_saptarshi" },
      { at: "36s", duration: 1 },
    ),
    kf(
      { still: "illustrations/shimshumAra.png", stillKey: "learn.chapters.still_shishumara" },
      { at: "50s", duration: 1 },
    ),
    kf({ overlay: "precession-cone" }, { at: "52s", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "01:20", from: "54s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:26", from: "01:18" }),
  ],
};

/* ── पञ्चाङ्ग · what the engine actually computes ─────────────────────── */

/**
 * तिथि — the Moon pulling away from the Sun, twelve degrees at a time.
 *
 * This is the first limb that is not a position but a *difference*: the angle
 * between where the Moon is and where the Sun is, cut in thirty. Both
 * sightlines are lit for exactly that reason — the तिथि is the gap between
 * them, so both have to be on screen before the gap means anything.
 *
 * And because the Moon's speed is not constant, the gap does not open evenly:
 * a तिथि runs anywhere from about 20 to 27 hours, which is why one can swallow
 * two sunrises or none at all. That is the क्षय / वृद्धि the engine spends most
 * of its care on.
 */
const tithi: Chapter = {
  id: "tithi",
  titleKey: "learn.chapters.tithi",
  partKey: "learn.chapters.part_panchanga",
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
    /* अमावस्या: both sightlines on one bearing, and no gap at all yet. */
    kf({ orbitalPosition: 0, sightline: false, moonSightline: false }, { at: 1, duration: 1 }),
    kf({ sightline: true }, { at: "8s", duration: "1s" }),
    kf({ moonSightline: true }, { at: "12s", duration: "1s" }),
    kf({ overlay: "tithi-elongation" }, { at: "18s", duration: 1 }),
    /* Out to पूर्णिमा — fifteen तिथि, the two sightlines opposite. */
    kf({ orbitalPosition: 15 * DAY }, { at: "52s", from: "20s", ease: "linear" }),
    kf({ tip: "learn.chapters.tip_scrub" }, { at: "56s", duration: 1 }),
    kf({ tip: "" }, { at: "01:04", duration: 1 }),
    kf({ orbitalPosition: 30 * DAY }, { at: "01:24", from: "56s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:30", from: "01:22" }),
  ],
};

/**
 * पक्ष — the same lunation, read as a shape in the sky.
 *
 * A तिथि is an angle; a phase is what that angle looks like from the ground.
 * शुक्ल पक्ष is the fifteen where the lit side is growing, कृष्ण पक्ष the
 * fifteen where it is going. The scene carries the geometry and the phase strip
 * carries the view, which is the honest division of labour — this camera is
 * above the orbit, and nobody sees the Moon from there.
 */
const paksha: Chapter = {
  id: "paksha",
  titleKey: "learn.chapters.paksha",
  partKey: "learn.chapters.part_panchanga",
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

/**
 * अधिक मास — twelve lunations do not fill a solar year.
 *
 * Twelve synodic months are about 354 days and the solar year is 365, so the
 * lunar count falls eleven days behind every year and, roughly every third one,
 * a whole month has to be inserted to stop the festivals walking out of their
 * seasons. Both clocks are on screen at once here — the महिना ring, which is
 * the *solar* count, and the Moon's own laps beside it — because the mismatch
 * between exactly those two is the entire reason the extra month exists.
 */
const adhikMaas: Chapter = {
  id: "adhik-maas",
  titleKey: "learn.chapters.adhik_maas",
  partKey: "learn.chapters.part_panchanga",
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
    /* Six solar months against a bit over six lunations — the drift is
       already half a month by here. */
    kf({ orbitalPosition: MONTH[6]! }, { at: "50s", from: "14s", ease: "linear" }),
    kf({ overlay: "adhik-maas" }, { at: "54s", duration: 1 }),
    kf({ orbitalPosition: 1 }, { at: "01:26", from: "56s", ease: "linear" }),
    kf({ handsOff: true }, { at: "01:32", from: "01:24" }),
  ],
};

/**
 * The five limbs, and where each one has already been seen.
 *
 * Nothing new is introduced. Every layer the tour has turned on comes back at
 * once, and the hierarchy diagram names the five things a पञ्चाङ्ग is: तिथि
 * from the Moon–Sun gap, वार from the count of days, नक्षत्र from the Moon
 * against the belt, and योग and करण from arithmetic on the first two. That last
 * pair is the only part of the almanac this scene never shows directly — they
 * are sums, not places — which is worth saying out loud rather than staging.
 */
const fiveLimbs: Chapter = {
  id: "five-limbs",
  titleKey: "learn.chapters.five_limbs",
  partKey: "learn.chapters.part_panchanga",
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
    kf({ tip: "learn.chapters.tip_layers" }, { at: "52s", duration: 1 }),
    kf({ tip: "" }, { at: "01:00", duration: 1 }),
    kf({ handsOff: true }, { at: "01:06", from: "50s" }),
  ],
};

/* ── the free stop ───────────────────────────────────────────────────── */

/**
 * Everything on, nothing driving — the original lab's `/playground`.
 *
 * It opens on the real year rather than the toy one, with both belts and the
 * Moon showing, because by the time a reader arrives here every one of those
 * has been introduced and taking them away again would be the odd choice.
 */
const playground: Chapter = {
  id: "playground",
  titleKey: "learn.chapters.playground",
  partKey: "learn.chapters.part_free",
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
