/**
 * Renderer for data-driven Learn articles.
 *
 * Owns every piece of markup an article can produce, so article files stay
 * pure data. Markup and classes match the hand-built articles in
 * `learn-articles.tsx` — the two render identically inside the same shell.
 */

import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useLocale, type Lang } from "@/i18n/locale";
import {
  learnRefCaption,
  learnRefTable,
  learnRefWrap,
  tmCardCap,
  tmFcard,
  tmFigure,
  tmCalc,
  tmCalcEg,
  tmCalcResult,
  tmCalcRule,
  tmCalcWhere,
  tmFigurePre,
  tmFormula,
  tmInkAmber,
  tmInkNum,
  tmInkStrong,
  tmInkTeal,
  tmKey,
  tmKeys,
  tmLede,
  tmList,
  tmListItem,
  tmListMarker,
  tmNote,
  tmPara,
  tmSecEn,
  tmSecHead,
  tmSecKicker,
  tmSecTitle,
  tmSection,
  tmSeeAlso,
  tmSeeAlsoItem,
} from "@/lib/learn-classes";
import { LEARN_DIAGRAMS } from "./learn-diagrams";
import { LEARN_LIBRARY_BY_SLUG } from "./learn-library";
import {
  sectionKicker,
  type ArticleData,
  type Bi,
  type Block,
  type Cell,
} from "./article-schema";

function pick(lang: Lang, value: Bi): string {
  return lang === "en" ? value.en || value.ne : value.ne || value.en;
}

function cellText(lang: Lang, cell: Cell): string {
  return typeof cell === "string" ? cell : pick(lang, cell);
}

const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * Section gloss. English-only strings stay in English UI and drop out of
 * Nepali. Mixed "नेपाली · English" labels keep only the Devanagari side.
 */
function eyebrowLabel(lang: Lang, eyebrow: Bi | string | undefined): string | null {
  if (!eyebrow) return null;
  if (typeof eyebrow !== "string") {
    const text = pick(lang, eyebrow).trim();
    return text || null;
  }
  if (lang === "en") return eyebrow;
  if (!DEVANAGARI.test(eyebrow)) return null;
  if (!eyebrow.includes(" · ")) return eyebrow;
  return eyebrow.split(" · ").map((part) => part.trim()).find((part) => DEVANAGARI.test(part)) ?? eyebrow;
}

/* ------------------------------------------------------------------ */
/* Inline markup                                                       */
/* ------------------------------------------------------------------ */

/**
 * `**strong**`, `*teal*`, `~amber~` and `` `numeric` `` → styled spans.
 *
 * Ordered so `**` is consumed before the single-asterisk rule. Unmatched
 * markers are left as literal text rather than swallowed, which keeps a
 * typo in one article from eating the rest of its paragraph.
 */
