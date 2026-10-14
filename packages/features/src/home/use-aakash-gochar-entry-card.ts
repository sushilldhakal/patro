/**
 * The home page's way into the 3D sky, shared by the website's
 * `components/sky3d/AakashGocharEntryCard.tsx` and the app's
 * `components/home/AakashGocharEntryCard.tsx`: the page name and its tag.
 */
import { useLocale } from "@vedic-patro/i18n/react";

export function useAakashGocharEntryCard() {
  const { t } = useLocale();
  return {
    label: t("sidebar_nav.items.aakash-gochar.label"),
    tag: t("ui.home.geocentric"),
  };
}
