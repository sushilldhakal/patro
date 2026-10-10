/**
 * Diagram slots available to data-driven articles.
 *
 * An article body references a visual by id (`{ kind: "diagram", id: "tithi-elongation" }`)
 * rather than importing a component, which keeps article files free of JSX and
 * gives one place to swap an implementation. Three.js scenes can be registered
 * here later without touching a single article.
 */

import { ElongationStudy } from "@/components/tithi-mechanics/TithiMechanics";
import {
  AdhikMassDiagram,
  SunriseTimeline,
} from "@/components/tithi-mechanics/tithi-mechanics-diagrams";
import { AyanamshaWheel } from "@/components/learn/AyanamshaWheel";
import {
  EclipticBeltStudy,  PrecessionSkyStudy,
} from "@/components/learn/ComputationSkyDiagrams";
import { EarthRotationDiagram } from "@/components/learn/EarthRotationDiagram";
import { EclipseStudy } from "@/components/learn/EclipseStudy";
import { EquinoxPrecession } from "@/components/learn/EquinoxPrecession";
import { HeliocentricOrbitStudy } from "@/components/learn/HeliocentricOrbitStudy";
import { HierarchyDiagram } from "@/components/learn/HierarchyDiagram";
import { MoonOrbitTiltStudy } from "@/components/learn/MoonOrbitTilt";
import { MoonPhasesStrip } from "@/components/learn/MoonPhasesStrip";
import { PrecessionCone } from "@/components/learn/PrecessionCone";
import {
  EclipseSeasonWindow,
  GregorianJump,
  HoraWeekdayCycle,
  SunRayAngle,
  YearLengthLadder,
} from "@/components/learn/calendar-cycle-diagrams";
import { CircumpolarSky } from "@/components/learn/CircumpolarSky";
import {
  MandaShighra,
  PakshaStrip,
  RetrogradeLoop,
} from "@/components/learn/motion-and-month-diagrams";
import {
  EclipticEquatorCross,
  TwoZeroPoints,
  ZodiacBeltWidth,
} from "@/components/learn/zodiac-frame-diagrams";
import {
  DayLengthHourAngle,
  MoonriseSlip,
  SiderealSolarDay,
  SunriseSamplesTithi,
  TithiAcrossZones,
} from "@/components/learn/day-timeline-diagrams";
import { LunarSolarGap } from "@/components/learn/LunarSolarGap";
import { RituWheel } from "@/components/learn/RituWheel";
import { SolarDeclinationYear } from "@/components/learn/SolarDeclinationYear";
import { SolarMonthLengths } from "@/components/learn/SolarMonthLengths";
import { SolarEclipseStudy } from "@/components/learn/SolarEclipseStudy";
import { SunEarthMoonStudy } from "@/components/learn/SunEarthMoonStudy";
import { TwoSystemsDiagram } from "@/components/learn/TwoSystemsDiagram";
import {
  GrahaReferenceTable,
  KaranaReferenceTable,
  NakshatraReferenceTable,
  RashiReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
} from "@/components/learn/PanchangaReferenceGuide";

export const LEARN_DIAGRAMS = {
  /* Sun / Earth geometry */
  "earth-orbit": HeliocentricOrbitStudy,
  "earth-rotation": EarthRotationDiagram,
  "sun-earth-moon": SunEarthMoonStudy,
  "ecliptic-belt": EclipticBeltStudy,
  "declination-year": SolarDeclinationYear,
  "ritu-wheel": RituWheel,
  "lunar-solar-gap": LunarSolarGap,
  "circumpolar-sky": CircumpolarSky,
  "retrograde-loop": RetrogradeLoop,
  "manda-shighra": MandaShighra,
  "paksha-strip": PakshaStrip,
  "two-zero-points": TwoZeroPoints,
  "zodiac-belt-width": ZodiacBeltWidth,
  "ecliptic-equator-cross": EclipticEquatorCross,
  "hora-weekday-cycle": HoraWeekdayCycle,
  "year-length-ladder": YearLengthLadder,
  "gregorian-jump": GregorianJump,
  "eclipse-season-window": EclipseSeasonWindow,
  "sun-ray-angle": SunRayAngle,
  "sidereal-solar-day": SiderealSolarDay,
  "day-length-hour-angle": DayLengthHourAngle,
  "moonrise-slip": MoonriseSlip,
  "sunrise-samples-tithi": SunriseSamplesTithi,
  "tithi-across-zones": TithiAcrossZones,
  "solar-month-lengths": SolarMonthLengths,
  /* 3D, client-only and code-split — see TwoSystemsDiagram. */
  "two-systems": TwoSystemsDiagram,
  "calendar-hierarchy": HierarchyDiagram,

  /* Zodiac reference frames */
  "ayanamsha-wheel": AyanamshaWheel,
  "equinox-precession": EquinoxPrecession,
  "precession-cone": PrecessionCone,
  "precession-sky": PrecessionSkyStudy,

  /* Moon */
  "tithi-elongation": () => <ElongationStudy />,
  "moon-phases": MoonPhasesStrip,
  "moon-orbit-tilt": MoonOrbitTiltStudy,
  "adhik-maas": AdhikMassDiagram,
  "sunrise-vriddhi": () => <SunriseTimeline mode="vriddhi" />,
  "sunrise-kshaya": () => <SunriseTimeline mode="kshaya" />,

  /* Eclipses */
  "lunar-eclipse": EclipseStudy,
  "solar-eclipse": SolarEclipseStudy,

  /* Reference tables */
  "table-rashi": RashiReferenceTable,
  "table-graha": GrahaReferenceTable,
  "table-nakshatra": NakshatraReferenceTable,
  "table-tithi": TithiReferenceTable,
  "table-yoga": YogaReferenceTable,
  "table-karana": KaranaReferenceTable,
} satisfies Record<string, () => React.ReactNode>;

export type DiagramId = keyof typeof LEARN_DIAGRAMS;
