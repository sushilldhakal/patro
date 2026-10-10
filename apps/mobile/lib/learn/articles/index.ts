import type { ArticleData } from "@vedic-patro/domain/learn/article-schema";
import { SHARED_ARTICLES } from "@vedic-patro/domain/learn/articles/index";

/**
 * Hand-transcribed chapters — web has these as JSX components
 * (`learn-articles.tsx`, `HowWeCalculateStudy.tsx`, `SuryaSiddhantaHistory.tsx`),
 * not data files, so they cannot be copied. See `transcribed/what-is-panchang.ts`
 * header note.
 */
import { astronomyBasics } from "./transcribed/astronomy-basics";
import { ayanamsha } from "./transcribed/ayanamsha";
import { calendarDifferences } from "./transcribed/calendar-differences";
import { eclipses } from "./transcribed/eclipses";
import { history } from "./transcribed/history";
import { hora } from "./transcribed/hora";
import { howWeCalculate } from "./transcribed/how-we-calculate";
import { karana } from "./transcribed/karana";
import { nakshatra } from "./transcribed/nakshatra";
import { rituDrift } from "./transcribed/ritu-drift";
import { sankranti } from "./transcribed/sankranti";
import { solarSystem } from "./transcribed/solar-system";
import { tithi } from "./transcribed/tithi";
import { tithiVriddhiKshaya } from "./transcribed/tithi-vriddhi-kshaya";
import { whatIsPanchang } from "./transcribed/what-is-panchang";
import { yoga } from "./transcribed/yoga";

/**
 * Every data-driven article body, keyed by slug: the chapters shared with the
 * website, then the app's hand-transcribed ones.
 */
const ALL: ArticleData[] = [
  ...SHARED_ARTICLES,
  /* Hand-transcribed chapters */
  whatIsPanchang,
  calendarDifferences,
  tithi,
  tithiVriddhiKshaya,
  nakshatra,
  yoga,
  karana,
  sankranti,
  hora,
  eclipses,
  ayanamsha,
  rituDrift,
  astronomyBasics,
  solarSystem,
  howWeCalculate,
  history,
];

export const DATA_ARTICLES: Record<string, ArticleData | undefined> = Object.fromEntries(
  ALL.map((article) => [article.slug, article]),
);
