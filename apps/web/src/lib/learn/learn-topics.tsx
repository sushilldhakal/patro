import {
  AstronomyBasics,
  SolarSystem,
  CalendarDifferences,
  WhatIsPanchang,
  TithiArticle,
  TithiVriddhiKshaya,
  Nakshatra,
  Yoga,
  Karana,
  Sankranti,
  HoraArticle,
  Eclipses,
  Ayanamsha,
  RituDrift,
} from "./learn-articles";
import { HowWeCalculateArticle } from "@/components/learn/HowWeCalculateStudy";
import { SuryaSiddhantaHistory } from "@/components/learn/SuryaSiddhantaHistory";
import { ArticleBody } from "./article-render";
import { MERGED_BY_SLUG, type MergedPage } from "./merged-pages";
import { useLocale } from "@/i18n/locale";
import { tmChapter, tmChapterNav, tmChapterNavLabel, tmChapterTitle } from "@/lib/learn-classes";
import { DATA_ARTICLES } from "./articles";
import {
  adjacentTopicMetas,
  LEARN_CATEGORIES,
  LEARN_TOPIC_METAS,
  type LearnCategory,
  type LearnTopicMeta,
} from "./learn-topics-meta";

export type { LearnCategory, LearnTopicMeta };
export { LEARN_CATEGORIES, LEARN_TOPIC_METAS };

export function topicsInCategory(categoryId: string): LearnTopic[] {
  return LEARN_TOPICS.filter((t) => t.category === categoryId);
}

export interface LearnTopic extends LearnTopicMeta {
  Content: () => React.ReactNode;
}

/**
 * Article bodies still written as React components.
 *
 * New articles should be data (see `articles/`); these predate that format and
 * keep working unchanged. A slug found here wins over a data article, so a
 * conversion is: add the data file, delete the entry here.
 */
const COMPONENT_CONTENT_BY_SLUG: Record<string, () => React.ReactNode> = {
  "astronomy-basics": AstronomyBasics,
  "solar-system": SolarSystem,
  "calendar-differences": CalendarDifferences,
  "ritu-drift": RituDrift,
  "what-is-panchang": WhatIsPanchang,
  tithi: TithiArticle,
  "tithi-vriddhi-kshaya": TithiVriddhiKshaya,
  nakshatra: Nakshatra,
  yoga: Yoga,
  karana: Karana,
  sankranti: Sankranti,
  hora: HoraArticle,
  eclipses: Eclipses,
  ayanamsha: Ayanamsha,
  "how-we-calculate": HowWeCalculateArticle,
  history: SuryaSiddhantaHistory,
};

/** One former article, however it happens to be written. */
function partBody(slug: string, offset: number): { node: React.ReactNode; sections: number } {
  const component = COMPONENT_CONTENT_BY_SLUG[slug];
  if (component) {
    const C = component;
    return { node: <C />, sections: 0 };
  }
  const data = DATA_ARTICLES[slug];
  if (data) {
    return {
      node: <ArticleBody article={data} sectionOffset={offset} hideSeeAlso />,
      sections: data.sections.length,
    };
  }
  return { node: null, sections: 0 };
}

/**
 * A merged page: several former articles on one scroll, each under a chapter
 * heading with an anchor, preceded by a jump list.
 *
 * Section numbers run continuously across the data-written chapters, which is
 * what stops a long page reading as a pile of separate articles that each
 * restart at ०१. The hand-written chapters carry their own kickers and are
 * left alone — they sit under their chapter heading, which scopes them.
 */
function MergedBody({ page }: { page: MergedPage }) {
  const { lang } = useLocale();
  // Section numbers run continuously across chapters, so each chapter's
  // offset depends on every one before it — threaded through `reduce`
  // rather than an outer counter mutated as the map runs.
  const { chapters } = page.parts.reduce<{
    chapters: { part: MergedPage["parts"][number]; node: React.ReactNode }[];
    offset: number;
  }>(
    (acc, part) => {
      const { node, sections } = partBody(part.slug, acc.offset);
      return {
        chapters: [...acc.chapters, { part, node }],
        offset: acc.offset + sections,
      };
    },
    { chapters: [], offset: 0 },
  );

  return (
    <>
      <nav className={tmChapterNav} aria-label={lang === "en" ? "On this page" : "यस पृष्ठमा"}>
        <span className={tmChapterNavLabel}>
          {lang === "en" ? "On this page" : "यस पृष्ठमा"}
        </span>
        <ol>
          {chapters.map(({ part }, i) => (
            <li key={part.slug}>
              <a href={`#${part.slug}`}>
                <span>{toNepaliIndex(lang, i + 1)}</span>
                {lang === "en" ? part.title.en : part.title.ne}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {chapters.map(({ part, node }) => (
        <section key={part.slug} id={part.slug} className={tmChapter}>
          <h2 className={tmChapterTitle}>{lang === "en" ? part.title.en : part.title.ne}</h2>
          {node}
        </section>
      ))}
    </>
  );
}

const NE_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const toNepaliIndex = (lang: string, n: number) =>
  lang === "en" ? String(n) : String(n).replace(/\d/g, (d) => NE_DIGITS[Number(d)]!);

function contentForSlug(slug: string): () => React.ReactNode {
  const merged = MERGED_BY_SLUG[slug];
  if (merged) return () => <MergedBody page={merged} />;

  const component = COMPONENT_CONTENT_BY_SLUG[slug];
  if (component) return component;

  const data = DATA_ARTICLES[slug];
  if (data) return () => <ArticleBody article={data} />;

  return () => null;
}

export const LEARN_TOPICS: LearnTopic[] = LEARN_TOPIC_METAS.map((meta) => ({
  ...meta,
  Content: contentForSlug(meta.slug),
}));

export const LEARN_TOPICS_BY_SLUG: Record<string, LearnTopic> = Object.fromEntries(
  LEARN_TOPICS.map((t) => [t.slug, t]),
);

export function adjacentTopics(slug: string): {
  prev: LearnTopic | null;
  next: LearnTopic | null;
} {
  const { prev, next } = adjacentTopicMetas(slug);
  return {
    prev: prev ? LEARN_TOPICS_BY_SLUG[prev.slug] ?? null : null,
    next: next ? LEARN_TOPICS_BY_SLUG[next.slug] ?? null : null,
  };
}
