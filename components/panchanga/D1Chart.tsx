import { useCallback, useMemo, useState } from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusMarksSvg";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { Text } from "@/components/ui/Text";
import type { BhavaHouse } from "@/lib/bhava";
import { aspectHousesFor, drishtiTargetHouses } from "@/lib/bhava";
import { bhavaHousesHaveStatusMarks } from "@/lib/graha-status";
import {
  NI_HOUSE_POLYGONS,
  planetGridLayout,
  pointsToSvg,
  polygonCentroid,
} from "@/lib/kundali/north-indian-layout";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@/lib/utils";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { bhavaReferenceKeys, fetchBhavaReference, type BhavaReferencePayload } from "@/lib/api";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";

const PLANET_ABBR_NE: Record<string, string> = {
  sun: "सू",
  moon: "चं",
  mars: "मं",
  mercury: "बु",
  jupiter: "गु",
  venus: "शु",
  saturn: "श",
  rahu: "रा",
  ketu: "के",
};

const PLANET_ABBR_EN: Record<string, string> = {
  sun: "Su",
  moon: "Mo",
  mars: "Ma",
  mercury: "Me",
  jupiter: "Ju",
  venus: "Ve",
  saturn: "Sa",
  rahu: "Ra",
  ketu: "Ke",
};

const RASHI_EN = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
];

type Props = {
  houses: BhavaHouse[];
};

type Selected = { key: string; house: number };

/**
 * Under plain `tsc` this project's `moduleSuffixes` (".web" first) resolves
 * react-native-svg's *web* type declarations even for this native-only file,
 * and those describe `onPress` with a broken, un-satisfiable intersection
 * type. There's no typecheck script in this repo's CI today; casting here is
 * the narrow, contained workaround rather than fighting the wrong platform's
 * types or touching the project-wide tsconfig.
 */
function svgOnPress(handler: (() => void) | undefined): any {
  return handler;
}

/** Small filled triangle at (x2,y2), pointing away from (x1,y1) — a manual
 * arrowhead since react-native-svg's <Marker>/<Defs> hit the same type-only
 * resolution problem as onPress above, with no existing usage in this
 * codebase to mirror. */
function arrowHeadPoints(x1: number, y1: number, x2: number, y2: number, size = 6): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const p1x = x2 - size * Math.cos(angle - spread);
  const p1y = y2 - size * Math.sin(angle - spread);
  const p2x = x2 - size * Math.cos(angle + spread);
  const p2y = y2 - size * Math.sin(angle + spread);
  return `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`;
}

