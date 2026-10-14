import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { BsNativeSelect } from "@/components/ui/BsNativeSelect";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaDetailsList } from "@/components/kundali/GrahaDetailsList";
import { BhavaTable, KundaliSection } from "@/components/kundali/KundaliSections";
import type { VargaCharts } from "@/lib/api";
import { buildBhavaChart } from "@vedic-patro/domain/bhava";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import {
  CHART_ANCHOR_LABELS,
  GRAHA_ANCHOR_ORDER,
  VARGA_OPTIONS,
  vargaOption,
  type ChartAnchor,
} from "@vedic-patro/domain/varga-display";

import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";
type PanelConfig = { anchor: ChartAnchor; division: number };

function buildDivisionalHouses(
  { anchor, division }: PanelConfig,
  vargaCharts: VargaCharts,
  combustion: Record<string, boolean | null>,
) {
  const entries = vargaCharts.entries[String(division)] ?? [];
  const anchorEntry = entries.find((e) => e.key === anchor);
  if (!anchorEntry) return [];

  const planetRashis = entries
    .filter((e) => e.key !== "lagna")
    .map((e) => ({
      key: e.key,
      labelNe: GRAHA_NAME[e.key as GrahaKey]?.ne ?? e.key,
      rashi: e.vargaRashi,
      isRetrograde: e.retrograde ?? false,
      isCombust: combustion[e.key] ?? false,
    }));

  return buildBhavaChart(anchorEntry.vargaRashi, planetRashis);
}

function useAnchorOptions(vargaCharts: VargaCharts): ChartAnchor[] {
  return useMemo(() => {
    const options: ChartAnchor[] = [];
    if (vargaCharts.points.lagna) options.push("lagna");
    for (const key of GRAHA_ANCHOR_ORDER) {
      if (vargaCharts.points[key]) options.push(key);
    }
    return options;
  }, [vargaCharts]);
}

