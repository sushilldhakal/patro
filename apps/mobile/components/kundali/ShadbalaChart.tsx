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
} from "@/lib/kundali/shadbala-display";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel, kundaliLabelVars } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { colorWithAlpha } from "@/lib/theme";

export type ShadbalaScale = "virupas" | "rupas" | "absolute" | "required";

const SCALES: { id: ShadbalaScale; labelKey: "scale_virupas" | "scale_rupas" | "scale_absolute" | "scale_vs_required" }[] = [
  { id: "virupas", labelKey: "scale_virupas" },
  { id: "rupas", labelKey: "scale_rupas" },
  { id: "absolute", labelKey: "scale_absolute" },
  { id: "required", labelKey: "scale_vs_required" },
];

const CHART_HEIGHT = 220;

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}

function positiveSum(planet: ShadbalaPlanet): number {
  return BALA_STACK.reduce((sum, bala) => sum + Math.max(0, planet.breakdown[bala.breakdownKey]), 0);
}

function yMaxFor(planets: ShadbalaPlanet[], scale: ShadbalaScale): number {
  if (scale === "absolute") return 100;
  if (scale === "required") {
    const peak = Math.max(...planets.map((planet) => (planet.total_virupas / Math.max(planet.required, 1)) * 100), 100);
    return niceCeil(peak * 1.08);
  }
  if (scale === "rupas") {
    const peak = Math.max(...planets.map((planet) => Math.max(planet.rupas, planet.required / 60)));
    return niceCeil(peak * 1.12);
  }
  const peak = Math.max(...planets.map((planet) => Math.max(planet.total_virupas, planet.required)));
  return niceCeil(peak * 1.12);
}

function displayTotal(planet: ShadbalaPlanet, scale: ShadbalaScale): number {
  if (scale === "rupas") return planet.rupas;
  if (scale === "required") return (planet.total_virupas / Math.max(planet.required, 1)) * 100;
  if (scale === "absolute") return 100;
  return planet.total_virupas;
}

function displayRequired(planet: ShadbalaPlanet, scale: ShadbalaScale): number | null {
  if (scale === "absolute") return null;
  if (scale === "rupas") return planet.required / 60;
  if (scale === "required") return 100;
  return planet.required;
}

function segmentDisplay(raw: number, planet: ShadbalaPlanet, scale: ShadbalaScale): number {
  const positive = Math.max(0, raw);
  if (scale === "rupas") return positive / 60;
  if (scale === "required") return (positive / Math.max(planet.required, 1)) * 100;
  if (scale === "absolute") {
    const sum = positiveSum(planet);
    return sum > 0 ? (positive / sum) * 100 : 0;
  }
  return positive;
}

function yTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((part) => max * part);
}

