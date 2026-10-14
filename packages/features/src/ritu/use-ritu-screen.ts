/**
 * The ritu page's header, shared by the website's `pages/Ritu.tsx` and the
 * app's `app/(tabs)/ritu.tsx`: title, the subtitle with the place, and the
 * Learn slugs under the seasons. The seasons themselves come from
 * `useRituPage`.
 */
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/domain/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";

const RITU_LEARN_SLUGS = ["ritu-drift"];

export function useRituScreen(location: PanchangaLocation) {
  const { t, lang } = useLocale();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  return {
    title: t("ritu.title"),
    subtitle: `${t("ritu.subtitle")}${locationLabel ? ` · ${locationLabel}` : ""}`,
    learnSlugs: RITU_LEARN_SLUGS,
  };
}
