import { useState } from "react";
import { TextInput, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { usePatroCalendarHeader, usePatroMonthYearNav } from "@vedic-patro/features/patro-date";
import { Box, Grid, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { PatroCalendarHeaderProps, PatroMonthYearNavProps } from "../contract";
import { shellIcons } from "../icon-nodes";
import { PatroHeaderLocation } from "./PatroHeaderLocation";

/**
 * Date badge, month and year, prev/next, calendar toggle and location. React Native has no
 * CSS grid or `order`, so the rows are written out: three on a phone, two on a tablet,
 * one on a wide screen. The month and location panels open as sheets.
 */
export function PatroCalendarHeader({
  era,
  year,
  month,
  onChange,
  onEraChange,
  location,
  onLocationChange,
  locate,
  segments,
  segmentsLabel,
  prevDisabled,
  nextDisabled,
  crossEraSubtitle,
  displayLanguage,
  className,
}: PatroCalendarHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  /* The row layout follows the width this header actually gets (the home page puts a side
     panel next to it on an iPad), not the window. */
  const [boxWidth, setBoxWidth] = useState(0);
  const width = boxWidth || windowWidth;
  const isCompact = width < 560;
  const isCalendarWide = width >= 900;
  const dense = windowWidth < 420;
  const header = usePatroCalendarHeader({ era, year, month, onChange });
  const nav = usePatroMonthYearNav({ era, year, month, location, crossEraSubtitle, displayLanguage });
  const { panel, labels, yearInput } = header;
  const monthOpen = panel === "month";
  const locationOpen = panel === "location";

  const title = (
    <View className={cls.nativeTitle}>
      <Pressable label={labels.today} onPress={header.goToday} className={cls.badge}>
        <Text className={cls.badgeMonth}>{header.title.month}</Text>
        <Box className={cls.badgeDays}>
          <Text className={cls.badgeDaysText}>{header.dayRange}</Text>
        </Box>
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text as="h2" numberOfLines={1} className={cls.titleMain}>
          {[header.title.year, header.eraLabel, header.samvatsara].filter(Boolean).join(" ")}
        </Text>
        {nav.crossEraSubtitle ? (
          <Text numberOfLines={1} className={cls.titleSub}>
            {nav.crossEraSubtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const stepper = (
    <View className="flex-row items-center gap-2">
      <Pressable label={labels.prevMonth} onPress={() => header.stepMonth(-1)} disabled={prevDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
        <Icon node={shellIcons.chevronLeft} size="md" tone="secondary" />
      </Pressable>
      <Pressable
        label={labels.picker}
        onPress={() => header.togglePanel("month")}
        className={cn(cls.selectButton, "min-w-32 shrink", monthOpen ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cls.nativeDenseControl)}
      >
        <Text numberOfLines={1} className={cn(cls.selectLabel, dense && cls.nativeDenseText)}>
          {header.title.month} {header.title.year}
        </Text>
        {dense ? null : <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" />}
      </Pressable>
      <Pressable label={labels.nextMonth} onPress={() => header.stepMonth(1)} disabled={nextDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
        <Icon node={shellIcons.chevronRight} size="md" tone="secondary" />
      </Pressable>
    </View>
  );

  const segment =
    segments && segments.length > 0 ? (
      <Box className={cn(cls.segment, cls.nativeSegmentRow)} label={segmentsLabel}>
        {segments.map((seg) => (
          <Pressable key={seg.key} label={seg.label} role="tab" selected={seg.active} onPress={seg.onPress} className={cn(cls.nativeSegmentRowItem, seg.active && cls.segmentItemActive)}>
            <Text className={cn(cls.segmentLabel, seg.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{seg.label}</Text>
          </Pressable>
        ))}
      </Box>
    ) : null;

  /** Phone: the toggle becomes one button that offers the other view. */
  const swap =
    segments && segments.length === 2
      ? segments
          .filter((seg) => !seg.active)
          .map((seg) => (
            <Pressable key={seg.key} label={seg.label} onPress={seg.onPress} className={cn(cls.swapButton, dense && cls.nativeDenseControl)}>
              <Icon node={shellIcons.arrowLeftRight} size="sm" tone="secondary" />
              <Text className={cls.swapLabel}>{seg.label}</Text>
            </Pressable>
          ))
      : null;

  const locationButton =
    location && onLocationChange && locate ? (
      <PatroHeaderLocation
        location={location}
        onLocationChange={onLocationChange}
        locate={locate}
        open={locationOpen}
        onOpenChange={(next) => header.openPanel(next ? "location" : null)}
      />
    ) : null;

  let rows;
  if (isCompact) {
    rows = (
      <>
        <View className="flex-row items-center justify-between gap-3">
          {title}
          {locationButton}
        </View>
        {swap ? (
          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 shrink">{stepper}</View>
            {swap}
          </View>
        ) : (
          <View className="flex-row">{stepper}</View>
        )}
      </>
    );
  } else if (!isCalendarWide) {
    rows = (
      <>
        <View className="flex-row items-center justify-between gap-3">
          {title}
          {locationButton}
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 shrink">{stepper}</View>
          {segment}
        </View>
      </>
    );
  } else {
    rows = (
      <View className="flex-row items-center gap-3.5">
        {title}
        <View className="min-w-0 shrink">{stepper}</View>
        {segment}
        {locationButton}
      </View>
    );
  }

  return (
    <View
      className={cn("w-full gap-3", className)}
      onLayout={(e: LayoutChangeEvent) => {
        const next = e.nativeEvent.layout.width;
        setBoxWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
      }}
    >
      {rows}

      <Sheet open={monthOpen} onClose={header.closePanel} title={labels.picker} closeLabel={labels.yearGo}>
        {onEraChange && header.eras.length > 0 ? (
          <Box className={cn(cls.segment, "mb-3")} label={header.eraAria}>
            {header.eras.map((e) => (
              <Pressable
                key={e.era}
                label={e.label}
                role="tab"
                selected={e.active}
                onPress={() => (e.active ? undefined : onEraChange(e.era))}
                className={cn(cls.segmentItem, e.active && cls.segmentItemActive)}
              >
                <Text className={cn(cls.segmentLabel, e.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{e.label}</Text>
              </Pressable>
            ))}
          </Box>
        ) : null}
        <Text className={cls.panelLabel}>{labels.yearSection}</Text>
        <Box className={cls.yearRow}>
          <Pressable label={labels.prevYear} onPress={() => header.stepYear("prev")} className={cls.iconButtonSmall}>
            <Icon node={shellIcons.chevronLeft} size="sm" tone="secondary" />
          </Pressable>
          <TextInput
            value={yearInput.value}
            onChangeText={yearInput.onChange}
            onSubmitEditing={yearInput.commit}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={labels.yearInput}
            className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk)}
          />
          <Pressable label={labels.yearGo} onPress={yearInput.commit} className={cls.yearGo}>
            <Text className={cls.yearGoLabel}>{labels.yearGo}</Text>
          </Pressable>
          <Pressable label={labels.nextYear} onPress={() => header.stepYear("next")} className={cls.iconButtonSmall}>
            <Icon node={shellIcons.chevronRight} size="sm" tone="secondary" />
          </Pressable>
        </Box>
        {yearInput.invalid ? <Text className={cls.yearError}>{labels.yearInvalid}</Text> : null}
        <Text className={cls.panelLabel}>{labels.monthSection}</Text>
        <Grid cols={3} gap={8}>
          {header.months.map((m) => (
            <Pressable key={m.month} label={m.label} onPress={m.pick} className={cn(cls.monthChip, m.selected ? cls.monthChipActive : cls.monthChipIdle)}>
              <Text className={cn(cls.monthChipLabel, m.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{m.label}</Text>
            </Pressable>
          ))}
        </Grid>
      </Sheet>
    </View>
  );
}

/** Month + year navigation. The caller stores the browsed month. */
export function PatroMonthYearNav({ onBrowse, ...rest }: PatroMonthYearNavProps) {
  return <PatroCalendarHeader {...rest} onChange={onBrowse} />;
}
