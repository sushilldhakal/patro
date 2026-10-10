import { cn } from "@/lib/utils";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { edBodyLabel, edRay, hoCalloutNe, hoEarthGroup, hoEquator, hoFocusAphelion, hoFocusLabel, hoFocusLine, hoMarkerDetail, hoMarkerDot, hoMarkerNe, hoMarkerTag, hoNorthPole, hoOrbitDir, hoOrbitEllipse, hoOrbitGuide, hoPoleAxis, hoPoleLabel, hoSunRay, hoSweep, hoTiltArc, hoTiltRef } from "@/lib/diagram-classes";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { edSvg } from "@/lib/learn-classes";
import { EarthGlobeImage, EARTH_AXIAL_TILT } from "./EarthGlobeImage";
import {
  ORBIT,
  ORBIT_B,
  ORBIT_MARKERS,
  ellipsePathPoints,
  meanFromPointer,
  meanFromTrue,
  orbitFromMeanAnomaly,
} from "./orbit-math";

const TILT = EARTH_AXIAL_TILT;
const HO = { W: 1200, H: 880, sunR: 70, earthR: 60, axisLen: 128 };

/**
 * Spin axis is fixed in space (it always points at the same distant star,
 * Polaris). Its absolute direction therefore does NOT change as Earth orbits —
 * the seasons come from where Earth sits relative to the Sun. We lean the axis
 * a constant 23.5° toward +x: at perihelion (right, winter) the North pole
 * leans away from the Sun, while half an orbit later at aphelion (left, summer)
 * the very same axis leans toward the Sun.
 */
function earthAxis() {
  const lean = (TILT * Math.PI) / 180;
  const ux = Math.sin(lean);
  const uy = -Math.cos(lean);
  return { ux, uy, lean };
}

function tiltArcPathAtOrigin(r: number, lean: number) {
  const ax = Math.sin(lean) * r;
  const ay = -Math.cos(lean) * r;
  const large = lean > Math.PI ? 1 : 0;
  return `M 0 ${-r} A ${r} ${r} 0 ${large} 1 ${ax.toFixed(1)} ${ay.toFixed(1)}`;
}

function markerLabelLayout(pos: { ex: number; ey: number }, nu: number) {
  const dx = pos.ex - ORBIT.cx;
  const dy = pos.ey - ORBIT.cy;

  if (nu === 90) {
    const lx = ORBIT.cx + dx * 1.08;
    const ly = ORBIT.cy + dy * 1.22;
    return {
      lx,
      anchor: "middle" as const,
      lines: { ne: ly - 32, detail: ly - 14 },
    };
  }
  if (nu === 270) {
    const lx = ORBIT.cx + dx * 1.08;
    const ly = ORBIT.cy + dy * 1.22;
    return {
      lx,
      anchor: "middle" as const,
      lines: { ne: ly - 38, detail: ly - 20 },
    };
  }
  if (nu === 0) {
    const lx = pos.ex + 28;
    const ly = pos.ey;
    return {
      lx,
      anchor: "start" as const,
      lines: { ne: ly - 22, detail: ly - 6, tag: ly + 10 },
    };
  }
  // nu === 180 — summer, left side
  const lx = pos.ex - 28;
  const ly = pos.ey;
  return {
    lx,
    anchor: "end" as const,
    lines: { ne: ly - 22, detail: ly - 6, tag: ly + 10 },
  };
}

interface Props {
  meanDeg?: number;
  onMeanDeg?: (v: number) => void;
}

