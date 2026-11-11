import { Circle, ClipPath, Defs, G, Line, LinearGradient, Marker, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useSvgClass } from "@/components/learn/study/study-ink";
import { StudyDragLayer, useSvgRefShim, type ShimPointerEvent } from "@/components/learn/study/StudyDragLayer";
import { StudySvg } from "@/components/learn/study/StudyCard";
import { useMemo, useRef } from "react";
import { eclAxis, eclBloodGlow, eclBloodTint, eclBodyLabel, eclEarthGlow, ecleclipticRing, eclMoonEclipsed, eclMoonOrbit, eclNodeArrow, eclNodeArrowHead, eclNodeCallout, eclNodeDot, eclNodeLine, eclNodeTitle, eclPanelBg, eclPenumbra, eclPlaneCaption, eclRay, eclStatusFor, eclStatusSub, eclSunDisc, eclTiltNote, eclUmbraShape } from "@vedic-patro/design-tokens/classes/diagram-classes";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { moonSunFacingRotation } from "@vedic-patro/domain/astronomy/moon-phase-svg";
import { EarthGlobeImage } from "@/components/learn/studies/EarthGlobeImageFigure";
import { MoonPhaseDisc } from "@/components/learn/figures/MoonPhaseDiscFigure";
import {
  ECL,
  earthScreen,
  isSolarAlignment,
  localToScreen,
  lunarEclipseStatus,
  moonGeo,
  nodeLineEndpointsInertial,
  nodeMarkersInertial,
  planePtSun,
  realBeta,
  sunScreen,
} from "@/components/learn/studies/eclipse-math";

import { illustration, midnight } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
interface Props {
  u: number;
  omega: number;
  omegaInertial: number;
  earthLon: number;
  onU?: (v: number) => void;
}

const TH_PENUMBRAL_VIS = 34;

