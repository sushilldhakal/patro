import { isNewMoonElongation, moonPhaseLitPath, normElongation } from "@vedic-patro/domain/moon-phase-svg";

import { brand, illustration, midnight } from "@vedic-patro/design-tokens";
interface MoonPhaseIconProps {
  /** Moon–sun elongation in degrees (0° new, 180° full). */
  elongation: number;
  r: number;
}

export function MoonPhaseIcon({ elongation, r }: MoonPhaseIconProps) {
  const e = normElongation(elongation);
  const isNew = isNewMoonElongation(elongation);
  return (
    <g>
      <circle
        cx="0"
        cy="0"
        r={r}
        fill={isNew ? midnight.background : midnight.background}
        stroke={illustration.teal33}
        strokeWidth="0.8"
      />
      {!isNew && e > 2 && e < 358 && (
        <path d={moonPhaseLitPath(elongation, r)} fill={brand.offWhite} />
      )}
      {e >= 170 && e <= 190 && (
        <circle cx="0" cy="0" r={r} fill={brand.offWhite} stroke="none" />
      )}
    </g>
  );
}
