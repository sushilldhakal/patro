import { memo } from "react";
import { edMoonDisk, edMoonHalo, edMoonLit, edMoonNew, edMoonRim } from "@/lib/diagram-classes";
import {
  isFullMoonElongation,
  isNewMoonElongation,
  moonPhaseLitPath,
  normElongation,
} from "@/lib/moon-phase-svg";

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
  const e = normElongation(elongation);
  const isNew = isNewMoonElongation(elongation);
  const isFull = isFullMoonElongation(elongation);
  const clipId = `${uid}-clip`;
  const baseId = `${uid}-base`;
  const litId = `${uid}-lit`;
  const darkId = `${uid}-dark`;

  return (
    <g>
      <defs>
        <radialGradient id={baseId} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#8a939d" />
          <stop offset="55%" stopColor="#4f5862" />
          <stop offset="100%" stopColor="#252c33" />
        </radialGradient>
        <radialGradient id={litId} cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fafcfe" />
          <stop offset="45%" stopColor="#e4ecf4" />
          <stop offset="100%" stopColor="#b8c4d0" />
        </radialGradient>
        <radialGradient id={darkId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a2228" />
          <stop offset="100%" stopColor="#0a0e12" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx={0} cy={0} r={r} />
        </clipPath>
      </defs>

      {!isNew && <circle cx={0} cy={0} r={r + 1.2} className={edMoonHalo} />}

      {isNew ? (
        <circle cx={0} cy={0} r={r} fill={`url(#${darkId})`} className={edMoonNew} strokeWidth={1} />
      ) : (
        <circle cx={0} cy={0} r={r} fill={`url(#${baseId})`} className={edMoonDisk} strokeWidth={1} />
      )}

      {!isNew && (
        <g clipPath={`url(#${clipId})`} opacity={0.45}>
          <circle cx={-r * 0.28} cy={-r * 0.22} r={r * 0.2} fill="#3d4650" />
          <circle cx={r * 0.34} cy={r * 0.12} r={r * 0.16} fill="#323a44" />
          <circle cx={-r * 0.08} cy={r * 0.34} r={r * 0.11} fill="#2e353d" />
          <circle cx={r * 0.12} cy={-r * 0.38} r={r * 0.08} fill="#404952" />
        </g>
      )}

      {isFull ? (
        <circle cx={0} cy={0} r={r} fill={`url(#${litId})`} className={edMoonLit} />
      ) : (
        !isNew &&
        e > 1.5 &&
        e < 358.5 && (
          <path d={moonPhaseLitPath(elongation, r)} fill={`url(#${litId})`} className={edMoonLit} />
        )
      )}

      <circle cx={0} cy={0} r={r} fill="none" className={edMoonRim} strokeWidth={isNew ? 0.8 : 1} />
    </g>
  );
});
