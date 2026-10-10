import { cn } from "@/lib/utils";
import { useMemo, useRef } from "react";
import { edBodyLabel, hoEarthGroup, hoEquator, hoOrbitDir, hoPoleAxis, semEarthGlow, semMoonLabelKey, semMoonOrbit, semMoonOrbitGuide, semOrbit, semOrbitGuide, semRadiusLine, semSunLonMarker, semSunLonRay, semTidalMarker } from "@/lib/diagram-classes";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { edSvg } from "@/lib/learn-classes";
import { EarthGlobeImage, EARTH_AXIAL_TILT } from "./EarthGlobeImage";
import { EclipticGridLayer } from "./EclipticGridLayer";
import {
  SEM,
  SEM_EARTH_ORBIT_B,
  SEM_GRID,
  SEM_MOON_ORBIT_B,
  dayFromEarthMean,
  earthMeanFromPointer,
  earthOrbitFromMeanAnomaly,
  elongationFromDay,
  ellipsePathAtFocus,
  ellipsePathAtOrigin,
  localRadialOffset,
  moonAbsoluteFromElongation,
  moonLocalFromTrueAnomaly,
  pol,
  sunDirFromEarth,
  sunSiderealLonFromEarthNu,
  yearAngleFromDay,
} from "./sun-earth-moon-math";

interface Props {
  day: number;
  onDay?: (v: number) => void;
  /** Rashi + nakshatra grid (Sun sidereal longitude from Earth). */
  showEclipticGrid?: boolean;
}

