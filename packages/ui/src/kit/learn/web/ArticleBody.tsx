import { Fragment, type ReactNode } from "react";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import { resolveArticle, resolveSeeAlso, type ResolvedInline } from "@vedic-patro/domain/learn/article-model";
import {
  learnRefCaption,
  learnRefHighlightRow,
  learnRefTable,
  learnRefWrap,
  ssPhasesHeading,
  tmCalc,
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

  return (
    <>
      {sections.map((section) => (
        <Box as="section" className={tmSection} key={section.key}>
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
              {block.kind === "calc" ? (
                <Box>
                  <Box className={tmCalc}>
                    <Box className={tmCalcRule}>
                      {block.rule.map((line, lineIndex) => (
                        <Box key={lineIndex}>
                          <Inline parts={line} openArticle={openArticle} />
                        </Box>
                      ))}
                    </Box>
                    {block.where ? (
                      <dl className={tmCalcWhere}>
                        {block.where.map((row) => (
                          <Box key={row.sym}>
                            <dt>{row.sym}</dt>
                            <dd>
                              <Inline parts={row.text} openArticle={openArticle} />
                            </dd>
                          </Box>
                        ))}
                      </dl>
                    ) : null}
                    {block.example ? (
                      <Box className={tmCalcEg}>
                        {block.example.map((row) => (
                          <Box key={row.key}>
                            <Text as="span">
                              <Inline parts={row.label} openArticle={openArticle} />
                            </Text>
                            <Text as="span">{row.value}</Text>
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                    {block.result ? (
                      <Box className={tmCalcResult}>
                        <Inline parts={block.result} openArticle={openArticle} />
                      </Box>
                    ) : null}
                  </Box>
                  {block.caption ? (
                    <Text as="p" className={tmCardCap}>
                      {block.caption}
                    </Text>
                  ) : null}
                </Box>
              ) : null}
              {block.kind === "diagram" ? <DiagramBlock block={block} renderDiagram={renderDiagram} /> : null}
            </Fragment>
          ))}
        </Box>
      ))}
      {seeAlso.length > 0 ? (
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
    </>
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
