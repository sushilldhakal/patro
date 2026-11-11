import { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop } from "react-native-svg";
import { useSvgClass } from "@/components/learn/study/study-ink";
import { memo } from "react";
import { edMoonDisk, edMoonHalo, edMoonLit, edMoonNew, edMoonRim } from "@vedic-patro/design-tokens/classes/diagram-classes";
import {
  isFullMoonElongation,
  isNewMoonElongation,
  moonPhaseLitPath,
  normElongation,
} from "@vedic-patro/domain/astronomy/moon-phase-svg";

import { brand, illustration, midnight, wheel } from "@vedic-patro/design-tokens";
interface MoonPhaseDiscProps {
  /** Moon–sun elongation in degrees (0° औंसी, 180° पूर्णिमा). */
  elongation: number;
  r: number;
  /** Unique id prefix for SVG defs (required when multiple instances). */
  uid?: string;
}

export const MoonPhaseDisc = memo(function MoonPhaseDisc({
  elongation,
  r,
  uid = "mpd",
}: MoonPhaseDiscProps) {
  const sc = useSvgClass();
  const e = normElongation(elongation);
  const isNew = isNewMoonElongation(elongation);
  const isFull = isFullMoonElongation(elongation);
  const clipId = `${uid}-clip`;
  const baseId = `${uid}-base`;
  const litId = `${uid}-lit`;
  const darkId = `${uid}-dark`;

  return (
    <G>
      <Defs>
        <RadialGradient id={baseId} cx="38%" cy="32%" r="72%">
          <Stop offset="0%" stopColor={illustration.gray58b} />
          <Stop offset="55%" stopColor={illustration.teal33} />
          <Stop offset="100%" stopColor={illustration.teal15} />
        </RadialGradient>
        <RadialGradient id={litId} cx="32%" cy="28%" r="78%">
          <Stop offset="0%" stopColor={brand.offWhite} />
          <Stop offset="45%" stopColor={wheel.ink} />
          <Stop offset="100%" stopColor={illustration.sky76b} />
        </RadialGradient>
        <RadialGradient id={darkId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={midnight.card} />
          <Stop offset="100%" stopColor={midnight.popover} />
        </RadialGradient>
        <ClipPath id={clipId}>
          <Circle cx={0} cy={0} r={r} />
        </ClipPath>
      </Defs>

      {!isNew && <Circle cx={0} cy={0} r={r + 1.2} {...sc(edMoonHalo)} />}

      {isNew ? (
        <Circle cx={0} cy={0} r={r} fill={`url(#${darkId})`} {...sc(edMoonNew)} strokeWidth={1} />
      ) : (
        <Circle cx={0} cy={0} r={r} fill={`url(#${baseId})`} {...sc(edMoonDisk)} strokeWidth={1} />
      )}

      {!isNew && (
        <G clipPath={`url(#${clipId})`} opacity={0.45}>
          <Circle cx={-r * 0.28} cy={-r * 0.22} r={r * 0.2} fill={illustration.sky27} />
          <Circle cx={r * 0.34} cy={r * 0.12} r={r * 0.16} fill={illustration.gray22} />
          <Circle cx={-r * 0.08} cy={r * 0.34} r={r * 0.11} fill={illustration.gray22} />
          <Circle cx={r * 0.12} cy={-r * 0.38} r={r * 0.08} fill={illustration.sky29b} />
        </G>
      )}

      {isFull ? (
        <Circle cx={0} cy={0} r={r} fill={`url(#${litId})`} {...sc(edMoonLit)} />
      ) : (
        !isNew &&
        e > 1.5 &&
        e < 358.5 && (
          <Path d={moonPhaseLitPath(elongation, r)} fill={`url(#${litId})`} {...sc(edMoonLit)} />
        )
      )}

      <Circle cx={0} cy={0} r={r} fill="none" {...sc(edMoonRim)} strokeWidth={isNew ? 0.8 : 1} />
    </G>
  );
});
