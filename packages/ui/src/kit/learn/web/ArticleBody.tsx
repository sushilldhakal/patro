import { Fragment, type ReactNode } from "react";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import { tFor } from "@vedic-patro/i18n/runtime";
import { articlePageDigits, useArticlePages } from "../use-article-pages";
import {
  resolveArticle,
  resolveSeeAlso,
  type ResolvedCalc,
  type ResolvedInline,
} from "@vedic-patro/domain/learn/article-model";
import {
  learnRefCaption,
  learnRefHighlightRow,
  learnRefTable,
  learnRefWrap,
  ssPhasesHeading,
  tmCalc,
  tmCalcCase,
  tmCalcCaseTitle,
  tmCases,
  tmCalcEg,
  tmCalcResult,
  tmCalcRule,
  tmCalcWhere,
  tmCardCap,
  tmFcard,
  tmFigure,
  tmFigurePre,
  tmFormula,
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
  tmSectionPaged,
  tmPager,
  tmPagerBtn,
  tmPagerCount,
  tmPagerDot,
  tmPagerDotOn,
  tmPagerDots,
  tmSeeAlso,
  tmSeeAlsoItem,
} from "@vedic-patro/design-tokens/classes/learn-classes";
import type { ArticleBodyProps } from "../contract";
import { learnIcons } from "../icons";
import { drawInline } from "./InlineText";

function Inline({ parts, openArticle }: { parts: ResolvedInline; openArticle: (slug: string) => void }) {
  return drawInline(parts, openArticle);
}

function ArticleAnchor({
  slug,
  className,
  openArticle,
  children,
}: {
  slug: string;
  className?: string;
  openArticle: (slug: string) => void;
  children: ReactNode;
}) {
  return (
    <a
      href={`/learn/${slug}`}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openArticle(slug);
      }}
    >
      {children}
    </a>
  );
}

/**
 * Data-driven Learn article. Section numbers, see-also and inline marks come
 * from `@vedic-patro/domain/learn/article-model`; this file is only the website drawing.
 */
