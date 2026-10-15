/**
 * The classical sources a ceremony's muhurta rules come from, shared by the
 * website's and the app's `components/sait/SaitSources.tsx`: which texts
 * apply to the ceremony, numbered, with credit, edition and what was used.
 */
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import { useLocale } from "@vedic-patro/i18n/react";

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

export function useSaitSources(category: SaitCategoryId) {
  const { t, digits } = useLocale();
  return {
    heading: t("sait.sources.heading"),
    blurb: t("sait.sources.blurb"),
    sources: SOURCES_BY_CATEGORY[category].map((id, i) => ({
      id,
      num: `${digits(i + 1)}.`,
      credit: t(`sait.sources.${id}.credit`),
      edition: t(`sait.sources.${id}.edition`),
      used: t(`sait.sources.${id}.used.${category}`),
    })),
  };
}
