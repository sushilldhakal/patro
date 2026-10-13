import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import {
  BALA_STACK,
  KALA_SUBS,
  STHANA_SUBS,
  yuddhaVirupasForPlanet,
} from "@vedic-patro/domain/kundali/shadbala-display";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel, kundaliLabelVars } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { colorWithAlpha } from "@/lib/theme";
import { brand, radius } from "@vedic-patro/design-tokens";
import { type ShadbalaScale, yMaxFor, displayTotal, displayRequired, segmentDisplay, formatScaleValue } from "@vedic-patro/domain/kundali/shadbala-chart";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
export { type ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";

const SCALES: { id: ShadbalaScale; labelKey: "scale_virupas" | "scale_rupas" | "scale_absolute" | "scale_vs_required" }[] = [
  { id: "virupas", labelKey: "scale_virupas" },
  { id: "rupas", labelKey: "scale_rupas" },
  { id: "absolute", labelKey: "scale_absolute" },
  { id: "required", labelKey: "scale_vs_required" },
];

const CHART_HEIGHT = 220;

function yTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((part) => max * part);
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <View className={cn(kundaliDetailClasses.shadbalaChart.meter, "flex-1")}>
      <View style={{ width: `${width}%`, backgroundColor: color }} className={kundaliDetailClasses.shadbalaChart.meterFill} />
    </View>
  );
}

