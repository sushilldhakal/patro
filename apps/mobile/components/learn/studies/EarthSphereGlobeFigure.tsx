/**
 * Earth as a lit sphere for the flat orbit studies — the website's
 * `EarthSphereGlobe`, seen from above the orbit plane at `elev`.
 *
 * The website shades every pixel of the textured sphere on an HTML canvas.
 * There is no canvas here, so the same picture is built from geometry: the
 * Earth map in the disc, turned so its north follows the projected axis; the
 * night side as the exact projection of the hemisphere facing away from the
 * Sun (terminator half-ellipse + limb arc); the equator as its projected great
 * circle; and the axis, drawn behind or in front of the disc as it points.
 * `axis` and `sun` are unit vectors in world coordinates: x right, y into the
 * picture along the orbit plane, z the orbit's north — as on the website.
 */
import { useId, useMemo } from "react";
import { Circle, ClipPath, Defs, G, Image as SvgImage, Line, Path, Text as SvgText } from "react-native-svg";
import { illustration, neutral } from "@vedic-patro/design-tokens";
import { STUDY_FONT, centralY } from "@/components/learn/study/study-ink";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EARTH = require("@/assets/sky3d/earth.jpg");

type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A great circle ⟂ `n` (camera coords), its visible half as screen points, in order. */
function visibleHalf(n: Vec, r: number, steps = 72): [number, number][] {
  let e1 = cross(n, [0, 0, 1]);
  if (Math.hypot(...e1) < 1e-6) e1 = [1, 0, 0];
  e1 = unit(e1);
  const e2 = unit(cross(n, e1));
  const pts: { x: number; y: number; w: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI * 2;
    const p: Vec = [Math.cos(t) * e1[0] + Math.sin(t) * e2[0], Math.cos(t) * e1[1] + Math.sin(t) * e2[1], Math.cos(t) * e1[2] + Math.sin(t) * e2[2]];
    pts.push({ x: p[0] * r, y: -p[1] * r, w: p[2] });
  }
  /* Start where the circle is hidden, so the visible run is one contiguous piece. */
  const start = pts.findIndex((p) => p.w < 0);
  const ordered = start < 0 ? pts : [...pts.slice(start), ...pts.slice(0, start)];
  return ordered.filter((p) => p.w >= 0).map((p) => [p.x, p.y]);
}

export function EarthSphereGlobe({
  cx,
  cy,
  r,
  axis,
  sun,
  elev,
  labelColor,
}: {
  cx: number;
  cy: number;
  r: number;
  axis: Vec;
  sun: Vec;
  elev: number;
  labelColor: string;
}) {
  const clip = `esg-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const se = Math.sin(elev);
  const ce = Math.cos(elev);
  /* World → camera: x right, y up on screen, z toward the viewer. */
  const toCam = (v: Vec): Vec => [v[0], v[1] * se + v[2] * ce, -v[1] * ce + v[2] * se];

  const q = (x: number) => Math.round(x * 60) / 60;
  const key = [...axis, ...sun].map(q).join(",");

  const { night, equator } = useMemo(() => {
    const [a0, a1, a2, s0, s1, s2] = key.split(",").map(Number) as [number, number, number, number, number, number];
    const sC = unit(toCam([s0, s1, s2]));
    const aC = unit(toCam([a0, a1, a2]));

    /* Night: the visible terminator half, closed along the limb through the anti-Sun side. */
    let nightPath = "";
    if (sC[2] < -0.995) nightPath = `M${-r},0 A${r},${r} 0 1 0 ${r},0 A${r},${r} 0 1 0 ${-r},0 Z`;
    else if (sC[2] < 0.995) {
      const term = visibleHalf(sC, r);
      if (term.length > 1) {
        const [fx, fy] = term[0]!;
        const [lx, ly] = term[term.length - 1]!;
        const a0r = Math.atan2(ly, lx);
        const a1r = Math.atan2(fy, fx);
        const anti = Math.atan2(sC[1], -sC[0]); /* screen y is down */
        /* Go from the last terminator point round the limb to the first, through `anti`. */
        const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const ccw = norm(a1r - a0r);
        const viaCcw = norm(anti - a0r) <= ccw;
        const span = viaCcw ? ccw : -(2 * Math.PI - ccw);
        const limb: string[] = [];
        for (let k = 1; k <= 32; k++) {
          const a = a0r + (span * k) / 32;
          limb.push(`L${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
        }
        nightPath = `M${term.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" L")} ${limb.join(" ")} Z`;
      }
    }

    const eq = visibleHalf(aC, r);
    const eqPath = eq.length > 1 ? `M${eq.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" L")}` : "";
    return { night: nightPath, equator: eqPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, r, elev]);

  /* The axis on screen, as the website draws it. */
  const sx = axis[0];
  const sy = -(axis[1] * se + axis[2] * ce);
  const depth = -axis[1] * ce + axis[2] * se;
  const len = 1.55 * r;
  const end = (sign: 1 | -1, front: boolean) => {
    const facing = sign * depth > 0;
    if (facing !== front) return null;
    const from = front ? r : 0;
    return <Line x1={sign * sx * from} y1={sign * sy * from} x2={sign * sx * len} y2={sign * sy * len} stroke={labelColor} strokeWidth={1.5} />;
  };
  const nLen = Math.hypot(sx, sy) || 1;
  /* The map's north turned toward the projected axis. */
  const mapTurn = (Math.atan2(sx, -sy) * 180) / Math.PI;

  return (
    <G transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
      <Defs>
        <ClipPath id={clip}>
          <Circle r={r} />
        </ClipPath>
      </Defs>
      {end(1, false)}
      {end(-1, false)}
      <G clipPath={`url(#${clip})`}>
        <Circle r={r} fill={illustration.sky51} />
        <SvgImage href={EARTH} x={-2 * r} y={-r} width={4 * r} height={2 * r} preserveAspectRatio="none" transform={`rotate(${mapTurn.toFixed(1)})`} />
        {/* The map is lit for a 3D scene; a light wash brings it up on a flat card. */}
        <Circle r={r} fill={neutral.white} opacity={0.12} />
        {night ? <Path d={night} fill={illustration.sky5} opacity={0.62} /> : null}
        {equator ? <Path d={equator} fill="none" stroke={illustration.red60} strokeWidth={Math.max(1, r * 0.07)} opacity={0.75} /> : null}
      </G>
      {end(1, true)}
      {end(-1, true)}
      <SvgText x={sx * len + (sx / nLen) * 7} y={centralY(sy * len + (sy / nLen) * 7, 9)} fill={labelColor} textAnchor="middle" fontSize={9} fontFamily={STUDY_FONT.bold}>
        N
      </SvgText>
    </G>
  );
}