export function SunEarthMoonOrbit({ day, onDay, showEclipticGrid = true }: Props) {
  const fmt = (n: number) => toNepaliDigits(n);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);

  const meanDeg = yearAngleFromDay(day);
  const earthOrbit = earthOrbitFromMeanAnomaly(meanDeg);
  const { ex, ey, nuDeg } = earthOrbit;
  const sunLon = sunSiderealLonFromEarthNu(nuDeg);
  const E = elongationFromDay(day);
  const sunDir = sunDirFromEarth(ex, ey);
  const [mx, my] = moonAbsoluteFromElongation(ex, ey, sunDir, E);

  const lean = (EARTH_AXIAL_TILT * Math.PI) / 180;
  const axisUx = Math.sin(lean);
  const axisUy = -Math.cos(lean);
  const eqUx = -axisUy;
  const eqUy = axisUx;
  const eqHalf = SEM.earthR * 0.94;
  const axisLen = SEM.earthR * 2.1;
  const northX = axisUx * axisLen;
  const northY = axisUy * axisLen;
  const southX = -axisUx * axisLen * 0.42;
  const southY = -axisUy * axisLen * 0.42;

  const earthEllipsePath = useMemo(
    () => ellipsePathAtFocus(SEM.cx, SEM.cy, SEM.earthOrbitA, SEM.earthOrbitE),
    [],
  );
  const moonEllipsePath = useMemo(
    () => ellipsePathAtOrigin(SEM.moonOrbitA, SEM.moonOrbitE),
    [],
  );
  const earthOrbitCenterX = SEM.cx + SEM.earthOrbitA * SEM.earthOrbitE;

  /** Tidal lock: this point always sits on the Earth-facing side of the Moon. */
  const earthDir = Math.atan2(-(ey - my), ex - mx) / (Math.PI / 180);
  const [tlX, tlY] = pol(mx, my, SEM.moonR * 0.62, earthDir);

  const dayFromEvt = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return day;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * SEM.W;
    const py = ((e.clientY - r.top) / r.height) * SEM.H;
    return dayFromEarthMean(earthMeanFromPointer(px, py));
  };

  const moonTicks = Array.from({ length: 12 }, (_, k) => {
    const nu = k * 30;
    const [lx, ly] = moonLocalFromTrueAnomaly(nu);
    const [tx, ty] = localRadialOffset(lx, ly, 18);
    const isNew = k === 0;
    const isFull = k === 6;
    return (
      <text
        key={`mn-${k}`}
        x={tx}
        y={ty}
        className={semMoonLabelKey(isNew || isFull)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {isNew ? "नयाँ" : isFull ? "पूर्ण" : fmt(k + 1)}
      </text>
    );
  });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SEM.W} ${SEM.H}`}
      className={edSvg("sem", !!onDay)}
      onPointerDown={(e) => {
        if (!onDay) return;
        drag.current = true;
        onDay(dayFromEvt(e));
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current && onDay) onDay(dayFromEvt(e));
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <defs>
        <radialGradient id="sem-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="38%" stopColor="#ffd24a" />
          <stop offset="78%" stopColor="#f08a1d" />
          <stop offset="100%" stopColor="#d65b12" />
        </radialGradient>
        <radialGradient id="sem-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf57" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#ffcf57" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="sem-moon" cx="36%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#eef1f4" />
          <stop offset="55%" stopColor="#aab2bb" />
          <stop offset="100%" stopColor="#666e79" />
        </radialGradient>
      </defs>

      {showEclipticGrid && <EclipticGridLayer sunLon={sunLon} />}

      <ellipse
        cx={earthOrbitCenterX}
        cy={SEM.cy}
        rx={SEM.earthOrbitA}
        ry={SEM_EARTH_ORBIT_B}
        className={cn(semOrbit, semOrbitGuide)}
      />
      <path d={earthEllipsePath} className={semOrbit} fill="none" />

      <g transform={`translate(${ex} ${ey}) rotate(${-sunDir})`}>
        <ellipse
          cx={SEM.moonOrbitA * SEM.moonOrbitE}
          cy={0}
          rx={SEM.moonOrbitA}
          ry={SEM_MOON_ORBIT_B}
          className={cn(semMoonOrbit, semMoonOrbitGuide)}
        />
        <path d={moonEllipsePath} className={semMoonOrbit} fill="none" />
        {moonTicks}
      </g>

      <line x1={SEM.cx} y1={SEM.cy} x2={ex} y2={ey} className={semRadiusLine} />

      <circle cx={SEM.cx} cy={SEM.cy} r={SEM.sunR + 30} fill="url(#sem-sunglow)" />
      <circle cx={SEM.cx} cy={SEM.cy} r={SEM.sunR} fill="url(#sem-sun)" />
      <text x={SEM.cx} y={SEM.cy + SEM.sunR + 26} className={edBodyLabel} textAnchor="middle">
        सूर्य
      </text>

      <g className={hoEarthGroup} transform={`translate(${ex} ${ey})`}>
        <EarthGlobeImage cx={0} cy={0} r={SEM.earthR} glow glowClassName={semEarthGlow} glowPad={8} />
        <line
          x1={-eqUx * eqHalf}
          y1={-eqUy * eqHalf}
          x2={eqUx * eqHalf}
          y2={eqUy * eqHalf}
          className={hoEquator}
        />
        <line x1={southX} y1={southY} x2={northX} y2={northY} className={hoPoleAxis} />
        <text y={SEM.earthR + 22} className={edBodyLabel} textAnchor="middle">
          पृथ्वी
        </text>
      </g>

      <circle cx={mx} cy={my} r={SEM.moonR} fill="url(#sem-moon)" />
      <circle cx={tlX} cy={tlY} r={2.4} className={semTidalMarker} />

      {showEclipticGrid && (() => {
        const [sunMx, sunMy] = pol(SEM.cx, SEM.cy, (SEM_GRID.rashiIn + SEM_GRID.nakOut) / 2, sunLon);
        return (
          <g>
            <line x1={SEM.cx} y1={SEM.cy} x2={sunMx} y2={sunMy} className={semSunLonRay} />
            <circle cx={sunMx} cy={sunMy} r={5.5} className={semSunLonMarker} />
          </g>
        );
      })()}

      <text x={SEM.cx} y={SEM.H - 18} className={hoOrbitDir} textAnchor="middle">
        ↺ वामावर्त — पृथ्वी १ वर्षमा १ फेरो, चन्द्र सोही समयमा ~{fmt(12)}.{fmt(4)} फेरो
      </text>
    </svg>
  );
}