export function ShadbalaChart({
  planets,
  selectedKey,
  onSelect,
  yuddha,
}: {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  onSelect: (key: string) => void;
  yuddha?: YuddhaData;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const [scale, setScale] = useState<ShadbalaScale>("virupas");

  const planetLabel = (planet: ShadbalaPlanet) => {
    const g = GRAHA_NAME[planet.key as GrahaKey];
    return g ? pick(g.ne, g.en) : pick(planet.name_ne, planet.name);
  };
  const yMax = useMemo(() => yMaxFor(planets, scale), [planets, scale]);
  const ticks = useMemo(() => yTicks(yMax), [yMax]);
  const selected = planets.find((planet) => planet.key === selectedKey) ?? planets[0];
  const selectedMeets = selected != null && selected.total_virupas >= selected.required;

  return (
    <View className={kundaliDetailClasses.shadbalaChart.root}>
      <View className={kundaliDetailClasses.shadbalaChart.headRow}>
        <View>
          <Text className={kundaliDetailClasses.shadbalaChart.title} style={nepaliTextStyle(15)}>
            {kundaliLabel("strength_skyline", lang)}
          </Text>
          <Text className={kundaliDetailClasses.shadbalaChart.hint} style={nepaliTextStyle(13)}>
            {kundaliLabel("strength_skyline_hint", lang)}
          </Text>
        </View>
        <View className={cn(kundaliDetailClasses.shadbalaChart.scaleBar, "self-start")}>
          {SCALES.map((item) => {
            const active = scale === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setScale(item.id)}
                className={cn(kundaliDetailClasses.shadbalaChart.scaleTab, "active:opacity-80", active && kundaliDetailClasses.shadbalaChart.scaleActive)}
              >
                <Text
                  className={cn(kundaliDetailClasses.shadbalaChart.scaleText, active ? kundaliDetailClasses.shadbalaChart.scaleActiveText : kundaliDetailClasses.shadbalaChart.scaleIdleText)}
                >
                  {kundaliLabel(item.labelKey, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className={kundaliDetailClasses.shadbalaChart.panel}>
        <View className="flex-row gap-2">
          <View className="mt-6" style={{ width: 32, height: CHART_HEIGHT }}>
            {ticks.map((tick) => (
              <Text
                key={tick}
                numberOfLines={1}
                className={cn(kundaliDetailClasses.shadbalaChart.axisLabel, "absolute right-0")}
                style={{ bottom: `${(tick / yMax) * 100}%`, transform: [{ translateY: 6 }] }}
              >
                {formatScaleValue(tick, scale, digits)}
              </Text>
            ))}
          </View>
          <View className="flex-1">
            <View style={{ height: CHART_HEIGHT }} className="relative mt-6">
              {ticks.map((tick) => (
                <View
                  key={`grid-${tick}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${(tick / yMax) * 100}%`,
                    borderTopWidth: 1,
                    borderTopColor: colorWithAlpha(colors.border, 0.6),
                  }}
                />
              ))}
              <View className="absolute inset-0 flex-row gap-1.5 px-0.5">
                {planets.map((planet) => (
                  <PlanetColumn
                    key={planet.key}
                    planet={planet}
                    scale={scale}
                    yMax={yMax}
                    selected={planet.key === selectedKey}
                    onSelect={() => onSelect(planet.key)}
                    digits={digits}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
            <View className="mt-2 flex-row gap-1.5 px-0.5">
              {planets.map((planet) => (
                <Pressable
                  key={planet.key}
                  onPress={() => onSelect(planet.key)}
                  className="min-w-0 flex-1 items-center gap-0.5"
                >
                  <GrahaPlanetIcon graha={planet.key as GrahaKey} size={16} />
                  <Text
                    numberOfLines={1}
                    className={cn(kundaliDetailClasses.shadbalaChart.barLabel, "max-w-full")}
                    style={nepaliTextStyle(10)}
                  >
                    {planetLabel(planet)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View className={kundaliDetailClasses.shadbalaChart.legend}>
          {BALA_STACK.map((bala) => (
            <View key={bala.key} className={kundaliDetailClasses.shadbalaChart.legendItem}>
              <View className={kundaliDetailClasses.shadbalaChart.legendDot} style={{ backgroundColor: bala.color }} />
              <Text className={kundaliDetailClasses.shadbalaChart.legendText} style={nepaliTextStyle(12)}>
                {t(bala.label)}
              </Text>
            </View>
          ))}
          <View className={kundaliDetailClasses.shadbalaChart.legendItem}>
            <View style={{ width: 16, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.accent }} />
            <Text className={kundaliDetailClasses.shadbalaChart.legendText} style={nepaliTextStyle(12)}>
              {kundaliLabel("required_minimum", lang)}
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text className={kundaliDetailClasses.shadbalaChart.pickLabel} style={nepaliTextStyle(10)}>
          {kundaliLabel("select_a_planet", lang)}
        </Text>
        <View className={kundaliDetailClasses.shadbalaChart.pickRow}>
          {planets.map((planet) => {
            const active = planet.key === selectedKey;
            return (
              <Pressable
                key={planet.key}
                onPress={() => onSelect(planet.key)}
                className={cn(
                  kundaliDetailClasses.shadbalaChart.pickChip,
                  "active:opacity-80",
                  active ? kundaliDetailClasses.shadbalaChart.pickActive : kundaliDetailClasses.shadbalaChart.pickIdle,
                )}
              >
                <GrahaPlanetIcon graha={planet.key as GrahaKey} size={14} />
                <Text
                  className={cn(kundaliDetailClasses.shadbalaChart.pickChipText, active ? kundaliDetailClasses.shadbalaChart.pickActiveText : kundaliDetailClasses.shadbalaChart.pickIdleText)}
                >
                  {planetLabel(planet)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selected ? (
        <PlanetInspector planet={selected} name={planetLabel(selected)} meets={selectedMeets} yuddha={yuddha} />
      ) : null}
    </View>
  );
}

function PlanetColumn({
  planet,
  scale,
  yMax,
  selected,
  onSelect,
  digits,
  colors,
}: {
  planet: ShadbalaPlanet;
  scale: ShadbalaScale;
  yMax: number;
  selected: boolean;
  onSelect: () => void;
  digits: (v: string | number) => string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const total = displayTotal(planet, scale);
  const required = displayRequired(planet, scale);
  const meets = planet.total_virupas >= planet.required;
  const columnPct = Math.min(100, (total / yMax) * 100);
  const requiredPct = required == null ? null : Math.min(100, (required / yMax) * 100);
  const labelValue =
    scale === "rupas"
      ? digits(planet.rupas.toFixed(1))
      : scale === "required"
        ? `${digits((planet.ratio * 100).toFixed(0))}%`
        : digits(planet.total_virupas.toFixed(1));

  const segments = BALA_STACK.map((bala) => ({
    ...bala,
    value: segmentDisplay(planet.breakdown[bala.breakdownKey], planet, scale),
  })).filter((segment) => segment.value > 0);

  return (
    <Pressable onPress={onSelect} className="relative min-w-0 flex-1">
      {requiredPct != null ? (
        <View
          style={{
            position: "absolute",
            left: -3,
            right: -3,
            bottom: `${requiredPct}%`,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderTopColor: colors.accent,
          }}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${columnPct}%`,
          flexDirection: "column-reverse",
          overflow: "hidden",
          borderRadius: radius.md,
          ...(selected ? { borderWidth: 2, borderColor: colors.primary } : null),
        }}
      >
        {segments.map((segment) => (
          <View key={segment.key} style={{ flex: segment.value, backgroundColor: segment.color }} />
        ))}
      </View>
      <View
        style={{
          position: "absolute",
          left: -8,
          right: -8,
          bottom: `${columnPct}%`,
          alignItems: "center",
          transform: [{ translateY: -16 }],
        }}
      >
        <View className="flex-row items-center gap-0.5">
          <Text numberOfLines={1} className="text-caption font-mono font-semibold text-foreground">
            {labelValue}
          </Text>
          <Ionicons
            name={meets ? "checkmark" : "close"}
            size={10}
            color={meets ? colors.primary : colors.destructive}
          />
        </View>
      </View>
    </Pressable>
  );
}

function PlanetInspector({
  planet,
  name,
  meets,
  yuddha,
}: {
  planet: ShadbalaPlanet;
  name: string;
  meets: boolean;
  yuddha?: YuddhaData;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const maxBala = Math.max(...BALA_STACK.map((bala) => Math.abs(planet.breakdown[bala.breakdownKey])), 1);
  const sthanaMax = Math.max(...STHANA_SUBS.map((row) => Math.abs(planet.sub_balas?.sthana?.[row.key] ?? 0)), 1);
  const kalaMax = Math.max(
    ...KALA_SUBS.map((row) => {
      const value =
        row.key === "yuddha" && yuddha
          ? yuddhaVirupasForPlanet(planet, yuddha)
          : (planet.sub_balas?.kala?.[row.key] ?? 0);
      return Math.abs(value);
    }),
    1,
  );

  return (
    <View className={kundaliDetailClasses.shadbalaChart.inspector}>
      <View className={kundaliDetailClasses.shadbalaChart.inspectorHead}>
        <View className={kundaliDetailClasses.shadbalaChart.inspectorTitleRow}>
          <GrahaPlanetIcon graha={planet.key as GrahaKey} size={22} />
          <Text className={kundaliDetailClasses.shadbalaChart.inspectorTitle} style={nepaliTextStyle(15)}>
            {name}
          </Text>
        </View>
        <Text
          className={cn(kundaliDetailClasses.shadbalaChart.inspectorValue, meets ? kundaliDetailClasses.shadbalaChart.inspectorMeets : kundaliDetailClasses.shadbalaChart.inspectorBelow)}
        >
          {kundaliLabelVars("of_required", lang, {
            virupas: digits(planet.total_virupas.toFixed(1)),
            percent: digits((planet.ratio * 100).toFixed(1)),
          })}
        </Text>
      </View>

      <View className={kundaliDetailClasses.shadbalaChart.breakdown}>
        {BALA_STACK.map((bala) => {
          const value = planet.breakdown[bala.breakdownKey];
          const signed = value < 0 ? `−${Math.abs(value).toFixed(1)}` : value.toFixed(1);
          return (
            <View key={bala.key} className={kundaliDetailClasses.shadbalaChart.breakdownRow}>
              <Text className={cn(kundaliDetailClasses.shadbalaChart.breakdownLabel, "w-20 shrink-0")} style={nepaliTextStyle(12)} numberOfLines={1}>
                {t(bala.label)}
              </Text>
              <Meter value={value} max={maxBala} color={bala.color} />
              <Text className={cn(kundaliDetailClasses.shadbalaChart.breakdownValue, "w-14 shrink-0")}>{digits(signed)}</Text>
            </View>
          );
        })}
      </View>

      {planet.sub_balas ? (
        <View className="gap-4">
          <SubBalaList
            title={pick("स्थान", "Sthana")}
            rows={STHANA_SUBS.map((row) => ({
              key: row.key,
              label: t(row.label),
              value: planet.sub_balas?.sthana?.[row.key] ?? 0,
            }))}
            max={sthanaMax}
            color={brand.saffron}
            digits={digits}
          />
          <SubBalaList
            title={pick("काल", "Kala")}
            rows={KALA_SUBS.map((row) => ({
              key: row.key,
              label: t(row.label),
              value:
                row.key === "yuddha" && yuddha
                  ? yuddhaVirupasForPlanet(planet, yuddha)
                  : (planet.sub_balas?.kala?.[row.key] ?? 0),
            }))}
            max={kalaMax}
            color={brand.blue}
            digits={digits}
          />
        </View>
      ) : null}
    </View>
  );
}

function SubBalaList({
  title,
  rows,
  max,
  color,
  digits,
}: {
  title: string;
  rows: { key: string; label: string; value: number }[];
  max: number;
  color: string;
  digits: (v: string | number) => string;
}) {
  return (
    <View>
      <Text className={kundaliDetailClasses.shadbalaChart.subTitle} style={nepaliTextStyle(10)}>
        {title}
      </Text>
      <View className={kundaliDetailClasses.shadbalaChart.subRows}>
        {rows.map((row) => {
          const signed = row.value < 0 ? `−${Math.abs(row.value).toFixed(1)}` : row.value.toFixed(1);
          return (
            <View key={row.key} className={kundaliDetailClasses.shadbalaChart.breakdownRow}>
              <Text className={cn(kundaliDetailClasses.shadbalaChart.subLabel, "w-24 shrink-0")} style={nepaliTextStyle(11)} numberOfLines={1}>
                {row.label}
              </Text>
              <Meter value={row.value} max={max} color={color} />
              <Text className={cn(kundaliDetailClasses.shadbalaChart.subValue, "w-12 shrink-0")}>{digits(signed)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
