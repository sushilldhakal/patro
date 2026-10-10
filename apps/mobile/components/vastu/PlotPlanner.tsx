/**
 * The plot, the house requirements, and the sketch they produce.
 *
 * Native counterpart of the web app's
 * `src/components/vastu/PlotPlanner.tsx` — same inputs, same Āyādi panel,
 * same per-storey sketches. Two differences, both forced by the platform:
 * the saved plot/plan arrive asynchronously from `@/lib/vastu-storage` (so
 * the first frame shows the defaults and is replaced once storage answers),
 * and the sketch needs an explicit pixel size where the web version simply
 * fills its container.
 */

import { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { CARDINAL_WALLS, type CardinalWall } from "@vedic-patro/domain/vastu";
import { useVastuSketch } from "@/lib/use-vastu-sketch";
import {
  assignmentsOnStorey,
  clampStoreys,
  kindCounts,
  storeyPref,
  type HousePlan,
  type StoreyId,
} from "@vedic-patro/domain/vastu-plan";
import {
  DEFAULT_PLOT_STATE,
  readStoredHousePlan,
  readStoredPlot,
  writeStoredHousePlan,
  writeStoredPlot,
  type PlotState,
} from "@/lib/vastu-storage";
import { DEFAULT_HOUSE_PLAN } from "@vedic-patro/domain/vastu-plan";
import { HouseRequirementsForm } from "./HouseRequirementsForm";
import { HouseSketch } from "./HouseSketch";
import { OwnerCompatibility } from "./OwnerCompatibility";
import { cn } from "@/lib/utils";

const MIN_M = 3;
const MAX_M = 100;
/** Widest the sketch is ever drawn, matching the web copy's max-w-[900px]. */
const MAX_SKETCH = 900;
/** Page padding + card padding the sketch sits inside. */
const SKETCH_CHROME = 56;

function parseDimension(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function DimensionInput({
  label,
  value,
  onChangeText,
  invalid,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  invalid: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="min-w-0 flex-1">
      <Text className="text-caption mb-1 font-semibold text-muted-foreground" style={nepaliTextStyle(12)}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          "text-body rounded-lg border bg-card px-3 py-2.5 text-foreground",
          invalid ? "border-danger" : "border-border",
        )}
        style={nepaliTextStyle(14)}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-2">
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className="text-body shrink text-right text-foreground" style={nepaliTextStyle(13)}>
        {value}
      </Text>
    </View>
  );
}

