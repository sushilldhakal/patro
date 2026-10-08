import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { SaitCategoryId } from "@/lib/sait-data";

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
    <View className="mt-6 rounded-xl border border-border bg-muted/40 p-3.5">
      <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {t("sait.sources.heading")}
      </Text>
      <Text className="mt-1.5 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
        {t("sait.sources.blurb")}
      </Text>
      <View className="mt-4 gap-4">
        {ids.map((id, i) => (
          <View key={id} className="flex-row gap-3">
            <Text className="w-5 text-sm font-semibold text-muted-foreground">{digits(i + 1)}.</Text>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
                {t(`sait.sources.${id}.credit`)}
              </Text>
              <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
                {t(`sait.sources.${id}.edition`)}
              </Text>
              <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
                {t(`sait.sources.${id}.used.${category}`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
