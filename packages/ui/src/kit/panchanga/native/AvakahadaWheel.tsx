import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs as SvgDefsBase,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { ZoomStage } from "./ZoomStage";
import { AVAKAHADA, type Gana } from "@vedic-patro/domain/avakahada-data";
import { useLocale } from "@vedic-patro/i18n/react";
import { avakahadaClasses } from "@vedic-patro/design-tokens/classes/avakahada-classes";
import { GANA_PILL_CLASS } from "@vedic-patro/design-tokens/classes/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { brand, illustration, midnight, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { CX, CY, R, ATTR_RINGS, type AvakahadaWheelRow, toWheelRow, polar, sectorPath, attrValue } from "@vedic-patro/domain/avakahada-wheel";
import { sameAvakahadaFocus, useAvakahadaWheel, type AvakahadaHubFocus } from "@vedic-patro/features/avakahada";
export { type AvakahadaWheelRow, toWheelRow } from "@vedic-patro/domain/avakahada-wheel";

/**
 * react-native-svg types `Defs` without `children` and `onPress` as an
 * unsatisfiable intersection; both work fine at runtime.
 */
const Defs = SvgDefsBase as unknown as React.ComponentType<{ children?: ReactNode }>;
const press = (fn: () => void) => fn as never;
const RIM = 302;

const NAK_STEP = 360 / 27;
/** Ring-name guides sit on a nakshatra boundary spoke — not at 286° (Śravaṇa mid). */
const RING_GUIDE_DEG = 17 * NAK_STEP;

// ── Resolved `.pn-wheel` / `.av-wheel` theme values ─────────────────────────
// The wheel is always dark (as on web), so these are literal rather than
// theme-driven — same technique as WheelChart.
const W_RIM = withAlpha(wheel.rim, 0.5);
const W_SEP = withAlpha(wheel.line, 0.42);
const W_SEP_SOFT = withAlpha(wheel.line, 0.16);
const W_INK = midnight.foam;
const W_INK_DIM = wheel.inkDim;
const W_INK_FAINT = wheel.inkFaint;
const W_ACCENT = brand.vermilion;
const W_PADA = wheel.sky0;
const W_PADA_ALT = wheel.sky0;
const W_SURFACE_BORDER = withAlpha(wheel.line, 0.28);
const HUB_CENTER = wheel.sky0;
const HUB_EDGE = midnight.background;
/** color-mix(in srgb, var(--brand-teal) 14% / 22%, wheel.sky0 / wheel.sky1) */
const ATTR_FILL = wheel.sky1;
const ATTR_FILL_ALT = wheel.sky0;
const GANA_VALUE_INK = illustration.teal82;
const NADI_VALUE_INK = illustration.sky85;

const nepaliSvgTextCenter = { alignmentBaseline: "central" as const };

export type AvakahadaWheelAssets = {
  chartFont: string;
  regularFont: string;
  ganaFill: Record<Gana, string>;
};
const AvakahadaAssetsContext = createContext<AvakahadaWheelAssets | null>(null);
function useAvakahadaAssets(): AvakahadaWheelAssets {
  const value = useContext(AvakahadaAssetsContext);
  if (!value) throw new Error("AvakahadaWheel assets");
  return value;
}

type HubFocus = AvakahadaHubFocus;

function RadialText({
  deg,
  r,
  fill,
  size,
  bold,
  font,
  children,
}: {
  deg: number;
  r: number;
  fill: string;
  size: number;
  bold?: boolean;
  font?: string;
  children: ReactNode;
}) {
  const { chartFont } = useAvakahadaAssets();
  const face = font ?? chartFont;
  const [x, y] = polar(r, deg);
  const flip = deg > 90 && deg < 270;
  const rot = flip ? deg + 180 : deg;
  return (
    <SvgText
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontFamily={face}
      fontWeight={bold ? "bold" : "600"}
      textAnchor="middle"
      {...nepaliSvgTextCenter}
      transform={`rotate(${rot} ${x.toFixed(2)} ${y.toFixed(2)})`}
    >
      {children}
    </SvgText>
  );
}

