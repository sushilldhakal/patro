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
import { cn } from "@/lib/utils";
import {
  LEARN_CATEGORIES,
  LEARN_TOPICS,
  topicsInCategory,
  type LearnCategory,
  type LearnTopic,
} from "@/lib/learn/learn-topics";
import { LEARN_SECTIONS_BY_ID, plannedInSection } from "@/lib/learn/learn-library";

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
 * Accent colours per library section. Icons come from the library itself, so
 * adding a section there only needs a palette entry here — and falls back to
 * neutral styling if it does not get one.
 */
const SECTION_STYLE: Record<string, { chip: string; ring: string }> = {
  start: {
    chip: "bg-emerald-500/10 text-emerald-900 border-emerald-500/25 dark:text-emerald-200",
    ring: "group-hover:ring-emerald-500/25",
  },
  foundation: {
    chip: "bg-emerald-500/10 text-emerald-900 border-emerald-500/25 dark:text-emerald-200",
    ring: "group-hover:ring-emerald-500/25",
  },
  sun: {
    chip: "bg-amber-500/10 text-amber-900 border-amber-500/25 dark:text-amber-200",
    ring: "group-hover:ring-amber-500/25",
  },
  moon: {
    chip: "bg-sky-500/10 text-sky-800 border-sky-500/25 dark:text-sky-200",
    ring: "group-hover:ring-sky-500/25",
  },
  "five-limbs": {
    chip: "bg-teal-500/10 text-teal-900 border-teal-500/25 dark:text-teal-200",
    ring: "group-hover:ring-teal-500/25",
  },
  "earth-sky": {
    chip: "bg-lime-500/10 text-lime-900 border-lime-500/25 dark:text-lime-200",
    ring: "group-hover:ring-lime-500/25",
  },
  zodiac: {
    chip: "bg-indigo-500/10 text-indigo-900 border-indigo-500/25 dark:text-indigo-200",
    ring: "group-hover:ring-indigo-500/25",
  },
  "vedic-time": {
    chip: "bg-slate-500/10 text-slate-900 border-slate-500/25 dark:text-slate-200",
    ring: "group-hover:ring-slate-500/25",
  },
  panchanga: {
    chip: "bg-teal-500/10 text-teal-900 border-teal-500/25 dark:text-teal-200",
    ring: "group-hover:ring-teal-500/25",
  },
  "bs-construction": {
    chip: "bg-red-500/10 text-red-900 border-red-500/25 dark:text-red-200",
    ring: "group-hover:ring-red-500/25",
  },
  eclipses: {
    chip: "bg-violet-500/10 text-violet-900 border-violet-500/25 dark:text-violet-200",
    ring: "group-hover:ring-violet-500/25",
  },
  calculation: {
    chip: "bg-cyan-500/10 text-cyan-900 border-cyan-500/25 dark:text-cyan-200",
    ring: "group-hover:ring-cyan-500/25",
  },
  comparison: {
    chip: "bg-orange-500/10 text-orange-950 border-orange-500/25 dark:text-orange-200",
    ring: "group-hover:ring-orange-500/25",
  },
  deeper: {
    chip: "bg-rose-500/10 text-rose-900 border-rose-500/25 dark:text-rose-200",
    ring: "group-hover:ring-rose-500/25",
  },
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
  const meta = SECTION_STYLE[topic.category];

  return (
    <LearnTopicLink
      topic={topic}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-secondary/45 hover:shadow-md",
        meta?.ring && `hover:ring-2 ${meta.ring}`,
      )}
    >
      {/* Icon, title and category read as one line, so the card opens with its identity. */}
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary/15">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-foreground">
            {bilingualText(lang, topic.titleNe, topic.titleEn)}
          </h3>
        </div>
        {category && meta && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              meta.chip,
            )}
          >
            {bilingualText(lang, category.ne, category.en)}
          </span>
        )}
      </div>

      <p className="flex-1 px-5 pt-3 text-sm leading-relaxed text-foreground/80">
        {bilingualText(lang, topic.summary, topic.summaryEn)}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border/70 px-5 py-3">
        <span className="text-sm font-semibold text-secondary">{t("learn_page.read_detail")}</span>
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/8 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
              <BookOpen className="h-4 w-4" />
              {t("learn_page.eyebrow")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("learn_page.title")}
              <span className="block text-secondary">{t("learn_page.title_accent")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              {t("learn_page.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
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

          <div className="w-full max-w-md shrink-0">
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
                className="h-12 pl-11 pr-11 text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-muted/40 hover:text-foreground"
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
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              activeCategory === "all"
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-card hover:border-secondary/40 hover:text-foreground",
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
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  activeCategory === cat.id
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border bg-card hover:border-secondary/40 hover:text-foreground",
                )}
              >
                <MetaIcon className="h-3.5 w-3.5" />
                {bilingualText(lang, cat.ne, cat.en)}
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        {isFiltering && (
          <p className="text-base">
            {t("learn_page.results_count", { count: filteredTopics.length })}
          </p>
        )}
      </div>

      {filteredTopics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-base text-base text-foreground">{t("learn_page.no_topics")}</p>
          <p className="mt-1 text-sm">
            {t("learn_page.no_topics_hint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("all");
            }}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
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
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <ModuleIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {bilingualText(lang, module.title.ne, module.title.en)}
                      </h2>
                      <p className="max-w-2xl text-sm">
                        {bilingualText(lang, module.blurb.ne, module.blurb.en)} ·{" "}
                        {t("learn_page.articles_count", { count: moduleTopics.length })}
                        {upcoming > 0 && (
                          <span className="opacity-70">
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
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <CatIcon className="h-4 w-4 text-secondary" />
                              {bilingualText(lang, cat.ne, cat.en)}
                              <span className="font-medium text-muted-foreground">
                                {t("learn_page.articles_count", { count: topics.length })}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveCategory(cat.id)}
                              className="text-sm font-semibold text-secondary hover:underline"
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
