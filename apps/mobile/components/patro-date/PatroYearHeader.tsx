import type { ReactNode } from "react";
import { TextInput, View } from "react-native";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { Era } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { useBreakpoint } from "@/lib/responsive";
import { usePatroYearHeader } from "@vedic-patro/features/patro-date";

export type PatroYearHeaderProps = {
  era: Era;
  year: number;
  onChange: (year: number) => void;
  /** The badge and "this year": the caller picks the year (and era) that is. */
  onToday: () => void;
  todayYear?: number;
  /** Replaces the Gregorian years under the title. */
  subtitle?: string | null;
  /** With it the sheet opens with the era switch (वि.सं. | पू.वि.सं.). */
  onEraChange?: (era: Era) => void;
  /** Right end of the title row (the location button). */
  titleAside?: ReactNode;
  /** Right end of the date row (the tabs). */
  navAside?: ReactNode;
  className?: string;
};

/** Year-only picker: badge, title, prev/next year and a sheet with the jump box and a paged year grid. */
export function PatroYearHeader({ era, year, onChange, onToday, todayYear, subtitle, onEraChange, titleAside, navAside, className }: PatroYearHeaderProps) {
  const h = usePatroYearHeader({ era, year, onChange, onToday, todayYear, subtitleOverride: subtitle });
  const { input, page, labels } = h;
  const dense = useBreakpoint().width < 420;

  return (
    <View className={cn("w-full gap-3", className)}>
      <View className="flex-row items-center gap-3">
      <View className={pick.nativeTitle}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text as="h2" numberOfLines={1} className={cls.titleMain}>
            {h.title.main}
          </Text>
          {h.title.sub ? (
            <Text numberOfLines={1} className={cls.titleSub}>
              {h.title.sub}
            </Text>
          ) : null}
        </View>
      </View>
        {titleAside}
      </View>

      <View className="flex-row items-center gap-2">
      <View className={pick.nativeNav}>
        <Pressable label={labels.prev} onPress={h.prev} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
          <Icon node={chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable
          label={labels.picker}
          onPress={h.toggle}
          className={cn(pick.yearButton, "flex-1", h.open ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cls.nativeDenseControl)}
        >
          <Text className={pick.yearButtonText}>{h.yearLabel}</Text>
          <Icon node={chevronDown} size="sm" tone="secondary" />
        </Pressable>
        <Pressable label={labels.next} onPress={h.next} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
          <Icon node={chevronRight} size="md" tone="secondary" />
        </Pressable>
      </View>
        {navAside}
      </View>

      <Sheet open={h.open} onClose={h.close} title={labels.picker} closeLabel={labels.thisYear}>
        {onEraChange && h.eras.length > 0 ? (
          <Box className={cn(cls.segment, "mb-3")} label={h.eraAria}>
            {h.eras.map((e) => (
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
        <Text className={pick.jumpLabel}>{labels.jump}</Text>
        <Box className={pick.jumpRow}>
          <TextInput
            value={input.value}
            onChangeText={input.onChange}
            onSubmitEditing={input.commit}
            keyboardType="number-pad"
            maxLength={input.maxLength}
            placeholder={input.placeholder}
            accessibilityLabel={labels.input}
            className={cn(cls.yearInput, input.invalid ? cls.yearInputBad : cls.yearInputOk)}
          />
          <Pressable label={labels.go} onPress={input.commit} className={cls.yearGo}>
            <Text className={cls.yearGoLabel}>{labels.go}</Text>
          </Pressable>
        </Box>
        {input.invalid ? <Text className={cls.yearError}>{input.errorText}</Text> : null}
        <Box className={pick.yearPageRow}>
          <Pressable label={labels.prevPage} onPress={page.prev} disabled={page.prevDisabled} className={cls.iconButtonSmall}>
            <Icon node={chevronLeft} size="sm" tone="secondary" />
          </Pressable>
          <Text className={pick.yearPageText}>{page.rangeText}</Text>
          <Pressable label={labels.nextPage} onPress={page.next} disabled={page.nextDisabled} className={cls.iconButtonSmall}>
            <Icon node={chevronRight} size="sm" tone="secondary" />
          </Pressable>
        </Box>
        <Box className={cls.monthGrid}>
          {h.chips.map((chip) => (
            <Pressable
              key={chip.year}
              label={chip.label}
              selected={chip.selected}
              onPress={chip.pick}
              className={cn(
                pick.yearChip,
                chip.selected ? cls.monthChipActive : cls.monthChipIdle,
                chip.current && !chip.selected && pick.monthChipCurrent,
              )}
            >
              <Text className={cn(pick.yearChipLabel, chip.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{chip.label}</Text>
              {chip.sub ? <Text className={cn(pick.yearChipSub, chip.selected && pick.yearChipSubSelected)}>{chip.sub}</Text> : null}
            </Pressable>
          ))}
        </Box>
        <Box className={pick.footer}>
          <Pressable label={labels.today} onPress={h.goToday} className={pick.ghostButton}>
            <Text className={pick.ghostLabel}>{labels.thisYear}</Text>
          </Pressable>
        </Box>
      </Sheet>
    </View>
  );
}
