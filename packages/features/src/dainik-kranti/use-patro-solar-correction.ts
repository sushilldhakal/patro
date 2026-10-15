/**
 * The deshaantar / akshamsha / belaantar strip under a day's planets, shared
 * by the website's and the app's
 * `components/dainikKranti/PatroSolarCorrectionStrip.tsx`: the items that
 * have a value, with their labels. Belaantar is the highlighted one.
 */
import { useLocale } from "@vedic-patro/i18n/react";

export type PatroSolarKey = "deshaantar" | "akshamsha" | "belaantar";

const SOLAR_ITEMS: { key: PatroSolarKey; label: string }[] = [
  { key: "deshaantar", label: "aside.deshaantar" },
  { key: "akshamsha", label: "aside.akshamsha" },
  { key: "belaantar", label: "aside.belaantar" },
];

export function usePatroSolarCorrection(values: Partial<Record<PatroSolarKey, string>>) {
  const { t } = useLocale();
  return SOLAR_ITEMS.filter((item) => values[item.key]).map((item) => ({
    key: item.key,
    label: t(item.label),
    value: values[item.key]!,
    highlight: item.key === "belaantar",
  }));
}
