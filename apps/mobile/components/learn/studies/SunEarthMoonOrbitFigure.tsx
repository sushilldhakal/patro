import { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { useSvgClass } from "@/components/learn/study/study-ink";
import { StudyDragLayer, useSvgRefShim, type ShimPointerEvent } from "@/components/learn/study/StudyDragLayer";
import { StudySvg } from "@/components/learn/study/StudyCard";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useMemo, useRef } from "react";
import { edBodyLabel, hoEarthGroup, hoEquator, hoOrbitDir, hoPoleAxis, semEarthGlow, semMoonLabelKey, semMoonOrbit, semMoonOrbitGuide, semOrbit, semOrbitGuide, semRadiusLine, semSunLonMarker, semSunLonRay, semTidalMarker } from "@vedic-patro/design-tokens/classes/diagram-classes";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { EarthGlobeImage, EARTH_AXIAL_TILT } from "@/components/learn/studies/EarthGlobeImageFigure";
import { EclipticGridLayer } from "@/components/learn/studies/EclipticGridLayerFigure";
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
} from "@/components/learn/studies/sun-earth-moon-math";

import { brand, illustration, midnight } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
interface Props {
  day: number;
  onDay?: (v: number) => void;
  /** Rashi + nakshatra grid (Sun sidereal longitude from Earth). */
  showEclipticGrid?: boolean;
}

export function SunEarthMoonOrbit({ day, onDay, showEclipticGrid = true }: Props) {
  const sc = useSvgClass();
  const fmt = (n: number) => toNepaliDigits(n);
  const svgRef = useSvgRefShim();
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

  const dayFromEvt = (e: ShimPointerEvent) => {
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
      <SvgText
        key={`mn-${k}`}
        x={tx}
        y={ty}
        {...sc(semMoonLabelKey(isNew || isFull))}
        textAnchor="middle"
        alignmentBaseline="central"
      >
        {isNew ? tFor(undefined, "ui.learn.x_71469f61") : isFull ? tFor(undefined, "kundali.x.grade_full") : fmt(k + 1)}
      </SvgText>
    );
  });

  return (
    <StudySvg w={SEM.W} h={SEM.H} label={""} overlay={<StudyDragLayer svgRef={svgRef} onPointerDown={(e) => {
        if (!onDay) return;
        drag.current = true;
        onDay(dayFromEvt(e));
        e.currentTarget.setPointerCapture(e.pointerId);
      }} onPointerMove={(e) => {
        if (drag.current && onDay) onDay(dayFromEvt(e));
      }} onPointerUp={() => {
        drag.current = false;
      }} onPointerCancel={() => {
        drag.current = false;
      }} />}>
      <Defs>
        <RadialGradient id="sem-sun" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber92} />
          <Stop offset="38%" stopColor={illustration.amber67} />
          <Stop offset="78%" stopColor={illustration.orange53} />
          <Stop offset="100%" stopColor={illustration.orange45} />
        </RadialGradient>
        <RadialGradient id="sem-sunglow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber67} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={illustration.amber67} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="sem-moon" cx="36%" cy="32%" r="74%">
          <Stop offset="0%" stopColor={brand.offWhite} />
          <Stop offset="55%" stopColor={midnight.mutedForeground} />
          <Stop offset="100%" stopColor={illustration.gray46} />
        </RadialGradient>
      </Defs>

      {showEclipticGrid && <EclipticGridLayer sunLon={sunLon} />}

      <Ellipse
        cx={earthOrbitCenterX}
        cy={SEM.cy}
        rx={SEM.earthOrbitA}
        ry={SEM_EARTH_ORBIT_B}
        {...sc(cn(semOrbit, semOrbitGuide))}
      />
      <Path d={earthEllipsePath} {...sc(semOrbit)} fill="none" />

      <G transform={`translate(${ex} ${ey}) rotate(${-sunDir})`}>
        <Ellipse
          cx={SEM.moonOrbitA * SEM.moonOrbitE}
          cy={0}
          rx={SEM.moonOrbitA}
          ry={SEM_MOON_ORBIT_B}
          {...sc(cn(semMoonOrbit, semMoonOrbitGuide))}
        />
        <Path d={moonEllipsePath} {...sc(semMoonOrbit)} fill="none" />
        {moonTicks}
      </G>

      <Line x1={SEM.cx} y1={SEM.cy} x2={ex} y2={ey} {...sc(semRadiusLine)} />

      <Circle cx={SEM.cx} cy={SEM.cy} r={SEM.sunR + 30} fill="url(#sem-sunglow)" />
      <Circle cx={SEM.cx} cy={SEM.cy} r={SEM.sunR} fill="url(#sem-sun)" />
      <SvgText x={SEM.cx} y={SEM.cy + SEM.sunR + 26} {...sc(edBodyLabel)} textAnchor="middle">
        {tFor(undefined, "kundali.report.meta_sun")}
      </SvgText>

      <G {...sc(hoEarthGroup)} transform={`translate(${ex} ${ey})`}>
        <EarthGlobeImage cx={0} cy={0} r={SEM.earthR} glow glowClassName={semEarthGlow} glowPad={8} />
        <Line
          x1={-eqUx * eqHalf}
          y1={-eqUy * eqHalf}
          x2={eqUx * eqHalf}
          y2={eqUy * eqHalf}
          {...sc(hoEquator)}
        />
        <Line x1={southX} y1={southY} x2={northX} y2={northY} {...sc(hoPoleAxis)} />
        <SvgText y={SEM.earthR + 22} {...sc(edBodyLabel)} textAnchor="middle">
          {tFor(undefined, "vastu.element.earth")}
        </SvgText>
      </G>

      <Circle cx={mx} cy={my} r={SEM.moonR} fill="url(#sem-moon)" />
      <Circle cx={tlX} cy={tlY} r={2.4} {...sc(semTidalMarker)} />

      {showEclipticGrid && (() => {
        const [sunMx, sunMy] = pol(SEM.cx, SEM.cy, (SEM_GRID.rashiIn + SEM_GRID.nakOut) / 2, sunLon);
        return (
          <G>
            <Line x1={SEM.cx} y1={SEM.cy} x2={sunMx} y2={sunMy} {...sc(semSunLonRay)} />
            <Circle cx={sunMx} cy={sunMy} r={5.5} {...sc(semSunLonMarker)} />
          </G>
        );
      })()}

      <SvgText x={SEM.cx} y={SEM.H - 18} {...sc(hoOrbitDir)} textAnchor="middle">
        {tFor(undefined, "ui.learn.x_2ccb2c5f")}{fmt(12)}.{fmt(4)}{tFor(undefined, "ui.learn.x_02f5808c")}
      </SvgText>
    </StudySvg>
  );
}