function HubContent({ hub, row }: { hub: ReturnType<ReturnType<typeof useAvakahadaWheel>["hub"]>; row: AvakahadaWheelRow }) {
  const { ring, label, value } = hub;
  const vairiLine = hub.vairi;
  const { chartFont } = useAvakahadaAssets();

  if (ring === "nakshatra") {
    return (
      <ScrollView
        contentContainerClassName={avakahadaClasses.hubStack}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{ color: W_INK, fontFamily: chartFont }}
          className={cn(avakahadaClasses.hubNakTitle, "text-xs text-center")}
        >
          {hub.nakTitle}
        </Text>
        <View className={avakahadaClasses.hubAttrList}>
          {hub.attrs.map((attr) => (
            <View
              key={attr.id}
              className={cn("flex-row justify-between", avakahadaClasses.hubAttrRow)}
              style={{ borderBottomColor: W_SEP_SOFT }}
            >
              <Text style={{ color: W_INK_FAINT, fontFamily: chartFont }} className={cn(avakahadaClasses.hubAttrName, "text-xs")}>
                {attr.label}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: W_INK, fontFamily: chartFont }}
                className={cn(avakahadaClasses.hubAttrValue, "text-xs shrink")}
              >
                {attr.value}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ color: W_INK_FAINT, fontFamily: chartFont }} className={cn(avakahadaClasses.hubSub, "text-xs")}>
          {vairiLine}
        </Text>
      </ScrollView>
    );
  }

  return (
    <View className={avakahadaClasses.hubStack}>
      <Text
        style={{ color: W_ACCENT, fontFamily: chartFont }}
        className={cn(avakahadaClasses.hubLabel, "text-xs text-center")}
      >
        {label}
      </Text>
      {ring === "gana" ? (
        <Text
          style={{ fontFamily: chartFont }}
          className={cn(avakahadaClasses.hubGanaPill, "text-xs", GANA_PILL_CLASS[row.gana])}
        >
          {value}
        </Text>
      ) : (
        <Text
          style={{ color: W_INK, fontFamily: chartFont }}
          className={cn(avakahadaClasses.hubValue, "text-sm text-center")}
        >
          {value}
        </Text>
      )}
      {hub.charan ? (
        <Text
          style={{ color: W_INK_FAINT, fontFamily: chartFont }}
          className={cn(avakahadaClasses.hubSub, "text-xs text-center")}
        >
          {hub.charan}
        </Text>
      ) : null}
      <Text
        style={{ color: W_INK_FAINT, fontFamily: chartFont }}
        className={cn(avakahadaClasses.hubSub, "text-xs text-center")}
        numberOfLines={2}
      >
        {hub.nakTitle}
      </Text>
      {ring === "yoni" ? (
        <Text style={{ color: W_INK_FAINT, fontFamily: chartFont }} className={cn(avakahadaClasses.hubVairi, "text-xs")}>
          {vairiLine}
        </Text>
      ) : null}
    </View>
  );
}


type Props = {
  highlighted?: Pick<AvakahadaWheelRow, "index">[];
  assets: AvakahadaWheelAssets;
};

