import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { cn } from "@/lib/utils";
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
        className="flex-row items-center justify-between py-3 active:opacity-80"
      >
        <Text className="flex-1 pr-2 text-base font-semibold text-foreground">{title}</Text>
        <Ionicons
          name={open ? "chevron-down" : "chevron-forward"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open ? <View className="pb-4">{children}</View> : null}
    </View>
  );
}

type AccordionProps = {
  children: ReactNode;
  className?: string;
};

export function PatroAccordion({ children, className }: AccordionProps) {
  return (
    <View className={cn("rounded-xl border border-border px-4", className)}>{children}</View>
  );
}
