import type { LucideIcon } from "lucide-react";

import {
  LEARN_SECTIONS,
  PUBLISHED_TOPICS,
  topicPath,
  type LibraryTopic,
} from "./learn-library";

/**
 * Flat view of the Learn library for consumers that predate it — the sitemap,
 * SEO metadata, related-links and the article shell.
 *
 * Only *published* topics appear here, which is what keeps outlined-but-unwritten
 * slugs out of the sitemap, out of prerendering and out of related links.
 * `category` carries the library's section id.
 */

export interface LearnTopicMeta {
  slug: string;
  category: string;
  titleNe: string;
  titleEn: string;
  icon: LucideIcon;
  summary: string;
  summaryEn: string;
  /** Route for this topic — a few render from their own page. */
  path: string;
}

export interface LearnCategory {
  id: string;
  ne: string;
  en: string;
}

function toMeta(topic: LibraryTopic): LearnTopicMeta {
  return {
    slug: topic.slug,
    category: topic.section,
    titleNe: topic.title.ne,
    titleEn: topic.title.en,
    icon: topic.icon,
    summary: topic.summary.ne,
    summaryEn: topic.summary.en,
    path: topicPath(topic),
  };
}

export const LEARN_CATEGORIES: LearnCategory[] = LEARN_SECTIONS.map((section) => ({
  id: section.id,
  ne: section.title.ne,
  en: section.title.en,
}));

export const LEARN_TOPIC_METAS: LearnTopicMeta[] = PUBLISHED_TOPICS.map(toMeta);

export const LEARN_TOPICS_BY_SLUG: Record<string, LearnTopicMeta> = Object.fromEntries(
  LEARN_TOPIC_METAS.map((t) => [t.slug, t]),
);

export function topicsInCategory(categoryId: string): LearnTopicMeta[] {
  return LEARN_TOPIC_METAS.filter((t) => t.category === categoryId);
}

export function adjacentTopicMetas(slug: string): {
  prev: LearnTopicMeta | null;
  next: LearnTopicMeta | null;
} {
  const i = LEARN_TOPIC_METAS.findIndex((t) => t.slug === slug);
  return {
    prev: i > 0 ? LEARN_TOPIC_METAS[i - 1]! : null,
    next: i >= 0 && i < LEARN_TOPIC_METAS.length - 1 ? LEARN_TOPIC_METAS[i + 1]! : null,
  };
}