export function ArticleBody({
  article,
  sectionOffset = 0,
  hideSeeAlso = false,
  openArticle,
  renderDiagram,
}: ArticleBodyProps) {
  const { lang } = useLocale();
  const sections = resolveArticle(article, lang, sectionOffset);
  const seeAlso = hideSeeAlso ? [] : resolveSeeAlso(article.seeAlso, lang);
  const paged = Boolean(article.paged) && sections.length > 1;
  const pager = useArticlePages(sections.length, paged);
  const shown = paged ? sections.filter((_, i) => i === pager.index) : sections;
  const showSeeAlso = seeAlso.length > 0 && (!paged || pager.index === sections.length - 1);

  return (
    <>
      {paged ? <div id="learn-article-page" className="scroll-mt-24" /> : null}
      {shown.map((section) => (
        <Box as="section" className={paged ? tmSectionPaged : tmSection} key={section.key}>
          <Box className={tmSecHead}>
            <Text as="span" className={tmSecKicker}>
              {section.kicker}
            </Text>
            <Text as="h3" className={tmSecTitle}>
              {section.title}
            </Text>
            {section.gloss ? (
              <Text as="span" className={tmSecEn}>
                {section.gloss}
              </Text>
            ) : null}
          </Box>
          {section.blocks.map((block, index) => (
            <Fragment key={index}>
              {block.kind === "lede" ? (
                <Text as="p" className={tmLede}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "para" ? (
                <Text as="p" className={tmPara}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "note" ? (
                <Text as="p" className={tmNote}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "keys" ? (
                <Box className={tmKeys}>
                  {block.items.map((item) => (
                    <Box className={tmKey} key={item.key}>
                      <Text as="h4">
                        <Inline parts={item.title} openArticle={openArticle} />
                      </Text>
                      <Text as="p">
                        <Inline parts={item.body} openArticle={openArticle} />
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "formula" ? (
                <Box className={tmFormula}>
                  {block.cards.map((card) => (
                    <Box className={tmFcard} key={card.key}>
                      <Box className="big">
                        {card.big}
                        {card.unit ? (
                          <Text as="span" className="u">
                            {card.unit}
                          </Text>
                        ) : null}
                      </Box>
                      <Box className="lbl">
                        <Inline parts={card.label} openArticle={openArticle} />
                      </Box>
                      <Box className="desc">
                        <Inline parts={card.desc} openArticle={openArticle} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "list" ? (
                <Box as="ul" className={tmList}>
                  {block.items.map((item) => (
                    <Box as="li" className={tmListItem} key={item.key}>
                      <span className={tmListMarker} aria-hidden="true">
                        {item.marker}
                      </span>
                      <Text as="span">
                        <Inline parts={item.text} openArticle={openArticle} />
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "table" ? (
                <div className={learnRefWrap}>
                  <table className={learnRefTable}>
                    {block.caption ? <caption className={learnRefCaption}>{block.caption}</caption> : null}
                    <thead>
                      <tr>
                        {block.headers.map((header) => (
                          <th key={header.key} scope="col">
                            {header.text}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row) => (
                        <tr key={row.key} className={row.highlight ? learnRefHighlightRow : undefined}>
                          {row.cells.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              <Inline parts={cell} openArticle={openArticle} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {block.kind === "figure" ? (
                <Box>
                  <Box className={tmFigure}>
                    <pre className={tmFigurePre}>{block.art}</pre>
                  </Box>
                  {block.caption ? (
                    <Text as="p" className={tmCardCap}>
                      {block.caption}
                    </Text>
                  ) : null}
                </Box>
              ) : null}
              {block.kind === "calc" ? <CalcCard calc={block} openArticle={openArticle} /> : null}
              {block.kind === "cases" ? (
                <Box className={tmCases}>
                  {block.items.map((item, itemIndex) => (
                    <CalcCard key={itemIndex} calc={item} inCases openArticle={openArticle} />
                  ))}
                </Box>
              ) : null}
              {block.kind === "diagram" ? <DiagramBlock block={block} renderDiagram={renderDiagram} /> : null}
            </Fragment>
          ))}
        </Box>
      ))}
      {showSeeAlso ? (
        <Box className={tmSeeAlso}>
          {seeAlso.map((item) => (
            <ArticleAnchor key={item.slug} slug={item.slug} className={tmSeeAlsoItem} openArticle={openArticle}>
              <Text as="span" className="min-w-0 flex-1 truncate" numberOfLines={1}>
                {item.title}
              </Text>
              <Icon
                node={learnIcons.arrowRight}
                size={16}
                tone="secondary"
                className="text-[var(--tm-teal)]"
                webClassName="transition-transform group-hover:translate-x-0.5"
              />
            </ArticleAnchor>
          ))}
        </Box>
      ) : null}
      {paged ? (
        <nav className={tmPager} aria-label={tFor(lang, "learn.pages.position", { n: articlePageDigits(lang, pager.index + 1), total: articlePageDigits(lang, sections.length) })}>
          <button type="button" className={tmPagerBtn} disabled={pager.index === 0} onClick={pager.back}>
            <Icon node={learnIcons.arrowLeft} size={16} tone="secondary" />
            {tFor(lang, "learn.pages.prev")}
          </button>
          <span className={tmPagerCount}>
            {tFor(lang, "learn.pages.position", {
              n: articlePageDigits(lang, pager.index + 1),
              total: articlePageDigits(lang, sections.length),
            })}
          </span>
          <button type="button" className={tmPagerBtn} disabled={pager.index >= sections.length - 1} onClick={pager.forward}>
            {tFor(lang, "learn.pages.next")}
            <Icon node={learnIcons.arrowRight} size={16} tone="secondary" />
          </button>
          <div className={tmPagerDots}>
            {sections.map((section, i) => (
              <button
                key={section.key}
                type="button"
                className={i === pager.index ? `${tmPagerDot} ${tmPagerDotOn}` : tmPagerDot}
                aria-current={i === pager.index ? "page" : undefined}
                aria-label={tFor(lang, "learn.pages.jump", { n: articlePageDigits(lang, i + 1) })}
                onClick={() => pager.go(i)}
              />
            ))}
          </div>
        </nav>
      ) : null}
    </>
  );
}

/** One worked calculation. Inside a `cases` group its caption is the heading; on its own it sits underneath. */
function CalcCard({
  calc,
  inCases = false,
  openArticle,
}: {
  calc: ResolvedCalc;
  inCases?: boolean;
  openArticle: (slug: string) => void;
}) {
  return (
    <Box>
      <Box className={inCases ? tmCalcCase : tmCalc}>
        {inCases && calc.caption ? (
          <Text as="h4" className={tmCalcCaseTitle}>
            {calc.caption}
          </Text>
        ) : null}
        <Box className={tmCalcRule}>
          {calc.rule.map((line, lineIndex) => (
            <Box key={lineIndex}>
              <Inline parts={line} openArticle={openArticle} />
            </Box>
          ))}
        </Box>
        {calc.where ? (
          <dl className={tmCalcWhere}>
            {calc.where.map((row) => (
              <Box key={row.sym}>
                <dt>{row.sym}</dt>
                <dd>
                  <Inline parts={row.text} openArticle={openArticle} />
                </dd>
              </Box>
            ))}
          </dl>
        ) : null}
        {calc.example ? (
          <Box className={tmCalcEg}>
            {calc.example.map((row) => (
              <Box key={row.key}>
                <Text as="span">
                  <Inline parts={row.label} openArticle={openArticle} />
                </Text>
                <Text as="span">{row.value}</Text>
              </Box>
            ))}
          </Box>
        ) : null}
        {calc.result ? (
          <Box className={tmCalcResult}>
            <Inline parts={calc.result} openArticle={openArticle} />
          </Box>
        ) : null}
      </Box>
      {!inCases && calc.caption ? (
        <Text as="p" className={tmCardCap}>
          {calc.caption}
        </Text>
      ) : null}
    </Box>
  );
}

function DiagramBlock({
  block,
  renderDiagram,
}: {
  block: { id: string; heading?: string; caption?: string };
  renderDiagram?: (id: string) => ReactNode;
}) {
  const node = renderDiagram?.(block.id) ?? null;
  if (!node) return null;
  return (
    <Box className="mt-5">
      {block.heading ? (
        <Text as="p" className={ssPhasesHeading}>
          {block.heading}
        </Text>
      ) : null}
      {node}
      {block.caption ? (
        <Text as="p" className={tmCardCap}>
          {block.caption}
        </Text>
      ) : null}
    </Box>
  );
}
