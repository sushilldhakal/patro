import { useMemo, useRef } from "react";
import { eclAxis, eclBloodGlow, eclBloodTint, eclBodyLabel, eclEarthGlow, ecleclipticRing, eclMoonEclipsed, eclMoonOrbit, eclNodeArrow, eclNodeArrowHead, eclNodeCallout, eclNodeDot, eclNodeLine, eclNodeTitle, eclPanelBg, eclPenumbra, eclPlaneCaption, eclRay, eclStatusFor, eclStatusSub, eclSunDisc, eclTiltNote, eclUmbraShape } from "@/lib/diagram-classes";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { edSvg } from "@/lib/learn-classes";
import { moonSunFacingRotation } from "@/lib/moon-phase-svg";
import { EarthGlobeImage } from "./EarthGlobeImage";
import { MoonPhaseDisc } from "@/components/tithi-mechanics/MoonPhaseDisc";
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
} from "./eclipse-math";

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
  const tx = side === "left" ? px - 118 : px + 118;
  const ty = side === "left" ? py - 62 : py + 62;
  return (
    <g className={eclNodeCallout}>
      <line x1={tx} y1={ty + 10} x2={px} y2={py} className={eclNodeArrow} markerEnd="url(#ecl-node-arrow)" />
      <text x={tx} y={ty} className={eclNodeTitle} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

export function EclipseGeometry({ u, omega, omegaInertial, earthLon, onU }: Props) {
  const fmt = (n: string | number) => toNepaliDigits(n);
  const svgRef = useRef<SVGSVGElement>(null);
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
        <line
          key={`o${uu}`}
          x1={a.sx}
          y1={a.sy}
          x2={b.sx}
          y2={b.sy}
          className={eclMoonOrbit(isAbove)}
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

  const uFromEvt = (e: React.PointerEvent) => {
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
      <line
        key={`ray${k}`}
        x1={sun.x + r0 * Math.cos(a)}
        y1={sun.y + r0 * Math.sin(a)}
        x2={sun.x + r1 * Math.cos(a)}
        y2={sun.y + r1 * Math.sin(a)}
        className={eclRay}
      />
    );
  });

  const moonGroup = (
    <g
      transform={`translate(${g.sx} ${g.sy}) rotate(${moonRot})`}
      className={status === "total" ? eclMoonEclipsed : undefined}
    >
      {(status === "total" || status === "partial") && (
        <circle cx={0} cy={0} r={ECL.moonR + 4} className={eclBloodGlow} />
      )}
      <MoonPhaseDisc elongation={status === "total" ? 178 : g.E} r={ECL.moonR} uid="ecl-moon" />
      {status === "total" && <circle cx={0} cy={0} r={ECL.moonR} className={eclBloodTint} />}
    </g>
  );

  const statusLabel =
    status === "total"
      ? "पूर्ण ग्रहण"
      : status === "partial"
        ? "खण्डग्रास"
        : status === "penumbral"
          ? "उपछायाँ ग्रहण"
          : solar
            ? "सूर्यग्रहण रेखा"
            : "ग्रहण छैन";

  const showShadow =
    status !== "none" || solar || (g.xEc > 0.3 && Math.abs(g.radial) < TH_PENUMBRAL_VIS);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${ECL.W} ${ECL.H}`}
      className={edSvg("ecl", !!onU)}
      onPointerDown={(e) => {
        if (!onU) return;
        drag.current = true;
        onU(uFromEvt(e));
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current && onU) onU(uFromEvt(e));
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <defs>
        <radialGradient id="ecl-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="38%" stopColor="#ffd24a" />
          <stop offset="78%" stopColor="#f08a1d" />
          <stop offset="100%" stopColor="#d65b12" />
        </radialGradient>
        <radialGradient id="ecl-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf57" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#ffcf57" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="ecl-umbra" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#11151b" stopOpacity={0.88} />
          <stop offset="100%" stopColor="#11151b" stopOpacity={0.55} />
        </linearGradient>
        <marker id="ecl-node-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" className={eclNodeArrowHead} />
        </marker>
        <clipPath id="ecl-panel-clip">
          <rect x={8} y={8} width={ECL.W - 16} height={ECL.H - 16} rx={18} />
        </clipPath>
      </defs>

      <g clipPath="url(#ecl-panel-clip)">
        <rect x={0} y={0} width={ECL.W} height={ECL.H} className={eclPanelBg} />

        {/* Sun at centre */}
        <circle cx={sun.x} cy={sun.y} r={ECL.sunR + 30} fill="url(#ecl-sunglow)" />
        {rays}
        <circle cx={sun.x} cy={sun.y} r={ECL.sunR} fill="url(#ecl-sun)" className={eclSunDisc} />
        <text x={sun.x} y={sun.y + ECL.sunR + 28} className={eclBodyLabel} textAnchor="middle">
          सूर्य
        </text>

        {/* Earth's orbital path around the Sun (क्रान्तिवृत्त) */}
        <path d={earthOrbit} className={ecleclipticRing} fill="none" />

        {/* राहु–केतु रेखा — through Earth's centre */}
        <line
          x1={nodeLine.a.x}
          y1={nodeLine.a.y}
          x2={nodeLine.b.x}
          y2={nodeLine.b.y}
          className={eclNodeLine}
        />

        {/* Moon orbit — below the ecliptic plane */}
        {moonOrbit.below}

        {/* Sun–Earth line */}
        <line x1={sun.x} y1={sun.y} x2={earth.x} y2={earth.y} className={eclAxis} />

        {showShadow && (
          <>
            <path
              d={`M ${shadowCone.topP.x} ${shadowCone.topP.y}
                  L ${shadowCone.tipP.x} ${shadowCone.tipP.y}
                  L ${shadowCone.botP.x} ${shadowCone.botP.y} Z`}
              className={eclPenumbra}
            />
            <path
              d={`M ${shadowCone.topU.x} ${shadowCone.topU.y}
                  L ${shadowCone.tipU.x} ${shadowCone.tipU.y}
                  L ${shadowCone.botU.x} ${shadowCone.botU.y} Z`}
              fill="url(#ecl-umbra)"
              className={eclUmbraShape}
            />
          </>
        )}

        {!moonAbove && moonGroup}

        {/* Earth on its orbit — rotating globe */}
        <g transform={`translate(${earth.x} ${earth.y})`}>
          <EarthGlobeImage cx={0} cy={0} r={ECL.earthR} glow glowClassName={eclEarthGlow} glowPad={8} />
        </g>

        {moonOrbit.above}

        <circle cx={asc.x} cy={asc.y} r={7} className={eclNodeDot} />
        <circle cx={desc.x} cy={desc.y} r={7} className={eclNodeDot} />

        <NodeCallout
          px={asc.x}
          py={asc.y}
          label="राहु · उत्तरी पात"
          side={asc.x < earth.x ? "left" : "right"}
        />
        <NodeCallout
          px={desc.x}
          py={desc.y}
          label="केतु · दक्षिणी पात"
          side={desc.x < earth.x ? "left" : "right"}
        />

        {moonAbove && moonGroup}

        <text x={earth.x} y={earth.y + ECL.earthR + 30} className={eclBodyLabel} textAnchor="middle">
          पृथ्वी
        </text>

        <text x={ECL.W / 2} y={ECL.H - 52} className={eclPlaneCaption} textAnchor="middle">
          क्रान्तिवृत्त — पृथ्वीको सूर्याङ्को कक्ष (ठोस वृत्त)
        </text>
        <text x={ECL.W / 2} y={ECL.H - 28} className={eclTiltNote} textAnchor="middle">
          चन्द्र-कक्ष ~{fmt(5)}° झुकेको (टुट्टेदार) · राहु–केतु घडीको दिशामा ~{fmt(19)} वर्षे चक्र
        </text>
      </g>

      <g transform={`translate(${ECL.W - 30} 40)`}>
        <text
          textAnchor="end"
          className={eclStatusFor(
            status === "none" ? "none" : status,
            status === "none" && solar,
          )}
        >
          {statusLabel}
        </text>
        <text textAnchor="end" y={26} className={eclStatusSub}>
          अक्षांश β = {fmt(Math.abs(realBeta(g.betaDeg)).toFixed(1))}° · कोण {fmt(Math.round(g.E))}°
        </text>
      </g>
    </svg>
  );
}
