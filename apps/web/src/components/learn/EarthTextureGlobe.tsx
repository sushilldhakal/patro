import { useId } from "react";
import { illustration, neutral } from "@vedic-patro/design-tokens";

const EARTH_MAP = `${import.meta.env.BASE_URL}sky3d/earth.jpg`;

/**
 * Earth seen side-on, for flat SVG diagrams: the sky3d equirectangular map in
 * a circle, turning slowly about its axis, with the axis leaned by `tilt`
 * (screen degrees, clockwise from straight up). When `sun` is given, the half
 * facing away from it is in night, so each Earth round an orbit shows the
 * Sun's side lit.
 */
export function EarthTextureGlobe({
  cx,
  cy,
  r,
  tilt = 0,
  sun,
  spinSeconds = 30,
}: {
  cx: number;
  cy: number;
  r: number;
  tilt?: number;
  sun?: [number, number];
  spinSeconds?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const clip = `etg-clip-${uid}`;
  const limb = `etg-limb-${uid}`;
  const night = `etg-night-${uid}`;
  const bright = `etg-bright-${uid}`;

  let dir: [number, number] | null = null;
  if (sun) {
    const dx = sun[0] - cx;
    const dy = sun[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    dir = [dx / len, dy / len];
  }

  /* 360° of longitude is 4r wide, so the visible half of the globe is the 2r disc;
     a second copy sits after the first so the slide wraps; each is 1 unit wider
     so the antialiased edges overlap instead of showing a hairline. */
  const map = (x: number) => (
    <image href={EARTH_MAP} filter={`url(#${bright})`} x={x} y={-r} width={4 * r + 1} height={2 * r} preserveAspectRatio="none" aria-hidden="true" />
  );

  return (
    <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
      <defs>
        {/* The sky3d map is lit for a 3D scene and reads too dark on a flat card. */}
        <filter id={bright} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope={1.7} />
            <feFuncG type="linear" slope={1.7} />
            <feFuncB type="linear" slope={1.55} />
          </feComponentTransfer>
        </filter>
        <clipPath id={clip}>
          <circle r={r} />
        </clipPath>
        <radialGradient id={limb} cx="40%" cy="38%" r="62%">
          <stop offset="0%" stopColor={neutral.white} stopOpacity={0.22} />
          <stop offset="60%" stopColor={neutral.black} stopOpacity={0} />
          <stop offset="100%" stopColor={illustration.sky5} stopOpacity={0.35} />
        </radialGradient>
        {dir ? (
          <linearGradient id={night} gradientUnits="userSpaceOnUse" x1={dir[0] * r * 0.15} y1={dir[1] * r * 0.15} x2={-dir[0] * r * 0.55} y2={-dir[1] * r * 0.55}>
            <stop offset="0%" stopColor={illustration.sky5} stopOpacity={0} />
            <stop offset="100%" stopColor={illustration.sky5} stopOpacity={0.7} />
          </linearGradient>
        ) : null}
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g transform={`rotate(${tilt.toFixed(1)})`}>
          <g>
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-4 * r} 0`} dur={`${spinSeconds}s`} repeatCount="indefinite" />
            {map(-2 * r)}
            {map(2 * r)}
          </g>
        </g>
        {dir ? <circle r={r} fill={`url(#${night})`} /> : null}
        <circle r={r} fill={`url(#${limb})`} />
      </g>
    </g>
  );
}
