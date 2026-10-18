/**
 * Pieces the graha and panchanga-element pages share, used by the website's
 * and the app's `components/graha/GrahaPageParts.tsx`: the "About" block
 * (what it is, how it is calculated, what it means) for a graha page or a
 * panchanga element, and the app's link back to all elements.
 */
import { GRAHA_PAGE_DESCRIPTIONS } from "@vedic-patro/domain/jyotish/graha-detail-descriptions";
import { bilingualText } from "@vedic-patro/domain/locale";
import { elementDescriptionBlocks } from "@vedic-patro/domain/panchanga/panchanga-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

const SECTIONS = ["what", "how", "meaning"] as const;

const SECTION_KEY: Record<(typeof SECTIONS)[number], string> = {
  what: "element_page.section_what",
  how: "element_page.section_how",
  meaning: "element_page.section_meaning",
};

export type AboutBlock = { section: (typeof SECTIONS)[number]; heading: string; body: string };

export type AboutCard = { title: string; blocks: AboutBlock[] };

/** About block for a graha page (asta, vakri, eclipses, ...), or null when it has none. */
export function useGrahaDescription(pageId: string): AboutCard | null {
  const { t, lang } = useLocale();
  const desc = GRAHA_PAGE_DESCRIPTIONS[pageId];
  if (!desc) return null;
  return {
    title: t("common.about"),
    blocks: SECTIONS.map((section) => ({
      section,
      heading: t(SECTION_KEY[section]),
      body: bilingualText(lang, desc[section].ne, desc[section].en),
    })),
  };
}

/** About block for a panchanga element page, or null when it has no text. */
export function useElementDescription(elementId: string): AboutCard | null {
  const { t, lang } = useLocale();
  const blocks = elementDescriptionBlocks(elementId, lang);
  if (!blocks.some((b) => b.body)) return null;
  return {
    title: t("common.about"),
    blocks: blocks.map((b) => ({ section: b.section, heading: t(SECTION_KEY[b.section]), body: b.body })),
  };
}

/** Label of the trailing "all panchanga elements" link. */
export function useAllElementsLink() {
  const { t } = useLocale();
  return { label: t("ui.graha.all_panchanga_elements") };
}
