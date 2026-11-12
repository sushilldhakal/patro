import { Fragment, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { useLocale } from "@vedic-patro/i18n/react";
import { tFor } from "@vedic-patro/i18n/runtime";
import { cn } from "@vedic-patro/design-tokens/cn";
import { articlePageDigits, useArticlePages } from "../use-article-pages";
import {
  resolveArticle,
  resolveSeeAlso,
  type ResolvedCalc,
  type ResolvedInline,
} from "@vedic-patro/domain/learn/article-model";
import { articleClasses as cls } from "@vedic-patro/design-tokens/classes/learn/article-classes";
import type { ArticleBodyProps } from "../contract";
import { learnIcons } from "../icons";
import { drawInline } from "./InlineText";

function Inline({ parts, openArticle }: { parts: ResolvedInline; openArticle: (slug: string) => void }) {
  return drawInline(parts, openArticle);
}

/**
 * Data-driven Learn article. The same resolved blocks as the website
 * (`@vedic-patro/domain/learn/article-model`); this file is only the app drawing.
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
      {shown.map((section) => (
        <Box className={paged ? cls.sectionPaged : cls.section} key={section.key}>
          <Box className={cls.secHead}>
            <Text className={cls.kicker}>{section.kicker}</Text>
            <Text as="h3" className={cls.title}>
              {section.title}
            </Text>
            {section.gloss ? <Text className={cls.gloss}>{section.gloss}</Text> : null}
          </Box>
          {section.blocks.map((block, index) => (
            <Fragment key={index}>
              {block.kind === "lede" ? (
                <Text className={cls.lede}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "para" ? (
                <Text className={cls.para}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "note" ? (
                <Text className={cls.note}>
                  <Inline parts={block.text} openArticle={openArticle} />
                </Text>
              ) : null}
              {block.kind === "keys" ? (
                <Box className={cls.keys}>
                  {block.items.map((item) => (
                    <Box className={cls.key} key={item.key} nativeClassName="border-l-4 border-l-[var(--brand-saffron-bright)]">
                      <Text className={cls.keyTitle}>
                        <Inline parts={item.title} openArticle={openArticle} />
                      </Text>
                      <Text className={cls.keyBody}>
                        <Inline parts={item.body} openArticle={openArticle} />
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "formula" ? (
                <Box className={cls.formula}>
                  {block.cards.map((card) => (
                    <Box className={cls.fcard} key={card.key}>
                      <Text className={cls.fBig}>
                        {card.big}
                        {card.unit ? <Text className={cls.fUnit}>{card.unit}</Text> : null}
                      </Text>
                      <Text className={cls.fLabel}>
                        <Inline parts={card.label} openArticle={openArticle} />
                      </Text>
                      <Text className={cls.fDesc}>
                        <Inline parts={card.desc} openArticle={openArticle} />
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "list" ? (
                <Box className={cls.list}>
                  {block.items.map((item) => (
                    <Box className={cls.listItem} key={item.key}>
                      <Text className={cls.marker}>{item.marker}</Text>
                      <Text className={cls.listText}>
                        <Inline parts={item.text} openArticle={openArticle} />
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
              {block.kind === "table" ? (
                <Box className={cls.tableWrap}>
                  {block.caption ? <Text className={cls.tableCaption}>{block.caption}</Text> : null}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box className={cls.table}>
                      <Box className={cls.headRow}>
                        {block.headers.map((header) => (
                          <Box className={cls.headCell} key={header.key}>
                            <Text className={cls.headText}>{header.text}</Text>
                          </Box>
                        ))}
                      </Box>
                      {block.rows.map((row) => (
                        <Box key={row.key} className={cn(cls.row, row.highlight && cls.highlightRow)}>
                          {row.cells.map((cell, cellIndex) => (
                            <Box className={cls.cell} key={cellIndex}>
                              <Text className={cls.cellText}>
                                <Inline parts={cell} openArticle={openArticle} />
                              </Text>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </ScrollView>
                </Box>
              ) : null}
              {block.kind === "figure" ? (
                <Box>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box className={cls.figure}>
                      <Text className={cls.figurePre}>{block.art}</Text>
                    </Box>
                  </ScrollView>
                  {block.caption ? <Text className={cls.caption}>{block.caption}</Text> : null}
                </Box>
              ) : null}
              {block.kind === "calc" ? <CalcCard calc={block} openArticle={openArticle} /> : null}
              {block.kind === "cases" ? (
                <Box className={cls.cases}>
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
        <Box className={cls.seeAlso}>
          {seeAlso.map((item) => (
            <Pressable key={item.slug} className={cls.seeAlsoItem} onPress={() => openArticle(item.slug)}>
              <Text className={cls.seeAlsoLabel} numberOfLines={1}>
                {item.title}
              </Text>
              <Icon node={learnIcons.arrowRight} size={16} tone="secondary" />
            </Pressable>
          ))}
        </Box>
      ) : null}
      {paged ? (
        <Box className={cls.pager}>
          <Pressable
            className={cn(cls.pagerBtn, pager.index === 0 && cls.pagerBtnOff)}
            disabled={pager.index === 0}
            label={tFor(lang, "learn.pages.prev")}
            onPress={pager.back}
          >
            <Icon node={learnIcons.arrowLeft} size={16} tone="secondary" />
            <Text className={cls.pagerBtnText}>{tFor(lang, "learn.pages.prev")}</Text>
          </Pressable>
          <Text className={cls.pagerCount}>
            {tFor(lang, "learn.pages.position", {
              n: articlePageDigits(lang, pager.index + 1),
              total: articlePageDigits(lang, sections.length),
            })}
          </Text>
          <Pressable
            className={cn(cls.pagerBtn, pager.index >= sections.length - 1 && cls.pagerBtnOff)}
            disabled={pager.index >= sections.length - 1}
            label={tFor(lang, "learn.pages.next")}
            onPress={pager.forward}
          >
            <Text className={cls.pagerBtnText}>{tFor(lang, "learn.pages.next")}</Text>
            <Icon node={learnIcons.arrowRight} size={16} tone="secondary" />
          </Pressable>
          <Box className={cls.dots}>
            {sections.map((section, i) => (
              <Pressable
                key={section.key}
                className={i === pager.index ? cls.dotOn : cls.dot}
                label={tFor(lang, "learn.pages.jump", { n: articlePageDigits(lang, i + 1) })}
                selected={i === pager.index}
                onPress={() => pager.go(i)}
              />
            ))}
          </Box>
        </Box>
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
    <Box className={inCases ? cls.calcCase : undefined}>
      <Box
        className={inCases ? undefined : cls.calc}
        nativeClassName={inCases ? undefined : "border-l-4 border-l-[var(--brand-saffron-bright)]"}
      >
        {inCases && calc.caption ? <Text className={cls.calcCaseTitle}>{calc.caption}</Text> : null}
        <Box>
          {calc.rule.map((line, lineIndex) => (
            <Text key={lineIndex} className={cn(cls.calcRule, lineIndex > 0 && cls.calcRuleLine)}>
              <Inline parts={line} openArticle={openArticle} />
            </Text>
          ))}
        </Box>
        {calc.where ? (
          <Box className={cls.calcWhere}>
            {calc.where.map((row) => (
              <Box className={cls.calcWhereRow} key={row.sym}>
                <Text className={cls.calcSym}>{row.sym}</Text>
                <Text className={cls.calcIs}>
                  <Inline parts={row.text} openArticle={openArticle} />
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}
        {calc.example ? (
          <Box className={cls.calcEg}>
            {calc.example.map((row) => (
              <Box className={cls.calcEgRow} key={row.key}>
                <Text className={cls.calcEgLabel}>
                  <Inline parts={row.label} openArticle={openArticle} />
                </Text>
                <Text className={cls.calcEgValue}>{row.value}</Text>
              </Box>
            ))}
          </Box>
        ) : null}
        {calc.result ? (
          <Text className={cls.calcResult}>
            <Inline parts={calc.result} openArticle={openArticle} />
          </Text>
        ) : null}
      </Box>
      {!inCases && calc.caption ? <Text className={cls.caption}>{calc.caption}</Text> : null}
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
    <Box className={cls.diagram}>
      {block.heading ? <Text className={cls.diagramHeading}>{block.heading}</Text> : null}
      {node}
      {block.caption ? <Text className={cls.caption}>{block.caption}</Text> : null}
    </Box>
  );
}
