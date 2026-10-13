import { Link, Navigate, useParams } from "@tanstack/react-router";
import { useLearnArticle } from "@vedic-patro/features/learn";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { DayPlaygroundDiagram } from "@/components/learn/DayPlaygroundDiagram";
import { cn } from "@vedic-patro/domain/utils";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "../components/PageShell";
import { LEARN_TOPICS_BY_SLUG } from "@/lib/learn/learn-topics";
import {
  tmHero,
  tmHeroEyebrow,
  tmHeroSub,
  tmHeroTitle,
  tmPageShell,
  tmWrap,
} from "@/lib/learn-classes";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

/** Learn article — the website's drawing of `useLearnArticle` (@vedic-patro/features). */
export function LearnArticle() {
  useRouteLoading(false);
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const article = useLearnArticle(slug);
  const { copy, topic, prev, next } = article;

  if (article.redirect) {
    return <Navigate to="/learn/$slug" params={{ slug: article.redirect.slug }} hash={article.redirect.anchor} replace />;
  }

  if (!topic) {
    return (
      <PageShell>
        <div className={cn(learnPageClasses.notFound, "text-center")}>
          <p>{copy.notFound}</p>
          <Link to="/learn" className={cn(learnPageClasses.inlineLink, "inline-flex")}>
            <ArrowLeft className="size-4" /> {copy.backHub}
          </Link>
        </div>
      </PageShell>
    );
  }

  const Content = LEARN_TOPICS_BY_SLUG[topic.slug]?.Content;

  return (
    <PageShell>
      <Link to="/learn" className={cn(learnPageClasses.backLink, "inline-flex transition-colors hover:text-foreground")}>
        <ArrowLeft className="size-4" /> {copy.backToHub}
      </Link>

      <article className={cn(tmPageShell, learnPageClasses.articleCard)}>
        <div className={tmWrap}>
          <header className={tmHero}>
            <div className={tmHeroEyebrow}>{topic.sectionLabel}</div>
            <h1 className={tmHeroTitle}>{topic.title}</h1>
            <p className={tmHeroSub}>{topic.summary}</p>
          </header>

          {/* The playground sits above the prose: a topic you can watch should
              be met before the words. Keyed by slug so another topic remounts
              it on its own opening state. */}
          {article.playground ? <DayPlaygroundDiagram key={topic.slug} slug={topic.slug} config={article.playground} /> : null}

          {article.hasGuidedTour || !Content ? null : <Content />}

          <nav className={cn(learnPageClasses.navRow, "mt-12")}>
            {prev ? (
              <Link
                to="/learn/$slug"
                params={{ slug: prev.slug }}
                className={cn(learnPageClasses.navCard, "group flex-1 text-left transition-colors hover:border-secondary/60")}
              >
                <ArrowLeft className="size-4 shrink-0 text-secondary" />
                <span className="min-w-0">
                  <span className={cn(learnPageClasses.navKicker, "block")}>{copy.prev}</span>
                  <span className={cn(learnPageClasses.navTitle, "block truncate")}>{prev.title}</span>
                </span>
              </Link>
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
            {next ? (
              <Link
                to="/learn/$slug"
                params={{ slug: next.slug }}
                className={cn(learnPageClasses.navCard, "group flex-1 justify-end text-right transition-colors hover:border-secondary/60")}
              >
                <span className="min-w-0">
                  <span className={cn(learnPageClasses.navKicker, "block")}>{copy.next}</span>
                  <span className={cn(learnPageClasses.navTitle, "block truncate")}>{next.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-secondary" />
              </Link>
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
          </nav>

          <div className="mt-6 text-center">
            <Link to="/learn" className={cn(learnPageClasses.inlineLink, "inline-flex")}>
              <BookOpen className="size-4" /> {copy.allTopics}
            </Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}

export default LearnArticle;
