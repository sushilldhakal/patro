import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

type ItemProps = {
  value: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function PatroAccordionItem({ value, title, children, defaultOpen }: ItemProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <View className="border-b border-border last:border-b-0">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-start justify-between py-3 active:opacity-80"
      >
        <Text className={cn("flex-1 pr-2", dainikKrantiClasses.accordionTrigger)} style={nepaliTextStyle()}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open ? <View className={dainikKrantiClasses.accordionBody}>{children}</View> : null}
    </View>
  );
}

type AccordionProps = {
  children: ReactNode;
  className?: string;
};

export function PatroAccordion({ children, className }: AccordionProps) {
  return (
    <View className={cn(dainikKrantiClasses.accordion, className)}>{children}</View>
  );
}