function sunOrbitPath(radius: number, step = 4): string {
  const pts: string[] = [];
  for (let a = 0; a <= 360; a += step) {
    const p = planePtSun(a, radius);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function NodeCallout({
  px,
  py,
  label,
  side,
}: {
  px: number;
  py: number;
  label: string;
  side: "left" | "right";
}) {
  const sc = useSvgClass();
  const tx = side === "left" ? px - 118 : px + 118;
  const ty = side === "left" ? py - 62 : py + 62;
  return (
    <G {...sc(eclNodeCallout)}>
      <Line x1={tx} y1={ty + 10} x2={px} y2={py} {...sc(eclNodeArrow)} markerEnd="url(#ecl-node-arrow)" />
      <SvgText x={tx} y={ty} {...sc(eclNodeTitle)} textAnchor="middle">
        {label}
      </SvgText>
    </G>
  );
}

export function EclipseGeometry({ u, omega, omegaInertial, earthLon, onU }: Props) {
  const sc = useSvgClass();
  const fmt = (n: string | number) => toNepaliDigits(n);
  const svgRef = useSvgRefShim();
  const drag = useRef(false);

  const g = moonGeo(u, omega, earthLon);
  const status = lunarEclipseStatus(g);
  const solar = isSolarAlignment(g);
  const sun = sunScreen();
  const earth = earthScreen(earthLon);

  const earthOrbit = useMemo(() => sunOrbitPath(ECL.earthOrbitR), []);
  const nodeLine = useMemo(
    () => nodeLineEndpointsInertial(omegaInertial, earthLon),
    [omegaInertial, earthLon],
  );
  const nodes = useMemo(
    () => nodeMarkersInertial(omegaInertial, earthLon),
    [omegaInertial, earthLon],
  );

  const moonOrbit = useMemo(() => {
    const below: React.ReactNode[] = [];
    const above: React.ReactNode[] = [];
    const STEP = 4;
    for (let uu = 0; uu < 360; uu += STEP) {
      const a = moonGeo(uu, omega, earthLon);
      const b = moonGeo(uu + STEP, omega, earthLon);
      const isAbove = a.zEc + b.zEc >= 0;
      const seg = (
        <Line
          key={`o${uu}`}
          x1={a.sx}
          y1={a.sy}
          x2={b.sx}
          y2={b.sy}
          {...sc(eclMoonOrbit(isAbove))}
        />
      );
      (isAbove ? above : below).push(seg);
    }
    return { below, above };
  }, [omega, earthLon]);

  const asc = nodes.asc;
  const desc = nodes.desc;
  const moonAbove = g.zEc >= 0;

  const moonRot = moonSunFacingRotation(g.sx, g.sy, sun.x, sun.y);

  const shadowCone = useMemo(() => {
    const tipU = localToScreen(ECL.umbraLen, 0, 0, earthLon);
    const tipP = localToScreen(ECL.penumbraLen, 0, 0, earthLon);
    const topU = localToScreen(0, -ECL.earthR, 0, earthLon);
    const botU = localToScreen(0, ECL.earthR, 0, earthLon);
    const topP = localToScreen(0, -ECL.earthR * 1.35, 0, earthLon);
    const botP = localToScreen(0, ECL.earthR * 1.35, 0, earthLon);
    return { tipU, tipP, topU, botU, topP, botP };
  }, [earthLon]);

  const uFromEvt = (e: ShimPointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return u;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * ECL.W;
    const py = ((e.clientY - r.top) / r.height) * ECL.H;
    let best = u;
    let bestD = Infinity;
    for (let k = 0; k < 360; k += 2) {
      const p = moonGeo(k, omega, earthLon);
      const d = (p.sx - px) ** 2 + (p.sy - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  };

  const rays = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    const r0 = ECL.sunR + 4;
    const r1 = ECL.sunR + (k % 2 ? 14 : 22);
    return (
      <Line
        key={`ray${k}`}
        x1={sun.x + r0 * Math.cos(a)}
        y1={sun.y + r0 * Math.sin(a)}
        x2={sun.x + r1 * Math.cos(a)}
        y2={sun.y + r1 * Math.sin(a)}
        {...sc(eclRay)}
      />
    );
  });

  const moonGroup = (
    <G
      transform={`translate(${g.sx} ${g.sy}) rotate(${moonRot})`}
      {...sc(status === "total" ? eclMoonEclipsed : undefined)}
    >
      {(status === "total" || status === "partial") && (
        <Circle cx={0} cy={0} r={ECL.moonR + 4} {...sc(eclBloodGlow)} />
      )}
      <MoonPhaseDisc elongation={status === "total" ? 178 : g.E} r={ECL.moonR} uid="ecl-moon" />
      {status === "total" && <Circle cx={0} cy={0} r={ECL.moonR} {...sc(eclBloodTint)} />}
    </G>
  );

  const statusLabel =
    status === "total"
      ? tFor(undefined, "learn.study.eclipse.status_total")
      : status === "partial"
        ? tFor(undefined, "learn.study.eclipse.status_partial")
        : status === "penumbral"
          ? tFor(undefined, "ui.learn.x_0793f232")
          : solar
            ? tFor(undefined, "ui.learn.x_7d7d699d")
            : tFor(undefined, "learn.study.eclipse.status_none");

  const showShadow =
    status !== "none" || solar || (g.xEc > 0.3 && Math.abs(g.radial) < TH_PENUMBRAL_VIS);

  return (
    <StudySvg w={ECL.W} h={ECL.H} label={""} overlay={<StudyDragLayer svgRef={svgRef} onPointerDown={(e) => {
        if (!onU) return;
        drag.current = true;
        onU(uFromEvt(e));
        e.currentTarget.setPointerCapture(e.pointerId);
      }} onPointerMove={(e) => {
        if (drag.current && onU) onU(uFromEvt(e));
      }} onPointerUp={() => {
        drag.current = false;
      }} onPointerCancel={() => {
        drag.current = false;
      }} />}>
      <Defs>
        <RadialGradient id="ecl-sun" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber92} />
          <Stop offset="38%" stopColor={illustration.amber67} />
          <Stop offset="78%" stopColor={illustration.orange53} />
          <Stop offset="100%" stopColor={illustration.orange45} />
        </RadialGradient>
        <RadialGradient id="ecl-sunglow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber67} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={illustration.amber67} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="ecl-umbra" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={midnight.background} stopOpacity={0.88} />
          <Stop offset="100%" stopColor={midnight.background} stopOpacity={0.55} />
        </LinearGradient>
        <Marker id="ecl-node-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <Path d="M0,0 L9,4.5 L0,9 Z" {...sc(eclNodeArrowHead)} />
        </Marker>
        <ClipPath id="ecl-panel-clip">
          <Rect x={8} y={8} width={ECL.W - 16} height={ECL.H - 16} rx={18} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#ecl-panel-clip)">
        <Rect x={0} y={0} width={ECL.W} height={ECL.H} {...sc(eclPanelBg)} />

        {/* Sun at centre */}
        <Circle cx={sun.x} cy={sun.y} r={ECL.sunR + 30} fill="url(#ecl-sunglow)" />
        {rays}
        <Circle cx={sun.x} cy={sun.y} r={ECL.sunR} fill="url(#ecl-sun)" {...sc(eclSunDisc)} />
        <SvgText x={sun.x} y={sun.y + ECL.sunR + 28} {...sc(eclBodyLabel)} textAnchor="middle">
          {tFor(undefined, "kundali.report.meta_sun")}
        </SvgText>

        {/* Earth's orbital path around the Sun (क्रान्तिवृत्त) */}
        <Path d={earthOrbit} {...sc(ecleclipticRing)} fill="none" />

        {/* राहु–केतु रेखा — through Earth's centre */}
        <Line
          x1={nodeLine.a.x}
          y1={nodeLine.a.y}
          x2={nodeLine.b.x}
          y2={nodeLine.b.y}
          {...sc(eclNodeLine)}
        />

        {/* Moon orbit — below the ecliptic plane */}
        {moonOrbit.below}

        {/* Sun–Earth line */}
        <Line x1={sun.x} y1={sun.y} x2={earth.x} y2={earth.y} {...sc(eclAxis)} />

        {showShadow && (
          <>
            <Path
              d={`M ${shadowCone.topP.x} ${shadowCone.topP.y}
                  L ${shadowCone.tipP.x} ${shadowCone.tipP.y}
                  L ${shadowCone.botP.x} ${shadowCone.botP.y} Z`}
              {...sc(eclPenumbra)}
            />
            <Path
              d={`M ${shadowCone.topU.x} ${shadowCone.topU.y}
                  L ${shadowCone.tipU.x} ${shadowCone.tipU.y}
                  L ${shadowCone.botU.x} ${shadowCone.botU.y} Z`}
              fill="url(#ecl-umbra)"
              {...sc(eclUmbraShape)}
            />
          </>
        )}

        {!moonAbove && moonGroup}

        {/* Earth on its orbit — rotating globe */}
        <G transform={`translate(${earth.x} ${earth.y})`}>
          <EarthGlobeImage cx={0} cy={0} r={ECL.earthR} glow glowClassName={eclEarthGlow} glowPad={8} />
        </G>

        {moonOrbit.above}

        <Circle cx={asc.x} cy={asc.y} r={7} {...sc(eclNodeDot)} />
        <Circle cx={desc.x} cy={desc.y} r={7} {...sc(eclNodeDot)} />

        <NodeCallout
          px={asc.x}
          py={asc.y}
          label={tFor(undefined, "ui.learn.x_47c24036")}
          side={asc.x < earth.x ? "left" : "right"}
        />
        <NodeCallout
          px={desc.x}
          py={desc.y}
          label={tFor(undefined, "ui.learn.x_fd9918e5")}
          side={desc.x < earth.x ? "left" : "right"}
        />

        {moonAbove && moonGroup}

        <SvgText x={earth.x} y={earth.y + ECL.earthR + 30} {...sc(eclBodyLabel)} textAnchor="middle">
          {tFor(undefined, "vastu.element.earth")}
        </SvgText>

        <SvgText x={ECL.W / 2} y={ECL.H - 52} {...sc(eclPlaneCaption)} textAnchor="middle">
          {tFor(undefined, "ui.learn.x_f915ca7c")}
        </SvgText>
        <SvgText x={ECL.W / 2} y={ECL.H - 28} {...sc(eclTiltNote)} textAnchor="middle">
          {tFor(undefined, "ui.learn.x_28614245")}{fmt(5)}{tFor(undefined, "ui.learn.x_a415b0a7")}{fmt(19)}{tFor(undefined, "ui.learn.x_4d6a4881")}
        </SvgText>
      </G>

      <G transform={`translate(${ECL.W - 30} 40)`}>
        <SvgText
          textAnchor="end"
          {...sc(eclStatusFor(
            status === "none" ? "none" : status,
            status === "none" && solar,
          ))}
        >
          {statusLabel}
        </SvgText>
        <SvgText textAnchor="end" y={26} {...sc(eclStatusSub)}>
          {tFor(undefined, "ui.learn.x_05739f5a")}{fmt(Math.abs(realBeta(g.betaDeg)).toFixed(1))}{tFor(undefined, "ui.learn.x_09ff5cb3")}{fmt(Math.round(g.E))}°
        </SvgText>
      </G>
    </StudySvg>
  );
}
