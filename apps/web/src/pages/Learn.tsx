import { useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronRight, GraduationCap, Search, X } from "lucide-react";
import { useLearnHub, type LearnHubModule, type LearnTopicCard as LearnTopic } from "@vedic-patro/features/learn";
import type { LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { learnHero, learnStatPill } from "@/lib/learn-classes";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "../components/PageShell";
import { Input } from "@/components/ui/input";
import { cn } from "@vedic-patro/design-tokens/cn";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { LearnTopicCard } from "@vedic-patro/ui/kit/learn";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

function LibIcon({ icon, className }: { icon?: LearnIconKey; className?: string }) {
  const Icon = icon ? LEARN_ICONS[icon] : BookOpen;
  return <Icon className={className} />;
}

function TopicCard({ topic, readMore }: { topic: LearnTopic; readMore: string }) {
  const navigate = useNavigate();
  return (
    <LearnTopicCard
      topic={topic}
      readMore={readMore}
      icon={<LibIcon icon={topic.icon} className="h-5 w-5" />}
      href={`/learn/${topic.slug}`}
      onOpen={() => navigate({ to: "/learn/$slug", params: { slug: topic.slug } })}
    />
  );
}

const pathAnchor = (id: string) => `learn-${id}`;

/** The hero's course map: every learning path in order, each a jump to its section. */
function PathMap({ heading, paths, onJump }: { heading: string; paths: LearnHubModule[]; onJump: (id: string) => void }) {
  return (
    <nav aria-label={heading} className={learnPageClasses.pathMap}>
      <p className={learnPageClasses.pathMapHead}>
        <GraduationCap className="h-4 w-4 text-secondary" />
        {heading}
      </p>
      <ol className={learnPageClasses.pathList}>
        {paths.map((path) => (
          <li key={path.id}>
            <a
              href={`#${pathAnchor(path.id)}`}
              onClick={(event) => {
                event.preventDefault();
                onJump(path.id);
              }}
              className={cn(learnPageClasses.pathItem, "group transition-colors hover:bg-secondary/8")}
            >
              <span className={cn(learnPageClasses.pathNum, "transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground")}>
                {path.indexLabel}
              </span>
              <span className="min-w-0 flex-1">
                <span className={learnPageClasses.pathTitle}>{path.title}</span>
                <span className={learnPageClasses.pathCount}>{path.countLabel}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Learn hub — the website's drawing of `useLearnHub` (@vedic-patro/features).
 *
 * The hero pairs the title and search with a numbered map of the learning
 * paths; below it a filter strip (one scrolling row on a phone), then each
 * path under its number with its sections and article cards.
 */
export function Learn() {
  useRouteLoading(false);
  const hub = useLearnHub();
  const { copy } = hub;

  /* A path's section is only drawn while nothing is filtered, so a jump made
     during a search clears it first and scrolls once the paths are back. */
  const jumpToPath = (id: string) => {
    if (hub.isFiltering) hub.clearFilters();
    requestAnimationFrame(() => document.getElementById(pathAnchor(id))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <PageShell className="space-y-8">
      <section className={learnHero}>
        <div className={learnPageClasses.heroGrid}>
          <div className="min-w-0">
            <div className={cn(learnPageClasses.eyebrow, learnPageClasses.eyebrowText, "inline-flex")}>
              <BookOpen className="h-4 w-4" />
              {copy.eyebrow}
            </div>
            <h1 className={cn(learnPageClasses.title, "leading-tight")}>
              {copy.title}
              <span className={cn(learnPageClasses.titleAccent, "block")}>{copy.titleAccent}</span>
            </h1>
            <p className={learnPageClasses.subtitle}>{copy.subtitle}</p>

            <div className={cn(learnPageClasses.searchWrap, "mt-6 max-w-lg")}>
              <label htmlFor="learn-search" className="sr-only">
                {copy.searchLabel}
              </label>
              <div className="relative">
                <Search className={learnPageClasses.searchIcon} />
                <Input
                  id="learn-search"
                  value={hub.query}
                  onChange={(e) => hub.setQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className={cn(learnPageClasses.searchInput, "rounded-xl bg-card pl-11 pr-11")}
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

            <div className={learnPageClasses.stats}>
              <div className={learnStatPill}>
                <BookOpen className="h-4 w-4 text-secondary" />
                <span>{copy.articlesStat}</span>
              </div>
            </div>
          </div>

          <PathMap heading={copy.pathsStat} paths={hub.paths} onJump={jumpToPath} />
        </div>
      </section>

      <div className={learnPageClasses.filterBar}>
        <div className={learnPageClasses.chipStrip}>
          {hub.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={chip.active}
              onClick={() => hub.setCategory(chip.id)}
              className={cn(
                learnPageClasses.chip,
                learnPageClasses.chipText,
                "inline-flex shrink-0 items-center whitespace-nowrap transition-colors",
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
        {copy.results && (
          <p className={learnPageClasses.resultsPill} aria-live="polite">
            {copy.results}
          </p>
        )}
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
        <div className={learnPageClasses.topicGrid}>
          {hub.results.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} />
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {hub.modules.map((module) => (
            <section key={module.id} id={pathAnchor(module.id)} className="scroll-mt-24" aria-labelledby={`${pathAnchor(module.id)}-title`}>
              <header className={learnPageClasses.moduleHead}>
                <span className={learnPageClasses.moduleNum} aria-hidden>
                  {module.indexLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`${pathAnchor(module.id)}-title`} className={learnPageClasses.moduleTitle}>
                    {module.title}
                  </h2>
                  <p className={learnPageClasses.moduleBlurb}>
                    {module.blurb}
                    {module.more && <span className={learnPageClasses.moduleMore}>{` · ${module.more}`}</span>}
                  </p>
                </div>
                <span className={learnPageClasses.moduleCount}>
                  <LibIcon icon={module.icon} className="h-3.5 w-3.5 text-secondary" />
                  {module.countLabel}
                </span>
              </header>
              <div className="space-y-8">
                {module.sections.map((section) => (
                  <div key={section.id}>
                    {module.showSectionHeads && (
                      <div className={learnPageClasses.catHead}>
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
                    <div className={learnPageClasses.topicGrid}>
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
