import { useId } from "react";
import { WHEEL_SIZE } from "@vedic-patro/domain/vastu/vastu";
import {
  VASTU_DIR16,
  VASTU_ELEMENT_COLOR,
  VASTU_ELEMENT_ORDER,
  VASTU_GUNA_COLOR,
  VASTU_INNER4,
  VASTU_PADAS,
  VASTU_WHEEL_DIRECTIONS,
  annularSectorPath as annularSectorPathAt,
  isDir16,
  isInner4,
  isPada,
  vastuDir16,
  vastuDirection,
  vastuElementAtBearing,
  vastuPada,
  vastuWheelPoint,
  type VastuSelectionId,
} from "@vedic-patro/domain/vastu/vastu";
import { cn } from "@vedic-patro/design-tokens/cn";
import { annulusPath } from "@vedic-patro/domain/vastu/vastu-purusha-wheel";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import {
  VASTU_COMPASS_16,
  VASTU_GUNA_BANDS,
  VASTU_WHEEL_GEOMETRY,
  useVastuPurushaWheel,
} from "@vedic-patro/features/vastu";
import type { VastuPurushaWheelProps } from "../contract";
import { ArcLabel, PadaCodeLabel, RingSeparators, VastuPurushaSilhouette } from "./WheelMarks";

const {
  PURUSHA_OPACITY, DEG_OUTER, DEG_INNER, GUNA_OUTER, GUNA_INNER, DIR16_OUTER, DIR16_INNER,
  CODE_OUTER, CODE_INNER, DEITY_OUTER, DEITY_INNER, WEDGE_OUTER, WEDGE_INNER, INNER4_OUTER,
  INNER4_INNER, CENTER_R, PURUSHA_SIZE, DEG_LABEL_R, GUNA_LABEL_R, DIR16_LABEL_R, CODE_LABEL_R,
  DEITY_LABEL_R, WEDGE_LABEL_R, INNER4_LABEL_R, PADA_HALF, RING_DIVIDERS, GUNA_BOUNDARIES,
  DIR16_BOUNDARIES, PADA_BOUNDARIES, DIR8_BOUNDARIES, INNER4_BOUNDARIES,
} = VASTU_WHEEL_GEOMETRY;
const GUNA_BANDS = VASTU_GUNA_BANDS;
const COMPASS_16 = VASTU_COMPASS_16;

