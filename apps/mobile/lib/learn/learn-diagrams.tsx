import type { DiagramId } from "@vedic-patro/domain/learn/diagram-ids";
/**
 * Diagram slots available to data-driven articles.
 *
 * An article body references a visual by id (`{ kind: "diagram", id: "tithi-elongation" }`)
 * rather than importing a component, which keeps article files free of JSX and
 * gives one place to swap an implementation.
 *
 * Mirrors web's `src/lib/learn/learn-diagrams.tsx` registry 1:1 by key, and
 * draws what the website draws: its still figures (`components/learn/figures`)
 * and its interactive studies (`components/learn/studies`) are ports of the
 * website's own SVG, so a figure looks and moves the same in both apps. The
 * 3D exceptions are the apsides orbit and the two-systems playground.
 */

import type { ComponentType } from "react";
import { Asset } from "expo-asset";
import { EarthRotationDiagram as EarthRotationFigure, ServerPipelineDiagram as PipelineFigure } from "@vedic-patro/ui/kit/learn";
import { HoraTodayDiagram } from "@/components/learn/diagrams/HoraTodayDiagram";
/* Still figures: the website's own SVG drawings, ported line for line. */
import { EclipseSeasonWindow, GregorianJump, HoraWeekdayCycle, SunRayAngle, YearLengthLadder } from "@/components/learn/figures/calendar-cycle-figures";
import { DayLengthHourAngle, MoonriseSlip, SiderealSolarDay, SunriseSamplesTithi, TithiAcrossZones } from "@/components/learn/figures/day-timeline-figures";
import { MandaShighra, PakshaStrip, RetrogradeLoop } from "@/components/learn/figures/motion-and-month-figures";
import { EclipticEquatorCross, TwoZeroPoints, ZodiacBeltWidth } from "@/components/learn/figures/zodiac-frame-figures";
import { RituWheel } from "@/components/learn/figures/RituWheelFigure";
import { LunarSolarGap } from "@/components/learn/figures/LunarSolarGapFigure";
import { SolarDeclinationYear } from "@/components/learn/figures/SolarDeclinationYearFigure";
import { SolarMonthLengths } from "@/components/learn/figures/SolarMonthLengthsFigure";
import { CircumpolarSky } from "@/components/learn/figures/CircumpolarSkyFigure";
import { HierarchyFigure } from "@/components/learn/figures/HierarchyFigure";
import { MoonPhasesStripFigure } from "@/components/learn/figures/MoonPhasesStripFigure";
import { AdhikMassDiagram, SunriseTimeline } from "@/components/learn/figures/tithi-mechanics-figures";

const earthGlobe = Asset.fromModule(require("@/assets/sky3d/earth.jpg")).uri;
function EarthRotationDiagram() {
  return <EarthRotationFigure globeSrc={earthGlobe} />;
}
import { ApsidesOrbitDiagram } from "@/components/learn/diagrams/ApsidesOrbitDiagram";
import { RashiFromStarsDiagram } from "@/components/learn/diagrams/RashiFromStarsDiagram";
/* Studies: the website's interactive SVG studies, ported line for line. */
import { HeliocentricOrbitStudy } from "@/components/learn/studies/HeliocentricOrbitStudyFigure";
import { SunEarthMoonStudy } from "@/components/learn/studies/SunEarthMoonStudyFigure";
import { AyanamshaWheel } from "@/components/learn/studies/AyanamshaWheelFigure";
import { EquinoxPrecession } from "@/components/learn/studies/EquinoxPrecessionFigure";
import { PrecessionCone } from "@/components/learn/studies/PrecessionConeFigure";
import { ElongationStudy } from "@/components/learn/studies/ElongationStudyFigure";
import { MoonOrbitTiltStudy } from "@/components/learn/studies/MoonOrbitTiltFigure";
import { EclipseStudy } from "@/components/learn/studies/EclipseStudyFigure";
import { SolarEclipseStudy } from "@/components/learn/studies/SolarEclipseStudyFigure";

/* The website's "precession-sky": the equinox drifting round the fixed ring, then the axis's cone. */
function PrecessionSkyDiagram() {
  return (
    <>
      <EquinoxPrecession />
      <PrecessionCone />
    </>
  );
}

const SunriseVriddhiDiagram = () => <SunriseTimeline mode="vriddhi" />;
const SunriseKshayaDiagram = () => <SunriseTimeline mode="kshaya" />;
import {
  RashiReferenceTable,
  GrahaReferenceTable,
  NakshatraReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
  KaranaReferenceTable,
} from "@vedic-patro/ui/kit/learn";
import { ComputationReferenceDiagram } from "@/components/learn/diagrams/ReferenceTables";
function ServerPipelineDiagram() {
  return <PipelineFigure earthSrc={earthGlobe} />;
}
import { TwoSystemsStudy } from "@/components/learn/playground/TwoSystemsStudy";

const TwoSystemsDiagram = () => <TwoSystemsStudy />;

export const LEARN_DIAGRAMS: Record<string, ComponentType> = {
  /* Sun / Earth geometry */
  "sun-earth-moon": SunEarthMoonStudy,
  "ecliptic-belt": SunEarthMoonStudy,

  "earth-orbit": HeliocentricOrbitStudy,
  "earth-rotation": EarthRotationDiagram,
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

  "two-systems": TwoSystemsDiagram,

  "calendar-hierarchy": HierarchyFigure,

  "rashi-from-stars": RashiFromStarsDiagram,
  "ayanamsha-wheel": AyanamshaWheel,
  "apsides-seasons": ApsidesOrbitDiagram,

  "equinox-precession": EquinoxPrecession,
  "precession-cone": PrecessionCone,
  "precession-sky": PrecessionSkyDiagram,

  "tithi-elongation": ElongationStudy,

  /* Moon */
  "moon-phases": MoonPhasesStripFigure,
  "moon-orbit-tilt": MoonOrbitTiltStudy,
  "adhik-maas": AdhikMassDiagram,
  "sunrise-vriddhi": SunriseVriddhiDiagram,
  "sunrise-kshaya": SunriseKshayaDiagram,

  "lunar-eclipse": EclipseStudy,
  "solar-eclipse": SolarEclipseStudy,

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

export type { DiagramId };