function pointInPolygon(x: number, y: number, pts: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function formatHouseList(houses: number[], lang: "ne" | "en", digits: (v: number) => string): string {
  const parts = houses.map((h) => digits(h));
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(", ");
  return lang === "en" ? `${rest} and ${last}` : `${rest} र ${last}`;
}

/** "क्रूर (छाया) दृष्टि" / "Malefic (Shadow) Aspect" — pure display logic over
 * the fetched isMalefic/isChaya flags, not itself interpretive content. */
function drishtiBadgeText(grahaKey: string, ref: BhavaReferencePayload, lang: "ne" | "en"): string {
  const info = ref.grahaDrishti[grahaKey];
  if (!info) return "";
  if (lang === "en") {
    const nature = info.isMalefic ? "Malefic" : "Benefic";
    return info.isChaya ? `${nature} (Shadow) Aspect` : `${nature} Aspect`;
  }
  const nature = info.isMalefic ? "क्रूर" : "सौम्य";
  return info.isChaya ? `${nature} (छाया) दृष्टि` : `${nature} दृष्टि`;
}

function DrishtiPanel({
  selected,
  reference,
  onClose,
}: {
  selected: Selected;
  reference: BhavaReferencePayload;
  onClose: () => void;
}) {
  const { pick, digits, lang } = useLocale();
  const small = lang === "en" ? undefined : nepaliTextStyle(12);
  const grahaKey = selected.key as GrahaKey;
  const info = reference.grahaDrishti[grahaKey];
  if (!info) return null;

  // The panel names the aspect by its classical offset (Jupiter is always
  // "described" as casting its 5th/7th/9th aspect, regardless of which
  // absolute house that lands on in this chart) — the arrows below still
  // point at the resolved absolute houses via drishtiTargetHouses.
  const offsets = aspectHousesFor(selected.key);
  const houseList = formatHouseList(offsets, lang, digits);
  const name = GRAHA_NAME[grahaKey] ? pick(GRAHA_NAME[grahaKey].ne, GRAHA_NAME[grahaKey].en) : grahaKey;
  const badge = drishtiBadgeText(grahaKey, reference, lang);

  return (
    <View className="mt-3 w-full gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-body flex-1 font-semibold text-foreground" style={small}>
          {pick(`${name}को दृष्टि: ${houseList} भावमा`, `${name}'s aspect: houses ${houseList}`)}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={pick("बन्द गर्नुहोस्", "Close")}
          className="h-7 w-7 items-center justify-center rounded-full bg-muted/60"
        >
          <Text className="text-body text-muted-foreground">✕</Text>
        </Pressable>
      </View>
      <View
        className={cn(
          "rounded-lg border p-3",
          info.isMalefic ? "border-destructive/20 bg-destructive/10" : "border-emerald-500/20 bg-emerald-500/10",
        )}
      >
        <View className="mb-1.5 flex-row items-center justify-between gap-2">
          <Text className="text-body font-semibold text-foreground">{pick("दृष्टिको फल", "Aspect effect")}</Text>
          <View
            className={cn(
              "rounded-full border px-2 py-0.5",
              info.isMalefic ? "border-destructive/30 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/15",
            )}
          >
            <Text
              className={cn(
                "text-body font-semibold",
                info.isMalefic ? "text-destructive" : "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {badge}
            </Text>
          </View>
        </View>
        <Text className="text-body leading-relaxed" style={small}>
          {pick(info.summaryNe, info.summaryEn)}
        </Text>
      </View>
    </View>
  );
}

export function D1Chart({ houses }: Props) {
  const { pick, digits } = useLocale();
  const { isTablet } = useBreakpoint();
  const colors = useThemeColors();
  const byHouse = useMemo(() => new Map(houses.map((h) => [h.house, h])), [houses]);
  const showLegend = useMemo(() => bhavaHousesHaveStatusMarks(houses), [houses]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [openHouse, setOpenHouse] = useState<number | null>(null);

  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });
  const reference = referenceQ.data;

  const targetHouses = useMemo(
    () => (selected ? new Set(drishtiTargetHouses(selected.key, selected.house)) : null),
    [selected],
  );

  const togglePlanet = (key: string, house: number) => {
    setSelected((prev) => (prev && prev.key === key && prev.house === house ? null : { key, house }));
  };

  /* Where every graha glyph sits, in viewBox units — the same arithmetic the
     render loop uses, kept here so taps can be resolved without depending on
     react-native-svg's own hit testing. */
  const planetSlots = useMemo(() => {
    const out: { key: string; house: number; x: number; y: number; r: number }[] = [];
    for (const [houseStr, points] of Object.entries(NI_HOUSE_POLYGONS)) {
      const houseNum = Number(houseStr);
      const planets = byHouse.get(houseNum)?.planets ?? [];
      if (planets.length === 0) continue;
      const [cx, cy] = polygonCentroid(points);
      const layout = planetGridLayout(points, planets.length);
      planets.forEach((planet, i) => {
        const row = Math.floor(i / layout.columns);
        const rowStart = row * layout.columns;
        const itemsInRow = Math.min(layout.columns, planets.length - rowStart);
        const col = i - rowStart;
        out.push({
          key: planet.key,
          house: houseNum,
          x: cx + (col - (itemsInRow - 1) / 2) * layout.colGap,
          y: cy + row * layout.rowGap - layout.fontSize * 0.3,
          r: Math.max(layout.fontSize * 0.9, 12),
        });
      });
    }
    return out;
  }, [byHouse]);

  const [chartSize, setChartSize] = useState(0);

  /* One tap handler for the whole चक्र: a graha glyph under the finger opens
     its aspect panel, anywhere else in a house opens that house's detail
     sheet. SVG-level onPress is unreliable on iOS for transparent shapes. */
  const onChartPress = useCallback(
    (e: GestureResponderEvent) => {
      if (chartSize <= 0) return;
      const scale = 300 / chartSize;
      const x = e.nativeEvent.locationX * scale;
      const y = e.nativeEvent.locationY * scale;

      let best: (typeof planetSlots)[number] | undefined;
      let bestD = Infinity;
      for (const slot of planetSlots) {
        const d = Math.hypot(slot.x - x, slot.y - y);
        if (d <= slot.r && d < bestD) {
          best = slot;
          bestD = d;
        }
      }
      if (best && reference?.grahaDrishti[best.key]) {
        togglePlanet(best.key, best.house);
        return;
      }
      for (const [houseStr, points] of Object.entries(NI_HOUSE_POLYGONS)) {
        const houseNum = Number(houseStr);
        if (byHouse.has(houseNum) && pointInPolygon(x, y, points)) {
          setOpenHouse(houseNum);
          return;
        }
      }
    },
    [chartSize, planetSlots, reference, byHouse],
  );

  /* On a wide column (iPad) the viewBox is scaled up, and the text with it —
     the rashi labels and graha glyphs ballooned. Past phone width, hold the
     rendered size of the text instead of letting it grow with the chart. */
  const wide = chartSize > 380;
  const houseLabelSize = wide ? (13 * 300) / chartSize : 15;
  const glyphCap = wide ? (15 * 300) / chartSize : Infinity;

  /* Square, and the full width of the column. `height={280}` against a
     viewBox 300 units square letterboxed the चक्र: `meet` scales by the
     smaller ratio, so on a ~340 px phone column the whole chart — glyphs
     included — was drawn at 0.93, and a crowded house's already-small text
     shrank again on the way to the screen. An `aspectRatio` box lets it use
     the width it has. */
  return (
    <View className="w-full items-center">
    <Pressable
      onPress={onChartPress}
      onLayout={(e) => setChartSize(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      style={{ width: isTablet ? "90%" : "100%", aspectRatio: 1 }}
    >
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={pick("उत्तर भारतीय D1 चक्र", "North Indian D1 chart")}>
        <Rect x={0} y={0} width={300} height={300} rx={4} fill={colors.card} stroke={colors.border} strokeWidth={1.5} />
        <Line x1={0} y1={0} x2={300} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
        <Line x1={300} y1={0} x2={0} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
        <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={colors.border} strokeWidth={1.25} opacity={0.8} />

        {Object.entries(NI_HOUSE_POLYGONS).map(([houseStr, points]) => {
          const houseNum = Number(houseStr);
          const house = byHouse.get(houseNum);
          const [cx, cy] = polygonCentroid(points);
          const planetLines = house?.planets ?? [];
          const hasPlanets = planetLines.length > 0;
          const layout = planetGridLayout(points, planetLines.length);
          const isAspected = Boolean(targetHouses?.has(houseNum));

          return (
            <G key={houseNum}>
              {/* Leaf-level touch target for the whole house. Deliberately
                  not relying on G-level press bubbling or stopPropagation —
                  both are flaky on react-native-svg. Planets render on top
                  with their own onPress and win the touch at their exact
                  pixels via normal topmost-shape hit testing. */}
              <Polygon
                points={pointsToSvg(points)}
                fill="transparent"
                onPress={svgOnPress(house ? () => setOpenHouse(houseNum) : undefined)}
              />
              {house?.isLagna ? (
                <Polygon points={pointsToSvg(points)} fill={colors.secondary} opacity={0.15} />
              ) : null}
              {isAspected && !house?.isLagna ? (
                <Polygon points={pointsToSvg(points)} fill={colors.secondary} opacity={0.08} />
              ) : null}
              {house ? (
                <SvgText
                  x={cx}
                  y={cy - (hasPlanets ? 12 : 0)}
                  fill={house.isLagna ? colors.secondary : colors.mutedForeground}
                  fontSize={houseLabelSize}
                  fontWeight="600"
                  textAnchor="middle"
                  onPress={svgOnPress(() => setOpenHouse(houseNum))}
                >
                  {`${digits(house.rashi)} ${pick(house.rashiNe, RASHI_EN[house.rashi - 1] ?? house.rashiNe)}`}
                </SvgText>
              ) : null}
              {planetLines.map((planet, i) => {
                const row = Math.floor(i / layout.columns);
                const rowStart = row * layout.columns;
                const itemsInRow = Math.min(layout.columns, planetLines.length - rowStart);
                const col = i - rowStart;
                const x = cx + (col - (itemsInRow - 1) / 2) * layout.colGap;
                const y = cy + row * layout.rowGap;
                const markSize = layout.fontSize * 0.5;
                const isSelected = selected?.key === planet.key && selected.house === houseNum;
                const isClickable = Boolean(reference?.grahaDrishti[planet.key]);
                const onPlanetPress = isClickable ? () => togglePlanet(planet.key, houseNum) : undefined;
                return (
                  <G key={planet.key}>
                    {/* Generous invisible touch target sized to the glyph —
                        a leaf shape so it wins the touch over the house
                        polygon underneath via z-order, no propagation needed. */}
                    <Circle
                      cx={x}
                      cy={y - layout.fontSize * 0.3}
                      r={layout.fontSize * 0.9}
                      fill={isSelected ? colors.secondary : "transparent"}
                      opacity={isSelected ? 0.2 : 1}
                      onPress={svgOnPress(onPlanetPress)}
                    />
                    <SvgText
                      x={x}
                      y={y}
                      fill={isSelected ? colors.secondary : colors.foreground}
                      fontSize={Math.min(layout.fontSize, glyphCap)}
                      fontWeight={isSelected ? "700" : "400"}
                      textAnchor="middle"
                      onPress={svgOnPress(onPlanetPress)}
                    >
                      {pick(
                        PLANET_ABBR_NE[planet.key] ?? planet.labelNe.slice(0, 2),
                        PLANET_ABBR_EN[planet.key] ?? planet.labelNe.slice(0, 2),
                      )}
                    </SvgText>
                    <GrahaStatusMarksSvg
                      planetKey={planet.key}
                      isRetrograde={planet.isRetrograde}
                      isCombust={planet.isCombust}
                      x={x + layout.fontSize * 0.42}
                      y={y - markSize - layout.fontSize * 0.05}
                      size={markSize}
                      vakriColor={colors.secondary}
                      astaColor={colors.danger}
                    />
                  </G>
                );
              })}
            </G>
          );
        })}

        {selected &&
          Array.from(targetHouses ?? []).map((targetHouse) => {
            if (targetHouse === selected.house) return null;
            const fromPoints = NI_HOUSE_POLYGONS[selected.house];
            const toPoints = NI_HOUSE_POLYGONS[targetHouse];
            if (!fromPoints || !toPoints) return null;
            const [x1, y1] = polygonCentroid(fromPoints);
            const [x2, y2] = polygonCentroid(toPoints);
            return (
              <G key={targetHouse}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.secondary} strokeWidth={1.5} opacity={0.85} />
                <Polygon points={arrowHeadPoints(x1, y1, x2, y2)} fill={colors.secondary} opacity={0.85} />
              </G>
            );
          })}
      </Svg>
    </Pressable>
      {showLegend ? <GrahaStatusLegend className="mt-2 w-full" /> : null}
      {selected && reference && (
        <DrishtiPanel selected={selected} reference={reference} onClose={() => setSelected(null)} />
      )}
      <BhavaDetailDialog
        houses={houses}
        houseNumber={openHouse}
        reference={reference}
        onClose={() => setOpenHouse(null)}
      />
    </View>
  );
}