export function HeliocentricOrbitDiagram({
  meanDeg = meanFromTrue(180),
  onMeanDeg,
}: Props) {
  const { t } = useTranslation();
  const fmt = (n: number) => toNepaliDigits(n);
  const orbit = orbitFromMeanAnomaly(meanDeg);
  const { ex, ey, speed } = orbit;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);

  const ellipsePath = useMemo(() => ellipsePathPoints(), []);
  const centerX = ORBIT.cx + ORBIT.a * ORBIT.e;

  const sunDx = ORBIT.cx - ex;
  const sunDy = ORBIT.cy - ey;
  const sunDist = Math.hypot(sunDx, sunDy) || 1;
  const sunUx = sunDx / sunDist;
  const sunUy = sunDy / sunDist;

  const { ux: axisUx, uy: axisUy, lean } = earthAxis();
  const eqUx = -axisUy;
  const eqUy = axisUx;
  const eqHalf = HO.earthR * 0.94;

  const northX = axisUx * HO.axisLen;
  const northY = axisUy * HO.axisLen;
  const southX = -axisUx * HO.axisLen * 0.42;
  const southY = -axisUy * HO.axisLen * 0.42;

  const speedKey =
    speed > 1.02
      ? "learn.diagrams.orbit_speed_fast"
      : speed < 0.98
        ? "learn.diagrams.orbit_speed_slow"
        : "learn.diagrams.orbit_speed_mean";

  const sweepPath = useMemo(() => {
    const pts: string[] = [];
    const steps = Math.max(2, Math.ceil(meanDeg / 3));
    for (let i = 0; i <= steps; i++) {
      const m = (meanDeg * i) / steps;
      const p = orbitFromMeanAnomaly(m);
      pts.push((i === 0 ? "M" : "L") + p.ex.toFixed(1) + "," + p.ey.toFixed(1));
    }
    return pts.length > 1 ? pts.join(" ") : "";
  }, [meanDeg]);

  const rays = useMemo(
    () =>
      Array.from({ length: 16 }, (_, k) => {
        const a = (k / 16) * Math.PI * 2;
        const r0 = HO.sunR + 4;
        const r1 = HO.sunR + (k % 2 ? 14 : 22);
        return (
          <line
            key={`ray${k}`}
            x1={ORBIT.cx + r0 * Math.cos(a)}
            y1={ORBIT.cy + r0 * Math.sin(a)}
            x2={ORBIT.cx + r1 * Math.cos(a)}
            y2={ORBIT.cy + r1 * Math.sin(a)}
            className={edRay}
          />
        );
      }),
    [],
  );

  const peri = orbitFromMeanAnomaly(meanFromTrue(0));
  const aphe = orbitFromMeanAnomaly(meanFromTrue(180));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${HO.W} ${HO.H}`}
      className={edSvg("ho", !!onMeanDeg)}
      onPointerDown={(e) => {
        if (!onMeanDeg) return;
        drag.current = true;
        const rect = svgRef.current!.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * HO.W;
        const py = ((e.clientY - rect.top) / rect.height) * HO.H;
        onMeanDeg(meanFromPointer(px, py));
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current || !onMeanDeg) return;
        const rect = svgRef.current!.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * HO.W;
        const py = ((e.clientY - rect.top) / rect.height) * HO.H;
        onMeanDeg(meanFromPointer(px, py));
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <defs>
        <radialGradient id="ho-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="38%" stopColor="#ffd24a" />
          <stop offset="78%" stopColor="#f08a1d" />
          <stop offset="100%" stopColor="#d65b12" />
        </radialGradient>
        <radialGradient id="ho-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf57" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#ffcf57" stopOpacity={0} />
        </radialGradient>
      </defs>

      <ellipse
        cx={centerX}
        cy={ORBIT.cy}
        rx={ORBIT.a}
        ry={ORBIT_B}
        className={cn(hoOrbitEllipse, hoOrbitGuide)}
        transform={`rotate(0 ${centerX} ${ORBIT.cy})`}
      />
      <path d={ellipsePath} className={hoOrbitEllipse} fill="none" />

      <line
        x1={ORBIT.cx}
        y1={ORBIT.cy}
        x2={peri.ex}
        y2={peri.ey}
        className={hoFocusLine}
      />
      <line
        x1={ORBIT.cx}
        y1={ORBIT.cy}
        x2={aphe.ex}
        y2={aphe.ey}
        className={cn(hoFocusLine, hoFocusAphelion)}
      />
      <text
        x={(ORBIT.cx + peri.ex) / 2}
        y={(ORBIT.cy + peri.ey) / 2 - 10}
        className={hoFocusLabel}
        textAnchor="middle"
      >
        {t("learn.diagrams.orbit_perihelion")}
      </text>
      <text
        x={(ORBIT.cx + aphe.ex) / 2}
        y={(ORBIT.cy + aphe.ey) / 2 - 10}
        className={hoFocusLabel}
        textAnchor="middle"
      >
        {t("learn.diagrams.orbit_aphelion")}
      </text>

      {ORBIT_MARKERS.map((m) => {
        const pos = orbitFromMeanAnomaly(meanFromTrue(m.nu));
        const { lx, anchor, lines } = markerLabelLayout(pos, m.nu);
        return (
          <g key={m.nu}>
            <circle cx={pos.ex} cy={pos.ey} r={5} className={hoMarkerDot} />
            <text x={lx} y={lines.ne} className={hoMarkerNe} textAnchor={anchor}>
              {m.ne}
            </text>
            <text x={lx} y={lines.detail} className={hoMarkerDetail} textAnchor={anchor}>
              {m.detail}
            </text>
            {"tag" in lines && m.tag ? (
              <text x={lx} y={lines.tag!} className={hoMarkerTag} textAnchor={anchor}>
                {m.tag}
              </text>
            ) : null}
          </g>
        );
      })}

      {sweepPath && <path d={sweepPath} className={hoSweep} fill="none" />}

      <text x={HO.W / 2} y={HO.H - 22} className={hoOrbitDir} textAnchor="middle">
        {t("learn.diagrams.orbit_direction")}
      </text>

      <line x1={ex} y1={ey} x2={ORBIT.cx} y2={ORBIT.cy} className={hoSunRay} />
      <circle cx={ORBIT.cx} cy={ORBIT.cy} r={HO.sunR + 36} fill="url(#ho-sunglow)" />
      {rays}
      <circle cx={ORBIT.cx} cy={ORBIT.cy} r={HO.sunR} fill="url(#ho-sun)" />
      <text x={ORBIT.cx} y={ORBIT.cy + HO.sunR + 28} className={edBodyLabel} textAnchor="middle">
        {t("learn.diagrams.orbit_sun_focus")}
      </text>

      <g className={hoEarthGroup} transform={`translate(${ex} ${ey})`}>
        <EarthGlobeImage cx={0} cy={0} r={HO.earthR} glow />
        <line
          x1={-eqUx * eqHalf}
          y1={-eqUy * eqHalf}
          x2={eqUx * eqHalf}
          y2={eqUy * eqHalf}
          className={hoEquator}
        />
        <line x1={0} y1={0} x2={0} y2={-HO.earthR * 0.55} className={hoTiltRef} />
        <path d={tiltArcPathAtOrigin(HO.earthR * 0.55, lean)} className={hoTiltArc} fill="none" />
        <line x1={southX} y1={southY} x2={northX} y2={northY} className={hoPoleAxis} />
        <circle cx={northX} cy={northY} r={5} className={hoNorthPole} />
        <text
          x={northX + axisUx * 14 + eqUx * 6}
          y={northY + axisUy * 14 + eqUy * 6}
          className={hoPoleLabel}
        >
          {t("learn.diagrams.orbit_north_pole")} · {fmt(TILT)}°
        </text>
        <text y={HO.earthR + 24} className={edBodyLabel} textAnchor="middle">
          {t("grahas.earth")}
        </text>
      </g>

      <g
        transform={`translate(${ex + sunUx * 72},${ey + sunUy * 72})`}
      >
        <text className={hoCalloutNe} textAnchor="middle" y={-6}>
          {t("learn.diagrams.orbit_speed")}: {t(speedKey)}
        </text>
      </g>
    </svg>
  );
}
