import { memo, useId } from "react";
import { earthGlobeObject, earthGlobeRim, hoEarthGlow } from "@/lib/diagram-classes";
import earthRotatingUrl from "@/assets/earth_rotating.svg?url";

/** Mean obliquity of the ecliptic (Earth's axial tilt). */
export const EARTH_AXIAL_TILT = 23.5;

interface Props {
  cx: number;
  cy: number;
  r: number;
  glow?: boolean;
  glowClassName?: string;
  glowPad?: number;
  /** Axial tilt in degrees — applied to the asset; rotation is built into earth_rotating.svg. */
  tilt?: number;
}

/**
 * earth_rotating.svg — built-in spin; we only apply axial tilt.
 * Rendered as a native SVG <image> (clipped + rotated with SVG attributes,
 * not CSS-on-foreignObject) so it tracks the parent orbit transform exactly.
 * Memoized so parent orbit animation can move a translate() group without
 * reloading the embedded image every frame.
 */
export const EarthGlobeImage = memo(function EarthGlobeImage({
  cx,
  cy,
  r,
  glow = false,
  glowClassName = hoEarthGlow,
  glowPad = 14,
  tilt = EARTH_AXIAL_TILT,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const clipId = `earth-clip-${uid}`;
  const d = r * 2;

  return (
    <>
      {glow && <circle cx={cx} cy={cy} r={r + glowPad} className={glowClassName} />}
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <image
          href={earthRotatingUrl}
          x={cx - r}
          y={cy - r}
          width={d}
          height={d}
          transform={`rotate(${tilt} ${cx} ${cy})`}
          className={earthGlobeObject}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" className={earthGlobeRim} />
    </>
  );
});
