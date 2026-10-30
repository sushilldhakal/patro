import { useEffect, useId, useMemo, useState } from "react";
import { illustration } from "@vedic-patro/design-tokens";

const EARTH_MAP = `${import.meta.env.BASE_URL}sky3d/earth.jpg`;
const TEX_W = 1024;
const TEX_H = 512;
/** Canvas pixels per SVG unit, so the globe stays sharp when the diagram is zoomed. */
const DENSITY = 3;
/** Longitude (rad) that faces the Sun, so Nepal is at noon on every Earth. */
const NOON_LON = (85 * Math.PI) / 180;

/** Half-width of the drawn equator, in radians of latitude. */
const EQ_HALF_WIDTH = 0.035;
const EQ_RGB = [1, 3, 5].map((k) => parseInt(illustration.red60.slice(k, k + 2), 16));

type Vec = [number, number, number];

let texture: Promise<ImageData | null> | null = null;
function loadTexture(): Promise<ImageData | null> {
  texture ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = TEX_W;
      c.height = TEX_H;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
      resolve(ctx.getImageData(0, 0, TEX_W, TEX_H));
    };
    img.onerror = () => resolve(null);
    img.src = EARTH_MAP;
  });
  return texture;
}

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Orthographic render of the textured, Sun-lit sphere; returns a PNG data URL. */
function renderSphere(tex: ImageData, size: number, axis: Vec, sun: Vec, elev: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const out = ctx.createImageData(size, size);
  const se = Math.sin(elev);
  const ce = Math.cos(elev);
  /* Camera frame in world coords (x right, y into the picture along the orbit plane, z orbit north). */
  const up: Vec = [0, se, ce];
  const toward: Vec = [0, -ce, se];
  /* Noon meridian: the Sun's direction with the axis part removed; east is axis × noon. */
  const noon = unit([sun[0] - dot(sun, axis) * axis[0], sun[1] - dot(sun, axis) * axis[1], sun[2] - dot(sun, axis) * axis[2]]);
  const east = cross(axis, noon);
  const half = size / 2;
  const src = tex.data;
  const dst = out.data;
  for (let j = 0; j < size; j++) {
    const v = 1 - (j + 0.5) / half;
    for (let i = 0; i < size; i++) {
      const u = (i + 0.5) / half - 1;
      const rr = u * u + v * v;
      if (rr >= 1) continue;
      const w = Math.sqrt(1 - rr);
      const p: Vec = [u, v * up[1] + w * toward[1], v * up[2] + w * toward[2]];
      const lat = Math.asin(Math.max(-1, Math.min(1, dot(p, axis))));
      const lon = Math.atan2(dot(p, east), dot(p, noon)) + NOON_LON;
      let tx = Math.floor(((lon / (2 * Math.PI) + 0.5) % 1) * TEX_W);
      if (tx < 0) tx += TEX_W;
      const ty = Math.min(TEX_H - 1, Math.floor((0.5 - lat / Math.PI) * TEX_H));
      const s = (ty * TEX_W + tx) * 4;
      /* Day side lit, a soft terminator, the night side dim but readable; the map is dark, so brighten it. */
      const l = dot(p, sun);
      const day = Math.max(0, Math.min(1, (l + 0.08) / 0.2));
      const k = (0.4 + 1.3 * day) * (0.78 + 0.22 * w);
      const d = (j * size + i) * 4;
      /* The equator, so the 23.44° tilt reads even when the axis points toward or away from you. */
      const eq = Math.abs(lat) < EQ_HALF_WIDTH ? 0.75 : 0;
      dst[d] = Math.min(255, src[s] * k * (1 - eq) + EQ_RGB[0] * eq);
      dst[d + 1] = Math.min(255, src[s + 1] * k * (1 - eq) + EQ_RGB[1] * eq);
      dst[d + 2] = Math.min(255, (src[s + 2] * k * 0.95 + 18 * (1 - day)) * (1 - eq) + EQ_RGB[2] * eq);
      /* Antialias the rim. */
      dst[d + 3] = Math.min(255, Math.max(0, (1 - Math.sqrt(rr)) * half * 255));
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Earth as a real sphere for flat SVG orbit diagrams seen from above the
 * orbit plane at `elev` (radians). `axis` is the unit north-pole direction and
 * `sun` the unit direction to the Sun, both in world coordinates: x to the
 * right, y into the picture along the orbit plane, z the orbit's north. So the
 * 23.44° tilt shows truly however the axis points — including toward or away
 * from the viewer — and the lit half shows which hemisphere faces the Sun.
 */
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
  const clip = `esg-clip-${useId().replace(/:/g, "")}`;
  const [tex, setTex] = useState<ImageData | null>(null);

  useEffect(() => {
    let live = true;
    void loadTexture().then((t) => live && setTex(t));
    return () => {
      live = false;
    };
  }, []);

  /* Re-render only when a direction has moved by about a degree, so playback stays light. */
  const q = (x: number) => Math.round(x * 60) / 60;
  const key = [...axis, ...sun].map(q).join(",");
  /* The texture only arrives in the browser, so the prerender keeps the plain disc. */
  const href = useMemo(() => {
    if (!tex) return "";
    const [a0, a1, a2, s0, s1, s2] = key.split(",").map(Number);
    return renderSphere(tex, Math.round(2 * r * DENSITY), unit([a0, a1, a2]), unit([s0, s1, s2]), elev);
  }, [tex, key, r, elev]);

  /* The axis on screen: x right, y down; `depth` > 0 means that end of the axis points toward the viewer. */
  const se = Math.sin(elev);
  const ce = Math.cos(elev);
  const sx = axis[0];
  const sy = -(axis[1] * se + axis[2] * ce);
  const depth = -axis[1] * ce + axis[2] * se;
  const len = 1.55 * r;
  const end = (sign: 1 | -1, front: boolean) => {
    const facing = sign * depth > 0;
    if (facing !== front) return null;
    const from = front ? r : 0;
    return (
      <line x1={sign * sx * from} y1={sign * sy * from} x2={sign * sx * len} y2={sign * sy * len} stroke={labelColor} strokeWidth={1.5} />
    );
  };
  const nLen = Math.hypot(sx, sy) || 1;

  return (
    <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
      <defs>
        <clipPath id={clip}>
          <circle r={r} />
        </clipPath>
      </defs>
      {end(1, false)}
      {end(-1, false)}
      {href ? (
        <image href={href} x={-r} y={-r} width={2 * r} height={2 * r} clipPath={`url(#${clip})`} aria-hidden="true" />
      ) : (
        <circle r={r} fill={illustration.sky51} />
      )}
      {end(1, true)}
      {end(-1, true)}
      <text
        x={sx * len + (sx / nLen) * 7}
        y={sy * len + (sy / nLen) * 7}
        fill={labelColor}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ font: "700 9px var(--pn-font)" }}
      >
        N
      </text>
    </g>
  );
}
