/**
 * The "related" cards that close a page, shared by the website's and the
 * app's `components/related/RelatedPageLinks.tsx`: the page's own Learn
 * articles (PAGE_LEARN_SLUGS — pages have no separate "learn more" card) or up
 * to two derived ones, then peer pages from the same group, with labels and blurbs. Each app works out the
 * page id from its own router and turns each card into its own link and icon.
 */
import { LEARN_LIBRARY, type LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { bilingualText } from "@vedic-patro/domain/locale";
import {
  SITE_LINK_BLURB_KEY,
  SITE_LINK_LABEL_KEY,
  getPageLearnSlugs,
  getRelatedLearnSlugs,
  getRelatedSiteLinkIds,
} from "@vedic-patro/domain/panchanga/related-page-links";
import { useLocale } from "@vedic-patro/i18n/react";

/** Articles and pages share one list, capped so the footer stays scannable. */
export const RELATED_CARD_LIMIT = 4;
/** Learn articles kept ahead of the pages, so every page also offers somewhere to go next. */
const RELATED_LEARN_FIRST = 2;

export type RelatedPageCard =
  | { kind: "learn"; key: string; slug: string; icon: LearnIconKey; label: string; description?: string }
  | { kind: "site"; key: string; linkId: string; label: string; description?: string };

const PUBLISHED_BY_SLUG = new Map(LEARN_LIBRARY.filter((t) => t.status === "published").map((t) => [t.slug, t]));

/** Pages kept after a page's own articles, so the footer still leads somewhere else too. */
const RELATED_PAGES_AFTER_OWN_ARTICLES = 2;

/** Two articles, then pages; whichever list runs short leaves its room to the other. */
function pickCards(learn: RelatedPageCard[], site: RelatedPageCard[], ownArticles: boolean): RelatedPageCard[] {
  // A page with its own article list shows every one of them (this footer is its
  // only "learn more"), then a couple of peer pages.
  if (ownArticles) {
    return [...learn, ...site.slice(0, Math.max(RELATED_CARD_LIMIT - learn.length, RELATED_PAGES_AFTER_OWN_ARTICLES))];
  }
  const head = learn.slice(0, RELATED_LEARN_FIRST);
  const pages = site.slice(0, RELATED_CARD_LIMIT - head.length);
  return [...head, ...pages, ...learn.slice(RELATED_LEARN_FIRST)].slice(0, RELATED_CARD_LIMIT);
}

export function useRelatedPageLinks(pageId: string | null) {
  const { t, lang } = useLocale();
  if (!pageId) return { cards: [] as RelatedPageCard[], heading: "", aria: "" };

  const ownSlugs = getPageLearnSlugs(pageId);
  const learnCards: RelatedPageCard[] = (ownSlugs ?? getRelatedLearnSlugs(pageId)).flatMap((slug): RelatedPageCard[] => {
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
    cards: pickCards(learnCards, siteCards, ownSlugs != null),
    heading: t("related_pages.heading"),
    aria: t("related_pages.aria"),
  };
}
