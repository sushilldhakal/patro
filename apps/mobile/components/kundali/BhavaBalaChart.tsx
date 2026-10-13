import { useMemo } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { GrahaInline } from "@/components/kundali/KundaliGlyphLabels";
import type { BhavaBalaData, BhavaBalaHouse, BhavaReferencePayload, VargaCharts } from "@/lib/api";
import { bhavaReferenceKeys, fetchBhavaReference } from "@/lib/api";
import { buildBhavaChart, houseClasses, type BhavaHouse } from "@vedic-patro/domain/bhava";
import { splitList } from "@vedic-patro/domain/kundali/bhava-detail";
import { NI_HOUSE_POLYGONS, pointsToSvg, polygonCentroid, type Point } from "@vedic-patro/domain/kundali/north-indian-layout";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel, kundaliLabelVars } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { type StrengthBand, strengthBand, houseNumberPos, rashiFromMadhya, clampPct } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { colorWithAlpha } from "@/lib/theme";

/**
 * Under plain `tsc` this project's `moduleSuffixes` (".web" first) resolves
 * react-native-svg's *web* type declarations even for this native-only file,
 * and those describe `onPress` with a broken, un-satisfiable intersection
 * type. Casting here is the narrow, contained workaround, mirroring D1Chart.
 */
function svgOnPress(handler: (() => void) | undefined): any {
  return handler;
}

function buildD1Houses(
  vargaCharts?: VargaCharts,
  combustion?: Record<string, boolean | null>,
): BhavaHouse[] {
  if (!vargaCharts) return [];
  const entries = vargaCharts.entries["1"] ?? [];
  const lagna = entries.find((entry) => entry.key === "lagna");
  if (!lagna) return [];
  return buildBhavaChart(
    lagna.vargaRashi,
    entries
      .filter((entry) => entry.key !== "lagna")
      .map((entry) => ({
        key: entry.key,
        labelNe: GRAHA_NAME[entry.key as GrahaKey]?.ne ?? entry.key,
        rashi: entry.vargaRashi,
        isRetrograde: entry.retrograde ?? false,
        isCombust: combustion?.[entry.key] ?? false,
      })));
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = clampPct(Math.abs(value), max);
  return (
    <View className={kundaliDetailClasses.bhavaChart.meter}>
      <View style={{ width: `${width}%` }} className={cn(kundaliDetailClasses.bhavaChart.meterFill, color)} />
    </View>
  );
}

function ComponentTile({
  label,
  value,
  max,
  color,
  digits,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  digits: (v: string | number) => string;
}) {
  const colors = useThemeColors();
  const abs = Math.abs(value).toFixed(1);
  const signed = value < 0 ? `−${abs}` : abs;
  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.tile, "flex-1")}>
      <Text className={kundaliDetailClasses.bhavaChart.tileLabel} style={nepaliTextStyle(10)} numberOfLines={1}>
        {label}
      </Text>
      <Text className={kundaliDetailClasses.bhavaChart.tileValue} numberOfLines={1}>
        {digits(signed)}
      </Text>
      <View className={kundaliDetailClasses.bhavaChart.tileMeter}>
        <Meter value={value} max={max} color={color} />
      </View>
    </View>
  );
}

function StrengthBadge({ band, isStrongest, lang }: { band: StrengthBand; isStrongest: boolean; lang: "ne" | "en" }) {
  const colors = useThemeColors();
  const label = isStrongest
    ? kundaliLabel("very_strong", lang)
    : band === "strong"
      ? kundaliLabel("report_confidence_strong", lang)
      : band === "weak"
        ? lang === "en" ? "Weak" : "कमजोर"
        : kundaliLabel("average_strength", lang);
  const isGood = isStrongest || band === "strong";
  const box = isGood ? kundaliDetailClasses.bhavaChart.badgeGood : band === "weak" ? kundaliDetailClasses.bhavaChart.badgeWeak : kundaliDetailClasses.bhavaChart.badgeAvg;
  const text = isGood ? kundaliDetailClasses.bhavaChart.badgeGoodText : band === "weak" ? kundaliDetailClasses.bhavaChart.badgeWeakText : kundaliDetailClasses.bhavaChart.badgeAvgText;
  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.badge, box)}>
      <Text className={cn(kundaliDetailClasses.bhavaChart.badgeText, text)}>
        {label}
      </Text>
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className={kundaliDetailClasses.bhavaChart.chip}>
      {children}
    </View>
  );
}

