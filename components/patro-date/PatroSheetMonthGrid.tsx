import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { SelectOption } from "@/components/ui/BsNativeSelect";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@/lib/utils";

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
              "min-w-[30%] flex-1 items-center rounded-lg border px-2 py-2.5",
              selected ? "border-secondary bg-secondary" : "border-border bg-card active:bg-muted",
            )}
            style={{ maxWidth: "32%" }}
          >
            <Text
              numberOfLines={1}
              className={cn(
                "text-body font-semibold",
                selected ? "text-secondary-foreground" : "text-foreground",
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
