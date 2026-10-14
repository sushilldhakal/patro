import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useSaitSources } from "@vedic-patro/features/sait";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";

/** Classical sources a ceremony's muhurta rules come from — same copy keys as web `SaitSources`. */
export function SaitSources({ category }: { category: SaitCategoryId }) {
  const src = useSaitSources(category);
  return (
    <View className={saitClasses.sourcesCard}>
      <Text className={saitClasses.sourcesHeading} style={nepaliTextStyle()}>
        {src.heading}
      </Text>
      <Text className={saitClasses.sourcesBlurb} style={nepaliTextStyle()}>
        {src.blurb}
      </Text>
      <View className={saitClasses.sourcesList}>
        {src.sources.map((s) => (
          <View key={s.id} className={saitClasses.sourceItem}>
            <Text className={cn(saitClasses.sourceText, saitClasses.sourceNum)} style={nepaliTextStyle()}>{s.num}</Text>
            <View className={cn(saitClasses.sourceBody, "flex-1")}>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceCredit)} style={nepaliTextStyle()}>
                {s.credit}
              </Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)} style={nepaliTextStyle()}>
                {s.edition}
              </Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)} style={nepaliTextStyle()}>
                {s.used}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
