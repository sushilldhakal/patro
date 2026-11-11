/**
 * Earth seen side-on for the flat studies — the website's `EarthTextureGlobe`:
 * the Earth map in a circle, its axis leaned by `tilt`, a limb shade, and, when
 * `sun` is given, night on the half facing away from it.
 *
 * The website slides the map with an SVG `<animateTransform>` so the globe
 * turns; that element does not exist here, so the map holds still.
 */
import { useId } from "react";
import { Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import { illustration, neutral } from "@vedic-patro/design-tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EARTH = require("@/assets/sky3d/earth.jpg");

export function EarthTextureGlobe({
  cx,
  cy,
  r,
  tilt = 0,
  sun,
}: {
  cx: number;
  cy: number;
  r: number;
  tilt?: number;
  sun?: [number, number];
  spinSeconds?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `etg-clip-${uid}`;
  const limb = `etg-limb-${uid}`;
  const night = `etg-night-${uid}`;

  let dir: [number, number] | null = null;
  if (sun) {
    const dx = sun[0] - cx;
    const dy = sun[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    dir = [dx / len, dy / len];
  }

  return (
    <G transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
      <Defs>
        <ClipPath id={clip}>
          <Circle r={r} />
        </ClipPath>
        <RadialGradient id={limb} cx="40%" cy="38%" r="62%">
          <Stop offset="0%" stopColor={neutral.white} stopOpacity={0.22} />
          <Stop offset="60%" stopColor={neutral.black} stopOpacity={0} />
          <Stop offset="100%" stopColor={illustration.sky5} stopOpacity={0.35} />
        </RadialGradient>
        {dir ? (
          <LinearGradient id={night} gradientUnits="userSpaceOnUse" x1={dir[0] * r * 0.15} y1={dir[1] * r * 0.15} x2={-dir[0] * r * 0.55} y2={-dir[1] * r * 0.55}>
            <Stop offset="0%" stopColor={illustration.sky5} stopOpacity={0} />
            <Stop offset="100%" stopColor={illustration.sky5} stopOpacity={0.7} />
          </LinearGradient>
        ) : null}
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <G transform={`rotate(${tilt.toFixed(1)})`}>
          <SvgImage href={EARTH} x={-2 * r} y={-r} width={4 * r + 1} height={2 * r} preserveAspectRatio="none" />
        </G>
        <Circle r={r} fill={neutral.white} opacity={0.12} />
        {dir ? <Circle r={r} fill={`url(#${night})`} /> : null}
        <Circle r={r} fill={`url(#${limb})`} />
      </G>
    </G>
  );
}
