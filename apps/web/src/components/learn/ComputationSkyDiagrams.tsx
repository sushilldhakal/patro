import { SunEarthMoonStudy } from "@/components/learn/SunEarthMoonStudy";
import { EquinoxPrecession } from "@/components/learn/EquinoxPrecession";
import { PrecessionCone } from "@/components/learn/PrecessionCone";
import {
  NakshatraReferenceTable,
  RashiReferenceTable,
} from "@/components/learn/PanchangaReferenceGuide";

/** Geocentric ecliptic + rashi/nakshatra grid around Earth. */
export function EclipticBeltStudy() {
  return <SunEarthMoonStudy />;
}

/** Obliquity, equinox drift on fixed sidereal ring, and axial precession cone. */
export function PrecessionSkyStudy() {
  return (
    <>
      <EquinoxPrecession />
      <div className="mt-8">
        <PrecessionCone />
      </div>
    </>
  );
}

/** @deprecated use EclipticBeltStudy + PrecessionSkyStudy in article */
export function ComputationSkyDiagrams() {
  return (
    <>
      <EclipticBeltStudy />
      <div className="mt-8">
        <PrecessionSkyStudy />
      </div>
    </>
  );
}

export function ComputationReferenceTables() {
  return (
    <>
      <RashiReferenceTable />
      <div className="mt-6">
        <NakshatraReferenceTable />
      </div>
    </>
  );
}