function ChartPanel({
  panel,
  onPanelChange,
  houses,
  anchorOptions,
  vargaCharts,
  combustion,
}: {
  panel: PanelConfig;
  onPanelChange: (next: PanelConfig) => void;
  houses: ReturnType<typeof buildBhavaChart>;
  anchorOptions: ChartAnchor[];
  vargaCharts: VargaCharts;
  combustion: Record<string, boolean | null>;
}) {
  const { t, pick } = useLocale();
  const [tab, setTab] = useState<"graha" | "bhava">("graha");
  const varga = vargaOption(panel.division);
  const anchorLabel = CHART_ANCHOR_LABELS[panel.anchor];

  const anchorSelectOptions = useMemo(
    () =>
      anchorOptions.map((anchor) => {
        const labels = CHART_ANCHOR_LABELS[anchor];
        return { value: anchor, label: pick(labels.labelNe, labels.labelEn) };
      }),
    [anchorOptions, pick],
  );

  const divisionSelectOptions = useMemo(
    () =>
      VARGA_OPTIONS.map((opt) => ({
        value: opt.division,
        label: `${opt.short} — ${pick(opt.labelNe, opt.labelEn)}`,
      })),
    [pick],
  );

  return (
    <View className={cn(kundaliDetailClasses.compare.root, "flex-1")}>
      <View className={kundaliDetailClasses.compare.controls}>
        <View className={cn(kundaliDetailClasses.compare.field, "min-w-[7.5rem]")}>
          <Text className={kundaliDetailClasses.compare.fieldLabel} style={nepaliTextStyle(11)}>
            {t("kundali.anchor")}
          </Text>
          <NativeStringSelect
            value={panel.anchor}
            options={anchorSelectOptions}
            onChange={(anchor) => onPanelChange({ ...panel, anchor: anchor as ChartAnchor })}
            ariaLabel={t("kundali.anchor")}
            minWidth={120}
          />
        </View>
        <View className={cn(kundaliDetailClasses.compare.field, "min-w-[9rem]")}>
          <Text className={kundaliDetailClasses.compare.fieldLabel} style={nepaliTextStyle(11)}>
            {t("ui.kundali.division")}
          </Text>
          <BsNativeSelect
            value={panel.division}
            options={divisionSelectOptions}
            onChange={(division) => onPanelChange({ ...panel, division })}
            ariaLabel={t("ui.kundali.division")}
            minWidth={140}
            className="h-9 px-2.5"
          />
        </View>
      </View>

      <View className={kundaliDetailClasses.compare.chartCard}>
        <Text className={kundaliDetailClasses.compare.chartTitle} style={nepaliTextStyle(14)}>
          {pick(anchorLabel.labelNe, anchorLabel.labelEn)} · {varga.short} — {pick(varga.labelNe, varga.labelEn)}
        </Text>
        {houses.length > 0 ? <D1Chart houses={houses} /> : (
          <Text className={kundaliDetailClasses.compare.empty} style={nepaliTextStyle(14)}>
            {t("ui.kundali.not_enough_data_for_this_chart")}
          </Text>
        )}
      </View>

      {houses.length > 0 ? (
        <View className={kundaliDetailClasses.compare.tableCard}>
          <View className={kundaliDetailClasses.compare.tableHead}>
            <View className={kundaliDetailClasses.compare.toggle}>
              {(["graha", "bhava"] as const).map((t) => {
                const active = tab === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    className={cn(kundaliDetailClasses.compare.toggleTab, "rounded-md active:opacity-80", active && kundaliDetailClasses.compare.toggleActive)}
                  >
                    <Text
                      style={nepaliTextStyle(13)}
                      className={cn(kundaliDetailClasses.compare.toggleText, active && kundaliDetailClasses.compare.toggleActiveText)}
                    >
                      {t === "graha" ? pick(tFor("ne", "kundali.graha"), tFor("en", "kundali.graha")) : pick(tFor("ne", "kundali.bhava_19"), tFor("en", "kundali.bhava_19"))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className={kundaliDetailClasses.compare.caption} style={nepaliTextStyle(12)} numberOfLines={1}>
              {pick(anchorLabel.labelNe, anchorLabel.labelEn)} · {varga.short}
            </Text>
          </View>
          <View>
            {tab === "graha" ? (
              <GrahaDetailsList
                division={panel.division}
                anchorKey={panel.anchor}
                vargaCharts={vargaCharts}
              />
            ) : (
              <BhavaTable division={panel.division} anchorKey={panel.anchor} vargaCharts={vargaCharts} />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export type DivisionalChartCompareProps = {
  vargaCharts: VargaCharts;
  combustion?: Record<string, boolean | null>;
  defaultLeft?: PanelConfig;
  defaultRight?: PanelConfig;
};

export function DivisionalChartCompare({
  vargaCharts,
  combustion = {},
  defaultLeft = { anchor: "lagna", division: 1 },
  defaultRight = { anchor: "moon", division: 9 },
}: DivisionalChartCompareProps) {
  const { t, pick } = useLocale();
  const { width } = useBreakpoint();
  const twoCol = width >= 768;
  const anchorOptions = useAnchorOptions(vargaCharts);
  const [left, setLeft] = useState(defaultLeft);
  const [right, setRight] = useState(defaultRight);

  const safeLeft = useMemo(
    () => (anchorOptions.includes(left.anchor) ? left : { ...left, anchor: anchorOptions[0] ?? "lagna" }),
    [anchorOptions, left],
  );
  const safeRight = useMemo(
    () =>
      anchorOptions.includes(right.anchor)
        ? right
        : { ...right, anchor: anchorOptions[1] ?? anchorOptions[0] ?? "moon" },
    [anchorOptions, right],
  );

  const leftHouses = useMemo(
    () => buildDivisionalHouses(safeLeft, vargaCharts, combustion),
    [safeLeft, vargaCharts, combustion],
  );
  const rightHouses = useMemo(
    () => buildDivisionalHouses(safeRight, vargaCharts, combustion),
    [safeRight, vargaCharts, combustion],
  );

  if (anchorOptions.length === 0) return null;

  return (
    <KundaliSection
      title={t("ui.kundali.divisional_charts_2")}
      subtitle={t("ui.kundali.compare_two_charts_d1_d9_etc")}
      icon="grid-outline"
    >
      <View className={twoCol ? "flex-row gap-4" : "gap-6"}>
        <ChartPanel
          panel={safeLeft}
          onPanelChange={setLeft}
          houses={leftHouses}
          anchorOptions={anchorOptions}
          vargaCharts={vargaCharts}
          combustion={combustion}
        />
        <ChartPanel
          panel={safeRight}
          onPanelChange={setRight}
          houses={rightHouses}
          anchorOptions={anchorOptions}
          vargaCharts={vargaCharts}
          combustion={combustion}
        />
      </View>
    </KundaliSection>
  );
}
