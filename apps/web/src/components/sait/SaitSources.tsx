import { useTranslation } from "react-i18next";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale } from "@/i18n/locale";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

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

export function SaitSources({ category }: { category: SaitCategoryId }) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const ids = SOURCES_BY_CATEGORY[category];
  return (
    <section className={saitClasses.sourcesCard}>
      <h2 className={saitClasses.sourcesHeading}>{t("sait.sources.heading")}</h2>
      <p className={saitClasses.sourcesBlurb}>{t("sait.sources.blurb")}</p>
      <ol className={saitClasses.sourcesList}>
        {ids.map((id, i) => (
          <li key={id} className={cn(saitClasses.sourceItem, "flex", saitClasses.sourceText)}>
            <span className={saitClasses.sourceNum}>{digits(i + 1)}.</span>
            <div className={saitClasses.sourceBody}>
              <p className={saitClasses.sourceCredit}>{t(`sait.sources.${id}.credit`)}</p>
              <p className={saitClasses.sourceDetail}>{t(`sait.sources.${id}.edition`)}</p>
              <p className={saitClasses.sourceDetail}>{t(`sait.sources.${id}.used.${category}`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default SaitSources;
