import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { spec } from "@vedic-patro/design-tokens";

/** Icon + title + optional subtitle at the top of a page. Same spec as the website's PageHeader. */
export function PageHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <View className={spec.pageHeaderRow}>
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1">
        <Text variant="pageTitle" style={nepaliTextStyle()}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="pageSubtitle" style={nepaliTextStyle()}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