export function PlotPlanner() {
  const { t, digits } = useLocale();
  const { width, isTablet } = useBreakpoint();
  const [plot, setPlot] = useState<PlotState>(DEFAULT_PLOT_STATE);
  const [house, setHouse] = useState<HousePlan>(DEFAULT_HOUSE_PLAN);

  // SecureStore is async, so the saved values replace the defaults a frame
  // later rather than seeding useState the way the web app's localStorage
  // read does.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedPlot, storedHouse] = await Promise.all([readStoredPlot(), readStoredHousePlan()]);
      if (cancelled) return;
      setPlot(storedPlot);
      setHouse(storedHouse);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateHouse(next: HousePlan) {
    setHouse(next);
    writeStoredHousePlan(next);
  }

  const storeys = clampStoreys(house.storeys);

  function update(next: Partial<PlotState>) {
    setPlot((prev) => {
      const merged = { ...prev, ...next };
      writeStoredPlot(merged);
      return merged;
    });
  }

  const parsed = {
    length: parseDimension(plot.length),
    breadth: parseDimension(plot.breadth),
  };
  const errors = {
    length: parsed.length === null || parsed.length < MIN_M || parsed.length > MAX_M,
    breadth: parsed.breadth === null || parsed.breadth < MIN_M || parsed.breadth > MAX_M,
  };
  const hasError = errors.length || errors.breadth;

  const lengthM = clamp(parsed.length ?? Number(DEFAULT_PLOT_STATE.length), MIN_M, MAX_M);
  const breadthM = clamp(parsed.breadth ?? Number(DEFAULT_PLOT_STATE.breadth), MIN_M, MAX_M);

  const footprint = useMemo(() => ({ width: breadthM, height: lengthM }), [breadthM, lengthM]);

  // Zone placement, the Āyādi check and the entrance corner all come from the
  // server (POST /vastu/sketch); this component only lays out what it returns.
  const sketchQuery = useVastuSketch({ widthM: breadthM, depthM: lengthM, facing: plot.facing }, house);
  const sketch = sketchQuery.data;
  const assignments = useMemo(() => sketch?.assignments ?? [], [sketch]);
  const leftover = useMemo(() => sketch?.leftover ?? [], [sketch]);
  const counts = useMemo(() => kindCounts(leftover), [leftover]);
  const ayadi = sketch?.ayadi ?? null;
  const preferredCorner = sketch?.entrance.preferred_corner;
  /* iPad: 10% under the full size. */
  const sketchSize = Math.round(Math.min(MAX_SKETCH, Math.max(240, width - SKETCH_CHROME)) * (isTablet ? 0.9 : 1));

  return (
    <View className="overflow-hidden rounded-2xl border border-border">
      <View className="border-b border-border px-4 py-3">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {t("vastu.plot.heading")}
        </Text>
      </View>

      <View className="gap-4 p-4">
        <Text className="text-body text-foreground" style={nepaliTextStyle(13)}>
          {t("vastu.plot.blurb")}
        </Text>

        <OwnerCompatibility />

        <View className="flex-row gap-3">
          <DimensionInput
            label={t("vastu.plot.length_label")}
            value={plot.length}
            onChangeText={(v) => update({ length: v })}
            invalid={errors.length}
          />
          <DimensionInput
            label={t("vastu.plot.breadth_label")}
            value={plot.breadth}
            onChangeText={(v) => update({ breadth: v })}
            invalid={errors.breadth}
          />
        </View>

        <View>
          <Text
            className="text-caption mb-1 font-semibold text-muted-foreground"
            style={nepaliTextStyle(12)}
          >
            {t("vastu.plot.facing_label")}
          </Text>
          <NativeStringSelect
            value={plot.facing}
            ariaLabel={t("vastu.plot.facing_label")}
            options={CARDINAL_WALLS.map((wall) => ({
              value: wall,
              label: t(`vastu.dir.${wall}.name`),
            }))}
            onChange={(v) => update({ facing: v as CardinalWall })}
          />
        </View>

        {hasError && (
          <Text className="text-body text-danger" style={nepaliTextStyle(13)}>
            {t("vastu.plot.range_error", { min: digits(MIN_M), max: digits(MAX_M) })}
          </Text>
        )}

        <HouseRequirementsForm plan={house} onChange={updateHouse} />

        <View className="rounded-xl border border-border bg-card p-3.5">
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
            {t("vastu.plan.layout_heading")}
          </Text>
          <Text className="text-body mb-4 mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.plan.layout_blurb")}
          </Text>

          {!sketch && (
            <Text className="text-body mb-4 text-muted-foreground" style={nepaliTextStyle(13)}>
              {sketchQuery.isError ? t("vastu.plan.sketch_error") : t("vastu.plan.sketch_loading")}
            </Text>
          )}

          {leftover.length > 0 && (
            <View className="mb-4 rounded-lg border border-border bg-background px-3 py-2.5">
              <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(13)}>
                {t("vastu.plan.cannot_fit_heading")}
              </Text>
              <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(13)}>
                {t("vastu.plan.cannot_fit_blurb")}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {leftover.map((row) => {
                  const many = (counts.get(row.kind) ?? 0) > 1 && row.kind !== "staircase";
                  const name =
                    many && row.index != null
                      ? t(`vastu.plan.space.${row.kind}_n`, { n: digits(row.index) })
                      : t(`vastu.plan.space.${row.kind}`);
                  return (
                    <View key={row.id} className="rounded-md border border-border px-2 py-0.5">
                      <Text
                        className="text-caption font-semibold text-foreground"
                        style={nepaliTextStyle(12)}
                      >
                        {name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View className="gap-8">
            {Array.from({ length: storeys }, (_, i) => i as StoreyId).map((storey) => (
              <View key={storey} className="min-w-0">
                {storeys > 1 && (
                  <Text
                    className="text-body mb-2 font-semibold text-foreground"
                    style={nepaliTextStyle(13)}
                  >
                    {t(`vastu.plan.floor.${storeyPref(storey)}`)}
                  </Text>
                )}
                <HouseSketch
                  size={sketchSize}
                  plot={footprint}
                  facing={plot.facing}
                  assignments={assignmentsOnStorey(assignments, storey)}
                />
              </View>
            ))}
          </View>

          <Text className="text-body mt-4 text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.sketch.disclaimer")}
          </Text>
          <Text className="text-body mt-4 text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.plot.buffer_note")}
          </Text>
          <Text className="text-body text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("vastu.plot.marma_note")}
          </Text>
        </View>

        {ayadi && preferredCorner && (
        <View className="gap-3">
          <View className="rounded-xl border border-border bg-card p-3.5">
            <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
              {t("vastu.plot.ayadi_heading")}
            </Text>
            <View className="mt-2 gap-1.5">
              <InfoRow
                label={t("vastu.plot.footprint_length_label")}
                value={`${digits(footprint.height.toFixed(1))} ${t("vastu.plot.unit_m")} · ${digits(ayadi.length_hasta.toFixed(1))} ${t("vastu.plot.unit_hasta")}`}
              />
              <InfoRow
                label={t("vastu.plot.footprint_width_label")}
                value={`${digits(footprint.width.toFixed(1))} ${t("vastu.plot.unit_m")} · ${digits(ayadi.width_hasta.toFixed(1))} ${t("vastu.plot.unit_hasta")}`}
              />
              <InfoRow
                label={t("vastu.plot.ayadi_remainder_label")}
                value={String(digits(ayadi.remainder))}
              />
            </View>
            <Text
              className={cn(
                "text-body mt-2 font-semibold",
                ayadi.auspicious ? "text-emerald-600 dark:text-emerald-400" : "text-danger",
              )}
              style={nepaliTextStyle(13)}
            >
              {t(ayadi.auspicious ? "vastu.plot.ayadi_auspicious" : "vastu.plot.ayadi_inauspicious")}
            </Text>
            {ayadi.suggested_hasta !== null && ayadi.suggested_meters !== null && (
              <Text className="text-body mt-1 text-foreground" style={nepaliTextStyle(13)}>
                {t("vastu.plot.ayadi_suggestion", {
                  hasta: digits(ayadi.suggested_hasta),
                  meters: digits(ayadi.suggested_meters.toFixed(1)),
                })}
              </Text>
            )}
            <Text className="text-body mt-2 text-muted-foreground" style={nepaliTextStyle(13)}>
              {t("vastu.plot.ayadi_disclaimer")}
            </Text>
          </View>

          <View className="rounded-xl border border-border bg-card p-3.5">
            <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
              {t("vastu.plot.entrance_heading")}
            </Text>
            <Text className="text-body mt-2 text-foreground" style={nepaliTextStyle(13)}>
              {t("vastu.plot.entrance_note", {
                wall: t(`vastu.dir.${plot.facing}.name`),
                corner: t(`vastu.dir.${preferredCorner}.name`),
              })}
            </Text>
            <Text className="text-body mt-2 text-muted-foreground" style={nepaliTextStyle(13)}>
              {t("vastu.plot.entrance_disclaimer")}
            </Text>
          </View>
        </View>
        )}
      </View>
    </View>
  );
}

export default PlotPlanner;
