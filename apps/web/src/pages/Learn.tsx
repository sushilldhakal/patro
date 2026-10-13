import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight, Search, X, GraduationCap } from "lucide-react";
import { useLearnHub, type LearnTopicCard } from "@vedic-patro/features/learn";
import type { LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { learnHero, learnStatPill } from "@/lib/learn-classes";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "../components/PageShell";
import { Input } from "@/components/ui/input";
import { cn } from "@vedic-patro/domain/utils";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

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

function LibIcon({ icon, className }: { icon?: LearnIconKey; className?: string }) {
  const Icon = icon ? LEARN_ICONS[icon] : BookOpen;
  return <Icon className={className} />;
}

function TopicCard({ topic, readMore }: { topic: LearnTopicCard; readMore: string }) {
  const ring = SECTION_RING[topic.section];
  const chip = learnPageClasses.sectionChip[topic.section];

  return (
    <Link
      to="/learn/$slug"
      params={{ slug: topic.slug }}
      className={cn(
        learnPageClasses.topicCard,
        "group relative h-full transition-all hover:-translate-y-0.5 hover:border-secondary/45 hover:shadow-md",
        ring && `hover:ring-2 ${ring}`,
      )}
    >
      {/* Icon, title and category read as one line, so the card opens with its identity. */}
      <div className={learnPageClasses.topicHead}>
        <span className={cn(learnPageClasses.topicIcon, "text-secondary transition-colors group-hover:bg-secondary/15")}>
          <LibIcon icon={topic.icon} className="h-5 w-5" />
        </span>
        <div className={learnPageClasses.topicTitleWrap}>
          <h3 className={learnPageClasses.topicTitle}>{topic.title}</h3>
        </div>
        {topic.sectionLabel && chip && (
          <span className={cn(learnPageClasses.topicBadge, learnPageClasses.topicBadgeText, chip)}>{topic.sectionLabel}</span>
        )}
      </div>

      <p className={cn(learnPageClasses.topicSummary, "flex-1")}>{topic.summary}</p>

      <div className={learnPageClasses.topicFooter}>
        <span className={learnPageClasses.topicFooterText}>{readMore}</span>
        <ArrowRight className="h-4 w-4 text-secondary transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Learn hub — the website's drawing of `useLearnHub` (@vedic-patro/features). */
export function Learn() {
  useRouteLoading(false);
  const hub = useLearnHub();
  const { copy } = hub;

  return (
    <PageShell className="space-y-8">
      <section className={learnHero}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className={cn(learnPageClasses.eyebrow, learnPageClasses.eyebrowText, "inline-flex")}>
              <BookOpen className="h-4 w-4" />
              {copy.eyebrow}
            </div>
            <h1 className={learnPageClasses.title}>
              {copy.title}
              <span className={cn(learnPageClasses.titleAccent, "block")}>{copy.titleAccent}</span>
            </h1>
            <p className={learnPageClasses.subtitle}>{copy.subtitle}</p>
            <div className={learnPageClasses.stats}>
              <div className={learnStatPill}>
                <GraduationCap className="h-4 w-4 text-secondary" />
                <span>{copy.pathsStat}</span>
              </div>
              <div className={learnStatPill}>
                <BookOpen className="h-4 w-4 text-secondary" />
                <span>{copy.articlesStat}</span>
              </div>
            </div>
          </div>

          <div className={cn(learnPageClasses.searchWrap, "shrink-0")}>
            <label htmlFor="learn-search" className="sr-only">
              {copy.searchLabel}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" />
              <Input
                id="learn-search"
                value={hub.query}
                onChange={(e) => hub.setQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className={cn(learnPageClasses.searchInput, "pl-11 pr-11")}
              />
              {hub.query && (
                <button
                  type="button"
                  onClick={() => hub.setQuery("")}
                  className={cn(learnPageClasses.searchClear, "absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:bg-muted/40 hover:text-foreground")}
                  aria-label={copy.clearSearch}
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
          {hub.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => hub.setCategory(chip.id)}
              className={cn(
                learnPageClasses.chip,
                learnPageClasses.chipText,
                "inline-flex items-center transition-colors",
                chip.active
                  ? cn(learnPageClasses.chipActive, learnPageClasses.chipActiveText)
                  : cn(learnPageClasses.chipIdle, "hover:border-secondary/40 hover:text-foreground"),
              )}
            >
              {chip.icon ? <LibIcon icon={chip.icon} className="h-3.5 w-3.5" /> : null}
              {chip.label}
              {chip.count ? <span className={learnPageClasses.chipCount}>{chip.count}</span> : null}
            </button>
          ))}
        </div>
        {copy.results && <p className={learnPageClasses.resultsText}>{copy.results}</p>}
      </div>

      {hub.results.length === 0 ? (
        <div className={cn(learnPageClasses.emptyState, "text-center")}>
          <p className={learnPageClasses.emptyTitle}>{copy.empty}</p>
          <p className={learnPageClasses.emptyHint}>{copy.emptyHint}</p>
          <button
            type="button"
            onClick={hub.clearFilters}
            className={cn(learnPageClasses.clearFilters, "inline-flex items-center gap-1 hover:underline")}
          >
            {copy.clearFilters}
          </button>
        </div>
      ) : hub.isFiltering ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hub.results.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {hub.modules.map((module) => (
            <section key={module.id} id={`learn-${module.id}`}>
              <div className={cn(learnPageClasses.moduleHeader, "flex flex-wrap items-end justify-between gap-3")}>
                <div className={learnPageClasses.moduleHeaderRow}>
                  <span className={cn(learnPageClasses.moduleIcon, "text-secondary")}>
                    <LibIcon icon={module.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className={learnPageClasses.moduleTitle}>{module.title}</h2>
                    <p className={learnPageClasses.moduleBlurb}>
                      {module.blurb}
                      {module.more && <span className={learnPageClasses.moduleMore}>{` · ${module.more}`}</span>}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                {module.sections.map((section) => (
                  <div key={section.id}>
                    {module.showSectionHeads && (
                      <div className={learnPageClasses.catHeader}>
                        <div className={cn(learnPageClasses.catTitle, learnPageClasses.catTitleText)}>
                          <LibIcon icon={section.icon} className="h-4 w-4 text-secondary" />
                          {section.label}
                          <span className={learnPageClasses.catCount}>{section.countLabel}</span>
                        </div>
                        <button type="button" onClick={() => hub.setCategory(section.id)} className={cn(learnPageClasses.catLink, "hover:underline")}>
                          {copy.viewCategory}
                        </button>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {section.topics.map((topic) => (
                        <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default Learn;
