import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import { learnHero, learnStatPill } from "@/lib/learn-classes";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ArrowRight,
  Search,
  X,
  GraduationCap,
} from "lucide-react";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "../components/PageShell";
import { Input } from "@/components/ui/input";
import { cn } from "@vedic-patro/domain/utils";
import {
  LEARN_CATEGORIES,
  LEARN_TOPICS,
  topicsInCategory,
  type LearnCategory,
  type LearnTopic,
} from "@/lib/learn/learn-topics";
import { LEARN_SECTIONS_BY_ID, plannedInSection } from "@/lib/learn/learn-library";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

interface LearnModule {
  id: string;
  title: { ne: string; en: string };
  blurb: { ne: string; en: string };
  sections: string[];
}

const LEARN_MODULES: LearnModule[] = [
  {
    id: "basics",
    title: { ne: "पहिले बुझ्ने कुरा", en: "Start Here" },
    blurb: {
      ne: "पात्रो, पञ्चाङ्ग र विक्रम सम्वत् बुझ्ने आधार।",
      en: "The base ideas behind the patro, panchanga and Bikram Sambat.",
    },
    sections: ["start"],
  },
  {
    id: "sky-sun",
    title: { ne: "आकाश, पृथ्वी र सूर्य", en: "Sky, Earth and Sun" },
    blurb: {
      ne: "दिन, ऋतु, राशि, सङ्क्रान्ति र अयनांश एउटै प्रवाहमा।",
      en: "Day, seasons, rashi, sankranti and ayanamsha in one flow.",
    },
    sections: ["earth-sky", "sun"],
  },
  {
    id: "moon-panchanga",
    title: { ne: "चन्द्र र पञ्चाङ्ग", en: "Moon and Panchanga" },
    blurb: {
      ne: "तिथि, पक्ष, मास र पञ्चाङ्गका पाँच अङ्ग।",
      en: "Tithi, paksha, months and the five limbs of the panchanga.",
    },
    sections: ["moon", "panchanga"],
  },
  {
    id: "calculation",
    title: { ne: "गणना कसरी हुन्छ", en: "How Calculation Works" },
    blurb: {
      ne: "सूर्योदय, तिथि, नक्षत्र र स्थानअनुसार फरक पर्ने कारण।",
      en: "Sunrise, tithi, nakshatra and why location changes the answer.",
    },
    sections: ["calculation"],
  },
  {
    id: "deeper",
    title: { ne: "अलि गहिरो खगोल", en: "Deeper Astronomy" },
    blurb: {
      ne: "वक्री गति, अयन चलन, ध्रुव तारा र ग्रहण।",
      en: "Retrograde motion, precession, pole stars and eclipses.",
    },
    sections: ["deeper"],
  },
  {
    id: "comparison",
    title: { ne: "तुलना र इतिहास", en: "Comparison and History" },
    blurb: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रो, अनि सूर्य सिद्धान्त।",
      en: "Nepali, Vedic and Gregorian calendars, plus Surya Siddhanta.",
    },
    sections: ["comparison"],
  },
];

/**
 * Hover ring per library section (web only). The badge colours are the shared
 * `learnPageClasses.sectionChip`; icons come from the library itself.
 */
const SECTION_RING: Record<string, string> = {
  start: "group-hover:ring-emerald-500/25",
  foundation: "group-hover:ring-emerald-500/25",
  sun: "group-hover:ring-amber-500/25",
  moon: "group-hover:ring-sky-500/25",
  "five-limbs": "group-hover:ring-teal-500/25",
  "earth-sky": "group-hover:ring-lime-500/25",
  zodiac: "group-hover:ring-indigo-500/25",
  "vedic-time": "group-hover:ring-slate-500/25",
  panchanga: "group-hover:ring-teal-500/25",
  "bs-construction": "group-hover:ring-red-500/25",
  eclipses: "group-hover:ring-violet-500/25",
  calculation: "group-hover:ring-cyan-500/25",
  comparison: "group-hover:ring-orange-500/25",
  deeper: "group-hover:ring-rose-500/25",
};

