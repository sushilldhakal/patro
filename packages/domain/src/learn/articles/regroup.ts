import type { ArticleData } from "../article-schema";

import { declination } from "./astronomy/declination";
import { howWeCalculate } from "./chapters/how-we-calculate";
import { sayanaNirayanaYear } from "./foundation/sayana-nirayana-year";
import { siderealVsTropical } from "./sun/sidereal-vs-tropical";
import { uttarayanaDakshinayana } from "./sun/uttarayana-dakshinayana";

/**
 * Articles cut into chapters that live on different pages of the course.
 *
 * The course runs nature → calendar → computation, so an article that used to
 * explain a topic end to end now gives its astronomy to one chapter and its
 * calendar use to a later one. Each piece reuses the source's own section
 * objects — text, tables and diagrams travel together, nothing is copied — and
 * every source section lands in exactly one piece (asserted in the domain tests).
 */
export interface ArticleSplit {
  source: ArticleData;
  pieces: { slug: string; sections: number[] }[];
}

export const ARTICLE_SPLITS: ArticleSplit[] = [
  {
    source: sayanaNirayanaYear,
    pieces: [
      /* 3.1 — what the two years are and which one BS keeps. */
      { slug: "sayana-nirayana-year", sections: [0, 1, 2, 4] },
      /* 3.3 — the two zodiacs and the ayanamsha. */
      { slug: "sayana-nirayana-rashi", sections: [3, 5, 7] },
      /* 3.5 — month lengths, perihelion and aphelion. */
      { slug: "month-lengths-apsides", sections: [6] },
      /* 3.5 — festivals, seasons and where BS is heading. */
      { slug: "sayana-nirayana-seasons", sections: [8, 9] },
    ],
  },
  {
    source: siderealVsTropical,
    pieces: [
      /* 3.3 — one sky, two zodiacs. */
      { slug: "sidereal-vs-tropical", sections: [0, 1, 2] },
      /* 3.1 — the twenty-minute gap and how it builds up. */
      { slug: "tropical-year-gap", sections: [3, 4, 5] },
    ],
  },
  {
    source: uttarayanaDakshinayana,
    pieces: [
      /* 2.5 — the astronomy: the Sun's north–south journey. */
      { slug: "uttarayana-dakshinayana", sections: [0, 1] },
      /* 3.5 — the calendar: traditional dates against the real ones. */
      { slug: "uttarayana-in-calendar", sections: [2, 3] },
    ],
  },
  {
    source: declination,
    pieces: [
      /* 2.5 — the Sun's declination through the year. */
      { slug: "declination", sections: [0, 2] },
      /* 2.3 — the two coordinate systems. */
      { slug: "coordinate-systems", sections: [1] },
    ],
  },
  {
    source: howWeCalculate,
    pieces: [
      /* 6.9 — Vedic Patro's own pipeline. */
      { slug: "how-we-calculate", sections: [0, 1, 2, 3, 4, 7] },
      /* 6.8 — planetary transits and eclipses. */
      { slug: "gochar-eclipse-calc", sections: [5, 6] },
    ],
  },
];

export const REGROUPED_ARTICLES: ArticleData[] = ARTICLE_SPLITS.flatMap(({ source, pieces }) =>
  pieces.map(({ slug, sections }) => ({
    slug,
    seeAlso: source.seeAlso,
    sections: sections.map((i) => {
      const section = source.sections[i];
      if (!section) throw new Error(`regroup: ${source.slug} has no section ${i} (for ${slug})`);
      return section;
    }),
  })),
);
