import { useId, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { Box, Text } from "@vedic-patro/ui";
import { fontFamily } from "@vedic-patro/design-tokens";
import { WHEEL_SIZE } from "@vedic-patro/domain/vastu/vastu";
import {
  VASTU_DIR16, VASTU_ELEMENT_COLOR, VASTU_ELEMENT_ORDER, VASTU_GUNA_COLOR, VASTU_INNER4, VASTU_PADAS,
  VASTU_WHEEL_DIRECTIONS, annularSectorPath as annularSectorPathAt, isDir16, isInner4, isPada,
  vastuDir16, vastuDirection, vastuElementAtBearing, vastuPada, vastuWheelPoint, type VastuSelectionId,
} from "@vedic-patro/domain/vastu/vastu";
import { annulusPath } from "@vedic-patro/drawing/vastu/vastu-purusha-wheel";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import { VASTU_COMPASS_16, VASTU_GUNA_BANDS, VASTU_WHEEL_GEOMETRY, useVastuPurushaWheel } from "@vedic-patro/features/vastu";
import type { VastuPurushaWheelProps } from "../contract";
import { ArcLabel, PadaCodeLabel, RingSeparators, VastuPurushaSilhouette } from "./WheelMarks";
import { ZoomStage } from "../../panchanga/native/ZoomStage";

const fonts = fontFamily.native;
const press = (fn: () => void): any => fn;

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
  color,
  onSelect,
}: {
  d: string;
  label: string;
  color: string;
  onSelect: () => void;
}) {
  return (
    <Path
      accessibilityRole="button"
      accessibilityLabel={label}
      d={d}
      fill="transparent"
      stroke={color}
      strokeOpacity={0}
      onPress={press(onSelect)}
    />
  );
}


