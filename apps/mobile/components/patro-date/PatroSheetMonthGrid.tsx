import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { SelectOption } from "@/components/ui/BsNativeSelect";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";

type Props = {
  month: number;
  monthOptions: SelectOption[];
  onMonthChange: (month: number) => void;
};

/** 3×4 month chips — shared by home + panchanga date sheets. */
export function PatroSheetMonthGrid({ month, monthOptions, onMonthChange }: Props) {
  const { lang } = useLocale();

  return (
    <View className="flex-row flex-wrap gap-2">
      {monthOptions.map((option) => {
        const selected = option.value === month;
        return (
          <Pressable
            key={option.value}
            onPress={() => onMonthChange(option.value)}
            className={cn(
              patroDateClasses.monthChip,
              "min-w-[30%] flex-1 items-center",
              selected ? patroDateClasses.monthChipActive : cn(patroDateClasses.monthChipIdle, "active:bg-muted"),
            )}
            style={{ maxWidth: "32%" }}
          >
            <Text
              numberOfLines={1}
              className={cn(
                patroDateClasses.monthChipLabel,
                selected ? patroDateClasses.monthChipLabelActive : patroDateClasses.monthChipLabelIdle,
              )}
              style={[
                { textAlign: "center", width: "100%" },
                lang === "en" ? undefined : nepaliTextStyle(14),
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
