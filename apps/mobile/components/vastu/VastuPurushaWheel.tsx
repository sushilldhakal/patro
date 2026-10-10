/**
 * वास्तुपुरुष मण्डल — the printed-chart wheel.
 *
 * The native counterpart of the web app's
 * `dhakal-patro/src/components/vastu/VastuPurushaWheel.tsx`. Same rings, same
 * radii, same bearings, same colours: the two are meant to be read side by
 * side, and the numbers all come from the shared `@/lib/vastu` copy so neither
 * platform can drift from the other. What differs is only the drawing surface
 * — `react-native-svg` elements instead of DOM SVG, a `press` shim instead of
 * `onClick`, and explicit Devanagari font families where the web relies on CSS
 * inheritance.
 *
 * The wheel keeps its own parchment ink (`VASTU_INK`) in both themes rather
 * than following the app's foreground colour, exactly as the web chart does —
 * it is a printed chart, not a themed surface.
 */

import { useId, type ReactNode } from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import {
  NOTO_DEVANAGARI_BOLD,
  NOTO_DEVANAGARI_REGULAR,
  NOTO_DEVANAGARI_SEMIBOLD,
} from "@/lib/fonts";
import { nepaliSvgTextCenter, nepaliTextStyle } from "@/lib/nepali-text";
import {
  VASTU_DIR16,
  VASTU_DIR16_ATTR,
  VASTU_ELEMENT_COLOR,
  VASTU_ELEMENT_ORDER,
  VASTU_GUNA_COLOR,
  VASTU_INK,
  VASTU_INNER4,
  VASTU_PADAS,
  VASTU_WHEEL_DIRECTIONS,
  annularSectorPath as annularSectorPathAt,
  evenBearings,
  isDir16,
  isInner4,
  isPada,
  vastuDir16,
  vastuDirection,
  vastuElementAtBearing,
  vastuPada,
  vastuWheelPoint,
  type VastuGunaId,
  type VastuSelectionId,
} from "@/shared/vastu";

/**
 * `react-native-svg` types `onPress` as an unsatisfiable intersection; it works
 * fine at runtime. Same shim `WheelChart` and the Avakahada wheel use.
 */
const press = (fn: () => void) => fn as never;

/** ArcLabel/PadaCodeLabel/RingSeparators below all close over this wheel's own
 * CX/CY rather than taking them as props, so anything reusing them has to
 * share this exact centre, not merely this size. */
export const WHEEL_SIZE = 620;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const PURUSHA_OPACITY = 0.2;

/**
 * Concentric bands, outside → in. Each ring is its own hit target:
 * guna + 16-dir (ENE / आनन्द), pada codes (E1), deities (शिखी / सूर्य),
 * eight house wedges, inner-four, Brahmasthan. E1 and शिखी are the same pada.
 */
const DEG_OUTER = 304;
const DEG_INNER = 288;
const GUNA_OUTER = 288;
const GUNA_INNER = 268;
const DIR16_OUTER = 268;
const DIR16_INNER = 214;
const CODE_OUTER = 214;
const CODE_INNER = 192;
const DEITY_OUTER = 192;
const DEITY_INNER = 162;
const WEDGE_OUTER = 162;
const WEDGE_INNER = 104;
const INNER4_OUTER = 104;
const INNER4_INNER = 66;
const CENTER_R = 60;
/** Diagonal figure — head/feet are the square corners, so keep those inside the rim. */
const PURUSHA_SIZE = Math.round(DEG_INNER * Math.SQRT2 * 0.82);

const DEG_LABEL_R = (DEG_OUTER + DEG_INNER) / 2;
const GUNA_LABEL_R = (GUNA_OUTER + GUNA_INNER) / 2;
const DIR16_LABEL_R = (DIR16_OUTER + DIR16_INNER) / 2;
const CODE_LABEL_R = (CODE_OUTER + CODE_INNER) / 2;
const DEITY_LABEL_R = (DEITY_OUTER + DEITY_INNER) / 2;
const WEDGE_LABEL_R = (WEDGE_OUTER + WEDGE_INNER) / 2;
const INNER4_LABEL_R = (INNER4_OUTER + INNER4_INNER) / 2;

function normBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/** Annular sector spanning `halfAngle` degrees on each side of `bearing`, around this wheel's own centre. */
function annularSectorPath(bearing: number, halfAngle: number, outerR: number, innerR: number): string {
  return annularSectorPathAt(bearing, halfAngle, outerR, innerR, CX, CY);
}

function annulusPath(outerR: number, innerR: number): string {
  return [
    `M ${(CX + outerR).toFixed(2)} ${CY}`,
    `A ${outerR} ${outerR} 0 1 1 ${(CX - outerR).toFixed(2)} ${CY}`,
    `A ${outerR} ${outerR} 0 1 1 ${(CX + outerR).toFixed(2)} ${CY}`,
    `M ${(CX + innerR).toFixed(2)} ${CY}`,
    `A ${innerR} ${innerR} 0 1 0 ${(CX - innerR).toFixed(2)} ${CY}`,
    `A ${innerR} ${innerR} 0 1 0 ${(CX + innerR).toFixed(2)} ${CY}`,
  ].join(" ");
}

const COMPASS_16 = VASTU_DIR16.map((d) => ({
  bearing: d.bearing,
  abbr: d.abbr,
  zone: d.id,
  nameKey: `vastu.dir16.${d.id}.name`,
}));

type GunaId = VastuGunaId;

/** Door-pada +/− marks only — sector fills use the five elements. */
const STATUS_MARK = {
  good: "#2f6b3c",
  ok: VASTU_INK.line,
  bad: "#8f2f28",
} as const;

/**
 * Triguna zones on the compass — Sattva 337.5°→112.5°, Rajas at SE (112.5°–157.5°)
 * and NW (292.5°–337.5°), Tamas 157.5°→292.5°.
 */
const GUNA_BANDS: { id: GunaId; key: string; bearing: number; halfAngle: number }[] = [
  { id: "sattva", key: "sattva", bearing: 45, halfAngle: 67.5 },
  { id: "rajas", key: "rajas-se", bearing: 135, halfAngle: 22.5 },
  { id: "tamas", key: "tamas", bearing: 225, halfAngle: 67.5 },
  { id: "rajas", key: "rajas-nw", bearing: 315, halfAngle: 22.5 },
];

const ATTR_16 = VASTU_DIR16_ATTR;

const PADA_HALF = 5.625;

const RING_DIVIDERS = [
  DEG_OUTER,
  DEG_INNER,
  GUNA_INNER,
  DIR16_INNER,
  CODE_INNER,
  DEITY_INNER,
  WEDGE_INNER,
  INNER4_INNER,
] as const;

const GUNA_BOUNDARIES = [112.5, 157.5, 292.5, 337.5] as const;
const DIR16_BOUNDARIES = evenBearings(16, 11.25);
const PADA_BOUNDARIES = evenBearings(32, 0);
const DIR8_BOUNDARIES = evenBearings(8, 22.5);
const INNER4_BOUNDARIES = evenBearings(4, 45);

