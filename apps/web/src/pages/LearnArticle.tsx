import { Link, Navigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { DayPlaygroundDiagram } from "@/components/learn/DayPlaygroundDiagram";
import { playgroundFor } from "@/lib/learn/playground-config";
import { cn } from "@/lib/utils";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "../components/PageShell";
import { PART_REDIRECTS } from "@/lib/learn/merged-pages";
import {
  LEARN_CATEGORIES,
  LEARN_TOPICS_BY_SLUG,
  adjacentTopics,
} from "@/lib/learn/learn-topics";
import {
  tmHero,
  tmHeroEyebrow,
  tmHeroSub,
  tmHeroTitle,
  tmPageShell,
  tmWrap,
} from "@/lib/learn-classes";

/**
 * Where a retired slug went.
 *
 * Two kinds. `MERGED_SLUGS` are articles absorbed wholesale into another —
 * they land at the top of the page that took them over. `PART_REDIRECTS` is
 * generated from the merged-page map: those slugs became *chapters* of a long
 * page, so they land on their own anchor inside it rather than at the top of
 * something several screens long.
 *
 * Both matter because merging is how this section keeps improving, and every
 * merge orphans a URL that is already in someone's history or a search index.
 */
const MERGED_SLUGS: Record<string, string> = {
  "lunar-eclipse": "geocentric-heliocentric#eclipses",
  "solar-eclipse": "geocentric-heliocentric#eclipses",
  equinoxes: "axial-tilt#equinox-solstice",
  solstices: "axial-tilt#equinox-solstice",
  "sankranti-vs-solstice": "sidereal-vs-tropical#uttarayana-dakshinayana",
  "twelve-rashis": "rashi",
  "solar-vs-lunar-calendar": "bikram-sambat#bs-calendar",
  "sidereal-vs-tropical-year": "sidereal-vs-tropical",
  "tithi-vriddhi": "tithi#tithi-vriddhi-kshaya",
  "tithi-kshaya": "tithi#tithi-vriddhi-kshaya",
  "adhik-maas": "tithi#adhik-kshaya-maas",
  "kshaya-maas": "tithi#adhik-kshaya-maas",
  ...PART_REDIRECTS,
};

/** Split a "page#anchor" target into router params. */
function redirectTarget(to: string): { slug: string; hash?: string } {
  const [slug, hash] = to.split("#");
  return { slug: slug!, hash };
}

export function LearnArticle() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  useRouteLoading(false);
  const { slug } = useParams({ strict: false }) as { slug?: string };

  if (slug && MERGED_SLUGS[slug]) {
    const { slug: to, hash } = redirectTarget(MERGED_SLUGS[slug]!);
    return <Navigate to="/learn/$slug" params={{ slug: to }} hash={hash} replace />;
  }

  const topic = slug ? LEARN_TOPICS_BY_SLUG[slug] : undefined;

  if (!topic) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p>{t("learn_page.topic_not_found")}</p>
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 text-sm text-secondary"
          >
            <ArrowLeft className="size-4" /> {t("learn_page.back_hub")}
          </Link>
        </div>
      </PageShell>
    );
  }

  const playgroundConfig = playgroundFor(topic.slug);
  const category = LEARN_CATEGORIES.find((c) => c.id === topic.category);
  const { prev, next } = adjacentTopics(topic.slug);
  const Content = topic.Content;
  /* A topic with a guided (narrated) tour explains itself through the
     playground and its voiceover — the written prose/diagrams below it
     would just be saying the same thing twice, over video that already
     says it. Topics whose playground has no `guided` track (most of them)
     still need the prose; it is the only explanation they have. */
  const hasGuidedTour = Boolean(playgroundConfig?.guided);

  return (
    <PageShell>
      <Link
        to="/learn"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("learn_page.eyebrow")}
      </Link>

      <article className={cn(tmPageShell, "rounded-2xl border border-border overflow-hidden")}>
        <div className={tmWrap}>
          <header className={tmHero}>
            <div className={tmHeroEyebrow}>
              {category ? bilingualText(lang, category.ne, category.en) : ""}
            </div>
            <h1 className={tmHeroTitle}>{bilingualText(lang, topic.titleNe, topic.titleEn)}</h1>
            <p className={tmHeroSub}>{bilingualText(lang, topic.summary, topic.summaryEn)}</p>
          </header>

          {/* The playground sits above the prose, not buried in it: a topic
              that has one is a topic you can watch, and the reader should meet
              it before the words. Its opening state is the topic's own. */}
          {playgroundConfig ? (
            <DayPlaygroundDiagram
              /* Keyed by slug: moving to another topic remounts the playground
                 on that topic's own opening state, rather than carrying the
                 last one's layers and camera across. */
              key={topic.slug}
              slug={topic.slug}
              config={playgroundConfig}
            />
          ) : null}

          {hasGuidedTour ? null : <Content />}

          <nav className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-between">
            {prev ? (
              <Link
                to="/learn/$slug"
                params={{ slug: prev.slug }}
                className="group flex flex-1 items-center gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-secondary/60"
              >
                <ArrowLeft className="size-4 shrink-0 text-secondary" />
                <span className="min-w-0">
                  <span className="block text-sm uppercase tracking-wide">
                    {t("learn_page.prev")}
                  </span>
                  <span className="block truncate text-sm text-foreground">
                    {bilingualText(lang, prev.titleNe, prev.titleEn)}
                  </span>
                </span>
              </Link>
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
            {next ? (
              <Link
                to="/learn/$slug"
                params={{ slug: next.slug }}
                className="group flex flex-1 items-center justify-end gap-2 rounded-xl border border-border bg-card p-3 text-right transition-colors hover:border-secondary/60"
              >
                <span className="min-w-0">
                  <span className="block text-sm uppercase tracking-wide">
                    {t("learn_page.next")}
                  </span>
                  <span className="block truncate text-sm text-foreground">
                    {bilingualText(lang, next.titleNe, next.titleEn)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-secondary" />
              </Link>
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
          </nav>

          <div className="mt-6 text-center">
            <Link
              to="/learn"
              className="inline-flex items-center gap-1.5 text-sm text-secondary"
            >
              <BookOpen className="size-4" /> {t("learn_page.all_topics")}
            </Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}

export default LearnArticle;
