/**
 * Panchanga UI copy from ne.json / en.json — single source of truth for element
 * titles, blurbs, and long-form descriptions.
 */
import { translateKey, type Lang } from "./locale";

export function elementTitle(id: string, lang?: string | Lang): string {
  return translateKey(`panchanga_elements.${id}.title`, lang, id);
}

export function elementBlurb(id: string, lang?: string | Lang): string {
  return translateKey(`panchanga_elements.${id}.blurb`, lang, "");
}

export function elementDescriptionSection(
  id: string,
  section: "what" | "how" | "meaning",
  lang?: string | Lang,
): string {
  return translateKey(`element_descriptions.${id}.${section}`, lang, "");
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
  return translateKey(`graha_pages.${pageId}.title`, lang, pageId);
}

export function grahaPageBlurb(pageId: string, lang?: string | Lang): string {
  return translateKey(`graha_pages.${pageId}.blurb`, lang, "");
}

export function grahaDescriptionSection(
  pageId: string,
  section: "what" | "how" | "meaning",
  lang?: string | Lang,
): string {
  return translateKey(`graha_descriptions.${pageId}.${section}`, lang, "");
}

/** All three description blocks for a graha detail page. */
export function grahaDescriptionBlocks(pageId: string, lang?: string | Lang) {
  const sections: Array<"what" | "how" | "meaning"> = ["what", "how", "meaning"];
  return sections.map((section) => ({
    section,
    body: grahaDescriptionSection(pageId, section, lang),
  }));
}