function formatScaleValue(value: number, scale: ShadbalaScale, digits: (v: string | number) => string): string {
  if (scale === "required" || scale === "absolute") return `${digits(Math.round(value))}%`;
  return digits(value >= 100 ? value.toFixed(0) : value.toFixed(1));
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
      <View style={{ width: `${width}%`, backgroundColor: color }} className="h-full rounded-full" />
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
  const { lang, pick, digits } = useLocale();
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
    <View className="gap-4">
      <View className="gap-3">
        <View>
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
            {kundaliLabel("strength_skyline", lang)}
          </Text>
          <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
            {kundaliLabel("strength_skyline_hint", lang)}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-1 self-start rounded-full border border-border bg-muted/40 p-1">
          {SCALES.map((item) => {
            const active = scale === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setScale(item.id)}
                style={active ? { backgroundColor: colors.primary } : undefined}
                className="rounded-full px-3 py-1 active:opacity-80"
              >
                <Text
                  className="text-body font-semibold"
                  style={{ color: active ? colors.background : colors.mutedForeground }}
                >
                  {kundaliLabel(item.labelKey, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        className="rounded-xl border border-border p-3"
        style={{ backgroundColor: colorWithAlpha(colors.background, 0.7) }}
      >
        <View className="flex-row gap-2">
          <View style={{ width: 32, height: CHART_HEIGHT, marginTop: 24 }}>
            {ticks.map((tick) => (
              <Text
                key={tick}
                numberOfLines={1}
                className="text-caption font-num absolute right-0 text-muted-foreground"
                style={{ bottom: `${(tick / yMax) * 100}%`, transform: [{ translateY: 6 }] }}
              >
                {formatScaleValue(tick, scale, digits)}
              </Text>
            ))}
          </View>
          <View className="flex-1">
            <View style={{ height: CHART_HEIGHT, marginTop: 24 }} className="relative">
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
                    className="text-caption max-w-full font-semibold text-foreground"
                    style={nepaliTextStyle(10)}
                  >
                    {planetLabel(planet)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
          {BALA_STACK.map((bala) => (
            <View key={bala.key} className="flex-row items-center gap-1.5">
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: bala.color }} />
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(12)}>
                {pick(bala.ne, bala.en)}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 16, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.accent }} />
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(12)}>
              {kundaliLabel("required_minimum", lang)}
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text className="text-caption mb-2 font-semibold uppercase tracking-wide text-muted-foreground" style={nepaliTextStyle(10)}>
          {kundaliLabel("select_a_planet", lang)}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {planets.map((planet) => {
            const active = planet.key === selectedKey;
            return (
              <Pressable
                key={planet.key}
                onPress={() => onSelect(planet.key)}
                style={
                  active
                    ? { borderColor: colors.primary, backgroundColor: colorWithAlpha(colors.primary, 0.1) }
                    : { borderColor: colors.border, backgroundColor: colorWithAlpha(colors.muted, 0.3) }
                }
                className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 active:opacity-80"
              >
                <GrahaPlanetIcon graha={planet.key as GrahaKey} size={14} />
                <Text
                  className="text-body font-semibold"
                  style={{ color: active ? colors.foreground : colors.mutedForeground }}
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
          borderRadius: 3,
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
          <Text numberOfLines={1} className="text-caption font-num font-semibold text-foreground">
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
  const { lang, pick, digits } = useLocale();
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
    <View
      className="gap-3 rounded-xl border border-border p-3"
      style={{ backgroundColor: colorWithAlpha(colors.muted, 0.2) }}
    >
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <GrahaPlanetIcon graha={planet.key as GrahaKey} size={22} />
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
            {name}
          </Text>
        </View>
        <Text
          className="text-body font-num font-semibold"
          style={{ color: meets ? colors.primary : colors.destructive }}
        >
          {kundaliLabelVars("of_required", lang, {
            virupas: digits(planet.total_virupas.toFixed(1)),
            percent: digits((planet.ratio * 100).toFixed(1)),
          })}
        </Text>
      </View>

      <View className="gap-2">
        {BALA_STACK.map((bala) => {
          const value = planet.breakdown[bala.breakdownKey];
          const signed = value < 0 ? `−${Math.abs(value).toFixed(1)}` : value.toFixed(1);
          return (
            <View key={bala.key} className="flex-row items-center gap-2">
              <Text className="text-body w-20 shrink-0 font-semibold text-foreground" style={nepaliTextStyle(12)} numberOfLines={1}>
                {pick(bala.ne, bala.en)}
              </Text>
              <Meter value={value} max={maxBala} color={bala.color} />
              <Text className="text-body font-num w-14 shrink-0 text-right text-foreground">{digits(signed)}</Text>
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
              label: pick(row.ne, row.en),
              value: planet.sub_balas?.sthana?.[row.key] ?? 0,
            }))}
            max={sthanaMax}
            color="#d97706"
            digits={digits}
          />
          <SubBalaList
            title={pick("काल", "Kala")}
            rows={KALA_SUBS.map((row) => ({
              key: row.key,
              label: pick(row.ne, row.en),
              value:
                row.key === "yuddha" && yuddha
                  ? yuddhaVirupasForPlanet(planet, yuddha)
                  : (planet.sub_balas?.kala?.[row.key] ?? 0),
            }))}
            max={kalaMax}
            color="#0b565a"
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
      <Text className="text-caption mb-2 font-semibold uppercase tracking-wide text-muted-foreground" style={nepaliTextStyle(10)}>
        {title}
      </Text>
      <View className="gap-1.5">
        {rows.map((row) => {
          const signed = row.value < 0 ? `−${Math.abs(row.value).toFixed(1)}` : row.value.toFixed(1);
          return (
            <View key={row.key} className="flex-row items-center gap-2">
              <Text className="text-body w-24 shrink-0 text-foreground" style={nepaliTextStyle(11)} numberOfLines={1}>
                {row.label}
              </Text>
              <Meter value={row.value} max={max} color={color} />
              <Text className="text-body font-num w-12 shrink-0 text-right text-muted-foreground">{digits(signed)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