export function BhavaBalaChart({
  data,
  selectedHouse,
  onSelectHouse,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const { lang, pick, digits } = useLocale();
  const chartHouses = useMemo(() => buildD1Houses(vargaCharts, combustion), [vargaCharts, combustion]);
  const referenceQ = useQuery({
    queryKey: bhavaReferenceKeys.all,
    queryFn: fetchBhavaReference,
    staleTime: Infinity,
  });

  const byHouse = useMemo(() => new Map(data.houses.map((house) => [house.house, house])), [data.houses]);
  const rankByHouse = useMemo(() => {
    const ranked = [...data.houses].sort((a, b) => b.totalPinda - a.totalPinda);
    return new Map(ranked.map((house, index) => [house.house, index + 1]));
  }, [data.houses]);

  const selected = byHouse.get(selectedHouse) ?? data.strongest;
  const selectedChartHouse = chartHouses.find((house) => house.house === selected.house);
  const band = strengthBand(selected.percent);
  const rashi = selectedChartHouse?.rashi ?? rashiFromMadhya(selected.madhyaLongitude);
  const occupants = selectedChartHouse?.planets ?? [];
  const maxBhavadhipati = Math.max(...data.houses.map((house) => house.bhavadhipati), 1);
  const maxDrishti = Math.max(...data.houses.map((house) => Math.abs(house.drishti)), 30);
  const totalScale = Math.max(data.strongest.totalPinda, data.referenceVirupas);

  const goHouse = (delta: number) => {
    onSelectHouse((((selected.house - 1 + delta) % 12) + 12) % 12 + 1);
  };

  return (
    <View className={kundaliDetailClasses.bhavaChart.root}>
      <View>
        <Text className={kundaliDetailClasses.bhavaChart.title} style={nepaliTextStyle(15)}>
          {kundaliLabel("explore_houses", lang)}
        </Text>
        <Text className={kundaliDetailClasses.prose.mutedMt1} style={nepaliTextStyle(13)}>
          {kundaliLabel("explore_houses_hint", lang)}
        </Text>
      </View>

      <BhavaDiamond houses={data.houses} selectedHouse={selected.house} onSelectHouse={onSelectHouse} lang={lang} digits={digits} />

      <HouseInspector
        house={selected}
        rashi={rashi}
        occupants={occupants}
        rank={rankByHouse.get(selected.house) ?? 1}
        totalHouses={data.houses.length}
        band={band}
        isStrongest={selected.house === data.strongest.house}
        totalScale={totalScale}
        maxBhavadhipati={maxBhavadhipati}
        maxDrishti={maxDrishti}
        reference={referenceQ.data}
        onPrev={() => goHouse(-1)}
        onNext={() => goHouse(1)}
      />

      <View className={kundaliDetailClasses.bhavaChart.legend}>
        <LegendSwatch colorToken="primary" label={kundaliLabel("report_confidence_strong", lang)} />
        <LegendSwatch colorToken="mutedForeground" label={kundaliLabel("average_strength", lang)} />
        <LegendSwatch colorToken="destructive" label={lang === "en" ? "Weak" : "कमजोर"} />
      </View>
      <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
        {kundaliLabel("explore_houses_legend", lang)}
      </Text>
    </View>
  );
}

function LegendSwatch({ colorToken, label }: { colorToken: "primary" | "mutedForeground" | "destructive"; label: string }) {
  const colors = useThemeColors();
  return (
    <View className={kundaliDetailClasses.bhavaChart.swatch}>
      <View className={kundaliDetailClasses.bhavaChart.swatchDot} style={{ backgroundColor: colors[colorToken] }} />
      <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
        {label}
      </Text>
    </View>
  );
}

function BhavaDiamond({
  houses,
  selectedHouse,
  onSelectHouse,
  lang,
  digits,
}: {
  houses: BhavaBalaHouse[];
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
}) {
  const colors = useThemeColors();
  const byHouse = useMemo(() => new Map(houses.map((house) => [house.house, house])), [houses]);

  const scoreColor = (band: StrengthBand) =>
    band === "strong" ? colors.primary : band === "weak" ? colors.destructive : colors.mutedForeground;

  return (
    <View className={kundaliDetailClasses.bhavaChart.panel}>
      <View className="w-full items-center" style={{ width: "100%", aspectRatio: 1 }}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={kundaliLabel("bhava_bala_chart", lang)}>
          <Rect x={0} y={0} width={300} height={300} rx={4} fill={colors.background} stroke={colors.border} strokeWidth={1.5} />
          <Line x1={0} y1={0} x2={300} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
          <Line x1={300} y1={0} x2={0} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
          <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={colors.border} strokeWidth={1.25} opacity={0.8} />

          {Object.entries(NI_HOUSE_POLYGONS).map(([houseStr, points]) => {
            const houseNum = Number(houseStr);
            const house = byHouse.get(houseNum);
            if (!house) return null;
            const [cx, cy] = polygonCentroid(points);
            const [nx, ny] = houseNumberPos(points);
            const selected = houseNum === selectedHouse;
            const band = strengthBand(house.percent);

            return (
              <G key={houseNum}>
                <Polygon
                  points={pointsToSvg(points)}
                  fill={selected ? colorWithAlpha(colors.primary, 0.2) : "transparent"}
                  onPress={svgOnPress(() => onSelectHouse(houseNum))}
                />
                {selected ? (
                  <Polygon points={pointsToSvg(points)} fill="none" stroke={colors.primary} strokeWidth={1.6} />
                ) : null}
                <SvgText
                  x={nx}
                  y={ny}
                  textAnchor="middle"
                  fill={colors.mutedForeground}
                  fontSize={15}
                  fontWeight="600"
                  onPress={svgOnPress(() => onSelectHouse(houseNum))}
                >
                  {digits(houseNum)}
                </SvgText>
                <SvgText
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fill={scoreColor(band)}
                  fontSize={18}
                  fontWeight="700"
                  onPress={svgOnPress(() => onSelectHouse(houseNum))}
                >
                  {digits(Math.round(house.totalPinda))}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function HouseInspector({
  house,
  rashi,
  occupants,
  rank,
  totalHouses,
  band,
  isStrongest,
  totalScale,
  maxBhavadhipati,
  maxDrishti,
  reference,
  onPrev,
  onNext,
}: {
  house: BhavaBalaHouse;
  rashi: number;
  occupants: BhavaHouse["planets"];
  rank: number;
  totalHouses: number;
  band: StrengthBand;
  isStrongest: boolean;
  totalScale: number;
  maxBhavadhipati: number;
  maxDrishti: number;
  reference?: BhavaReferencePayload;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const lordKey = house.lordKey as GrahaKey;
  const lordEntry = GRAHA_NAME[lordKey];
  const lordName = lordEntry ? pick(lordEntry.ne, lordEntry.en) : house.lordName;
  const classes = houseClasses(house.house);
  const titles =
    reference?.houseDetail[house.house] != null
      ? pick(reference.houseDetail[house.house].titlesNe, reference.houseDetail[house.house].titlesEn)
      : reference?.houseInfo[house.house] != null
        ? pick(reference.houseInfo[house.house].themeNe, reference.houseInfo[house.house].themeEn)
        : "";
  const signifies = splitList(titles);
  const classical = reference?.houseClassicalName[house.house];

  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.inspector, "rounded-xl border border-border bg-card p-3.5")}>
      <View className={kundaliDetailClasses.bhavaChart.inspectorHead}>
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
          <View className={kundaliDetailClasses.bhavaChart.houseNum}>
            <Text className={kundaliDetailClasses.bhavaChart.houseNumText}>
              {digits(house.house)}
            </Text>
          </View>
          <Text className={kundaliDetailClasses.bhavaChart.houseTitle} style={nepaliTextStyle(18)}>
            {formatRashiByNumber(rashi, lang)}
          </Text>
          {classical ? (
            <Text className={kundaliDetailClasses.bhavaChart.classical} style={nepaliTextStyle(14)}>
              · {pick(classical.ne, classical.en)}
            </Text>
          ) : null}
        </View>
        <View className={kundaliDetailClasses.bhavaChart.navRow}>
          <Pressable
            onPress={onPrev}
            accessibilityRole="button"
            accessibilityLabel={kundaliLabel("previous_house", lang)}
            className="h-8 w-8 items-center justify-center rounded-lg border border-border active:opacity-70"
          >
            <Ionicons name="chevron-back" size={16} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={kundaliLabel("next_house", lang)}
            className="h-8 w-8 items-center justify-center rounded-lg border border-border active:opacity-70"
          >
            <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View className={kundaliDetailClasses.bhavaChart.metaRow}>
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
          {kundaliLabel("ruled_by", lang)}
        </Text>
        <GrahaInline grahaKey={lordKey} label={lordName} size={16} textSize={12} />
        {classes.length > 0 ? (
          <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
            · {classes.map((cls) => kundaliLabel(cls, lang)).join(" · ")}
          </Text>
        ) : null}
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
          · {kundaliLabelVars("house_rank", lang, { rank: digits(rank), total: digits(totalHouses) })}
        </Text>
        <StrengthBadge band={band} isStrongest={isStrongest} lang={lang} />
      </View>

      <View>
        <View className={kundaliDetailClasses.bhavaChart.scoreHead}>
          <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(13)}>
            {kundaliLabel("nav_bhava_bala", lang)}
          </Text>
          <Text
            className={cn(kundaliDetailClasses.bhavaChart.score, band === "strong" ? kundaliDetailClasses.bhavaChart.scoreStrong : band === "weak" ? kundaliDetailClasses.bhavaChart.scoreWeak : kundaliDetailClasses.bhavaChart.scoreAvg)}
          >
            {kundaliLabelVars("virupas_rupas", lang, {
              virupas: digits(house.totalPinda.toFixed(1)),
              rupas: digits(house.rupas.toFixed(2)),
            })}
          </Text>
        </View>
        <View className={kundaliDetailClasses.bhavaChart.tileMeter}>
          <Meter value={house.totalPinda} max={totalScale} color={kundaliDetailClasses.bhavaChart.barPrimary} />
        </View>
      </View>

      <View className="flex-row gap-2">
        <ComponentTile label={kundaliLabel("bhavadhipati", lang)} value={house.bhavadhipati} max={maxBhavadhipati} color={kundaliDetailClasses.bhavaChart.barPrimary} digits={digits} />
        <ComponentTile label={kundaliLabel("bhava_disha", lang)} value={house.disha} max={60} color={kundaliDetailClasses.bhavaChart.barSecondary} digits={digits} />
        <ComponentTile label={kundaliLabel("bhava_drishti", lang)} value={house.drishti} max={maxDrishti} color={kundaliDetailClasses.bhavaChart.barAccent} digits={digits} />
      </View>

      <View className="gap-3">
        <View>
          <Text className={kundaliDetailClasses.bhavaChart.groupLabel} style={nepaliTextStyle(10)}>
            {kundaliLabel("signifies", lang)}
          </Text>
          {signifies.length > 0 ? (
            <View className={kundaliDetailClasses.bhavaChart.chips}>
              {signifies.map((item) => (
                <Chip key={item}>
                  <Text className={kundaliDetailClasses.bhavaChart.chipText} style={nepaliTextStyle(12)}>
                    {item}
                  </Text>
                </Chip>
              ))}
            </View>
          ) : (
            <Text className={kundaliDetailClasses.prose.muted}>—</Text>
          )}
        </View>
        <View>
          <Text className={kundaliDetailClasses.bhavaChart.groupLabel} style={nepaliTextStyle(10)}>
            {kundaliLabel("occupants", lang)}
          </Text>
          {occupants.length > 0 ? (
            <View className={kundaliDetailClasses.bhavaChart.chips}>
              {occupants.map((planet) => {
                const key = planet.key as GrahaKey;
                const entry = GRAHA_NAME[key];
                return (
                  <Chip key={planet.key}>
                    <GrahaInline grahaKey={key} label={entry ? pick(entry.ne, entry.en) : planet.labelNe} size={14} textSize={12} />
                  </Chip>
                );
              })}
            </View>
          ) : (
            <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
              {kundaliLabel("no_occupants", lang)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