const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|~([^~]+)~|`([^`]+)`/g;

function richText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const at = match.index;
    if (at > last) parts.push(text.slice(last, at));

    const [, strong, teal, amber, num] = match;
    if (strong !== undefined) {
      parts.push(
        <b key={key++} className={tmInkStrong}>
          {strong}
        </b>,
      );
    } else if (teal !== undefined) {
      parts.push(
        <span key={key++} className={tmInkTeal}>
          {teal}
        </span>,
      );
    } else if (amber !== undefined) {
      parts.push(
        <span key={key++} className={tmInkAmber}>
          {amber}
        </span>,
      );
    } else if (num !== undefined) {
      parts.push(
        <span key={key++} className={tmInkNum}>
          {num}
        </span>,
      );
    }
    last = at + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function BlockView({ block, lang }: { block: Block; lang: Lang }) {
  switch (block.kind) {
    case "lede":
      return <p className={tmLede}>{richText(pick(lang, block.text))}</p>;

    case "para":
      return <p className={tmPara}>{richText(pick(lang, block.text))}</p>;

    case "note":
      return <p className={tmNote}>{richText(pick(lang, block.text))}</p>;

    case "keys":
      return (
        <div className={tmKeys}>
          {block.items.map((item) => (
            <div className={tmKey} key={item.h.en || item.h.ne}>
              <h4>{richText(pick(lang, item.h))}</h4>
              <p>{richText(pick(lang, item.p))}</p>
            </div>
          ))}
        </div>
      );

    case "formula":
      return (
        <div className={tmFormula}>
          {block.cards.map((card) => (
            <div className={tmFcard} key={card.label.en || card.label.ne}>
              <div className="big">
                {cellText(lang, card.big)}
                {card.unit && <span className="u"> {pick(lang, card.unit)}</span>}
              </div>
              <div className="lbl">{richText(pick(lang, card.label))}</div>
              <div className="desc">{richText(pick(lang, card.desc))}</div>
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <ul className={tmList}>
          {block.items.map((item, i) => (
            <li className={tmListItem} key={item.en || item.ne}>
              <span className={tmListMarker} aria-hidden="true">
                {block.ordered ? `${i + 1}.` : "·"}
              </span>
              <span>{richText(pick(lang, item))}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className={learnRefWrap}>
          <table className={learnRefTable}>
            {block.caption && (
              <caption className={learnRefCaption}>{pick(lang, block.caption)}</caption>
            )}
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h.en || h.ne} scope="col">
                    {pick(lang, h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{richText(cellText(lang, cell))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "figure":
      return (
        <div>
          <div className={tmFigure}>
            <pre className={tmFigurePre}>{block.art}</pre>
          </div>
          {block.caption && <p className={tmCardCap}>{pick(lang, block.caption)}</p>}
        </div>
      );

    case "calc":
      return (
        <div>
          <div className={tmCalc}>
            <div className={tmCalcRule}>
              {block.rule.map((line) => (
                <div key={line.en || line.ne}>{richText(pick(lang, line))}</div>
              ))}
            </div>
            {block.where && (
              <dl className={tmCalcWhere}>
                {block.where.map((w) => (
                  <div key={w.sym}>
                    <dt>{w.sym}</dt>
                    <dd>{richText(pick(lang, w.is))}</dd>
                  </div>
                ))}
              </dl>
            )}
            {block.example && (
              <div className={tmCalcEg}>
                {block.example.map((row) => (
                  <div key={row.k.en || row.k.ne}>
                    <span>{richText(pick(lang, row.k))}</span>
                    <span>{cellText(lang, row.v)}</span>
                  </div>
                ))}
              </div>
            )}
            {block.result && <div className={tmCalcResult}>{richText(pick(lang, block.result))}</div>}
          </div>
          {block.caption && <p className={tmCardCap}>{pick(lang, block.caption)}</p>}
        </div>
      );

    case "diagram": {
      const Diagram = LEARN_DIAGRAMS[block.id];
      if (!Diagram) return null;
      return (
        <div className="mt-5">
          <Diagram />
          {block.caption && <p className={tmCardCap}>{pick(lang, block.caption)}</p>}
        </div>
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Article                                                             */
/* ------------------------------------------------------------------ */

function SeeAlso({ slugs, lang }: { slugs: string[]; lang: Lang }) {
  const topics = slugs
    .map((slug) => LEARN_LIBRARY_BY_SLUG[slug])
    .filter((topic) => topic?.status === "published");

  if (topics.length === 0) return null;

  return (
    <div className={tmSeeAlso}>
      {topics.map((topic) => (
        <Link
          key={topic!.slug}
          to="/learn/$slug"
          params={{ slug: topic!.slug }}
          className={tmSeeAlsoItem}
        >
          <span className="min-w-0 flex-1 truncate">{pick(lang, topic!.title)}</span>
          <ArrowRight className="size-4 shrink-0 text-[var(--tm-teal)] transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

/**
 * `sectionOffset` lets several articles run as one continuous page with their
 * section numbers carrying on rather than restarting at ०१ — which is what a
 * merged chapter needs. `hideSeeAlso` suppresses the per-article footer for
 * the same reason: a merged page carries one at the very bottom, not one after
 * every chapter.
 */
export function ArticleBody({
  article,
  sectionOffset = 0,
  hideSeeAlso = false,
}: {
  article: ArticleData;
  sectionOffset?: number;
  hideSeeAlso?: boolean;
}) {
  const { lang } = useLocale();

  return (
    <>
      {article.sections.map((section, index) => {
        const kicker = sectionKicker(index + sectionOffset);
        const gloss = eyebrowLabel(lang, section.eyebrow);
        return (
          <section className={tmSection} key={section.title.en || section.title.ne}>
            <div className={tmSecHead}>
              <span className={tmSecKicker}>{pick(lang, kicker)}</span>
              <h3 className={tmSecTitle}>{pick(lang, section.title)}</h3>
              {gloss ? <span className={tmSecEn}>{gloss}</span> : null}
            </div>
            {section.blocks.map((block, bi) => (
              <Fragment key={bi}>
                <BlockView block={block} lang={lang} />
              </Fragment>
            ))}
          </section>
        );
      })}
      {article.seeAlso && !hideSeeAlso && <SeeAlso slugs={article.seeAlso} lang={lang} />}
    </>
  );
}
