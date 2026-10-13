/**
 * Learn article page logic, shared by the website (`apps/web/src/pages/LearnArticle.tsx`)
 * and the app (`apps/mobile/app/(tabs)/learn/[slug].tsx`): retired-slug
 * redirects, which topic is shown, its header, playground, prev/next and copy.
 * The article body is drawn by each app's own renderer.
 */
import { buildLearnViews, LEARN_LIBRARY, LEARN_SECTIONS } from "@vedic-patro/domain/learn/learn-library";
import { RETIRED_SLUG_REDIRECTS } from "@vedic-patro/domain/learn/merged-pages";
import { playgroundFor } from "@vedic-patro/domain/learn/playground-config";
import { useLocale } from "@vedic-patro/i18n/react";

const views = buildLearnViews(LEARN_SECTIONS, LEARN_LIBRARY);

export type LearnNeighbour = { slug: string; title: string };

export function useLearnArticle(slug: string | undefined) {
  const { t, lang } = useLocale();
  const pick = (v: { ne: string; en: string }) => (lang === "en" ? v.en : v.ne);

  const retired = slug ? RETIRED_SLUG_REDIRECTS[slug] : undefined;
  const [redirectSlug, redirectAnchor] = retired ? retired.split("#") : [];
  const found = slug && !retired ? views.bySlug[slug] : undefined;
  const topic = found?.status === "published" ? found : undefined;
  const section = topic ? views.sectionsById[topic.section] : undefined;
  const playground = topic ? playgroundFor(topic.slug) : undefined;
  const { prev, next } = topic ? views.adjacentPublished(topic.slug) : { prev: null, next: null };
  const neighbour = (n: typeof prev): LearnNeighbour | null => (n ? { slug: n.slug, title: pick(n.title) } : null);
  const title = topic ? pick(topic.title) : undefined;

  return {
    /** A retired slug: go to this page (and chapter anchor) instead. */
    redirect: redirectSlug ? { slug: redirectSlug, anchor: redirectAnchor } : undefined,
    topic: topic && title
      ? { slug: topic.slug, title, summary: pick(topic.summary), sectionLabel: section ? pick(section.title) : "" }
      : undefined,
    playground,
    /** A narrated tour explains the topic itself; the prose below would repeat it. */
    hasGuidedTour: Boolean(playground?.guided),
    prev: neighbour(prev),
    next: neighbour(next),
    copy: {
      navTitle: title ?? t("nav.learn"),
      backToHub: t("learn_page.eyebrow"),
      notFound: t("learn_page.topic_not_found"),
      backHub: t("learn_page.back_hub"),
      prev: t("learn_page.prev"),
      next: t("learn_page.next"),
      allTopics: t("learn_page.all_topics"),
      playgroundTitle: title ? t("learn_page.playground_title", { title }) : "",
    },
  };
}

export type LearnArticle = ReturnType<typeof useLearnArticle>;
