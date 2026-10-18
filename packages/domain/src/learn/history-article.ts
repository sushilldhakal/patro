import { getCurrentBs } from "../calendar/bs-calendar";
import { translateKey } from "../locale";
import { toNepaliDigits } from "../panchanga/panchanga-format";
import { HISTORY_ERA_NOTE, formatBbse } from "./history/era-dates";
import {
  HISTORY_MILESTONES,
  HISTORY_SOURCE,
  SURYA_SIDDHANTA_HISTORY,
} from "./history/surya-siddhanta-history";
import type { ArticleData, Bi } from "./article-schema";

const both = (key: string, vars: Record<string, string> = {}): Bi => {
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (w, k: string) => vars[k] ?? w);
  return { ne: fill(translateKey(key, "ne")), en: fill(translateKey(key, "en")) };
};

/**
 * The Surya Siddhanta history as an article body, for screens that cannot lay
 * out the website's own history page (sticky contents list, accordion). The
 * text is the same shared data; the transcript itself stays Nepali in both
 * languages, as it is the wording of a Nepali documentary.
 *
 * Built on demand rather than at import, because the section copy comes from
 * the catalogue, which an app configures after its modules load.
 */
export function buildHistoryArticle(): ArticleData {
  const year = getCurrentBs().year;
  const sameBoth = (text: string): Bi => ({ ne: text, en: text });
  return {
    slug: "history",
    sections: [
      {
        title: both("learn.study.history.topics"),
        blocks: [
          { kind: "lede", text: both("learn.study.history.lede", { epoch: formatBbse(6778) }) },
          {
            kind: "formula",
            cards: HISTORY_MILESTONES.map((m) => ({
              big: m.year,
              label: sameBoth(m.label),
              desc: sameBoth(""),
            })),
          },
          {
            kind: "note",
            text: {
              ne: `${translateKey("learn.study.history.era_bbse", "ne")} — ${HISTORY_ERA_NOTE.bbse} ${translateKey("learn.study.history.era_bs", "ne")} — ${HISTORY_ERA_NOTE.bs} ${translateKey("learn.study.history.era_bs_today", "ne").replace("{{year}}", toNepaliDigits(year, "ne"))}`,
              en: `${translateKey("learn.study.history.era_bbse", "en")} — ${HISTORY_ERA_NOTE.bbse} ${translateKey("learn.study.history.era_bs", "en")} — ${HISTORY_ERA_NOTE.bs} ${translateKey("learn.study.history.era_bs_today", "en").replace("{{year}}", String(year))}`,
            },
          },
        ],
      },
      ...SURYA_SIDDHANTA_HISTORY.map((section) => ({
        title: sameBoth(section.title),
        eyebrow: section.kicker,
        blocks: section.paragraphs.map((paragraph) => ({ kind: "para" as const, text: sameBoth(paragraph) })),
      })),
      {
        title: sameBoth(HISTORY_SOURCE.title),
        blocks: [
          {
            kind: "para",
            text: {
              ne: `${translateKey("learn.study.history.transcript_lead", "ne")} ${translateKey("learn.study.history.transcript_link", "ne")}${translateKey("learn.study.history.transcript_rest", "ne")} ${HISTORY_SOURCE.url}`,
              en: `${translateKey("learn.study.history.transcript_lead", "en")} ${translateKey("learn.study.history.transcript_link", "en")}${translateKey("learn.study.history.transcript_rest", "en")} ${HISTORY_SOURCE.url}`,
            },
          },
        ],
      },
    ],
  };
}