export function VastuPurushaWheel({
  size, selected, onSelect, centerContent, headingDeg = null, center, ink, marks, fullscreenOverlay, onFullscreenChange,
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
    <View>
      <ZoomStage size={size ?? WHEEL_SIZE} fullscreenOverlay={fullscreenOverlay} onFullscreenChange={onFullscreenChange}>
      {(px) => (
      <View style={{ width: px, height: px }}>
      <Svg
        width={px}
        height={px}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        accessibilityLabel={w.heading}
      >
        {/* @ts-expect-error react-native-svg Defs children typing */}
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={CX} cy={CY} r={DIR16_INNER} />
          </ClipPath>
        </Defs>
        <G
          transform={
            headingDeg == null ? undefined : `rotate(${(-headingDeg).toFixed(2)} ${CX} ${CY})`
          }
        >
          <Circle cx={CX} cy={CY} r={DEG_OUTER} fill={VASTU_INK.background} />

          {/* Triguna ring */}
          {GUNA_BANDS.map((band) => {
            const color = VASTU_GUNA_COLOR[band.id];
            const labelFill = band.id === "tamas" ? VASTU_INK.background : VASTU_INK.text;
            return (
              <G key={band.key}>
                <Path
                  d={annularSectorPath(band.bearing, band.halfAngle, GUNA_OUTER, GUNA_INNER)}
                  fill={color}
                  fillOpacity={0.92}
                />
                <ArcLabel center={center}
                  bearing={band.bearing}
                  radius={GUNA_LABEL_R}
                  fontSize={13}
                  fontFamily={fonts.bold}
                  fill={labelFill}
                >
                  {w.organ(band.id)}
                </ArcLabel>
              </G>
            );
          })}

          {/* 16 compass + life attribute — coloured by tattva */}
          {COMPASS_16.map((point, i) => {
            const color = VASTU_ELEMENT_COLOR[vastuElementAtBearing(point.bearing)];
            const attr = w.dir16[i]!.attr;
            const active = point.zone === selected;
            return (
              <G key={point.abbr}>
                <Path
                  d={annularSectorPath(point.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
                  fill={color}
                  fillOpacity={active ? 0.72 : 0.42}
                />
                <ArcLabel center={center}
                  bearing={point.bearing}
                  radius={DIR16_LABEL_R + 11}
                  fontSize={14}
                  fontFamily={fonts.bold}
                 fill={VASTU_INK.text}>
                  {point.abbr}
                </ArcLabel>
                <ArcLabel center={center}
                  bearing={point.bearing}
                  radius={DIR16_LABEL_R - 11}
                  fontSize={12}
                  fontFamily={fonts.semibold}
                 fill={VASTU_INK.text}>
                  {attr}
                </ArcLabel>
              </G>
            );
          })}

          {VASTU_PADAS.map((pada) => {
            const color = VASTU_ELEMENT_COLOR[pada.element];
            const active = selected === pada.id;
            return (
              <G key={`code-${pada.code}`}>
                <Path
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
              </G>
            );
          })}

          {VASTU_PADAS.map((pada) => {
            const color = VASTU_ELEMENT_COLOR[pada.element];
            const active = selected === pada.id;
            return (
              <G key={`deity-${pada.id}`}>
                <Path
                  d={annularSectorPath(pada.bearing, PADA_HALF, DEITY_OUTER, DEITY_INNER)}
                  fill={color}
                  fillOpacity={active ? 0.7 : 0.34}
                />
                <ArcLabel center={center}
                  bearing={pada.bearing}
                  radius={DEITY_LABEL_R}
                  fontSize={12}
                  fontFamily={fonts.semibold}
                 fill={VASTU_INK.text}>
                  {w.padaName(pada.id)}
                </ArcLabel>
              </G>
            );
          })}

          {VASTU_INNER4.map((devata) => {
            const color = VASTU_ELEMENT_COLOR[devata.element];
            const label = vastuWheelPoint(devata.bearing, INNER4_LABEL_R, CX, CY);
            const active = selected === devata.id;
            return (
              <G key={devata.id}>
                <Path
                  d={annularSectorPath(devata.bearing, 45, INNER4_OUTER, INNER4_INNER)}
                  fill={color}
                  fillOpacity={active ? 0.4 : 0.22}
                />
                <SvgText
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  alignmentBaseline="central"
                  fill={VASTU_INK.text}
                  fillOpacity={0.88}
                  fontSize={15}
                  fontFamily={fonts.semibold}
                >
                  {w.padaName(devata.id)}
                </SvgText>
              </G>
            );
          })}

          {/* 8-direction fills sit under the Purusha so the figure stays visible. */}
          {VASTU_WHEEL_DIRECTIONS.map((dir) => {
            const active = dir.id === selected;
            const color = VASTU_ELEMENT_COLOR[dir.element];
            return (
              <Path
                key={`wedge-fill-${dir.id}`}
                d={annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER)}
                fill={color}
                fillOpacity={active ? 0.42 : 0.18}
                pointerEvents="none"
              />
            );
          })}
          <Circle
            cx={CX}
            cy={CY}
            r={CENTER_R}
            fill={VASTU_ELEMENT_COLOR.space}
            fillOpacity={selected === "center" ? 0.28 : 0.14}
            pointerEvents="none"
          />

          <G clipPath={`url(#${clipId})`} pointerEvents="none">
            <G transform={`translate(${CX} ${CY})`} opacity={PURUSHA_OPACITY}>
              <VastuPurushaSilhouette size={PURUSHA_SIZE} color={VASTU_INK.text} />
            </G>
          </G>

          {RING_DIVIDERS.map((r) => (
            <Circle
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
              <SvgText
                key={`wedge-label-${dir.id}`}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                alignmentBaseline="central"
                pointerEvents="none"
                fill={VASTU_INK.text}
                fillOpacity={active ? 1 : 0.82}
                fontSize={14}
                fontFamily={active ? fonts.bold : fonts.semibold}
              >
                {w.dirName(dir.id)}
              </SvgText>
            );
          })}

          <Line x1={CX - 5} y1={CY} x2={CX + 5} y2={CY} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
          <Line x1={CX} y1={CY - 5} x2={CX} y2={CY + 5} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
          {/* A hand over the centre: the Brahmasthan is a button, and this says so. */}
          {centerContent ? null : (
            <G pointerEvents="none" transform={`translate(${CX - 15} ${CY - 34}) scale(1.25)`}>
              <Path d="M22 14a8 8 0 0 1-8 8" fill="none" stroke={VASTU_INK.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" fill="none" stroke={VASTU_INK.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" fill="none" stroke={VASTU_INK.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" fill="none" stroke={VASTU_INK.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" fill="none" stroke={VASTU_INK.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          )}
          {centerContent ?? (
            <SvgText
              x={CX}
              y={CY + 16}
              textAnchor="middle"
              alignmentBaseline="central"
              pointerEvents="none"
              fill={VASTU_INK.text}
              fillOpacity={0.9}
              fontSize={16}
              fontFamily={fonts.bold}
            >
              {w.centerDeity}
            </SvgText>
          )}

          {VASTU_DIR16.map((dir) => (
            <HitSector
              key={`hit-guna-${dir.id}`}
              d={annularSectorPath(dir.bearing, 11.25, GUNA_OUTER, GUNA_INNER)}
              label={w.dir16Name(dir.id)}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_DIR16.map((dir) => (
            <HitSector
              key={`hit-16-${dir.id}`}
              d={annularSectorPath(dir.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
              label={w.dir16Hit(dir.id, dir.attrKey)}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_PADAS.map((pada) => (
            <HitSector
              key={`hit-code-${pada.id}`}
              d={annularSectorPath(pada.bearing, PADA_HALF, CODE_OUTER, CODE_INNER)}
              label={w.padaHit(pada)}
              color={VASTU_ELEMENT_COLOR[pada.element]}
              onSelect={() => onSelect(pada.id)}
            />
          ))}

          {VASTU_PADAS.map((pada) => (
            <HitSector
              key={`hit-deity-${pada.id}`}
              d={annularSectorPath(pada.bearing, PADA_HALF, DEITY_OUTER, DEITY_INNER)}
              label={w.padaName(pada.id)}
              color={VASTU_ELEMENT_COLOR[pada.element]}
              onSelect={() => onSelect(pada.id)}
            />
          ))}

          {VASTU_WHEEL_DIRECTIONS.map((dir) => (
            <HitSector
              key={`hit-8-${dir.id}`}
              d={annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER)}
              label={w.dirName(dir.id)}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_INNER4.map((devata) => (
            <HitSector
              key={`hit-inner4-${devata.id}`}
              d={annularSectorPath(devata.bearing, 45, INNER4_OUTER, INNER4_INNER)}
              label={w.padaName(devata.id)}
              color={VASTU_ELEMENT_COLOR[devata.element]}
              onSelect={() => onSelect(devata.id)}
            />
          ))}

          <Circle
            accessibilityRole="button"
            accessibilityLabel={w.centerName}
            cx={CX}
            cy={CY}
            r={CENTER_R}
            fill="transparent"
            stroke={VASTU_ELEMENT_COLOR.space}
            strokeOpacity={0.55}
            strokeDasharray="5 4"
          />

          {/* Degree rim on top — parchment, so triguna colour cannot leak into 0°–360° */}
          <Path d={annulusPath(DEG_OUTER, DEG_INNER)} fill={VASTU_INK.background} fillRule="evenodd" />
          {Array.from({ length: 360 }, (_, bearing) => {
            const every10 = bearing % 10 === 0;
            const every5 = bearing % 5 === 0;
            const cardinal = bearing % 90 === 0;
            const tickInner = every10 ? DEG_INNER : every5 ? DEG_INNER + 4 : DEG_OUTER - 6;
            const inner = vastuWheelPoint(bearing, tickInner, CX, CY);
            const outer = vastuWheelPoint(bearing, DEG_OUTER, CX, CY);
            return (
              <G key={`deg-${bearing}`}>
                <Line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={VASTU_INK.text}
                  strokeOpacity={cardinal ? 0.9 : every10 ? 0.75 : every5 ? 0.55 : 0.32}
                  strokeWidth={cardinal ? 1.35 : every10 ? 0.85 : every5 ? 0.45 : 0.28}
                />
                {every10 ? (
                  <ArcLabel center={center}
                    bearing={bearing}
                    radius={DEG_LABEL_R}
                    fontSize={9}
                    fontFamily={fonts.semibold}
                    fillOpacity={0.8}
                   fill={VASTU_INK.text}>
                    {digits(bearing)}
                  </ArcLabel>
                ) : null}
              </G>
            );
          })}

          {/* Selection outline last so rings, spokes, and the degree rim cannot cover it. */}
          <G pointerEvents="none" fill="none">
            {selected === "center" ? (
              <>
                <Circle cx={CX} cy={CY} r={CENTER_R} fill="none" stroke={VASTU_INK.text} strokeWidth={4.2} pointerEvents="none" />
                <Circle cx={CX} cy={CY} r={CENTER_R} fill="none" stroke={VASTU_ELEMENT_COLOR.space} strokeWidth={2.2} pointerEvents="none" />
              </>
            ) : (
              selectionSlices(selected).map((slice, i) => (
                <G key={`sel-${selected}-${i}`}>
                  <Path d={slice.d} fill="none" stroke={VASTU_INK.text} strokeWidth={4.2} strokeLinejoin="round" pointerEvents="none" />
                  <Path d={slice.d} fill="none" stroke={slice.color} strokeWidth={2.2} strokeLinejoin="round" pointerEvents="none" />
                </G>
              ))
            )}
          </G>
        </G>
        {headingDeg != null ? (
          <G pointerEvents="none">
            <Polygon points={`${CX - 9},6 ${CX + 9},6 ${CX},24`} fill={VASTU_INK.text} />
          </G>
        ) : null}
      </Svg>
      {/* The centre is a real touch target on top of the drawing: a tap on an SVG shape was dropped once
          that shape was the selection (the outline drawn over it), so the Brahmasthan could not be
          opened a second time. */}
      <Pressable
        onPress={() => onSelect("center")}
        accessibilityRole="button"
        accessibilityLabel={w.centerName}
        style={{
          position: "absolute",
          left: (CX / WHEEL_SIZE) * px - (CENTER_R / WHEEL_SIZE) * px,
          top: (CY / WHEEL_SIZE) * px - (CENTER_R / WHEEL_SIZE) * px,
          width: (2 * CENTER_R / WHEEL_SIZE) * px,
          height: (2 * CENTER_R / WHEEL_SIZE) * px,
          borderRadius: (CENTER_R / WHEEL_SIZE) * px,
        }}
      />
      </View>
      )}
      </ZoomStage>

      <View className={vastuClasses.wheelLegend}>
        {VASTU_ELEMENT_ORDER.map((element) => (
          <View key={element} className={vastuClasses.wheelLegendItem}>
            <View
              className={vastuClasses.wheelLegendDot}
              style={{ backgroundColor: VASTU_ELEMENT_COLOR[element] }}
            />
            <Text className={vastuClasses.wheelLegendText}>
              {w.elementName(element)}
            </Text>
          </View>
        ))}
      </View>
      <View className={vastuClasses.wheelLegendTight}>
        {(["sattva", "rajas", "tamas"] as const).map((guna) => (
          <View key={guna} className={vastuClasses.wheelLegendItem}>
            <View
              className={vastuClasses.wheelLegendDot}
              style={{ backgroundColor: VASTU_GUNA_COLOR[guna] }}
            />
            <Text className={vastuClasses.wheelLegendText}>
              {w.organ(guna)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

