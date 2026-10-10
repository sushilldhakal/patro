import { Circle, G, Path } from "react-native-svg";
import { isNewMoonElongation, moonPhaseLitPath, normElongation } from "@/lib/moon-phase-svg";

interface MoonPhaseIconProps {
  elongation: number;
  r: number;
}

export function MoonPhaseIcon({ elongation, r }: MoonPhaseIconProps) {
  const e = normElongation(elongation);
  const isNew = isNewMoonElongation(elongation);
  return (
    <G>
      <Circle cx={0} cy={0} r={r} fill={isNew ? "#0e1418" : "#11181c"} stroke="#4a5a60" strokeWidth={0.8} />
      {!isNew && e > 2 && e < 358 ? <Path d={moonPhaseLitPath(elongation, r)} fill="#eef3f1" /> : null}
      {e >= 170 && e <= 190 ? <Circle cx={0} cy={0} r={r} fill="#eef3f1" /> : null}
    </G>
  );
}
