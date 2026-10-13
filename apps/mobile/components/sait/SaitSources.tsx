import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";

type SaitSourceId = "brihat_samhita" | "dharma_sindhu" | "muhurta_chintamani";

const SOURCES_BY_CATEGORY: Record<SaitCategoryId, readonly SaitSourceId[]> = {
  vivah: ["brihat_samhita", "dharma_sindhu", "muhurta_chintamani"],
  bratabandha: ["brihat_samhita", "dharma_sindhu", "muhurta_chintamani"],
  "griha-aarambha": ["brihat_samhita", "dharma_sindhu", "muhurta_chintamani"],
  "griha-pravesh": ["dharma_sindhu", "muhurta_chintamani"],
  "byaparik-pratisthan": ["brihat_samhita", "muhurta_chintamani"],
  "rudri-jurne": ["dharma_sindhu", "muhurta_chintamani"],
  "agni-jurne": ["muhurta_chintamani"],
  annaprasan: ["muhurta_chintamani"],
};

/** Classical sources a ceremony's muhurta rules come from — same copy keys as web `SaitSources`. */
export function SaitSources({ category }: { category: SaitCategoryId }) {
  const { t, digits } = useLocale();
  const ids = SOURCES_BY_CATEGORY[category];
  return (
    <View className={saitClasses.sourcesCard}>
      <Text className={saitClasses.sourcesHeading} style={nepaliTextStyle()}>
        {t("sait.sources.heading")}
      </Text>
      <Text className={saitClasses.sourcesBlurb} style={nepaliTextStyle()}>
        {t("sait.sources.blurb")}
      </Text>
      <View className={saitClasses.sourcesList}>
        {ids.map((id, i) => (
          <View key={id} className={saitClasses.sourceItem}>
            <Text className={cn(saitClasses.sourceText, saitClasses.sourceNum)} style={nepaliTextStyle()}>{digits(i + 1)}.</Text>
            <View className={cn(saitClasses.sourceBody, "flex-1")}>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceCredit)} style={nepaliTextStyle()}>
                {t(`sait.sources.${id}.credit`)}
              </Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)} style={nepaliTextStyle()}>
                {t(`sait.sources.${id}.edition`)}
              </Text>
              <Text className={cn(saitClasses.sourceText, saitClasses.sourceDetail)} style={nepaliTextStyle()}>
                {t(`sait.sources.${id}.used.${category}`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