function HitSector({
  d,
  label,
  active,
  color,
  onSelect,
}: {
  d: string;
  label: string;
  active: boolean;
  color: string;
  onSelect: () => void;
}) {
  return (
    <path
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={label}
      d={d}
      fill="transparent"
      className="cursor-pointer outline-none focus-visible:stroke-[3]"
      stroke={color}
      strokeOpacity={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    />
  );
}


export function VastuPurushaWheel({
  selected, onSelect, centerContent, headingDeg = null, center, ink, marks, className,
}: VastuPurushaWheelProps) {
  const w = useVastuPurushaWheel();
  const digits = w.digits;
  const CX = center.cx;
  const CY = center.cy;
  const VASTU_INK = ink;
  const annularSectorPath = (bearing: number, halfAngle: number, outerR: number, innerR: number) =>
    annularSectorPathAt(bearing, halfAngle, outerR, innerR, CX, CY);
  function selectionSlices(selected: VastuSelectionId): { d: string; color: string }[] {
    if (isPada(selected)) {
      const pada = vastuPada(selected);
      return [
        {
          d: annularSectorPath(pada.bearing, PADA_HALF, CODE_OUTER, DEITY_INNER),
          color: VASTU_ELEMENT_COLOR[pada.element],
        },
      ];
    }
    if (isInner4(selected)) {
      const inner = VASTU_INNER4.find((d) => d.id === selected)!;
      return [
        {
          d: annularSectorPath(inner.bearing, 45, INNER4_OUTER, INNER4_INNER),
          color: VASTU_ELEMENT_COLOR[inner.element],
        },
      ];
    }
    if (isDir16(selected)) {
      const zone = vastuDir16(selected);
      return [
        {
          d: annularSectorPath(zone.bearing, 11.25, GUNA_OUTER, DIR16_INNER),
          color: VASTU_ELEMENT_COLOR[zone.element],
        },
      ];
    }
    const dir = vastuDirection(selected);
    if (dir.bearing === null) return [];
    return [
      {
        d: annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER),
        color: VASTU_ELEMENT_COLOR[dir.element],
      },
    ];
  }
  
  
  const clipId = `vastu-purusha-${useId().replace(/:/g, "")}`;

  return (
    <div>
    <svg
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
      className={cn("mx-auto block h-auto w-full", className)}
      overflow="visible"
      role="group"
      aria-label={w.heading}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={DIR16_INNER} />
        </clipPath>
      </defs>
      <g
        transform={
          headingDeg == null ? undefined : `rotate(${(-headingDeg).toFixed(2)} ${CX} ${CY})`
        }
      >
      <circle cx={CX} cy={CY} r={DEG_OUTER} fill={VASTU_INK.background} />

      {/* Triguna ring */}
      {GUNA_BANDS.map((band) => {
        const color = VASTU_GUNA_COLOR[band.id];
        const labelFill = band.id === "tamas" ? VASTU_INK.background : VASTU_INK.text;
        return (
          <g key={band.key} aria-hidden="true">
            <title>{w.organ(band.id)}</title>
            <path
              d={annularSectorPath(band.bearing, band.halfAngle, GUNA_OUTER, GUNA_INNER)}
              fill={color}
              fillOpacity={0.92}
            />
            <ArcLabel center={center} bearing={band.bearing} radius={GUNA_LABEL_R} fontSize={10} className="font-bold" fill={labelFill}>
              {w.organ(band.id)}
            </ArcLabel>
          </g>
        );
      })}

      {/* 16 compass + life attribute — coloured by tattva */}
      {COMPASS_16.map((point, i) => {
        const color = VASTU_ELEMENT_COLOR[vastuElementAtBearing(point.bearing)];
        const attr = w.dir16[i]!.attr;
        const active = point.zone === selected;
        return (
          <g key={point.abbr} aria-hidden="true">
            <title>{w.dir16[i]!.title}</title>
            <path
              d={annularSectorPath(point.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
              fill={color}
              fillOpacity={active ? 0.72 : 0.42}
            />
            <ArcLabel center={center} bearing={point.bearing} radius={DIR16_LABEL_R + 11} fontSize={11} className="font-bold" fill={VASTU_INK.text}>
              {point.abbr}
            </ArcLabel>
            <ArcLabel center={center} bearing={point.bearing} radius={DIR16_LABEL_R - 11} fontSize={9} className="font-semibold" fill={VASTU_INK.text}>
              {attr}
            </ArcLabel>
          </g>
        );
      })}

      {VASTU_PADAS.map((pada) => {
        const color = VASTU_ELEMENT_COLOR[pada.element];
        const active = selected === pada.id;
        return (
          <g key={`code-${pada.code}`} aria-hidden="true">
            <title>{w.padaCodeTitle(pada)}</title>
            <path
              d={annularSectorPath(pada.bearing, PADA_HALF, CODE_OUTER, CODE_INNER)}
              fill={color}
              fillOpacity={active ? 0.7 : 0.38}
            />
            <PadaCodeLabel center={center} ink={VASTU_INK.text} marks={marks}
              bearing={pada.bearing}
              radius={CODE_LABEL_R}
              code={w.padaCode(pada)}
              status={pada.status}
            />
          </g>
        );
      })}

      {VASTU_PADAS.map((pada) => {
        const color = VASTU_ELEMENT_COLOR[pada.element];
        const active = selected === pada.id;
        return (
          <g key={`deity-${pada.id}`} aria-hidden="true">
            <title>{w.padaDeityTitle(pada)}</title>
            <path
              d={annularSectorPath(pada.bearing, PADA_HALF, DEITY_OUTER, DEITY_INNER)}
              fill={color}
              fillOpacity={active ? 0.7 : 0.34}
            />
            <ArcLabel center={center} bearing={pada.bearing} radius={DEITY_LABEL_R} fontSize={9} className="font-semibold" fill={VASTU_INK.text}>
              {w.padaName(pada.id)}
            </ArcLabel>
          </g>
        );
      })}

      {VASTU_INNER4.map((devata) => {
        const color = VASTU_ELEMENT_COLOR[devata.element];
        const label = vastuWheelPoint(devata.bearing, INNER4_LABEL_R, CX, CY);
        const active = selected === devata.id;
        return (
          <g key={devata.id} aria-hidden="true">
            <path
              d={annularSectorPath(devata.bearing, 45, INNER4_OUTER, INNER4_INNER)}
              fill={color}
              fillOpacity={active ? 0.4 : 0.22}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none font-semibold"
              fill={VASTU_INK.text}
              fillOpacity={0.88}
              fontSize={12}
            >
              {w.padaName(devata.id)}
            </text>
          </g>
        );
      })}

      {/* 8-direction fills sit under the Purusha so the figure stays visible. */}
      {VASTU_WHEEL_DIRECTIONS.map((dir) => {
        const active = dir.id === selected;
        const color = VASTU_ELEMENT_COLOR[dir.element];
        return (
          <path
            key={`wedge-fill-${dir.id}`}
            d={annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER)}
            fill={color}
            fillOpacity={active ? 0.42 : 0.18}
            className="pointer-events-none transition-[fill-opacity]"
          />
        );
      })}
      <circle
        cx={CX}
        cy={CY}
        r={CENTER_R}
        fill={VASTU_ELEMENT_COLOR.space}
        fillOpacity={selected === "center" ? 0.28 : 0.14}
        className="pointer-events-none"
      />

      <g clipPath={`url(#${clipId})`} pointerEvents="none" aria-hidden>
        <g transform={`translate(${CX} ${CY})`} opacity={PURUSHA_OPACITY} style={{ color: VASTU_INK.text }}>
          <VastuPurushaSilhouette size={PURUSHA_SIZE} color={VASTU_INK.text} />
        </g>
      </g>

      {RING_DIVIDERS.map((r) => (
        <circle
          key={`div-${r}`}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke={VASTU_INK.text}
          strokeOpacity={0.48}
          strokeWidth={0.95}
        />
      ))}
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={GUNA_BOUNDARIES} innerR={GUNA_INNER} outerR={GUNA_OUTER} />
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={DIR16_BOUNDARIES} innerR={DIR16_INNER} outerR={DIR16_OUTER} />
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={PADA_BOUNDARIES} innerR={CODE_INNER} outerR={CODE_OUTER} />
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={PADA_BOUNDARIES} innerR={DEITY_INNER} outerR={DEITY_OUTER} />
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={DIR8_BOUNDARIES} innerR={WEDGE_INNER} outerR={WEDGE_OUTER} />
      <RingSeparators center={center} ink={VASTU_INK.text} bearings={INNER4_BOUNDARIES} innerR={INNER4_INNER} outerR={INNER4_OUTER} />

      {VASTU_WHEEL_DIRECTIONS.map((dir) => {
        const active = dir.id === selected;
        const label = vastuWheelPoint(dir.bearing, WEDGE_LABEL_R, CX, CY);
        return (
          <text
            key={`wedge-label-${dir.id}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn("pointer-events-none select-none", active ? "font-bold" : "font-semibold")}
            fill={VASTU_INK.text}
            fillOpacity={active ? 1 : 0.82}
            fontSize={11}
          >
            {w.dirName(dir.id)}
          </text>
        );
      })}

      <line x1={CX - 5} y1={CY} x2={CX + 5} y2={CY} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
      <line x1={CX} y1={CY - 5} x2={CX} y2={CY + 5} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
      {centerContent ?? (
        <text
          x={CX}
          y={CY + 16}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none select-none font-bold"
          fill={VASTU_INK.text}
          fillOpacity={0.9}
          fontSize={16}
        >
          {w.centerDeity}
        </text>
      )}

      {VASTU_DIR16.map((dir) => (
        <HitSector
          key={`hit-guna-${dir.id}`}
          d={annularSectorPath(dir.bearing, 11.25, GUNA_OUTER, GUNA_INNER)}
          label={w.dir16Name(dir.id)}
          active={dir.id === selected}
          color={VASTU_ELEMENT_COLOR[dir.element]}
          onSelect={() => onSelect(dir.id)}
        />
      ))}

      {VASTU_DIR16.map((dir) => (
        <HitSector
          key={`hit-16-${dir.id}`}
          d={annularSectorPath(dir.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
          label={w.dir16Hit(dir.id, dir.attrKey)}
          active={dir.id === selected}
          color={VASTU_ELEMENT_COLOR[dir.element]}
          onSelect={() => onSelect(dir.id)}
        />
      ))}

      {VASTU_PADAS.map((pada) => (
        <HitSector
          key={`hit-code-${pada.id}`}
          d={annularSectorPath(pada.bearing, PADA_HALF, CODE_OUTER, CODE_INNER)}
          label={w.padaHit(pada)}
          active={selected === pada.id}
          color={VASTU_ELEMENT_COLOR[pada.element]}
          onSelect={() => onSelect(pada.id)}
        />
      ))}

      {VASTU_PADAS.map((pada) => (
        <HitSector
          key={`hit-deity-${pada.id}`}
          d={annularSectorPath(pada.bearing, PADA_HALF, DEITY_OUTER, DEITY_INNER)}
          label={w.padaName(pada.id)}
          active={selected === pada.id}
          color={VASTU_ELEMENT_COLOR[pada.element]}
          onSelect={() => onSelect(pada.id)}
        />
      ))}

      {VASTU_WHEEL_DIRECTIONS.map((dir) => (
        <HitSector
          key={`hit-8-${dir.id}`}
          d={annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER)}
          label={w.dirName(dir.id)}
          active={dir.id === selected}
          color={VASTU_ELEMENT_COLOR[dir.element]}
          onSelect={() => onSelect(dir.id)}
        />
      ))}

      {VASTU_INNER4.map((devata) => (
        <HitSector
          key={`hit-inner4-${devata.id}`}
          d={annularSectorPath(devata.bearing, 45, INNER4_OUTER, INNER4_INNER)}
          label={w.padaName(devata.id)}
          active={selected === devata.id}
          color={VASTU_ELEMENT_COLOR[devata.element]}
          onSelect={() => onSelect(devata.id)}
        />
      ))}

      <circle
        role="button"
        tabIndex={0}
        aria-pressed={selected === "center"}
        aria-label={w.centerName}
        cx={CX}
        cy={CY}
        r={CENTER_R}
        fill="transparent"
        className="cursor-pointer outline-none focus-visible:stroke-[3]"
        stroke={VASTU_ELEMENT_COLOR.space}
        strokeOpacity={0}
        onClick={() => onSelect("center")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect("center");
          }
        }}
      />

      {/* Degree rim on top — parchment, so triguna colour cannot leak into 0°–360° */}
      <path d={annulusPath(DEG_OUTER, DEG_INNER)} fill={VASTU_INK.background} fillRule="evenodd" />
      {Array.from({ length: 360 }, (_, bearing) => {
        const every10 = bearing % 10 === 0;
        const every5 = bearing % 5 === 0;
        const cardinal = bearing % 90 === 0;
        const tickInner = every10 ? DEG_INNER : every5 ? DEG_INNER + 4 : DEG_OUTER - 6;
        const inner = vastuWheelPoint(bearing, tickInner, CX, CY);
        const outer = vastuWheelPoint(bearing, DEG_OUTER, CX, CY);
        return (
          <g key={`deg-${bearing}`} aria-hidden="true">
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={VASTU_INK.text}
              strokeOpacity={cardinal ? 0.9 : every10 ? 0.75 : every5 ? 0.55 : 0.32}
              strokeWidth={cardinal ? 1.35 : every10 ? 0.85 : every5 ? 0.45 : 0.28}
            />
            {every10 ? (
              <ArcLabel center={center} bearing={bearing} radius={DEG_LABEL_R} fontSize={7} className="font-semibold" fillOpacity={0.8} fill={VASTU_INK.text}>
                {digits(bearing)}
              </ArcLabel>
            ) : null}
          </g>
        );
      })}

      {/* Selection outline last so rings, spokes, and the degree rim cannot cover it. */}
      <g pointerEvents="none" fill="none" aria-hidden>
        {selected === "center" ? (
          <>
            <circle cx={CX} cy={CY} r={CENTER_R} stroke={VASTU_INK.text} strokeWidth={4.2} />
            <circle cx={CX} cy={CY} r={CENTER_R} stroke={VASTU_ELEMENT_COLOR.space} strokeWidth={2.2} />
          </>
        ) : (
          selectionSlices(selected).map((slice, i) => (
            <g key={`sel-${selected}-${i}`}>
              <path d={slice.d} stroke={VASTU_INK.text} strokeWidth={4.2} strokeLinejoin="round" />
              <path d={slice.d} stroke={slice.color} strokeWidth={2.2} strokeLinejoin="round" />
            </g>
          ))
        )}
      </g>
      </g>
      {headingDeg != null ? (
        <g pointerEvents="none" aria-hidden>
          <polygon points={`${CX - 9},6 ${CX + 9},6 ${CX},24`} fill={VASTU_INK.text} />
        </g>
      ) : null}
    </svg>
    <ul className={cn(vastuClasses.wheelLegend, vastuClasses.wheelLegendText)}>
      {VASTU_ELEMENT_ORDER.map((element) => (
        <li key={element} className={cn(vastuClasses.wheelLegendItem, "inline-flex")}>
          <span className={vastuClasses.wheelLegendDot} style={{ backgroundColor: VASTU_ELEMENT_COLOR[element] }} aria-hidden />
          {w.elementName(element)}
        </li>
      ))}
    </ul>
    <ul className={cn(vastuClasses.wheelLegendTight, vastuClasses.wheelLegendText)}>
      {(["sattva", "rajas", "tamas"] as const).map((guna) => (
        <li key={guna} className={cn(vastuClasses.wheelLegendItem, "inline-flex")}>
          <span className={vastuClasses.wheelLegendDot} style={{ backgroundColor: VASTU_GUNA_COLOR[guna] }} aria-hidden />
          {w.organ(guna)}
        </li>
      ))}
    </ul>
    </div>
  );
}