function sectionIcon(sectionId: string) {
  return LEARN_SECTIONS_BY_ID[sectionId]?.icon ?? BookOpen;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function topicMatchesQuery(topic: LearnTopic, query: string) {
  if (!query) return true;
  return (
    topic.titleNe.toLowerCase().includes(query) ||
    topic.titleEn.toLowerCase().includes(query) ||
    topic.summary.toLowerCase().includes(query) ||
    topic.slug.includes(query)
  );
}

function categoryForTopic(topic: LearnTopic): LearnCategory | undefined {
  return LEARN_CATEGORIES.find((c) => c.id === topic.category);
}

function topicsInModule(module: LearnModule): LearnTopic[] {
  const sectionIds = new Set(module.sections);
  return LEARN_TOPICS.filter((topic) => sectionIds.has(topic.category));
}

function moduleMatchesFilter(module: LearnModule, activeCategory: string) {
  return activeCategory === "all" || module.sections.includes(activeCategory);
}

function LearnTopicLink({
  topic,
  className,
  children,
}: {
  topic: LearnTopic;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to="/learn/$slug" params={{ slug: topic.slug }} className={className}>
      {children}
    </Link>
  );
}

function TopicCard({ topic }: { topic: LearnTopic }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const Icon = topic.icon;
  const category = categoryForTopic(topic);
  const ring = SECTION_RING[topic.category];
  const chip = learnPageClasses.sectionChip[topic.category];

  return (
    <LearnTopicLink
      topic={topic}
      className={cn(
        learnPageClasses.topicCard,
        "group relative h-full transition-all hover:-translate-y-0.5 hover:border-secondary/45 hover:shadow-md",
        ring && `hover:ring-2 ${ring}`,
      )}
    >
      {/* Icon, title and category read as one line, so the card opens with its identity. */}
      <div className={learnPageClasses.topicHead}>
        <span className={cn(learnPageClasses.topicIcon, "text-secondary transition-colors group-hover:bg-secondary/15")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className={learnPageClasses.topicTitleWrap}>
          <h3 className={learnPageClasses.topicTitle}>
            {bilingualText(lang, topic.titleNe, topic.titleEn)}
          </h3>
        </div>
        {category && chip && (
          <span
            className={cn(learnPageClasses.topicBadge, learnPageClasses.topicBadgeText, chip)}
          >
            {bilingualText(lang, category.ne, category.en)}
          </span>
        )}
      </div>

      <p className={cn(learnPageClasses.topicSummary, "flex-1")}>
        {bilingualText(lang, topic.summary, topic.summaryEn)}
      </p>

      <div className={learnPageClasses.topicFooter}>
        <span className={learnPageClasses.topicFooterText}>{t("learn_page.read_detail")}</span>
        <ArrowRight className="h-4 w-4 text-secondary transition-transform group-hover:translate-x-0.5" />
      </div>
    </LearnTopicLink>
  );
}

export function Learn() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  useRouteLoading(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizedQuery = normalizeSearch(query);
  const isFiltering = normalizedQuery.length > 0 || activeCategory !== "all";

  /** Modules with at least one published article are what the hub presents first. */
  const liveModuleCount = useMemo(
    () => LEARN_MODULES.filter((module) => topicsInModule(module).length > 0).length,
    [],
  );

  const filteredTopics = useMemo(() => {
    return LEARN_TOPICS.filter((topic) => {
      const matchesCategory =
        activeCategory === "all" || topic.category === activeCategory;
      return matchesCategory && topicMatchesQuery(topic, normalizedQuery);
    });
  }, [activeCategory, normalizedQuery]);

  const visibleCategories = useMemo(() => {
    if (!isFiltering) return LEARN_CATEGORIES;
    const ids = new Set(filteredTopics.map((t) => t.category));
    return LEARN_CATEGORIES.filter((c) => ids.has(c.id));
  }, [filteredTopics, isFiltering]);

  return (
    <PageShell className="space-y-8">
      <section className={learnHero}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className={cn(learnPageClasses.eyebrow, learnPageClasses.eyebrowText, "inline-flex")}>
              <BookOpen className="h-4 w-4" />
              {t("learn_page.eyebrow")}
            </div>
            <h1 className={learnPageClasses.title}>
              {t("learn_page.title")}
              <span className={cn(learnPageClasses.titleAccent, "block")}>{t("learn_page.title_accent")}</span>
            </h1>
            <p className={learnPageClasses.subtitle}>
              {t("learn_page.subtitle")}
            </p>
            <div className={learnPageClasses.stats}>
              <div className={learnStatPill}>
                <GraduationCap className="h-4 w-4 text-secondary" />
                <span>{t("learn_page.learning_paths_count", { count: liveModuleCount })}</span>
              </div>
              <div className={learnStatPill}>
                <BookOpen className="h-4 w-4 text-secondary" />
                <span>{t("learn_page.articles_count", { count: LEARN_TOPICS.length })}</span>
              </div>
            </div>
          </div>

          <div className={cn(learnPageClasses.searchWrap, "shrink-0")}>
            <label htmlFor="learn-search" className="sr-only">
              {t("learn_page.search_label")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" />
              <Input
                id="learn-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("learn_page.search_placeholder")}
                className={cn(learnPageClasses.searchInput, "pl-11 pr-11")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={cn(learnPageClasses.searchClear, "absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:bg-muted/40 hover:text-foreground")}
                  aria-label={t("common.clear_search")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              learnPageClasses.chip,
              learnPageClasses.chipText,
              "transition-colors",
              activeCategory === "all"
                ? cn(learnPageClasses.chipActive, learnPageClasses.chipActiveText)
                : cn(learnPageClasses.chipIdle, "hover:border-secondary/40 hover:text-foreground"),
            )}
          >
            {t("common.all")}
          </button>
          {LEARN_CATEGORIES.map((cat) => {
            const MetaIcon = sectionIcon(cat.id);
            const count = topicsInCategory(cat.id).length;
            // A section whose articles are all still outlined has nothing to
            // filter to — its chip would lead to the empty state.
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  learnPageClasses.chip,
                  learnPageClasses.chipText,
                  "inline-flex items-center transition-colors",
                  activeCategory === cat.id
                    ? cn(learnPageClasses.chipActive, learnPageClasses.chipActiveText)
                    : cn(learnPageClasses.chipIdle, "hover:border-secondary/40 hover:text-foreground"),
                )}
              >
                <MetaIcon className="h-3.5 w-3.5" />
                {bilingualText(lang, cat.ne, cat.en)}
                <span className={learnPageClasses.chipCount}>({count})</span>
              </button>
            );
          })}
        </div>
        {isFiltering && (
          <p className={learnPageClasses.resultsText}>
            {t("learn_page.results_count", { count: filteredTopics.length })}
          </p>
        )}
      </div>

      {filteredTopics.length === 0 ? (
        <div className={cn(learnPageClasses.emptyState, "text-center")}>
          <p className={learnPageClasses.emptyTitle}>{t("learn_page.no_topics")}</p>
          <p className={learnPageClasses.emptyHint}>
            {t("learn_page.no_topics_hint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("all");
            }}
            className={cn(learnPageClasses.clearFilters, "inline-flex items-center gap-1 hover:underline")}
          >
            {t("learn_page.clear_filters")}
          </button>
        </div>
      ) : isFiltering ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTopics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {LEARN_MODULES.map((module) => {
            const moduleTopics = topicsInModule(module);
            if (moduleTopics.length === 0 || !moduleMatchesFilter(module, activeCategory)) {
              return null;
            }
            const firstSection = module.sections[0] ?? module.id;
            const ModuleIcon = sectionIcon(firstSection);
            const upcoming = module.sections.reduce(
              (total, sectionId) => total + plannedInSection(sectionId).length,
              0,
            );
            const moduleCategories = visibleCategories.filter((cat) =>
              module.sections.includes(cat.id),
            );

            return (
              <section key={module.id} id={`learn-${module.id}`}>
                <div className={cn(learnPageClasses.moduleHeader, "flex flex-wrap items-end justify-between gap-3")}>
                  <div className={learnPageClasses.moduleHeaderRow}>
                    <span className={cn(learnPageClasses.moduleIcon, "text-secondary")}>
                      <ModuleIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className={learnPageClasses.moduleTitle}>
                        {bilingualText(lang, module.title.ne, module.title.en)}
                      </h2>
                      <p className={learnPageClasses.moduleBlurb}>
                        {bilingualText(lang, module.blurb.ne, module.blurb.en)} ·{" "}
                        {t("learn_page.articles_count", { count: moduleTopics.length })}
                        {upcoming > 0 && (
                          <span className={learnPageClasses.moduleMore}>
                            {" · "}
                            {t("learn_page.more_coming", { count: upcoming })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  {moduleCategories.map((cat) => {
                    const topics = topicsInCategory(cat.id);
                    if (topics.length === 0) return null;
                    const CatIcon = sectionIcon(cat.id);
                    return (
                      <div key={cat.id}>
                        {moduleCategories.length > 1 && (
                          <div className={learnPageClasses.catHeader}>
                            <div className={cn(learnPageClasses.catTitle, learnPageClasses.catTitleText)}>
                              <CatIcon className="h-4 w-4 text-secondary" />
                              {bilingualText(lang, cat.ne, cat.en)}
                              <span className={learnPageClasses.catCount}>
                                {t("learn_page.articles_count", { count: topics.length })}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveCategory(cat.id)}
                              className={cn(learnPageClasses.catLink, "hover:underline")}
                            >
                              {t("learn_page.view_category")}
                            </button>
                          </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {topics.map((topic) => (
                            <TopicCard key={topic.slug} topic={topic} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

export default Learn;
