import type { ArticleData } from "../article-schema";

import { bikramSambat } from "./foundation/bikram-sambat";
import { bsAdOffset } from "./foundation/bs-ad-offset";
import { bsCalendar } from "./foundation/bs-calendar";
import { bsVsAd } from "./foundation/bs-vs-ad";
import { chandramana } from "./foundation/chandramana";
import { nepaliCalendarBasics } from "./foundation/nepali-calendar-basics";
import { sauramana } from "./foundation/sauramana";
import { whatIsADay } from "./foundation/what-is-a-day";
import { whyLocationMatters } from "./foundation/why-location-matters";
import { yearBeginsBaisakh } from "./foundation/year-begins-baisakh";

import { amavasyaPurnima } from "./moon/amavasya-purnima";
import { adhikKshayaMaas } from "./moon/adhik-kshaya-maas";
import { lunarMonth } from "./moon/lunar-month";
import { lunarSolarDrift } from "./moon/lunar-solar-drift";
import { moonLunarCalendar } from "./moon/moon-lunar-calendar";
import { shuklaKrishnaPaksha } from "./moon/shukla-krishna-paksha";
import { tithiNot24Hours } from "./moon/tithi-not-24-hours";

import { karkaSankranti } from "./sun/karka-sankranti";
import { makaraSankranti } from "./sun/makara-sankranti";
import { meshaSankranti } from "./sun/mesha-sankranti";
import { rashi } from "./sun/rashi";
import { siderealVsTropical } from "./sun/sidereal-vs-tropical";
import { solarYear } from "./sun/solar-year";
import { uttarayanaDakshinayana } from "./sun/uttarayana-dakshinayana";

import { fiveLimbsTogether } from "./five-limbs/five-limbs-together";
import { vara } from "./five-limbs/vara";

import { eclipseSeasons } from "./eclipses/eclipse-seasons";
import { rahuKetuNodes } from "./eclipses/rahu-ketu-nodes";

import { ancientSky } from "./astronomy/ancient-sky";
import { axialTilt } from "./astronomy/axial-tilt";
import { declination } from "./astronomy/declination";
import { equinoxSolstice } from "./astronomy/equinox-solstice";
import { earthRotationDay } from "./astronomy/earth-rotation-day";
import { lunarLongitude } from "./astronomy/lunar-longitude";
import { poleStarChanges } from "./astronomy/pole-star-changes";
import { precession } from "./astronomy/precession";
import { siderealTime } from "./astronomy/sidereal-time";
import { solarLongitude } from "./astronomy/solar-longitude";
import { whySeasons } from "./astronomy/why-seasons";

import { calcKarana } from "./calculation/calc-karana";
import { calcMoonrise } from "./calculation/calc-moonrise";
import { calcNakshatra } from "./calculation/calc-nakshatra";
import { calcSankranti } from "./calculation/calc-sankranti";
import { calcSunrise } from "./calculation/calc-sunrise";
import { calcSunset } from "./calculation/calc-sunset";
import { calcTithi } from "./calculation/calc-tithi";
import { calcYoga } from "./calculation/calc-yoga";
import { locationDifferentResults } from "./calculation/location-different-results";
import { timeScales } from "./calculation/time-scales";

import { ancientCalendars } from "./comparison/ancient-calendars";
import { calendarDrift } from "./comparison/calendar-drift";
import { calendarsAlignedWithNature } from "./comparison/calendars-aligned-with-nature";
import { leapYears } from "./comparison/leap-years";

import { ancientPlanetaryMotion } from "./deeper/ancient-planetary-motion";
import { celestialEquator } from "./deeper/celestial-equator";
import { celestialSphere } from "./deeper/celestial-sphere";
import { ecliptic } from "./deeper/ecliptic";
import { geocentricHeliocentric } from "./deeper/geocentric-heliocentric";
import { meanVsTrueMotion } from "./deeper/mean-vs-true-motion";
import { retrogradeMotion } from "./deeper/retrograde-motion";
import { rightAscension } from "./deeper/right-ascension";
import { skyRotation } from "./deeper/sky-rotation";
import { zodiacBelt } from "./deeper/zodiac-belt";

/**
 * Every data-driven article body, keyed by slug.
 *
 * Articles still written as React components live in `learn-articles.tsx` and
 * are wired up in `learn-topics.tsx`; both kinds render inside the same shell,
 * so an old article can be converted to data one at a time.
 */
const ALL: ArticleData[] = [
  /* Foundation */
  nepaliCalendarBasics,
  bikramSambat,
  bsCalendar,
  yearBeginsBaisakh,
  bsVsAd,
  bsAdOffset,
  sauramana,
  chandramana,
  whyLocationMatters,
  whatIsADay,

  /* The Moon */
  tithiNot24Hours,
  shuklaKrishnaPaksha,
  amavasyaPurnima,
  lunarMonth,
  moonLunarCalendar,
  lunarSolarDrift,
  adhikKshayaMaas,

  /* The Sun */
  solarYear,
  rashi,
  meshaSankranti,
  makaraSankranti,
  karkaSankranti,
  uttarayanaDakshinayana,
  siderealVsTropical,

  /* The Five Limbs */
  vara,
  fiveLimbsTogether,

  /* Eclipses */
  rahuKetuNodes,
  eclipseSeasons,

  /* Astronomy behind the calendar */
  earthRotationDay,
  axialTilt,
  whySeasons,
  equinoxSolstice,
  precession,
  poleStarChanges,
  ancientSky,
  siderealTime,
  solarLongitude,
  lunarLongitude,
  declination,

  /* How a date is calculated */
  calcSunrise,
  calcSunset,
  calcSankranti,
  calcTithi,
  calcNakshatra,
  calcYoga,
  calcKarana,
  calcMoonrise,
  locationDifferentResults,
  timeScales,

  /* Calendar comparison */
  leapYears,
  calendarDrift,
  calendarsAlignedWithNature,
  ancientCalendars,

  /* Deeper knowledge */
  ancientPlanetaryMotion,
  meanVsTrueMotion,
  retrogradeMotion,
  geocentricHeliocentric,
  celestialSphere,
  ecliptic,
  celestialEquator,
  rightAscension,
  zodiacBelt,
  skyRotation,
];

export const DATA_ARTICLES: Record<string, ArticleData | undefined> = Object.fromEntries(
  ALL.map((article) => [article.slug, article]),
);
