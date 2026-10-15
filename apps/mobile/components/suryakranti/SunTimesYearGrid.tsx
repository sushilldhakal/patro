import { useEffect, useState } from "react";
import { Ionicons } from "@/components/icons/Ionicons";
import { LucideNative } from "@/components/icons/LucideNative";
import { __iconNode as SunriseNode } from "lucide-react/dist/esm/icons/sunrise";
import { __iconNode as SunsetNode } from "lucide-react/dist/esm/icons/sunset";
import { Pressable, ScrollView, View } from "react-native";
import type { SunCell, SunTimesPage } from "@vedic-patro/features/sun-times";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { illustration } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";

const DAY_COL = 48;
const MONTH_COL = 84;

type Copy = SunTimesPage["copy"];

const ayanaClass = (cell: SunCell) => (cell.ayana?.north ? sunTimesClasses.ayanaNorth : sunTimesClasses.ayanaSouth);

function SunTimesLegend({ copy }: { copy: Copy }) {
  const colors = useThemeColors();
  return (
    <View className={cn("flex-row flex-wrap", sunTimesClasses.legend)}>
      <View className={cn("flex-row", sunTimesClasses.legendItems)}>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <LucideNative node={SunriseNode} size={16} color={colors.foreground} />
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {copy.sunrise}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <LucideNative node={SunsetNode} size={16} color={colors.foreground} />
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {copy.sunset}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <Text className={sunTimesClasses.ayanaNorth}>{copy.northMark}</Text>
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {copy.northLabel}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <Text className={sunTimesClasses.ayanaSouth}>{copy.southMark}</Text>
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {copy.southLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SunTimesYearMatrix({ page }: { page: SunTimesPage }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View className="flex-row">
          <View style={{ width: DAY_COL }} className={cn("items-center justify-center", sunTimesClasses.matrixDayHead)}>
            <Text className={sunTimesClasses.matrixDayHeadText} style={nepaliTextStyle()}>
              {page.copy.colDay}
            </Text>
          </View>
          {page.monthLabels.map((name, idx) => (
            <View
              key={`sun-month-${idx + 1}`}
              style={{ width: MONTH_COL }}
              className={cn("items-center justify-center", sunTimesClasses.matrixMonthHead)}
            >
              <Text numberOfLines={1} className={sunTimesClasses.matrixMonthHeadText} style={nepaliTextStyle()}>
                {name || " "}
              </Text>
            </View>
          ))}
        </View>

        {page.matrix.map((row) => (
          <View key={row.day} className="flex-row">
            <View style={{ width: DAY_COL }} className={cn("items-center justify-center", sunTimesClasses.matrixDayRowHead)}>
              <Text className={sunTimesClasses.matrixDayRowText} style={nepaliTextStyle()}>
                {row.dayLabel}
              </Text>
            </View>
            {row.cells.map((cell, colIdx) =>
              !cell ? (
                <View key={colIdx} style={{ width: MONTH_COL }} className={cn(sunTimesClasses.matrixCell, sunTimesClasses.matrixCellBlank)} />
              ) : (
                <View key={colIdx} style={{ width: MONTH_COL }} className={cn("justify-center", sunTimesClasses.matrixCell)}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={nepaliTextStyle()}
                    className={cn("text-center font-num", sunTimesClasses.matrixRise)}
                  >
                    {cell.sunrise ?? "—"}
                    {cell.ayana ? (
                      <Text className={ayanaClass(cell)}>
                        {" "}
                        {cell.ayana.short}
                      </Text>
                    ) : null}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={nepaliTextStyle()}
                    className={cn("text-center font-num", sunTimesClasses.matrixSet)}
                  >
                    {cell.sunset ?? "—"}
                  </Text>
                </View>
              ),
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* Web month table: `h-10 px-3 py-3` head on bg-muted, `px-3 py-2.5` cells, border-b rows
   (none on the last), sunrise/sunset in text-base. Columns share the width 1:1:2:2. */
const MONTH_COLS = [
  { key: "day", flex: 1 },
  { key: "ayana", flex: 1 },
  { key: "sunrise", flex: 2 },
  { key: "sunset", flex: 2 },
] as const;

function MonthSunDataTable({ rows, copy }: { rows: SunCell[]; copy: Copy }) {
  const { colors, isDark } = useTheme();
  const riseColor = isDark ? colors.accent : colors.primary;

  const head = (key: (typeof MONTH_COLS)[number]["key"]) => {
    if (key === "day") return copy.colDay;
    if (key === "ayana") return copy.colAyana;
    const rise = key === "sunrise";
    return (
      <View className="flex-row items-center gap-1.5">
        <LucideNative node={rise ? SunriseNode : SunsetNode} size={16} color={rise ? colors.primary : illustration.sky60} />
        <Text className={sunTimesClasses.monthHeadText} style={nepaliTextStyle()}>
          {rise ? copy.sunrise : copy.sunset}
        </Text>
      </View>
    );
  };

  return (
    <View>
      <View className={cn("flex-row border-b border-border", sunTimesClasses.monthHeadRow)}>
        {MONTH_COLS.map((c) => {
          const label = head(c.key);
          return (
            <View key={c.key} style={{ flex: c.flex }} className={cn("justify-center", sunTimesClasses.monthHeadCell)}>
              {typeof label === "string" ? (
                <Text className={sunTimesClasses.monthHeadText} style={nepaliTextStyle()}>
                  {label}
                </Text>
              ) : (
                label
              )}
            </View>
          );
        })}
      </View>
      {rows.map((row, i) => (
        <View key={row.day} className={cn("flex-row", i < rows.length - 1 && sunTimesClasses.monthRow)}>
          <View style={{ flex: 1 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthDayText)} style={nepaliTextStyle()}>
              {row.dayLabel}
            </Text>
          </View>
          <View style={{ flex: 1 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            {row.ayana ? (
              <Text className={ayanaClass(row)} style={nepaliTextStyle()}>
                {row.ayana.short}
              </Text>
            ) : (
              <Text className={sunTimesClasses.monthPlainText} style={nepaliTextStyle()}>
                —
              </Text>
            )}
          </View>
          <View style={{ flex: 2 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthRiseText)} style={[nepaliTextStyle(), { color: riseColor }]}>
              {row.sunrise ?? "—"}
            </Text>
          </View>
          <View style={{ flex: 2 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthSetText)} style={nepaliTextStyle()}>
              {row.sunset ?? "—"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SunTimesYearAccordion({ page }: { page: SunTimesPage }) {
  const colors = useThemeColors();
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!page.loading) setOpenMonth(page.defaultMonth);
  }, [page.defaultMonth, page.loading]);

  return (
    <View className={sunTimesClasses.accordion}>
      {page.months.map((m, idx) => {
        const open = openMonth === m.key;
        const isLast = idx === page.months.length - 1;
        return (
          <View key={m.key} className={cn("border-border", !isLast && "border-b")}>
            <Pressable
              onPress={() => setOpenMonth(open ? null : m.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              className={cn("flex-row items-start justify-between rounded-lg border border-transparent py-2.5 active:opacity-80", sunTimesClasses.accordionTrigger)}
            >
              <Text className={cn("flex-1 pr-2", sunTimesClasses.accordionTriggerText)} style={nepaliTextStyle()}>
                {m.label}
                <Text className={sunTimesClasses.accordionDays}>
                  {"  "}
                  {m.daysLabel}
                </Text>
              </Text>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </Pressable>
            {open ? (
              <View className="pb-2.5">
                <MonthSunDataTable rows={m.rows} copy={page.copy} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Year sun matrix (≥992px) or per-month accordion — draws `useSunTimesPage`, as the website does. */
export function SunTimesYearGrid({ page }: { page: SunTimesPage }) {
  const { width } = useBreakpoint();
  const showMatrix = width >= BREAKPOINTS.lg;

  if (page.status === "error") {
    return (
      <View className={sunTimesClasses.card}>
        <Text className={sunTimesClasses.loadError} style={nepaliTextStyle()}>
          {page.copy.loadError}
        </Text>
      </View>
    );
  }

  return (
    <View className={sunTimesClasses.card}>
      <View className={sunTimesClasses.cardClip}>
        <SunTimesLegend copy={page.copy} />
        {page.status === "loading" ? (
          <Text className="px-4 py-8 text-sm" style={nepaliTextStyle()}>
            {page.copy.loading}
          </Text>
        ) : showMatrix ? (
          <SunTimesYearMatrix page={page} />
        ) : (
          <SunTimesYearAccordion page={page} />
        )}
      </View>
    </View>
  );
}
