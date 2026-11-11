/**
 * The Earth disc the website's studies draw (`EarthGlobeImage`): a globe
 * image clipped to a circle, tilted on its axis, with a rim and an optional
 * glow.
 *
 * The website's image is `earth_rotating.svg`, which spins on its own; an SVG
 * file cannot be drawn as an image here, so the app uses its Earth texture —
 * the same one its Earth-rotation figure uses — still, at the same tilt.
 */
import { memo, useId } from "react";
import { Circle, ClipPath, Defs, G, Image as SvgImage } from "react-native-svg";
import { earthGlobeRim, hoEarthGlow } from "@vedic-patro/design-tokens/classes/diagram-classes";
import { useSvgClass } from "@/components/learn/study/study-ink";

/** Mean obliquity of the ecliptic (Earth's axial tilt). */
export const EARTH_AXIAL_TILT = 23.5;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EARTH = require("@/assets/sky3d/earth.jpg");

interface Props {
  cx: number;
  cy: number;
  r: number;
  glow?: boolean;
  glowClassName?: string;
  glowPad?: number;
  tilt?: number;
}

export const EarthGlobeImage = memo(function EarthGlobeImage({
  cx,
  cy,
  r,
  glow = false,
  glowClassName = hoEarthGlow,
  glowPad = 14,
  tilt = EARTH_AXIAL_TILT,
}: Props) {
  const sc = useSvgClass();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `earth-clip-${uid}`;
  const d = r * 2;
  return (
    <G>
      {glow ? <Circle cx={cx} cy={cy} r={r + glowPad} {...sc(glowClassName)} /> : null}
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={cx} cy={cy} r={r} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <SvgImage
          href={EARTH}
          x={cx - r * 2}
          y={cy - r}
          width={d * 2}
          height={d}
          transform={`rotate(${tilt} ${cx} ${cy})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </G>
      <Circle cx={cx} cy={cy} r={r} fill="none" {...sc(earthGlobeRim)} />
    </G>
  );
});
