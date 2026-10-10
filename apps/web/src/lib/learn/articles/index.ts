import type { ArticleData } from "@vedic-patro/domain/learn/article-schema";

import { bikramSambat } from "@vedic-patro/domain/learn/articles/foundation/bikram-sambat";
import { bsAdOffset } from "@vedic-patro/domain/learn/articles/foundation/bs-ad-offset";
import { bsCalendar } from "@vedic-patro/domain/learn/articles/foundation/bs-calendar";
import { bsVsAd } from "@vedic-patro/domain/learn/articles/foundation/bs-vs-ad";
import { chandramana } from "@vedic-patro/domain/learn/articles/foundation/chandramana";
import { nepaliCalendarBasics } from "@vedic-patro/domain/learn/articles/foundation/nepali-calendar-basics";
import { sauramana } from "@vedic-patro/domain/learn/articles/foundation/sauramana";
import { whatIsADay } from "@vedic-patro/domain/learn/articles/foundation/what-is-a-day";
import { whyLocationMatters } from "@vedic-patro/domain/learn/articles/foundation/why-location-matters";
import { yearBeginsBaisakh } from "@vedic-patro/domain/learn/articles/foundation/year-begins-baisakh";

import { amavasyaPurnima } from "@vedic-patro/domain/learn/articles/moon/amavasya-purnima";
import { adhikKshayaMaas } from "@vedic-patro/domain/learn/articles/moon/adhik-kshaya-maas";
import { lunarMonth } from "@vedic-patro/domain/learn/articles/moon/lunar-month";
import { lunarSolarDrift } from "@vedic-patro/domain/learn/articles/moon/lunar-solar-drift";
import { moonLunarCalendar } from "@vedic-patro/domain/learn/articles/moon/moon-lunar-calendar";
import { shuklaKrishnaPaksha } from "@vedic-patro/domain/learn/articles/moon/shukla-krishna-paksha";
import { tithiNot24Hours } from "@vedic-patro/domain/learn/articles/moon/tithi-not-24-hours";

import { karkaSankranti } from "@vedic-patro/domain/learn/articles/sun/karka-sankranti";
import { makaraSankranti } from "@vedic-patro/domain/learn/articles/sun/makara-sankranti";
import { meshaSankranti } from "@vedic-patro/domain/learn/articles/sun/mesha-sankranti";
import { rashi } from "@vedic-patro/domain/learn/articles/sun/rashi";
import { siderealVsTropical } from "@vedic-patro/domain/learn/articles/sun/sidereal-vs-tropical";
import { solarYear } from "@vedic-patro/domain/learn/articles/sun/solar-year";
import { uttarayanaDakshinayana } from "@vedic-patro/domain/learn/articles/sun/uttarayana-dakshinayana";

import { fiveLimbsTogether } from "@vedic-patro/domain/learn/articles/five-limbs/five-limbs-together";
import { vara } from "@vedic-patro/domain/learn/articles/five-limbs/vara";

import { eclipseSeasons } from "@vedic-patro/domain/learn/articles/eclipses/eclipse-seasons";
import { rahuKetuNodes } from "@vedic-patro/domain/learn/articles/eclipses/rahu-ketu-nodes";

import { ancientSky } from "@vedic-patro/domain/learn/articles/astronomy/ancient-sky";
import { axialTilt } from "@vedic-patro/domain/learn/articles/astronomy/axial-tilt";
import { declination } from "@vedic-patro/domain/learn/articles/astronomy/declination";
import { equinoxSolstice } from "@vedic-patro/domain/learn/articles/astronomy/equinox-solstice";
import { earthRotationDay } from "@vedic-patro/domain/learn/articles/astronomy/earth-rotation-day";
import { lunarLongitude } from "@vedic-patro/domain/learn/articles/astronomy/lunar-longitude";
import { poleStarChanges } from "@vedic-patro/domain/learn/articles/astronomy/pole-star-changes";
import { precession } from "@vedic-patro/domain/learn/articles/astronomy/precession";
import { siderealTime } from "@vedic-patro/domain/learn/articles/astronomy/sidereal-time";
import { solarLongitude } from "@vedic-patro/domain/learn/articles/astronomy/solar-longitude";
import { whySeasons } from "@vedic-patro/domain/learn/articles/astronomy/why-seasons";

import { calcKarana } from "@vedic-patro/domain/learn/articles/calculation/calc-karana";
import { calcMoonrise } from "./calculation/calc-moonrise";
import { calcNakshatra } from "@vedic-patro/domain/learn/articles/calculation/calc-nakshatra";
import { calcSankranti } from "@vedic-patro/domain/learn/articles/calculation/calc-sankranti";
import { calcSunrise } from "@vedic-patro/domain/learn/articles/calculation/calc-sunrise";
import { calcSunset } from "@vedic-patro/domain/learn/articles/calculation/calc-sunset";
import { calcTithi } from "@vedic-patro/domain/learn/articles/calculation/calc-tithi";
import { calcYoga } from "@vedic-patro/domain/learn/articles/calculation/calc-yoga";
import { locationDifferentResults } from "@vedic-patro/domain/learn/articles/calculation/location-different-results";
import { timeScales } from "@vedic-patro/domain/learn/articles/calculation/time-scales";

import { ancientCalendars } from "@vedic-patro/domain/learn/articles/comparison/ancient-calendars";
import { calendarDrift } from "@vedic-patro/domain/learn/articles/comparison/calendar-drift";
import { calendarsAlignedWithNature } from "@vedic-patro/domain/learn/articles/comparison/calendars-aligned-with-nature";
import { leapYears } from "@vedic-patro/domain/learn/articles/comparison/leap-years";

import { ancientPlanetaryMotion } from "@vedic-patro/domain/learn/articles/deeper/ancient-planetary-motion";
import { celestialEquator } from "@vedic-patro/domain/learn/articles/deeper/celestial-equator";
import { celestialSphere } from "@vedic-patro/domain/learn/articles/deeper/celestial-sphere";
import { ecliptic } from "@vedic-patro/domain/learn/articles/deeper/ecliptic";
import { geocentricHeliocentric } from "@vedic-patro/domain/learn/articles/deeper/geocentric-heliocentric";
import { meanVsTrueMotion } from "@vedic-patro/domain/learn/articles/deeper/mean-vs-true-motion";
import { retrogradeMotion } from "@vedic-patro/domain/learn/articles/deeper/retrograde-motion";
import { rightAscension } from "@vedic-patro/domain/learn/articles/deeper/right-ascension";
import { skyRotation } from "@vedic-patro/domain/learn/articles/deeper/sky-rotation";
import { zodiacBelt } from "@vedic-patro/domain/learn/articles/deeper/zodiac-belt";

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
