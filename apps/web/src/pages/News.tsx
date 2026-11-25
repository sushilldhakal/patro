import { ExternalLink, Newspaper } from "lucide-react";
import { useNewsPage, type NewsCardView } from "@vedic-patro/features/news";
import { cn } from "@vedic-patro/design-tokens/cn";
import { newsClasses as nc } from "@vedic-patro/design-tokens/classes/news-classes";
import { PageHeader, PageShell } from "@/components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";

/** One story: category and time, headline, the outlet's summary, and a link per outlet. */
function StoryCard({ story, top, sourceLabel }: { story: NewsCardView; top?: boolean; sourceLabel: string }) {
  return (
    <article lang={story.language} className={cn("flex flex-col", nc.card, top && nc.cardTop)}>
      <div className={cn("flex", nc.meta)}>
        <span className={nc.metaCategory}>{story.category}</span>
        <span className={nc.metaText}>· {story.ago}</span>
        {story.sourcesCount ? <span className={nc.metaText}>· {story.sourcesCount}</span> : null}
      </div>
      <h3 className={cn("m-0", top ? nc.titleTop : nc.title)}>
        <a href={story.sources[0]?.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {story.title}
        </a>
      </h3>
      {story.summary ? <p className={cn("m-0 line-clamp-3", nc.summary)}>{story.summary}</p> : null}
      <div className={cn("flex", nc.sources)}>
        <span className={nc.sourcesLabel}>{sourceLabel}:</span>
        {story.sources.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className={cn("inline-flex hover:bg-muted/70 transition-colors", nc.sourceChip, nc.sourceLabel)}
          >
            {s.name}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ))}
      </div>
    </article>
  );
}

/**
 * News — the website's drawing of `useNewsPage` (@vedic-patro/features): publisher
 * headlines grouped by story; each source opens the outlet's article in a new tab.
 */
export function News() {
  const page = useNewsPage();
  const { copy } = page;
  useRouteLoading(page.status === "loading");

  return (
    <PageShell>
      <PageHeader icon={<Newspaper className="w-6 h-6 text-secondary" />} title={copy.title} subtitle={copy.subtitle} />

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={copy.language} className={cn("flex w-fit", nc.toggle)}>
          {page.languages.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={l.active}
              onClick={() => page.setLanguage(l.id)}
              className={cn(
                "flex transition-colors",
                nc.toggleButton,
                nc.toggleLabel,
                l.active ? cn(nc.toggleButtonActive, nc.toggleLabelActive) : cn(nc.toggleLabelIdle, "hover:bg-muted"),
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("flex flex-wrap", nc.chips)}>
        {page.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.active}
            onClick={() => page.setCategory(c.id)}
            className={cn(
              "transition-colors",
              nc.chip,
              nc.chipLabel,
              c.active ? cn(nc.chipActive, nc.chipLabelActive) : cn(nc.chipLabelIdle, "hover:bg-muted"),
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {page.status === "error" ? (
        <div className={cn("flex flex-col", nc.stateBox)}>
          <p className={cn("m-0", nc.stateText)}>{copy.loadError}</p>
          <button type="button" onClick={() => void page.refresh()} className={cn("flex", nc.moreButton, nc.moreLabel)}>
            {copy.retry}
          </button>
        </div>
      ) : page.status === "loading" ? (
        <p className={nc.stateText}>{copy.loading}</p>
      ) : (
        <>
          {page.topStories.length > 0 ? (
            <section className="space-y-3">
              <h2 className={cn("m-0", nc.sectionTitle)}>{copy.topStories}</h2>
              <div className={cn("grid md:grid-cols-2", nc.list)}>
                {page.topStories.map((s) => (
                  <StoryCard key={s.id} story={s} top sourceLabel={copy.source} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className={cn("m-0", nc.sectionTitle)}>{copy.latest}</h2>
            {page.latest.length === 0 && page.topStories.length === 0 ? (
              <p className={nc.stateText}>{copy.empty}</p>
            ) : (
              <div className={cn("flex flex-col", nc.list)}>
                {page.latest.map((s) => (
                  <StoryCard key={s.id} story={s} sourceLabel={copy.source} />
                ))}
              </div>
            )}
            {page.hasMore ? (
              <button
                type="button"
                disabled={page.loadingMore}
                onClick={page.loadMore}
                className={cn("flex hover:bg-muted transition-colors disabled:opacity-60", nc.moreButton, nc.moreLabel)}
              >
                {page.loadingMore ? copy.loading : copy.loadMore}
              </button>
            ) : null}
          </section>

          <p className={nc.note}>{copy.note}</p>
        </>
      )}
    </PageShell>
  );
}
