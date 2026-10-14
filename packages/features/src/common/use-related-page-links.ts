/**
 * The "related" cards that close a page, shared by the website's and the
 * app's `components/related/RelatedPageLinks.tsx`: published Learn articles
 * first (closest to what the reader just read), then peer pages from the
 * same group, six at most, with labels and blurbs. Each app works out the
 * page id from its own router and turns each card into its own link and icon.
 */
import { LEARN_LIBRARY, type LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { bilingualText } from "@vedic-patro/domain/locale";
import {
  SITE_LINK_BLURB_KEY,
  SITE_LINK_LABEL_KEY,
  getRelatedLearnSlugs,
  getRelatedSiteLinkIds,
} from "@vedic-patro/domain/related-page-links";
import { useLocale } from "@vedic-patro/i18n/react";

/** Articles and pages share one list, capped so the footer stays scannable. */
export const RELATED_CARD_LIMIT = 6;

export type RelatedPageCard =
  | { kind: "learn"; key: string; slug: string; icon: LearnIconKey; label: string; description?: string }
  | { kind: "site"; key: string; linkId: string; label: string; description?: string };

const PUBLISHED_BY_SLUG = new Map(LEARN_LIBRARY.filter((t) => t.status === "published").map((t) => [t.slug, t]));

export function useRelatedPageLinks(pageId: string | null) {
  const { t, lang } = useLocale();
  if (!pageId) return { cards: [] as RelatedPageCard[], heading: "", aria: "" };

  const learnCards: RelatedPageCard[] = getRelatedLearnSlugs(pageId).flatMap((slug): RelatedPageCard[] => {
    const topic = PUBLISHED_BY_SLUG.get(slug);
    if (!topic) return [];
    return [
      {
        kind: "learn",
        key: `learn:${slug}`,
        slug,
        icon: topic.icon,
        label: bilingualText(lang, topic.title.ne, topic.title.en),
        description: bilingualText(lang, topic.summary.ne, topic.summary.en, ""),
      },
    ];
  });

  const siteCards: RelatedPageCard[] = getRelatedSiteLinkIds(pageId).map((linkId) => {
    let label: string;
    let description: string | undefined;
    if (linkId.startsWith("element:")) {
      const id = linkId.slice(8);
      label = t(`panchanga_elements.${id}.title`);
      description = t(`panchanga_elements.${id}.blurb`);
    } else if (linkId.startsWith("sait:")) {
      label = t(`sait.categories.${linkId.slice(5)}`);
      description = t("sidebar_nav.items.sait_moment.blurb");
    } else {
      const labelKey = SITE_LINK_LABEL_KEY[linkId];
      label = labelKey ? t(labelKey) : linkId;
      const blurbKey = SITE_LINK_BLURB_KEY[linkId];
      description = blurbKey ? t(blurbKey) : undefined;
    }
    return { kind: "site", key: linkId, linkId, label, description };
  });

  return {
    cards: [...learnCards, ...siteCards].slice(0, RELATED_CARD_LIMIT),
    heading: t("related_pages.heading"),
    aria: t("related_pages.aria"),
  };
}
