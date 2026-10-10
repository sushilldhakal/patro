import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

/** Web `PageHeader` — icon, title, optional subtitle. */
export function PatroPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-4 flex-row items-start gap-3">
      <View className="mt-0.5 shrink-0">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-display font-bold text-foreground" style={nepaliTextStyle(24)}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-body mt-0.5 text-muted-foreground" style={nepaliTextStyle(14)}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
