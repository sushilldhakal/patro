import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
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

export function SaitSources({ category }: { category: SaitCategoryId }) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const ids = SOURCES_BY_CATEGORY[category];
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-3.5 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("sait.sources.heading")}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("sait.sources.blurb")}</p>
      <ol className="mt-4 flex flex-col gap-4">
        {ids.map((id, i) => (
          <li key={id} className="flex gap-3 text-sm">
            <span className="w-5 shrink-0 font-semibold text-muted-foreground">{digits(i + 1)}.</span>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-semibold text-foreground">{t(`sait.sources.${id}.credit`)}</p>
              <p className="text-muted-foreground">{t(`sait.sources.${id}.edition`)}</p>
              <p className="text-muted-foreground">{t(`sait.sources.${id}.used.${category}`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default SaitSources;