function AvakahadaWheelView({ highlighted }: { highlighted?: Props["highlighted"] }) {
  const v = useAvakahadaWheel({ highlighted });
  const { lang } = useLocale();
  const { width } = useWindowDimensions();
  const { ganaFill: GANA_FILL, regularFont, chartFont } = useAvakahadaAssets();
  const { allRows, highlightSet, hasFilter, selected, activeRow, selectFocus, copy } = v;
  const isSameFocus = sameAvakahadaFocus;

  /* The stage's card has a 12 px margin and its own padding. */
  const size = Math.min(width - 32 - 24, 660);

  const layers = useMemo(() => {
    const segs: ReactNode[] = [];
    const labels: ReactNode[] = [];

    allRows.forEach((row, i) => {
      const a0 = i * NAK_STEP;
      const a1 = (i + 1) * NAK_STEP;
      const mid = (a0 + a1) / 2;
      const isActiveNak = selected?.index === row.index;
      const dim = hasFilter && !highlightSet.has(row.index) ? 0.22 : 1;
      const nakSel = isActiveNak && selected?.ring === "nakshatra";

      segs.push(
        <Path
          key={`nak-${row.index}`}
          d={sectorPath(R.nakIn, R.nakOut, a0, a1)}
          fill={GANA_FILL[row.gana]}
          fillOpacity={dim}
          stroke={nakSel ? W_ACCENT : W_SEP}
          strokeWidth={nakSel ? 1.2 : 0.55}
          strokeOpacity={dim}
          onPress={press(() => selectFocus({ index: row.index, ring: "nakshatra" }))}
        />,
      );

      ATTR_RINGS.forEach((ring) => {
        const ringFocus: HubFocus = { index: row.index, ring: ring.id };
        const ringSel = isSameFocus(selected, ringFocus);
        segs.push(
          <Path
            key={`${ring.id}-${row.index}`}
            d={sectorPath(ring.rIn, ring.rOut, a0, a1)}
            fill={i % 2 === 1 ? ATTR_FILL_ALT : ATTR_FILL}
            fillOpacity={dim}
            stroke={ringSel ? W_ACCENT : W_SEP_SOFT}
            strokeWidth={ringSel ? 1.1 : 0.3}
            strokeOpacity={dim}
            onPress={press(() => selectFocus(ringFocus))}
          />,
        );
        labels.push(
          <RadialText
            key={`${ring.id}-lbl-${row.index}`}
            deg={mid}
            r={(ring.rOut + ring.rIn) / 2}
            size={ring.id === "rashi" || ring.id === "yoni" ? 7 : 6.5}
            bold={ring.id === "gana"}
            fill={
              ringSel
                ? W_ACCENT
                : ring.id === "gana"
                  ? GANA_VALUE_INK
                  : ring.id === "nadi"
                    ? NADI_VALUE_INK
                    : W_INK_DIM
            }
          >
            {attrValue(ring.id, row, lang)}
          </RadialText>,
        );
      });

      const nakName =
        row.nakshatraLabel.length > 8 ? `${row.nakshatraLabel.slice(0, 7)}…` : row.nakshatraLabel;

      labels.push(
        <RadialText
          key={`nak-idx-${row.index}`}
          deg={mid}
          r={278}
          size={8}
          font={regularFont}
          fill={isActiveNak ? W_ACCENT : W_INK_FAINT}
        >
          {row.index}
        </RadialText>,
        <RadialText
          key={`nak-name-${row.index}`}
          deg={mid}
          r={264}
          size={9}
          fill={isActiveNak ? W_ACCENT : W_INK}
        >
          {nakName}
        </RadialText>,
      );
    });

    return { segs, labels };
  }, [allRows, hasFilter, highlightSet, lang, selected, selectFocus]);

  const padaSegs = useMemo(() => {
    const step = 360 / 108;
    return AVAKAHADA.flatMap((row, ni) =>
      row.aksharas.map((akshara, pi) => {
        const i = ni * 4 + pi;
        const a0 = i * step;
        const a1 = (i + 1) * step;
        const mid = (a0 + a1) / 2;
        const dim = hasFilter && !highlightSet.has(row.index) ? 0.22 : 1;
        const padaFocus: HubFocus = { index: row.index, ring: "pada", padaIndex: pi };
        const padaSel = isSameFocus(selected, padaFocus);

        return (
          <G key={`pada-${i}`}>
            <Path
              d={sectorPath(R.padaIn, R.padaOut, a0, a1)}
              fill={i % 2 === 1 ? W_PADA_ALT : W_PADA}
              fillOpacity={dim}
              stroke={padaSel ? W_ACCENT : W_SEP_SOFT}
              strokeWidth={padaSel ? 1 : 0.35}
              strokeOpacity={dim}
              onPress={press(() => selectFocus(padaFocus))}
            />
            <RadialText deg={mid} r={239} size={7.5} fill={W_INK_DIM}>
              {akshara}
            </RadialText>
          </G>
        );
      }),
    );
  }, [hasFilter, highlightSet, selected, selectFocus]);

  const hubBox = R.hub * 2 - 20;

  const drawWheel = (size: number) => {
    const scale = size / 620;
    return (
          <View
            style={{
              width: size,
              height: size,
              alignSelf: "center",
            }}
          >
            <Svg width={size} height={size} viewBox="0 0 620 620">
              <Defs>
                <RadialGradient id="av-hub-glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={HUB_CENTER} />
                  <Stop offset="100%" stopColor={HUB_EDGE} />
                </RadialGradient>
              </Defs>

              <Circle cx={CX} cy={CY} r={RIM} fill="none" stroke={W_RIM} strokeWidth={1.5} />
              {[R.padaIn, R.rashiIn, R.lordIn, R.varnaIn, R.vashyaIn, R.yoniIn, R.ganaIn, R.nadiIn].map(
                (r) => (
                  <Circle
                    key={`guide-c-${r}`}
                    cx={CX}
                    cy={CY}
                    r={r}
                    fill="none"
                    stroke={W_SEP_SOFT}
                    strokeWidth={0.35}
                    opacity={0.55}
                  />
                ),
              )}

              {padaSegs}
              {layers.segs}

              {v.attrRings.map((ring) => (
                <RadialText
                  key={`guide-${ring.id}`}
                  deg={RING_GUIDE_DEG}
                  r={(ring.rOut + ring.rIn) / 2}
                  size={6}
                  bold
                  fill={W_ACCENT}
                >
                  {ring.label}
                </RadialText>
              ))}

              {layers.labels}

              {Array.from({ length: 27 }, (_, i) => {
                const deg = i * NAK_STEP;
                const [x1, y1] = polar(R.nadiIn, deg);
                const [x2, y2] = polar(R.nakOut, deg);
                return (
                  <Line
                    key={`spoke-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={W_SEP_SOFT}
                    strokeWidth={0.5}
                  />
                );
              })}

              <Circle
                cx={CX}
                cy={CY}
                r={R.hub}
                fill="url(#av-hub-glow)"
                stroke={W_SURFACE_BORDER}
                strokeWidth={1}
              />
            </Svg>

            {/* hub overlay — react-native-svg has no foreignObject */}
            <View
              pointerEvents="box-none"
              style={{
                position: "absolute",
                left: (CX - R.hub + 10) * scale,
                top: (CY - R.hub + 10) * scale,
                width: hubBox * scale,
                height: hubBox * scale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeRow && selected ? (
                <HubContent hub={v.hub(selected, activeRow)} row={activeRow} />
              ) : (
                <View className="items-center px-1">
                  <Text
                    style={{ color: W_ACCENT, fontFamily: chartFont }}
                    className={cn(avakahadaClasses.hubIdleTitle, "text-sm")}
                  >
                    {copy.hubTitle}
                  </Text>
                  <Text
                    style={{ color: W_INK, fontFamily: chartFont }}
                    className={cn(avakahadaClasses.hubIdleHint, "text-xs text-center")}
                  >
                    {copy.hubHint}
                  </Text>
                </View>
              )}
            </View>
          </View>
    );
  };

  return (
    <View className={avakahadaClasses.wheelSection}>
      <View className={avakahadaClasses.wheelHead}>
        <Text className={avakahadaClasses.wheelTitle} style={{ fontFamily: chartFont }}>
          {copy.title}
        </Text>
        <Text className={avakahadaClasses.wheelSubtitle} style={{ fontFamily: chartFont }}>
          {copy.subtitle}
        </Text>
      </View>

      <View className="m-3">
        <ZoomStage size={size}>{(px) => drawWheel(px)}</ZoomStage>
      </View>

      <View className={cn("flex-row", avakahadaClasses.legend)}>
        <Text className={avakahadaClasses.legendLabel} style={{ fontFamily: chartFont }}>
          {copy.legendGana}
        </Text>
        {v.ganas.map(({ gana: g, label }) => (
          <View key={g} className={cn("flex-row", avakahadaClasses.legendItem)}>
            <View
              style={{ backgroundColor: GANA_FILL[g] }}
              className={avakahadaClasses.legendSwatch}
            />
            <Text className={avakahadaClasses.legendText} style={{ fontFamily: chartFont }}>
              {label}
            </Text>
          </View>
        ))}
        <Text className={avakahadaClasses.legendText} style={{ fontFamily: chartFont }}>
          {copy.legendRings}
        </Text>
        <Text className={avakahadaClasses.legendText} style={{ fontFamily: chartFont }}>
          {`· ${copy.panHint}`}
        </Text>
        {copy.filter ? (
          <Text className={avakahadaClasses.legendText} style={{ fontFamily: chartFont }}>
            {copy.filter}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const AVAKAHADA_WHEEL_ROWS = AVAKAHADA.map((r) => toWheelRow(r, "ne"));

export function AvakahadaWheel({ highlighted, assets }: Props) {
  return (
    <AvakahadaAssetsContext.Provider value={assets}>
      <AvakahadaWheelView highlighted={highlighted} />
    </AvakahadaAssetsContext.Provider>
  );
}

export default AvakahadaWheel;
