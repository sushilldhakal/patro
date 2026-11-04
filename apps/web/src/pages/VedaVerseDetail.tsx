import { Link, useParams, useSearch } from "@tanstack/react-router";
import { isVerseDetailKind, shlokaAnchor, useVerseDetailList } from "@vedic-patro/features/documents";
import { PageShell } from "@/components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import type { VedaVerseDetailSearch } from "@/lib/documents-api";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/**
 * Every mantra with one देवता / ऋषि / छन्द / स्वर — where each link in a verse's details
 * line goes. The website's drawing of `useVerseDetailList` (@vedic-patro/features).
 */
export function VedaVerseDetail() {
  const { kind } = useParams({ strict: false }) as { kind?: string };
  const { value = "", slug } = useSearch({ strict: false }) as VedaVerseDetailSearch;
  const valid = isVerseDetailKind(kind);
  const list = useVerseDetailList(valid ? kind : null, value, slug);
  useRouteLoading(list.status === "loading");

  return (
    <PageShell>
      <header className="mb-6 flex flex-col gap-1">
        <h1 className={documentsClasses.chapterTitle}>{list.copy.heading}</h1>
        {list.status === "ready" ? <p className={documentsClasses.chapterProgress}>{list.copy.count}</p> : null}
      </header>
      {list.status === "ready" && list.rows.length === 0 ? <p className="text-muted-foreground">{list.copy.empty}</p> : null}
      <div className="flex flex-col gap-3">
        {list.rows.map((row) => (
          <Link
            key={row.key}
            to={row.chapter != null ? "/documents/$slug/$chapter" : "/documents/$slug"}
            params={row.chapter != null ? { slug: row.slug, chapter: String(row.chapter) } : { slug: row.slug }}
            hash={shlokaAnchor(row.label)}
            className={cn(documentsClasses.verse, documentsClasses.verseIdle, "block transition-colors hover:border-secondary/60")}
          >
            <span className={cn(documentsClasses.verseBadge, documentsClasses.verseBadgeText)}>{row.reference}</span>
            <p className={cn(documentsClasses.verseText, "whitespace-normal")}>{row.verse.sanskrit}</p>
          </Link>
        ))}
      </div>
      {list.hasMore ? (
        <button
          type="button"
          onClick={list.loadMore}
          disabled={list.loadingMore}
          className={cn(documentsClasses.pagerButton, "mx-auto mt-6 inline-flex transition-colors hover:border-secondary/60 hover:text-secondary")}
        >
          {list.copy.loadMore}
        </button>
      ) : null}
    </PageShell>
  );
}
