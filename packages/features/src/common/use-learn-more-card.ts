/**
 * The "Learn more" block at the foot of a page, shared by the website's
 * `components/LearnMoreCard.tsx` and the app's `components/learn/LearnMoreCard.tsx`:
 * the heading and the published Learn topics for the given slugs, with the
 * icon key each app maps to its own icon.
 */
import { LEARN_LIBRARY, type LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type LearnMoreTopic = { slug: string; title: string; icon: LearnIconKey };

const PUBLISHED_BY_SLUG = new Map(LEARN_LIBRARY.filter((t) => t.status === "published").map((t) => [t.slug, t]));

export function useLearnMoreCard(slugs: string[], heading?: string) {
  const { t, lang } = useLocale();
  const topics: LearnMoreTopic[] = slugs.flatMap((slug) => {
    const topic = PUBLISHED_BY_SLUG.get(slug);
    return topic
      ? [{ slug, title: bilingualText(lang, topic.title.ne, topic.title.en), icon: topic.icon }]
      : [];
  });
  return { heading: heading ?? t("learn_more.default_heading"), topics };
}
