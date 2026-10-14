import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { BsNativeSelect } from "@/components/ui/BsNativeSelect";
import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusLegend";
import { GrahaDetailsList } from "@/components/kundali/GrahaDetailsList";
import { BhavaTable, KundaliSection } from "@/components/kundali/KundaliSections";
import type { VargaCharts } from "@/lib/api";
import {
  useDivisionalChartCompare,
  useDivisionalTableToggle,
  type DivisionalChartSlot,
  type DivisionalPanelConfig,
} from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import type { ChartAnchor } from "@vedic-patro/domain/varga-display";

import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Compare = ReturnType<typeof useDivisionalChartCompare>;

function ChartPanel({
  compare,
  slot,
  vargaCharts,
}: {
  compare: Compare;
  slot: DivisionalChartSlot;
  vargaCharts: VargaCharts;
}) {
  const toggle = useDivisionalTableToggle();
  const { panel, houses } = slot;

  return (
    <View className={cn(kundaliDetailClasses.compare.root, "flex-1")}>
      <View className={kundaliDetailClasses.compare.controls}>
        <View className={cn(kundaliDetailClasses.compare.field, "min-w-[7.5rem]")}>
          <Text className={kundaliDetailClasses.compare.fieldLabel} style={nepaliTextStyle(11)}>
            {compare.anchorLabel}
          </Text>
          <NativeStringSelect
            value={panel.anchor}
            options={compare.anchorSelect}
            onChange={(anchor) => slot.setAnchor(anchor as ChartAnchor)}
            ariaLabel={compare.anchorLabel}
            minWidth={120}
          />
        </View>
        <View className={cn(kundaliDetailClasses.compare.field, "min-w-[9rem]")}>
          <Text className={kundaliDetailClasses.compare.fieldLabel} style={nepaliTextStyle(11)}>
            {compare.divisionLabel}
          </Text>
          <BsNativeSelect
            value={panel.division}
            options={compare.divisionSelect}
            onChange={slot.setDivision}
            ariaLabel={compare.divisionLabel}
            minWidth={140}
            className="h-9 px-2.5"
          />
        </View>
      </View>

      <View className={kundaliDetailClasses.compare.chartCard}>
        <Text className={kundaliDetailClasses.compare.chartTitle} style={nepaliTextStyle(14)}>
          {slot.chartTitle}
        </Text>
        {houses.length > 0 ? (
          <>
            <D1Chart houses={houses} />
            {slot.showStatusLegend ? <GrahaStatusLegend /> : null}
          </>
        ) : (
          <Text className={kundaliDetailClasses.compare.empty} style={nepaliTextStyle(14)}>
            {compare.empty}
          </Text>
        )}
      </View>

      {slot.showTables ? (
        <View className={kundaliDetailClasses.compare.tableCard}>
          <View className={kundaliDetailClasses.compare.tableHead}>
            <View className={kundaliDetailClasses.compare.toggle}>
              {toggle.tabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={tab.select}
                  className={cn(kundaliDetailClasses.compare.toggleTab, "rounded-md active:opacity-80", tab.active && kundaliDetailClasses.compare.toggleActive)}
                >
                  <Text
                    style={nepaliTextStyle(13)}
                    className={cn(kundaliDetailClasses.compare.toggleText, tab.active && kundaliDetailClasses.compare.toggleActiveText)}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className={kundaliDetailClasses.compare.caption} style={nepaliTextStyle(12)} numberOfLines={1}>
              {slot.caption}
            </Text>
          </View>
          <View>
            {toggle.tab === "graha" ? (
              <GrahaDetailsList division={panel.division} anchorKey={panel.anchor} vargaCharts={vargaCharts} />
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
  defaultLeft?: DivisionalPanelConfig;
  defaultRight?: DivisionalPanelConfig;
};

export function DivisionalChartCompare(props: DivisionalChartCompareProps) {
  const { width } = useBreakpoint();
  const twoCol = width >= 768;
  const compare = useDivisionalChartCompare(props);

  if (!compare.hasAnchors) return null;

  return (
    <KundaliSection title={compare.sectionTitle} subtitle={compare.sectionSubtitle} icon="grid-outline">
      <View className={twoCol ? "flex-row gap-4" : "gap-6"}>
        {compare.slots.map((slot) => (
          <ChartPanel key={slot.side} compare={compare} slot={slot} vargaCharts={props.vargaCharts} />
        ))}
      </View>
    </KundaliSection>
  );
}
