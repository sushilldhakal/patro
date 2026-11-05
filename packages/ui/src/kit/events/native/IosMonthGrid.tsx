import { Pressable, View } from "react-native";
import { useBsDateTimePicker } from "@vedic-patro/features/panchanga";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { Icon, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { IosMonthGridProps } from "../contract";
import { iconChevronLeft, iconChevronRight } from "../icons";

/**
 * A BS month as Apple Calendar's inline date picker draws it under a date row: "कात्तिक २०८३ ›"
 * with ‹ › on the right, the weekday letters, then borderless days — the chosen one in a filled
 * circle, today in the accent colour.
 */
export function IosMonthGrid({ year, month, day, yearOptions, onSelect }: IosMonthGridProps) {
  const { digits } = useLocale();
  const picker = useBsDateTimePicker({ year, month, day, yearOptions, onSelectDate: onSelect, showTime: false, onDraftDate: onSelect });
  const monthName = picker.monthOptions.find((o) => o.value === picker.draft.month)?.label ?? "";
  const rows = Math.ceil(picker.cells.length / 7);

  const arrow = (dir: "prev" | "next") => {
    const step = dir === "prev" ? picker.prev : picker.next;
    return (
      <Pressable
        disabled={step.disabled}
        onPress={() => {
          haptics.tick();
          step.go();
        }}
        accessibilityRole="button"
        accessibilityLabel={step.label}
        hitSlop={8}
        className={cn("h-9 w-9 items-center justify-center active:opacity-50", step.disabled && "opacity-30")}
      >
        <Icon node={dir === "prev" ? iconChevronLeft : iconChevronRight} size={22} />
      </Pressable>
    );
  };

  return (
    <View className="gap-1 pb-3 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1 pl-1">
          <Text className="text-body font-semibold text-foreground">{`${monthName} ${digits(picker.draft.year)}`}</Text>
          <Icon node={iconChevronRight} size={16} tone="destructive" />
        </View>
        <View className="flex-row items-center gap-2">
          {arrow("prev")}
          {arrow("next")}
        </View>
      </View>

      <View className="flex-row pt-1">
        {picker.weekdays.map((wd) => (
          <View key={wd.label} className="flex-1 items-center py-1">
            <Text className="text-caption font-semibold uppercase text-muted-foreground">{wd.label}</Text>
          </View>
        ))}
      </View>

      {picker.gridLoading ? (
        <View className="h-48 items-center justify-center">
          <Text className="text-caption text-muted-foreground">{picker.copy.loading}</Text>
        </View>
      ) : (
        Array.from({ length: rows }, (_, r) => (
          <View key={`row-${r}`} className="flex-row">
            {Array.from({ length: 7 }, (_, i) => picker.cells[r * 7 + i]).map((c, i) =>
              !c || c.day == null ? (
                <View key={c?.key ?? `pad-${r}-${i}`} className="h-11 flex-1" />
              ) : (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    haptics.tick();
                    c.pick();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected: c.selected }}
                  className="h-11 flex-1 items-center justify-center"
                >
                  <View className={cn("h-10 w-10 items-center justify-center rounded-full", c.selected && "bg-destructive")}>
                    <Text
                      className={cn(
                        "font-num text-title",
                        c.selected ? "font-semibold text-white" : c.today ? "font-semibold text-destructive" : "text-foreground",
                      )}
                    >
                      {c.label}
                    </Text>
                  </View>
                </Pressable>
              ),
            )}
          </View>
        ))
      )}
    </View>
  );
}
