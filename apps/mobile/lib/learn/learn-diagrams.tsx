/**
 * Diagram slots available to data-driven articles.
 *
 * An article body references a visual by id (`{ kind: "diagram", id: "tithi-elongation" }`)
 * rather than importing a component, which keeps article files free of JSX and
 * gives one place to swap an implementation.
 *
 * Mirrors web's `src/lib/learn/learn-diagrams.tsx` registry 1:1 by key, so
 * article data files (which reference these ids) type-check unchanged.
 */

import type { ComponentType } from "react";
import { HoraTodayDiagram } from "@/components/learn/diagrams/HoraTodayDiagram";
import { EarthRotationDiagram } from "@/components/learn/diagrams/EarthRotationDiagram";
import { SunRayAngleDiagram } from "@/components/learn/diagrams/SunRayAngleDiagram";
import { HoraWeekdayCycleDiagram } from "@/components/learn/diagrams/HoraWeekdayCycleDiagram";
import { YearLengthLadderDiagram } from "@/components/learn/diagrams/YearLengthLadderDiagram";
import { GregorianJumpDiagram } from "@/components/learn/diagrams/GregorianJumpDiagram";
import { TwoZeroPointsDiagram } from "@/components/learn/diagrams/TwoZeroPointsDiagram";
import { ZodiacBeltWidthDiagram } from "@/components/learn/diagrams/ZodiacBeltWidthDiagram";
import { EclipticEquatorCrossDiagram } from "@/components/learn/diagrams/EclipticEquatorCrossDiagram";
import { SunriseTimelineDiagram } from "@/components/learn/diagrams/SunriseTimelineDiagram";
import { DayLengthHourAngleDiagram } from "@/components/learn/diagrams/DayLengthHourAngleDiagram";
import { MoonriseSlipDiagram } from "@/components/learn/diagrams/MoonriseSlipDiagram";
import { SiderealSolarDayDiagram } from "@/components/learn/diagrams/SiderealSolarDayDiagram";
import { SunriseSamplesTithiDiagram } from "@/components/learn/diagrams/SunriseSamplesTithiDiagram";
import { TithiAcrossZonesDiagram } from "@/components/learn/diagrams/TithiAcrossZonesDiagram";
import { EarthOrbitDiagram } from "@/components/learn/diagrams/EarthOrbitDiagram";
import { DeclinationYearDiagram } from "@/components/learn/diagrams/DeclinationYearDiagram";
import { RituWheelDiagram } from "@/components/learn/diagrams/RituWheelDiagram";
import { LunarSolarGapDiagram } from "@/components/learn/diagrams/LunarSolarGapDiagram";
import { CircumpolarSkyDiagram } from "@/components/learn/diagrams/CircumpolarSkyDiagram";
import { PakshaStripDiagram } from "@/components/learn/diagrams/PakshaStripDiagram";
import { EclipseSeasonWindowDiagram } from "@/components/learn/diagrams/EclipseSeasonWindowDiagram";
import { SolarMonthLengthsDiagram } from "@/components/learn/diagrams/SolarMonthLengthsDiagram";
import { CalendarHierarchyDiagram } from "@/components/learn/diagrams/CalendarHierarchyDiagram";
import { EquinoxPrecessionDiagram } from "@/components/learn/diagrams/EquinoxPrecessionDiagram";
import { RetrogradeLoopDiagram } from "@/components/learn/diagrams/RetrogradeLoopDiagram";
import { MandaShighraDiagram } from "@/components/learn/diagrams/MandaShighraDiagram";
import { PrecessionConeDiagram } from "@/components/learn/diagrams/PrecessionConeDiagram";
import { MoonOrbitTiltDiagram } from "@/components/learn/diagrams/MoonOrbitTiltDiagram";
import { MoonPhasesDiagram } from "@/components/learn/diagrams/MoonPhasesDiagram";
import { AdhikMaasDiagram } from "@/components/learn/diagrams/AdhikMaasDiagram";

