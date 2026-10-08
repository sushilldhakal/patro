import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Pressable, ScrollView, View } from "react-native";
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
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { AVAKAHADA, type Gana, type NakshatraRow } from "@/lib/avakahada-data";
import {
  localizeGana,
  localizeLord,
  localizeNadi,
  localizeNakshatra,
  localizeRashi,
  localizeVarna,
  localizeVashya,
  localizeYoni,
  rowMetaFromCharans,
} from "@/lib/avakahada-locale";
import { useLocale } from "@/lib/i18n";
import { nepaliSvgTextCenter, nepaliTextStyle } from "@/lib/nepali-text";
import { NOTO_DEVANAGARI_CHART, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";
import { useBreakpoint } from "@/lib/responsive";

/**
 * react-native-svg types `Defs` without `children` and `onPress` as an
 * unsatisfiable intersection; both work fine at runtime.
 */
const Defs = SvgDefsBase as unknown as React.ComponentType<{ children?: ReactNode }>;
const press = (fn: () => void) => fn as never;

const CX = 310;
const CY = 310;
const RIM = 302;

/** Outside → inside */
const R = {
  nakOut: 302,
  nakIn: 254,
  padaOut: 254,
  padaIn: 224,
  rashiOut: 224,
  rashiIn: 208,
  lordOut: 208,
  lordIn: 192,
  varnaOut: 192,
  varnaIn: 176,
  vashyaOut: 176,
  vashyaIn: 160,
  yoniOut: 160,
  yoniIn: 144,
  ganaOut: 144,
  ganaIn: 128,
  nadiOut: 128,
  nadiIn: 112,
  hub: 104,
} as const;

const NAK_STEP = 360 / 27;
/** Ring-name guides sit on a nakshatra boundary spoke — not at 286° (Śravaṇa mid). */
const RING_GUIDE_DEG = 17 * NAK_STEP;

// ── Resolved `.pn-wheel` / `.av-wheel` theme values ─────────────────────────
// The wheel is always dark (as on web), so these are literal rather than
// theme-driven — same technique as WheelChart.
const W_RIM = "rgba(169,212,212,0.5)";
const W_SEP = "rgba(143,191,193,0.42)";
const W_SEP_SOFT = "rgba(143,191,193,0.16)";
const W_INK = "#eaf3f1";
const W_INK_DIM = "#a7c4c3";
const W_INK_FAINT = "#84a3a2";
const W_ACCENT = "#c62828";
const W_PADA = "#0d2024";
const W_PADA_ALT = "#112a2f";
const W_SURFACE_BORDER = "rgba(143,191,193,0.28)";
const HUB_CENTER = "#0f2224";
const HUB_EDGE = "#091315";
/** color-mix(in srgb, var(--brand-teal) 14% / 22%, #0a1518 / #0b181a) */
const ATTR_FILL = "#0f241c";
const ATTR_FILL_ALT = "#132e1f";
const GANA_VALUE_INK = "#b8e8d8";
const NADI_VALUE_INK = "#c4d4f0";

const FONT = NOTO_DEVANAGARI_CHART;
const NUM_FONT = NOTO_DEVANAGARI_REGULAR;

const GANA_FILL: Record<Gana, string> = {
  देव: "#183e23",
  नर: "#0b2c2e",
  राक्षस: "#3f1c1e",
};

const GANA_PILL: Record<Gana, { bg: string; fg: string }> = {
  देव: { bg: "rgba(16,185,129,0.25)", fg: "#6ee7b7" },
  नर: { bg: "rgba(14,165,233,0.25)", fg: "#7dd3fc" },
  राक्षस: { bg: "rgba(244,63,94,0.25)", fg: "#fda4af" },
};

const ATTR_RINGS = [
  { id: "rashi" as const, rOut: R.rashiOut, rIn: R.rashiIn },
  { id: "lord" as const, rOut: R.lordOut, rIn: R.lordIn },
  { id: "varna" as const, rOut: R.varnaOut, rIn: R.varnaIn },
  { id: "vashya" as const, rOut: R.vashyaOut, rIn: R.vashyaIn },
  { id: "yoni" as const, rOut: R.yoniOut, rIn: R.yoniIn },
  { id: "gana" as const, rOut: R.ganaOut, rIn: R.ganaIn },
  { id: "nadi" as const, rOut: R.nadiOut, rIn: R.nadiIn },
] as const;

type AttrRingId = (typeof ATTR_RINGS)[number]["id"];
type HubRing = AttrRingId | "nakshatra" | "pada";

type HubFocus = {
  index: number;
  ring: HubRing;
  padaIndex?: number;
};

const RING_LABELS: Record<HubRing, { ne: string; en: string }> = {
  nakshatra: { ne: "नक्षत्र", en: "Nakshatra" },
  pada: { ne: "नामाक्षर (चरण १–४)", en: "Name syllable (charan 1–4)" },
  rashi: { ne: "राशि", en: "Rashi" },
  lord: { ne: "राशि स्वामी", en: "Rashi lord" },
  varna: { ne: "वर्ण", en: "Varna" },
  vashya: { ne: "वश्य", en: "Vashya" },
  yoni: { ne: "योनि", en: "Yoni" },
  gana: { ne: "गण", en: "Gana" },
  nadi: { ne: "नाडी", en: "Nadi" },
};

export type AvakahadaWheelRow = {
  index: number;
  ne: string;
  en: string;
  nakshatraLabel: string;
  aksharas: string[];
  charanRashis: string[];
  lord: string;
  varna: string;
  vashya: string;
  yoni: string;
  vairiYoni: string;
  gana: Gana;
  nadi: string;
};

export function toWheelRow(r: NakshatraRow, lang: string): AvakahadaWheelRow {
  const meta = rowMetaFromCharans(r.charanRashis);
  return {
    index: r.index,
    ne: r.ne,
    en: r.en,
    nakshatraLabel: localizeNakshatra(r, lang),
    aksharas: r.aksharas,
    charanRashis: r.charanRashis,
    lord: localizeLord(meta.lord, lang),
    varna: localizeVarna(meta.varna, lang),
    vashya: localizeVashya(meta.vashya, lang),
    yoni: localizeYoni(r.yoni, lang),
    vairiYoni: localizeYoni(r.vairiYoni, lang),
    gana: r.gana,
    nadi: localizeNadi(r.nadi, lang),
  };
}

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(rOut, a0);
  const [x2, y2] = polar(rOut, a1);
  const [x3, y3] = polar(rIn, a1);
  const [x4, y4] = polar(rIn, a0);
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${rOut},${rOut} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${rIn},${rIn} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function formatRashi(row: AvakahadaWheelRow, lang: string): string {
  const u = [...new Set(row.charanRashis)];
  if (u.length === 1) return localizeRashi(u[0]!, lang);
  return u.map((r) => localizeRashi(r, lang)).join("/");
}

function formatDual(value: string): string {
  return value.replace(/ \/ /g, "·");
}

function attrValue(id: AttrRingId, row: AvakahadaWheelRow, lang: string): string {
  switch (id) {
    case "rashi":
      return formatRashi(row, lang);
    case "lord":
      return formatDual(row.lord);
    case "varna":
      return formatDual(row.varna);
    case "vashya":
      return localizeVashya(row.vashya, lang, true);
    case "yoni":
      return row.yoni;
    case "gana":
      return localizeGana(row.gana, lang);
    case "nadi":
      return row.nadi;
  }
}

function RadialText({
  deg,
  r,
  fill,
  size,
  bold,
  font = FONT,
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
  const [x, y] = polar(r, deg);
  const flip = deg > 90 && deg < 270;
  const rot = flip ? deg + 180 : deg;
  return (
    <SvgText
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontFamily={font}
      fontWeight={bold ? "bold" : "600"}
      textAnchor="middle"
      {...nepaliSvgTextCenter}
      transform={`rotate(${rot} ${x.toFixed(2)} ${y.toFixed(2)})`}
    >
      {children}
    </SvgText>
  );
}

function HubContent({ focus, row }: { focus: HubFocus; row: AvakahadaWheelRow }) {
  const { lang, pick } = useLocale();
  const { ring, padaIndex } = focus;
  const label = pick(RING_LABELS[ring].ne, RING_LABELS[ring].en);

  const vairiLine = pick(
    `वैरि योनि: ${row.vairiYoni}`,
    `Enemy yoni: ${row.vairiYoni}`,
  );

  if (ring === "nakshatra") {
    return (
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingVertical: 4 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{ color: W_INK, ...nepaliTextStyle(12) }}
          className="text-center text-xs font-bold"
        >
          {row.index}. {row.nakshatraLabel}
        </Text>
        <View className="mt-1 w-full">
          {ATTR_RINGS.map((attr) => (
            <View
              key={attr.id}
              className="flex-row justify-between gap-1 border-b py-0.5"
              style={{ borderBottomColor: W_SEP_SOFT }}
            >
              <Text style={{ color: W_INK_FAINT, ...nepaliTextStyle(9) }} className="text-[12px]">
                {pick(RING_LABELS[attr.id].ne, RING_LABELS[attr.id].en)}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: W_INK, ...nepaliTextStyle(9) }}
                className="shrink text-[12px] font-semibold"
              >
                {attrValue(attr.id, row, lang)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ color: W_INK_FAINT, ...nepaliTextStyle(9) }} className="mt-1 text-[12px]">
          {vairiLine}
        </Text>
      </ScrollView>
    );
  }

  const value =
    ring === "pada"
      ? padaIndex != null
        ? (row.aksharas[padaIndex] ?? "")
        : ""
      : attrValue(ring, row, lang);

  return (
    <View className="items-center px-1 py-1">
      <Text
        style={{ color: W_ACCENT, ...nepaliTextStyle(10) }}
        className="text-center text-[12px] font-bold uppercase tracking-wide"
      >
        {label}
      </Text>
      {ring === "gana" ? (
        <View
          style={{ backgroundColor: GANA_PILL[row.gana].bg }}
          className="mt-0.5 rounded-full px-1.5 py-0.5"
        >
          <Text
            style={{ color: GANA_PILL[row.gana].fg, ...nepaliTextStyle(13) }}
            className="text-[13px] font-bold"
          >
            {value}
          </Text>
        </View>
      ) : (
        <Text
          style={{ color: W_INK, ...nepaliTextStyle(15) }}
          className="mt-0.5 text-center text-[15px] font-bold"
        >
          {value}
        </Text>
      )}
      {ring === "pada" && padaIndex != null ? (
        <Text
          style={{ color: W_INK_FAINT, ...nepaliTextStyle(10) }}
          className="mt-1 text-center text-[12px]"
        >
          {pick(
            `चरण ${padaIndex + 1} · ${localizeRashi(row.charanRashis[padaIndex]!, lang)}`,
            `Charan ${padaIndex + 1} · ${localizeRashi(row.charanRashis[padaIndex]!, lang)}`,
          )}
        </Text>
      ) : null}
      <Text
        style={{ color: W_INK_FAINT, ...nepaliTextStyle(10) }}
        className="mt-1 text-center text-[12px]"
        numberOfLines={2}
      >
        {row.index}. {row.nakshatraLabel}
      </Text>
      {ring === "yoni" ? (
        <Text style={{ color: W_INK_FAINT, ...nepaliTextStyle(9) }} className="text-[12px]">
          {vairiLine}
        </Text>
      ) : null}
    </View>
  );
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3.5;
const ZOOM_STEP = 1.35;

type Props = {
  highlighted?: Pick<AvakahadaWheelRow, "index">[];
};

export function AvakahadaWheel({ highlighted }: Props) {
  const { lang, pick, digits } = useLocale();
  const { width } = useBreakpoint();
  const [selected, setSelected] = useState<HubFocus | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const size = Math.min(width - 32, 660);
  const scale = size / 620;

  const handleZoom = useCallback((z: number) => {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    setZoom(next);
    if (next <= 1) setPan({ x: 0, y: 0 });
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          zoomRef.current > 1 && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
        onPanResponderGrant: () => {
          panStart.current = pan;
        },
        onPanResponderMove: (_e, g) => {
          setPan({ x: panStart.current.x + g.dx, y: panStart.current.y + g.dy });
        },
      }),
    [pan],
  );

  const allRows = useMemo(() => AVAKAHADA.map((r) => toWheelRow(r, lang)), [lang]);

  const highlightSet = useMemo(
    () => new Set((highlighted ?? allRows).map((r) => r.index)),
    [highlighted, allRows],
  );
  const hasFilter = highlighted !== undefined && highlighted.length < allRows.length;

  const activeRow = useMemo(
    () => (selected != null ? allRows.find((r) => r.index === selected.index) : undefined),
    [selected, allRows],
  );

  const selectFocus = useCallback((focus: HubFocus) => {
    setSelected((s) =>
      s?.index === focus.index && s?.ring === focus.ring && s?.padaIndex === focus.padaIndex
        ? null
        : focus,
    );
  }, []);

  const isSameFocus = (a: HubFocus | null | undefined, b: HubFocus) =>
    a?.index === b.index && a?.ring === b.ring && a?.padaIndex === b.padaIndex;

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
          font={NUM_FONT}
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

  const ganas: Gana[] = ["देव", "नर", "राक्षस"];
  const hubBox = R.hub * 2 - 20;

  return (
    <View className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
      <View className="px-4 pt-4">
        <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(18)}>
          {pick("अवकहडा चक्र — चक्र दृश्य", "Avakahada Chakra — wheel view")}
        </Text>
        <Text className="mt-0.5 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick(
            "बाहिरबाट भित्र: नक्षत्र → नामाक्षर (१०८ चरण) → राशि → स्वामी → वर्ण → वश्य → योनि → गण → नाडी",
            "Outside to inside: nakshatra → name syllable (108 charans) → rashi → lord → varna → vashya → yoni → gana → nadi",
          )}
        </Text>
      </View>

      <View
        className="m-3 overflow-hidden rounded-2xl p-2"
        style={{ backgroundColor: "#0a1a1b", borderWidth: 1, borderColor: W_SURFACE_BORDER }}
      >
        <View className="mb-2 flex-row items-center justify-end gap-1.5">
          <ZoomBtn icon="add" onPress={() => handleZoom(zoom * ZOOM_STEP)} />
          <ZoomBtn
            icon="remove"
            disabled={zoom <= ZOOM_MIN}
            onPress={() => handleZoom(zoom / ZOOM_STEP)}
          />
          {zoom !== 1 ? (
            <Pressable
              onPress={resetView}
              style={{ borderColor: W_SURFACE_BORDER }}
              className="rounded-md border px-2 py-1 active:opacity-70"
            >
              <Text style={{ color: W_INK_DIM }} className="text-[12px] font-semibold">
                1:1
              </Text>
            </Pressable>
          ) : null}
          <Text
            style={{ color: W_INK_DIM, fontFamily: NUM_FONT }}
            className="min-w-[42px] text-center text-[12px] font-semibold"
          >
            {digits(Math.round(zoom * 100))}%
          </Text>
        </View>

        <View className="overflow-hidden" style={{ height: size }} {...responder.panHandlers}>
          <View
            style={{
              width: size,
              height: size,
              alignSelf: "center",
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }],
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

              {ATTR_RINGS.map((ring) => (
                <RadialText
                  key={`guide-${ring.id}`}
                  deg={RING_GUIDE_DEG}
                  r={(ring.rOut + ring.rIn) / 2}
                  size={6}
                  bold
                  fill={W_ACCENT}
                >
                  {pick(RING_LABELS[ring.id].ne, RING_LABELS[ring.id].en)}
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
                <HubContent focus={selected} row={activeRow} />
              ) : (
                <View className="items-center px-1">
                  <Text
                    style={{ color: W_ACCENT, ...nepaliTextStyle(16) }}
                    className="text-base font-bold"
                  >
                    {pick("अवकहडा", "Avakahada")}
                  </Text>
                  <Text
                    style={{ color: W_INK, ...nepaliTextStyle(10) }}
                    className="mt-1 text-center text-[12px] font-semibold"
                  >
                    {pick(
                      "वलय छुनुहोस् — नक्षत्र, अक्षर, राशि, वर्ण, वश्य, योनि, गण, नाडी",
                      "Tap a ring — nakshatra, syllable, rashi, varna, vashya, yoni, gana, nadi",
                    )}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center gap-x-3.5 gap-y-2 px-4 pb-4">
        <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(12)}>
          {pick("गण रङ:", "Gana colors:")}
        </Text>
        {ganas.map((g) => (
          <View key={g} className="flex-row items-center gap-1.5">
            <View
              style={{ backgroundColor: GANA_FILL[g] }}
              className="h-3 w-3 rounded-[3px] border border-border"
            />
            <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
              {localizeGana(g, lang)}
            </Text>
          </View>
        ))}
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick(
            "· भित्री ७ वलय: राशि, स्वामी, वर्ण, वश्य, योनि, गण, नाडी",
            "· 7 inner rings: rashi, lord, varna, vashya, yoni, gana, nadi",
          )}
        </Text>
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
          {pick("· जुम गरेपछि तानेर सार्न सकिन्छ", "· Drag to pan when zoomed")}
        </Text>
        {hasFilter ? (
          <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {pick(
              `· खोजमा ${digits(highlightSet.size)} नक्षत्र`,
              `· ${highlightSet.size} nakshatras in search`,
            )}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ZoomBtn({
  icon,
  onPress,
  disabled,
}: {
  icon: "add" | "remove";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ borderColor: W_SURFACE_BORDER, opacity: disabled ? 0.4 : 1 }}
      className="h-7 w-7 items-center justify-center rounded-md border active:opacity-70"
    >
      <Ionicons name={icon} size={15} color={W_INK_DIM} />
    </Pressable>
  );
}

export const AVAKAHADA_WHEEL_ROWS = AVAKAHADA.map((r) => toWheelRow(r, "ne"));

export default AvakahadaWheel;
