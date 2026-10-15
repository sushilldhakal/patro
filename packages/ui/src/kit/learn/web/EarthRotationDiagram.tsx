import { useId } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { ssRotSvg } from "@vedic-patro/design-tokens/classes/learn-classes";
import {
  earthGlobeObject,
  earthGlobeRim,
  ssRotArrowHead,
  ssRotAxis,
  ssRotCurve,
  ssRotDir,
  ssRotGlow,
  ssRotLabel,
  ssRotPole,
} from "@vedic-patro/design-tokens/classes/diagram-classes";
import {
  EARTH_ROT_GLOW_PAD,
  EARTH_ROT_H,
  EARTH_ROT_R,
  EARTH_ROT_TILT,
  EARTH_ROT_W,
  earthRotation,
} from "@vedic-patro/domain/learn/earth-rotation";
import type { EarthRotationDiagramProps } from "../contract";

export function EarthRotationDiagram({ globeSrc }: EarthRotationDiagramProps) {
  const { t, digits } = useLocale();
  const clipId = `earth-clip-${useId().replace(/:/g, "")}`;
  const markerId = `ss-rot-arrow-${useId().replace(/:/g, "")}`;
  const { cx, cy } = earthRotation;
  const d = EARTH_ROT_R * 2;

  return (
    <svg viewBox={`0 0 ${EARTH_ROT_W} ${EARTH_ROT_H}`} className={ssRotSvg} aria-hidden>
      <defs>
        <marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className={ssRotArrowHead} />
        </marker>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={EARTH_ROT_R} />
        </clipPath>
      </defs>
      <text x={earthRotation.west.x} y={earthRotation.west.y} className={ssRotDir} textAnchor="middle">
        {t("learn.west")}
      </text>
      <text x={earthRotation.east.x} y={earthRotation.east.y} className={ssRotDir} textAnchor="middle">
        {t("learn.east")}
      </text>
      <line x1={earthRotation.axis.x1} y1={earthRotation.axis.y1} x2={earthRotation.axis.x2} y2={earthRotation.axis.y2} className={ssRotAxis} />
      <circle cx={cx} cy={cy} r={EARTH_ROT_R + EARTH_ROT_GLOW_PAD} className={ssRotGlow} />
      <g clipPath={`url(#${clipId})`}>
        <image
          href={globeSrc}
          x={cx - EARTH_ROT_R}
          y={cy - EARTH_ROT_R}
          width={d}
          height={d}
          transform={`rotate(${EARTH_ROT_TILT} ${cx} ${cy})`}
          className={earthGlobeObject}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      <circle cx={cx} cy={cy} r={EARTH_ROT_R} fill="none" className={earthGlobeRim} />
      <line x1={earthRotation.pole.x1} y1={earthRotation.pole.y1} x2={earthRotation.pole.x2} y2={earthRotation.pole.y2} className={ssRotPole} />
      <path d={earthRotation.curve} className={ssRotCurve} fill="none" markerEnd={`url(#${markerId})`} />
      <text x={earthRotation.label.x} y={earthRotation.label.y} className={ssRotLabel} textAnchor="middle">
        {t("learn.west_east")} · ~{digits(24)} {t("learn.hours")}
      </text>
    </svg>
  );
}
