/**
 * Learn hub logic, shared by the website (`apps/web/src/pages/Learn.tsx`) and
 * the app (`apps/mobile/app/(tabs)/learn/index.tsx`): the learning paths, the
 * section chips, search and filtering over the published library, and copy.
 * Icons are the library's icon keys; each app maps them to its own icon set.
 */
import { useMemo, useState } from "react";
import {
  buildLearnViews,
  LEARN_LIBRARY,
  LEARN_MODULES,
  LEARN_SECTIONS,
  topicPath,
  type LearnIconKey,
  type LibraryTopic,
} from "@vedic-patro/domain/learn/learn-library";
import { useLocale } from "@vedic-patro/i18n/react";

const views = buildLearnViews(LEARN_SECTIONS, LEARN_LIBRARY);

export type LearnTopicCard = {
  slug: string;
  /** Route of the topic (a few render from their own page). */
  path: string;
  section: string;
  title: string;
  summary: string;
  icon: LearnIconKey;
  /** The section's name, shown as the card's badge. */
  sectionLabel?: string;
};

export type LearnChip = { id: string; label: string; count?: string; icon?: LearnIconKey; active: boolean };

export type LearnHubSection = { id: string; label: string; countLabel: string; icon: LearnIconKey; topics: LearnTopicCard[] };

export type LearnHubModule = {
  id: string;
  title: string;
  /** "Blurb · 4 articles". */
  blurb: string;
  /** "2 more being written" (when any). */
  more?: string;
  icon: LearnIconKey;
  sections: LearnHubSection[];
  /** More than one section: each gets its own heading. */
  showSectionHeads: boolean;
};

function matches(topic: LibraryTopic, query: string): boolean {
  if (!query) return true;
  return (
    topic.title.ne.toLowerCase().includes(query) ||
    topic.title.en.toLowerCase().includes(query) ||
    topic.summary.ne.toLowerCase().includes(query) ||
    topic.summary.en.toLowerCase().includes(query) ||
    topic.slug.includes(query)
  );
}

export function useLearnHub() {
  const { t, lang, digits } = useLocale();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const pick = (v: { ne: string; en: string }) => (lang === "en" ? v.en : v.ne);

  const normalized = query.trim().toLowerCase();
  const isFiltering = normalized.length > 0 || activeCategory !== "all";
  const articles = (n: number) => t("learn_page.articles_count", { count: digits(n) });

  const card = (topic: LibraryTopic): LearnTopicCard => {
    const section = views.sectionsById[topic.section];
    return {
      slug: topic.slug,
      path: topicPath(topic),
      section: topic.section,
      title: pick(topic.title),
      summary: pick(topic.summary),
      icon: topic.icon,
      sectionLabel: section ? pick(section.title) : undefined,
    };
  };

  const filtered = useMemo(
    () => views.published.filter((topic) => (activeCategory === "all" || topic.section === activeCategory) && matches(topic, normalized)),
    [activeCategory, normalized],
  );

  const modules: LearnHubModule[] = isFiltering
    ? []
    : LEARN_MODULES.flatMap((module) => {
      const moduleTopics = views.published.filter((topic) => module.sections.includes(topic.section));
      if (moduleTopics.length === 0) return [];
      const upcoming = module.sections.reduce((n, id) => n + views.plannedInSection(id).length, 0);
      const sections = LEARN_SECTIONS.filter((s) => module.sections.includes(s.id)).flatMap((s) => {
        const topics = views.publishedInSection(s.id);
        if (topics.length === 0) return [];
        return [{ id: s.id, label: pick(s.title), countLabel: articles(topics.length), icon: s.icon, topics: topics.map(card) }];
      });
      return [
        {
          id: module.id,
          title: pick(module.title),
          blurb: `${pick(module.blurb)} · ${articles(moduleTopics.length)}`,
          more: upcoming > 0 ? t("learn_page.more_coming", { count: digits(upcoming) }) : undefined,
          icon: views.sectionsById[module.sections[0] ?? ""]?.icon ?? "ScrollText",
          sections,
          showSectionHeads: sections.length > 1,
        },
      ];
    });

  const liveModules = LEARN_MODULES.filter((m) => views.published.some((topic) => m.sections.includes(topic.section))).length;

  const chips: LearnChip[] = [
    { id: "all", label: t("common.all"), active: activeCategory === "all" },
    ...LEARN_SECTIONS.flatMap((s) => {
      const count = views.publishedInSection(s.id).length;
      // A section whose articles are all still outlined has nothing to filter to.
      if (count === 0) return [];
      return [{ id: s.id, label: pick(s.title), count: `(${digits(count)})`, icon: s.icon, active: activeCategory === s.id }];
    }),
  ];

  return {
    copy: {
      navTitle: t("nav.learn"),
      eyebrow: t("learn_page.eyebrow"),
      title: t("learn_page.title"),
      titleAccent: t("learn_page.title_accent"),
      subtitle: t("learn_page.subtitle"),
      pathsStat: t("learn_page.learning_paths_count", { count: digits(liveModules) }),
      articlesStat: articles(views.published.length),
      searchLabel: t("learn_page.search_label"),
      searchPlaceholder: t("learn_page.search_placeholder"),
      clearSearch: t("common.clear_search"),
      results: isFiltering ? t("learn_page.results_count", { count: digits(filtered.length) }) : undefined,
      empty: t("learn_page.no_topics"),
      emptyHint: t("learn_page.no_topics_hint"),
      clearFilters: t("learn_page.clear_filters"),
      viewCategory: t("learn_page.view_category"),
      readMore: t("learn_page.read_detail"),
    },
    query,
    setQuery,
    activeCategory,
    setCategory: setActiveCategory,
    clearFilters: () => {
      setQuery("");
      setActiveCategory("all");
    },
    chips,
    isFiltering,
    /** The matching topics, shown flat while a search or chip is active. */
    results: filtered.map(card),
    /** The learning paths, shown when nothing is filtered. */
    modules,
  };
}

export type LearnHub = ReturnType<typeof useLearnHub>;
