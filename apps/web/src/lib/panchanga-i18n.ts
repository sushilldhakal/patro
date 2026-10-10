/**
 * Panchanga UI copy from ne.json / en.json — single source of truth for element
 * titles, blurbs, and long-form descriptions.
 */
import i18n from "@/i18n";
import { normalizeLang, type Lang } from "@/i18n/locale";

function lng(lang?: string | Lang): Lang {
  return lang ? normalizeLang(lang) : normalizeLang(i18n.language);
}

export function elementTitle(id: string, lang?: string | Lang): string {
  return i18n.t(`panchanga_elements.${id}.title`, { lng: lng(lang), defaultValue: id });
}

export function elementBlurb(id: string, lang?: string | Lang): string {
  return i18n.t(`panchanga_elements.${id}.blurb`, { lng: lng(lang), defaultValue: "" });
}

export function elementDescriptionSection(
  id: string,
  section: "what" | "how" | "meaning",
  lang?: string | Lang,
): string {
  return i18n.t(`element_descriptions.${id}.${section}`, { lng: lng(lang), defaultValue: "" });
}

/** All three description blocks for an element page. */
export function elementDescriptionBlocks(id: string, lang?: string | Lang) {
  const sections: Array<"what" | "how" | "meaning"> = ["what", "how", "meaning"];
  return sections.map((section) => ({
    section,
    body: elementDescriptionSection(id, section, lang),
  }));
}

export function grahaPageTitle(pageId: string, lang?: string | Lang): string {
  return i18n.t(`graha_pages.${pageId}.title`, { lng: lng(lang), defaultValue: pageId });
}

export function grahaPageBlurb(pageId: string, lang?: string | Lang): string {
  return i18n.t(`graha_pages.${pageId}.blurb`, { lng: lng(lang), defaultValue: "" });
}

export function grahaDescriptionSection(
  pageId: string,
  section: "what" | "how" | "meaning",
  lang?: string | Lang,
): string {
  return i18n.t(`graha_descriptions.${pageId}.${section}`, { lng: lng(lang), defaultValue: "" });
}

/** All three description blocks for a graha detail page. */
export function grahaDescriptionBlocks(pageId: string, lang?: string | Lang) {
  const sections: Array<"what" | "how" | "meaning"> = ["what", "how", "meaning"];
  return sections.map((section) => ({
    section,
    body: grahaDescriptionSection(pageId, section, lang),
  }));
}