const SunriseVriddhiDiagram = () => <SunriseTimelineDiagram mode="vriddhi" />;
const SunriseKshayaDiagram = () => <SunriseTimelineDiagram mode="kshaya" />;
import {
  RashiReferenceTable,
  GrahaReferenceTable,
  NakshatraReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
  KaranaReferenceTable,
  ComputationReferenceDiagram,
} from "@/components/learn/diagrams/ReferenceTables";
import { ServerPipelineDiagram } from "@/components/learn/diagrams/ServerPipelineDiagram";
import {
  SunEarthMoonDiagram,
  AyanamshaDiagram,
  TithiAngleDiagram,
  EclipseDiagram,
} from "@/components/learn/diagrams/LearnDiagramWidgets";
import { TwoSystemsStudy } from "@/components/learn/playground/TwoSystemsStudy";

const SolarEclipseDiagram = () => <EclipseDiagram mode="solar" />;
const LunarEclipseDiagram = () => <EclipseDiagram mode="lunar" />;
const TwoSystemsDiagram = () => <TwoSystemsStudy />;

export const LEARN_DIAGRAMS: Record<string, ComponentType> = {
  /* Sun / Earth geometry — has native equivalent */
  "sun-earth-moon": SunEarthMoonDiagram,
  "ecliptic-belt": SunEarthMoonDiagram,

  /* Sun / Earth geometry */
  "earth-orbit": EarthOrbitDiagram,
  "earth-rotation": EarthRotationDiagram,
  "declination-year": DeclinationYearDiagram,
  "ritu-wheel": RituWheelDiagram,
  "lunar-solar-gap": LunarSolarGapDiagram,
  "circumpolar-sky": CircumpolarSkyDiagram,
  "retrograde-loop": RetrogradeLoopDiagram,
  "manda-shighra": MandaShighraDiagram,
  "paksha-strip": PakshaStripDiagram,
  "two-zero-points": TwoZeroPointsDiagram,
  "zodiac-belt-width": ZodiacBeltWidthDiagram,
  "ecliptic-equator-cross": EclipticEquatorCrossDiagram,
  "hora-weekday-cycle": HoraWeekdayCycleDiagram,
  "year-length-ladder": YearLengthLadderDiagram,
  "gregorian-jump": GregorianJumpDiagram,
  "eclipse-season-window": EclipseSeasonWindowDiagram,
  "sun-ray-angle": SunRayAngleDiagram,
  "sidereal-solar-day": SiderealSolarDayDiagram,
  "day-length-hour-angle": DayLengthHourAngleDiagram,
  "moonrise-slip": MoonriseSlipDiagram,
  "sunrise-samples-tithi": SunriseSamplesTithiDiagram,
  "tithi-across-zones": TithiAcrossZonesDiagram,
  "solar-month-lengths": SolarMonthLengthsDiagram,

  /* 3D — has native equivalent (playground system, already at parity) */
  "two-systems": TwoSystemsDiagram,

  "calendar-hierarchy": CalendarHierarchyDiagram,

  /* Zodiac reference frames — has native equivalent */
  "ayanamsha-wheel": AyanamshaDiagram,

  /* Zodiac reference frames — placeholder, Phase 3 Tier 2/3 */
  "equinox-precession": EquinoxPrecessionDiagram,
  "precession-cone": PrecessionConeDiagram,
  "precession-sky": PrecessionConeDiagram,

  /* Moon — has native equivalent */
  "tithi-elongation": TithiAngleDiagram,

  /* Moon */
  "moon-phases": MoonPhasesDiagram,
  "moon-orbit-tilt": MoonOrbitTiltDiagram,
  "adhik-maas": AdhikMaasDiagram,
  "sunrise-vriddhi": SunriseVriddhiDiagram,
  "sunrise-kshaya": SunriseKshayaDiagram,

  /* Eclipses — has native equivalent */
  "lunar-eclipse": LunarEclipseDiagram,
  "solar-eclipse": SolarEclipseDiagram,

  /* Live — today's planetary hour, wired to mobile's own panchang data */
  "hora-live": HoraTodayDiagram,

  /* "How we calculate" chapter — no matching id in web's 45-slot registry
     either (these sit outside it, directly embedded in HowWeCalculateStudy) */
  "server-pipeline": ServerPipelineDiagram,
  "computation-reference": ComputationReferenceDiagram,

  /* Reference tables */
  "table-rashi": RashiReferenceTable,
  "table-graha": GrahaReferenceTable,
  "table-nakshatra": NakshatraReferenceTable,
  "table-tithi": TithiReferenceTable,
  "table-yoga": YogaReferenceTable,
  "table-karana": KaranaReferenceTable,
};

export type DiagramId = keyof typeof LEARN_DIAGRAMS;
