import { Circle, G, Path } from "react-native-svg";
import { isNewMoonElongation, moonPhaseLitPath, normElongation } from "@vedic-patro/domain/astronomy/moon-phase-svg";
import { brand, illustration, midnight } from "@vedic-patro/design-tokens";

export type MoonPhaseIconProps = {
  elongation: number;
  r: number;
};

export function MoonPhaseIcon({ elongation, r }: MoonPhaseIconProps) {
  const e = normElongation(elongation);
  const isNew = isNewMoonElongation(elongation);
  return (
    <G>
      <Circle cx={0} cy={0} r={r} fill={isNew ? midnight.background : midnight.background} stroke={illustration.teal33} strokeWidth={0.8} />
      {!isNew && e > 2 && e < 358 ? <Path d={moonPhaseLitPath(elongation, r)} fill={brand.offWhite} /> : null}
      {e >= 170 && e <= 190 ? <Circle cx={0} cy={0} r={r} fill={brand.offWhite} /> : null}
    </G>
  );
}
