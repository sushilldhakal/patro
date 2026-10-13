import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

/**
 * Web `PageHeader` — icon, title, optional subtitle. Same spec classes as the
 * website; the web page stack spaces sections with `space-y-8`, so callers pass
 * `className="mb-8"` (default `mb-4` is the older tight spacing).
 */
export function PatroPageHeader({
  icon,
  title,
  subtitle,
  className,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <View className={cn("mb-4", spec.pageHeaderRow, className)}>
      <View className="mt-0.5 shrink-0">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className={spec.pageTitle} style={nepaliTextStyle()}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={spec.pageSubtitle} style={nepaliTextStyle()}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
