import { useWindowDimensions } from "react-native";
import { useDivisionalChartCompare, useDivisionalTableToggle, type DivisionalChartSlot } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { DivisionalChartCompareProps } from "../contract";
import { GrahaDetailsList } from "./Cards";

const c = kundaliDetailClasses.compare;

function SlotView({ compare, slot, props }: { compare: ReturnType<typeof useDivisionalChartCompare>; slot: DivisionalChartSlot; props: DivisionalChartCompareProps }) {
  const toggle = useDivisionalTableToggle();
  const { panel, houses } = slot;
  return (
    <Box className={cn(c.root, "flex-1")}>
      <Box className={c.controls}>
        {props.renderSelect?.({ id: "anchor", label: compare.anchorLabel, value: panel.anchor, onChange: (value) => slot.setAnchor(value as never), options: compare.anchorSelect.map((o) => ({ id: o.value, label: o.label })) })}
        {props.renderSelect?.({ id: "division", label: compare.divisionLabel, value: String(panel.division), onChange: (value) => slot.setDivision(Number(value)), options: compare.divisionSelect.map((o) => ({ id: String(o.value), label: o.label })) })}
      </Box>
      <Box className={c.chartCard}>
        <Text className={c.chartTitle}>{slot.anchorName} · {slot.vargaShort} — {slot.vargaName}</Text>
        {houses.length > 0 ? props.renderChart(houses) : <Text className={c.empty}>{compare.empty}</Text>}
        {houses.length > 0 && slot.showStatusLegend ? props.renderLegend?.() : null}
      </Box>
      {slot.showTables ? (
        <Box className={c.tableCard}>
          <Box className={c.toggle} nativeClassName="flex-row">
            {toggle.tabs.map((tab) => (
              <Pressable key={tab.id} role="tab" selected={tab.active} onPress={tab.select} className={cn(c.toggleTab, tab.active ? c.toggleActive : undefined)}>
                <Text className={cn(c.toggleText, tab.active ? c.toggleActiveText : undefined)}>{tab.label}</Text>
              </Pressable>
            ))}
          </Box>
          <Text className={c.caption}>{slot.anchorName} · {slot.vargaShort}</Text>
          {toggle.tab === "graha" ? (
            <GrahaDetailsList division={panel.division} anchorKey={panel.anchor} vargaCharts={props.vargaCharts} renderGraha={props.renderGraha} />
          ) : props.renderBhava({ division: panel.division, anchorKey: panel.anchor, vargaCharts: props.vargaCharts })}
        </Box>
      ) : null}
    </Box>
  );
}

export function DivisionalChartCompare(props: DivisionalChartCompareProps) {
  const compare = useDivisionalChartCompare(props);
  const { width } = useWindowDimensions();
  if (!compare.hasAnchors) return null;
  const body = (
    <Box className={width >= 768 ? "flex-row gap-4 p-4" : "gap-6 p-4"}>
      {compare.slots.map((slot) => <SlotView key={slot.side} compare={compare} slot={slot} props={props} />)}
    </Box>
  );
  return props.renderShell ? props.renderShell({ title: compare.sectionTitle, subtitle: compare.sectionSubtitle, children: body }) : body;
}