export function RingSeparators({
  bearings,
  innerR,
  outerR,
}: {
  bearings: readonly number[];
  innerR: number;
  outerR: number;
}) {
  return (
    <>
      {bearings.map((bearing) => {
        const a = vastuWheelPoint(bearing, innerR, CX, CY);
        const b = vastuWheelPoint(bearing, outerR, CX, CY);
        return (
          <Line
            key={`sep-${innerR}-${outerR}-${bearing}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={VASTU_INK.text}
            strokeOpacity={0.4}
            strokeWidth={0.75}
          />
        );
      })}
    </>
  );
}

export function PadaCodeLabel({
  bearing,
  radius,
  code,
  status,
}: {
  bearing: number;
  radius: number;
  code: string;
  status: "good" | "ok" | "bad" | "mixed";
}) {
  const flip = normBearing(bearing) > 90 && normBearing(bearing) < 270;
  const x = CX;
  const y = CY - radius;
  const signX = x + 8;
  return (
    <G transform={`rotate(${bearing} ${CX} ${CY})`} pointerEvents="none">
      <G transform={flip ? `rotate(180 ${x} ${y})` : undefined} fill={VASTU_INK.text}>
        <SvgText
          x={x + 1}
          y={y}
          textAnchor="end"
          {...nepaliSvgTextCenter}
          fontSize={15}
          fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
          fillOpacity={0.92}
        >
          {code}
        </SvgText>
        {status === "mixed" ? (
          <>
            <SvgText
              x={signX}
              y={y - 4.6}
              textAnchor="middle"
              {...nepaliSvgTextCenter}
              fontSize={15}
              fontFamily={NOTO_DEVANAGARI_BOLD}
              fill={STATUS_MARK.good}
            >
              +
            </SvgText>
            <SvgText
              x={signX}
              y={y + 4.6}
              textAnchor="middle"
              {...nepaliSvgTextCenter}
              fontSize={15}
              fontFamily={NOTO_DEVANAGARI_BOLD}
              fill={STATUS_MARK.bad}
            >
              −
            </SvgText>
          </>
        ) : status !== "ok" ? (
          <SvgText
            x={signX}
            y={y}
            textAnchor="middle"
            {...nepaliSvgTextCenter}
            fontSize={15}
            fontFamily={NOTO_DEVANAGARI_BOLD}
            fill={STATUS_MARK[status]}
          >
            {status === "good" ? "+" : "−"}
          </SvgText>
        ) : null}
      </G>
    </G>
  );
}

export function ArcLabel({
  bearing,
  radius,
  fontFamily = NOTO_DEVANAGARI_REGULAR,
  fontSize,
  fill = VASTU_INK.text,
  fillOpacity = 0.92,
  children,
}: {
  bearing: number;
  radius: number;
  fontFamily?: string;
  fontSize: number;
  fill?: string;
  fillOpacity?: number;
  children: ReactNode;
}) {
  const flip = normBearing(bearing) > 90 && normBearing(bearing) < 270;
  return (
    <G transform={`rotate(${bearing} ${CX} ${CY})`} pointerEvents="none">
      <SvgText
        x={CX}
        y={CY - radius}
        textAnchor="middle"
        {...nepaliSvgTextCenter}
        fill={fill}
        fillOpacity={fillOpacity}
        fontSize={fontSize}
        fontFamily={fontFamily}
        transform={flip ? `rotate(180 ${CX} ${CY - radius})` : undefined}
      >
        {children}
      </SvgText>
    </G>
  );
}

/**
 * The exact figure the user provided (a classical dorsal-view Vastu Purusha
 * line drawing), traced into a vector path with potrace rather than
 * hand-approximated — earlier hand-drawn attempts didn't read as a person.
 * The source art already has the head in the upper-right (northeast) and
 * feet in the lower-left (southwest), matching this wheel's own screen
 * orientation, so no extra rotation is applied — just centering and scaling
 * to fit the hub. Exported on its own since it'll be reused outside this
 * wheel (e.g. the 2D नक्सा overlay).
 *
 * The web copy fills with `currentColor` and inherits the ink from a parent
 * `style`; `react-native-svg` has no such inheritance, so the colour is an
 * explicit prop here and defaults to the same `VASTU_INK.text`.
 */
export function VastuPurushaSilhouette({
  size = 100,
  color = VASTU_INK.text,
}: {
  size?: number;
  color?: string;
}) {
  const scale = size / 220;
  return (
    <G transform={`translate(${-size / 2} ${-size / 2}) scale(${scale})`}>
      <G transform="translate(0,220) scale(0.1,-0.1)" fill={color}>
        <Path d="M1643 2185 c-14 -10 -30 -42 -44 -88 -26 -87 -43 -121 -81 -165 -40
-47 -35 -76 14 -80 39 -3 43 -23 10 -49 -50 -41 -123 11 -198 139 -52 89 -96
127 -177 155 -59 20 -194 22 -240 4 -36 -14 -191 -14 -237 -1 -70 21 -198 31
-268 20 -106 -17 -192 -90 -192 -165 0 -28 -4 -33 -29 -38 -170 -34 -241 -432
-167 -932 52 -348 44 -720 -18 -893 -15 -42 -15 -44 4 -49 11 -3 20 -11 20
-19 0 -23 16 -24 72 -5 144 50 543 63 798 27 239 -34 298 -38 510 -33 324 7
474 62 505 187 5 21 12 26 39 26 42 0 99 44 134 103 31 53 42 195 23 291 -28
136 -32 186 -20 255 43 264 10 365 -153 463 -123 75 -166 128 -146 182 18 49
55 54 60 8 4 -48 37 -49 89 -4 26 22 72 45 121 62 136 45 160 86 74 127 -29
14 -36 22 -31 35 32 81 8 203 -54 273 -63 72 -117 94 -235 94 -96 0 -99 1
-108 25 -9 26 -37 60 -47 60 -4 0 -16 -7 -28 -15z m50 -52 l15 -38 -40 -34
c-39 -34 -88 -118 -88 -153 0 -17 -28 -38 -49 -38 -19 0 -12 18 23 64 19 25
46 82 61 128 40 120 53 132 78 71z m-1036 -54 c52 -20 202 -23 280 -5 94 21
137 20 216 -4 85 -26 115 -53 177 -155 119 -198 234 -211 275 -31 30 138 110
207 237 208 152 0 257 -105 258 -258 0 -132 -57 -198 -205 -237 -76 -20 -92
-28 -107 -53 -47 -77 -9 -134 156 -234 79 -47 88 -56 116 -114 41 -83 47 -151
25 -266 -19 -98 -16 -220 6 -276 7 -16 12 -82 13 -149 1 -136 -6 -158 -73
-218 -50 -45 -82 -48 -106 -10 -10 16 -71 80 -135 143 -138 135 -280 337 -253
359 59 51 114 81 131 72 28 -15 98 -94 133 -151 49 -80 62 -69 27 25 -19 51
-23 80 -23 195 l0 135 -80 -80 c-111 -112 -170 -154 -321 -229 -102 -51 -141
-77 -178 -116 l-48 -51 -55 17 c-109 34 -226 132 -255 211 -10 26 -26 41 -71
65 -70 38 -135 107 -171 184 -46 98 -46 107 12 164 36 35 67 84 112 172 78
154 110 199 228 320 l94 96 -38 -9 c-95 -22 -212 -9 -356 38 -38 12 -16 -23
28 -47 50 -26 139 -101 154 -131 8 -15 1 -30 -36 -79 -26 -33 -49 -60 -50 -60
-2 0 -41 22 -87 49 -104 62 -229 163 -283 230 -23 27 -67 71 -98 96 -60 49
-62 54 -45 88 27 52 79 91 144 108 39 11 216 2 252 -12z m-359 -216 c85 -64
261 -341 313 -492 34 -97 28 -123 -36 -166 -30 -20 -81 -45 -112 -56 -73 -25
-136 -62 -190 -112 -24 -22 -43 -37 -43 -34 0 3 15 48 32 99 30 84 33 104 32
208 0 125 -15 200 -40 200 -10 0 -13 -6 -10 -17 47 -157 35 -276 -51 -492 -81
-205 -64 -315 69 -442 82 -78 76 -111 -30 -169 -56 -31 -72 -58 -79 -135 -6
-62 -35 -115 -64 -115 -4 0 -13 -16 -19 -35 -6 -19 -16 -35 -21 -35 -11 0 -12
-3 5 56 54 187 56 532 3 869 -31 204 -31 541 1 668 25 101 49 151 89 189 55
53 92 55 151 11z m621 -103 l66 0 -46 -46 -46 -46 -53 52 -52 53 32 -7 c18 -3
62 -6 99 -6z m1226 -74 c51 -22 36 -41 -54 -71 -66 -22 -128 -55 -187 -100
-19 -14 -26 -1 -15 26 7 19 24 29 67 43 45 14 70 29 104 66 54 57 43 53 85 36z
m-1443 -159 c32 -18 58 -36 58 -42 0 -5 -21 -52 -46 -104 l-46 -95 -23 70
c-21 68 -79 189 -130 271 l-26 43 78 -56 c42 -31 103 -70 135 -87z m-128 -420
c30 -105 129 -225 216 -263 26 -12 43 -30 64 -70 16 -30 52 -75 80 -101 49
-44 177 -113 211 -113 10 0 15 -6 13 -18 -13 -61 -249 87 -327 205 -17 25 -52
61 -79 78 -137 93 -274 328 -195 335 1 0 9 -24 17 -53z m-67 3 c26 -100 130
-241 225 -305 27 -17 62 -53 79 -78 60 -91 170 -176 276 -213 59 -21 59 -21
16 -109 -79 -160 -213 -258 -327 -239 -123 20 -262 161 -282 286 -6 32 -9 35
-71 51 -185 48 -302 245 -234 392 33 71 122 152 226 204 71 36 85 38 92 11z
m1269 -317 c-2 -4 -96 89 -96 95 0 3 19 23 43 43 l42 37 6 -87 c3 -47 5 -87 5
-88z m-194 -167 c38 -55 76 -112 85 -125 14 -20 8 -17 -41 14 -80 51 -210 112
-274 128 -64 16 -61 20 59 77 74 35 85 38 94 24 6 -9 40 -62 77 -118z m-157
-39 c44 -18 129 -61 188 -97 322 -193 371 -299 181 -394 -93 -46 -163 -58
-389 -63 -162 -4 -236 -1 -320 11 -419 61 -773 62 -968 2 -56 -17 -63 2 -7 20
18 6 38 21 45 34 17 32 53 49 103 50 70 0 105 21 140 83 29 52 64 77 107 77 7
0 44 -31 81 -68 131 -131 208 -136 475 -33 166 63 263 71 432 35 34 -8 37 13
2 26 -98 37 -261 30 -401 -19 l-82 -28 49 64 c54 71 80 117 99 178 15 49 45
101 79 138 32 35 66 32 186 -16z m-1021 -109 c53 -15 55 -17 77 -80 18 -55 14
-68 -22 -68 -23 0 -64 -41 -89 -89 -23 -46 -50 -61 -113 -61 -23 0 -55 -7 -71
-15 -26 -14 -28 -14 -21 3 5 9 11 44 15 77 11 84 16 92 76 127 60 33 84 61 84
95 0 26 7 27 64 11z m-277 -365 c-9 -9 -20 -14 -24 -10 -3 4 2 14 13 21 25 19
33 10 11 -11z" />
      </G>
    </G>
  );
}

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

export function VastuPurushaWheel({
  size,
  selected,
  onSelect,
  centerContent,
  headingDeg = null,
}: {
  /** Rendered edge length in points. The viewBox stays {@link WHEEL_SIZE}. */
  size: number;
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
  centerContent?: ReactNode;
  /** Compass heading (0 = north, clockwise). The facing wall sits at the top. */
  headingDeg?: number | null;
}) {
  const { t, digits } = useLocale();
  const clipId = `vastu-purusha-${useId().replace(/:/g, "")}`;

  return (
    <View>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        accessibilityLabel={t("vastu.wheel.heading")}
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
                <ArcLabel
                  bearing={band.bearing}
                  radius={GUNA_LABEL_R}
                  fontSize={15}
                  fontFamily={NOTO_DEVANAGARI_BOLD}
                  fill={labelFill}
                >
                  {t(`vastu.wheel.organ.${band.id}`)}
                </ArcLabel>
              </G>
            );
          })}

          {/* 16 compass + life attribute — coloured by tattva */}
          {COMPASS_16.map((point, i) => {
            const color = VASTU_ELEMENT_COLOR[vastuElementAtBearing(point.bearing)];
            const attr = t(ATTR_16[i]!);
            const active = point.zone === selected;
            return (
              <G key={point.abbr}>
                <Path
                  d={annularSectorPath(point.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
                  fill={color}
                  fillOpacity={active ? 0.72 : 0.42}
                />
                <ArcLabel
                  bearing={point.bearing}
                  radius={DIR16_LABEL_R + 11}
                  fontSize={15}
                  fontFamily={NOTO_DEVANAGARI_BOLD}
                >
                  {point.abbr}
                </ArcLabel>
                <ArcLabel
                  bearing={point.bearing}
                  radius={DIR16_LABEL_R - 11}
                  fontSize={15}
                  fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                >
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
                <PadaCodeLabel
                  bearing={pada.bearing}
                  radius={CODE_LABEL_R}
                  code={`${pada.wall}${digits(pada.index)}`}
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
                <ArcLabel
                  bearing={pada.bearing}
                  radius={DEITY_LABEL_R}
                  fontSize={15}
                  fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                >
                  {t(`vastu.pada.${pada.id}.name`)}
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
                  {...nepaliSvgTextCenter}
                  fill={VASTU_INK.text}
                  fillOpacity={0.88}
                  fontSize={15}
                  fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                >
                  {t(`vastu.pada.${devata.id}.name`)}
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
              <VastuPurushaSilhouette size={PURUSHA_SIZE} />
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
          <RingSeparators bearings={GUNA_BOUNDARIES} innerR={GUNA_INNER} outerR={GUNA_OUTER} />
          <RingSeparators bearings={DIR16_BOUNDARIES} innerR={DIR16_INNER} outerR={DIR16_OUTER} />
          <RingSeparators bearings={PADA_BOUNDARIES} innerR={CODE_INNER} outerR={CODE_OUTER} />
          <RingSeparators bearings={PADA_BOUNDARIES} innerR={DEITY_INNER} outerR={DEITY_OUTER} />
          <RingSeparators bearings={DIR8_BOUNDARIES} innerR={WEDGE_INNER} outerR={WEDGE_OUTER} />
          <RingSeparators bearings={INNER4_BOUNDARIES} innerR={INNER4_INNER} outerR={INNER4_OUTER} />

          {VASTU_WHEEL_DIRECTIONS.map((dir) => {
            const active = dir.id === selected;
            const label = vastuWheelPoint(dir.bearing, WEDGE_LABEL_R, CX, CY);
            return (
              <SvgText
                key={`wedge-label-${dir.id}`}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                {...nepaliSvgTextCenter}
                pointerEvents="none"
                fill={VASTU_INK.text}
                fillOpacity={active ? 1 : 0.82}
                fontSize={15}
                fontFamily={active ? NOTO_DEVANAGARI_BOLD : NOTO_DEVANAGARI_SEMIBOLD}
              >
                {t(`vastu.dir.${dir.id}.name`)}
              </SvgText>
            );
          })}

          <Line x1={CX - 5} y1={CY} x2={CX + 5} y2={CY} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
          <Line x1={CX} y1={CY - 5} x2={CX} y2={CY + 5} stroke={VASTU_INK.text} strokeOpacity={0.45} strokeWidth={1} />
          {centerContent ?? (
            <SvgText
              x={CX}
              y={CY + 16}
              textAnchor="middle"
              {...nepaliSvgTextCenter}
              pointerEvents="none"
              fill={VASTU_INK.text}
              fillOpacity={0.9}
              fontSize={18}
              fontFamily={NOTO_DEVANAGARI_BOLD}
            >
              {t("vastu.dir.center.deity")}
            </SvgText>
          )}

          {VASTU_DIR16.map((dir) => (
            <HitSector
              key={`hit-guna-${dir.id}`}
              d={annularSectorPath(dir.bearing, 11.25, GUNA_OUTER, GUNA_INNER)}
              label={t(`vastu.dir16.${dir.id}.name`)}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_DIR16.map((dir) => (
            <HitSector
              key={`hit-16-${dir.id}`}
              d={annularSectorPath(dir.bearing, 11.25, DIR16_OUTER, DIR16_INNER)}
              label={`${t(`vastu.dir16.${dir.id}.name`)} · ${t(dir.attrKey)}`}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_PADAS.map((pada) => (
            <HitSector
              key={`hit-code-${pada.id}`}
              d={annularSectorPath(pada.bearing, PADA_HALF, CODE_OUTER, CODE_INNER)}
              label={`${pada.code} · ${t(`vastu.pada.${pada.id}.name`)}`}
              color={VASTU_ELEMENT_COLOR[pada.element]}
              onSelect={() => onSelect(pada.id)}
            />
          ))}

          {VASTU_PADAS.map((pada) => (
            <HitSector
              key={`hit-deity-${pada.id}`}
              d={annularSectorPath(pada.bearing, PADA_HALF, DEITY_OUTER, DEITY_INNER)}
              label={t(`vastu.pada.${pada.id}.name`)}
              color={VASTU_ELEMENT_COLOR[pada.element]}
              onSelect={() => onSelect(pada.id)}
            />
          ))}

          {VASTU_WHEEL_DIRECTIONS.map((dir) => (
            <HitSector
              key={`hit-8-${dir.id}`}
              d={annularSectorPath(dir.bearing, 22.5, WEDGE_OUTER, WEDGE_INNER)}
              label={t(`vastu.dir.${dir.id}.name`)}
              color={VASTU_ELEMENT_COLOR[dir.element]}
              onSelect={() => onSelect(dir.id)}
            />
          ))}

          {VASTU_INNER4.map((devata) => (
            <HitSector
              key={`hit-inner4-${devata.id}`}
              d={annularSectorPath(devata.bearing, 45, INNER4_OUTER, INNER4_INNER)}
              label={t(`vastu.pada.${devata.id}.name`)}
              color={VASTU_ELEMENT_COLOR[devata.element]}
              onSelect={() => onSelect(devata.id)}
            />
          ))}

          <Circle
            accessibilityRole="button"
            accessibilityLabel={t("vastu.dir.center.name")}
            cx={CX}
            cy={CY}
            r={CENTER_R}
            fill="transparent"
            stroke={VASTU_ELEMENT_COLOR.space}
            strokeOpacity={0}
            onPress={press(() => onSelect("center"))}
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
                  <ArcLabel
                    bearing={bearing}
                    radius={DEG_LABEL_R}
                    fontSize={15}
                    fontFamily={NOTO_DEVANAGARI_SEMIBOLD}
                    fillOpacity={0.8}
                  >
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
                <Circle cx={CX} cy={CY} r={CENTER_R} fill="none" stroke={VASTU_INK.text} strokeWidth={4.2} />
                <Circle cx={CX} cy={CY} r={CENTER_R} fill="none" stroke={VASTU_ELEMENT_COLOR.space} strokeWidth={2.2} />
              </>
            ) : (
              selectionSlices(selected).map((slice, i) => (
                <G key={`sel-${selected}-${i}`}>
                  <Path d={slice.d} fill="none" stroke={VASTU_INK.text} strokeWidth={4.2} strokeLinejoin="round" />
                  <Path d={slice.d} fill="none" stroke={slice.color} strokeWidth={2.2} strokeLinejoin="round" />
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

      <View className="mt-3 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {VASTU_ELEMENT_ORDER.map((element) => (
          <View key={element} className="flex-row items-center gap-1.5">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: VASTU_ELEMENT_COLOR[element] }}
            />
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {t(`vastu.element.${element}`)}
            </Text>
          </View>
        ))}
      </View>
      <View className="mt-1.5 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {(["sattva", "rajas", "tamas"] as const).map((guna) => (
          <View key={guna} className="flex-row items-center gap-1.5">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: VASTU_GUNA_COLOR[guna] }}
            />
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {t(`vastu.wheel.organ.${guna}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default VastuPurushaWheel;
