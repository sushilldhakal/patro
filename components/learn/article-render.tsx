/**
 * Renderer for data-driven Learn articles.
 *
 * Owns every piece of markup an article can produce, so article data files
 * stay pure data. Native port of web's `src/lib/learn/article-render.tsx` —
 * same block switch, same section-numbering/see-also behaviour, RN markup via
 * `LearnProse.tsx` instead of DOM + CSS classes.
 */

import { Fragment } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import {
  sectionKicker,
  type ArticleData,
  type Bi,
  type Block,
  type Cell,
} from "@/lib/learn/article-schema";
import { richText } from "@/components/learn/inline-richtext";
import {
  LearnCalc,
  LearnFigure,
  LearnFormulaRow,
  LearnKeys,
  LearnList,
  LearnNote,
  LearnTable,
  LearnDiagramBlock,
} from "@/components/learn/LearnProse";

function pick(lang: "ne" | "en", value: Bi): string {
  return lang === "en" ? value.en || value.ne : value.ne || value.en;
}

function cellText(lang: "ne" | "en", cell: Cell): string {
  return typeof cell === "string" ? cell : pick(lang, cell);
}

const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * Section gloss. English-only strings stay in English UI and drop out of
 * Nepali. Mixed "नेपाली · English" labels keep only the Devanagari side.
 */
function eyebrowLabel(lang: "ne" | "en", eyebrow: Bi | string | undefined): string | null {
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
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function BlockView({ block, lang }: { block: Block; lang: "ne" | "en" }) {
  switch (block.kind) {
    case "lede":
      return (
        <Text className="text-base leading-relaxed text-foreground" style={nepaliTextStyle(16)}>
          {richText(pick(lang, block.text))}
        </Text>
      );

    case "para":
      return (
        <Text className="mt-3 text-base leading-relaxed text-muted-foreground" style={nepaliTextStyle(15)}>
          {richText(pick(lang, block.text))}
        </Text>
      );

    case "note":
      return <LearnNote>{richText(pick(lang, block.text))}</LearnNote>;

    case "keys":
      return (
        <View className="mt-3">
          <LearnKeys
            items={block.items.map((item, i) => ({
              key: `${i}`,
              title: richText(pick(lang, item.h)),
              body: richText(pick(lang, item.p)),
            }))}
          />
        </View>
      );

    case "formula":
      return (
        <View className="mt-3">
          <LearnFormulaRow
            items={block.cards.map((card, i) => ({
              key: `${i}`,
              value: cellText(lang, card.big),
              unit: card.unit ? pick(lang, card.unit) : undefined,
              label: richText(pick(lang, card.label)),
              desc: richText(pick(lang, card.desc)),
            }))}
          />
        </View>
      );

    case "list":
      return (
        <View className="mt-3">
          <LearnList
            ordered={block.ordered}
            items={block.items.map((item) => richText(pick(lang, item)))}
          />
        </View>
      );

    case "table":
      return (
        <View className="mt-3">
          <LearnTable
            caption={block.caption ? pick(lang, block.caption) : undefined}
            headers={block.headers.map((h) => pick(lang, h))}
            rows={block.rows.map((row) => row.map((cell) => richText(cellText(lang, cell))))}
          />
        </View>
      );

    case "figure":
      return (
        <View className="mt-3">
          <LearnFigure art={block.art} caption={block.caption ? pick(lang, block.caption) : undefined} />
        </View>
      );

    case "calc":
      return (
        <View className="mt-3">
          <LearnCalc
            rule={block.rule.map((line) => richText(pick(lang, line)))}
            where={block.where?.map((w) => ({ sym: w.sym, is: richText(pick(lang, w.is)) }))}
            example={block.example?.map((row, i) => ({
              key: `${i}`,
              k: richText(pick(lang, row.k)),
              v: row.v,
            }))}
            result={block.result ? richText(pick(lang, block.result)) : undefined}
            caption={block.caption ? pick(lang, block.caption) : undefined}
          />
        </View>
      );

    case "diagram":
      return <LearnDiagramBlock id={block.id} caption={block.caption ? pick(lang, block.caption) : undefined} />;
  }
}

/* ------------------------------------------------------------------ */
/* Article                                                             */
/* ------------------------------------------------------------------ */

function SeeAlso({ slugs, lang }: { slugs: string[]; lang: "ne" | "en" }) {
  const router = useRouter();
  const colors = useThemeColors();
  const topics = slugs
    .map((slug) => LEARN_LIBRARY_BY_SLUG[slug])
    .filter((topic) => topic?.status === "published");

  if (topics.length === 0) return null;

  return (
    <View className="mt-6 gap-2 border-t border-border pt-4">
      {topics.map((topic) => (
        <Pressable
          key={topic!.slug}
          onPress={() => router.push(`/learn/${topic!.slug}` as never)}
          className="flex-row items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 active:opacity-80"
        >
          <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
            {pick(lang, topic!.title)}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.secondary} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * `sectionOffset` lets several chapters run as one continuous page with their
 * section numbers carrying on rather than restarting at ०१ — what a merged
 * guide needs. `hideSeeAlso` suppresses the per-chapter footer for the same
 * reason: a merged page carries one at the very bottom, not one after every
 * chapter.
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
          <View className="mb-6 gap-1" key={section.title.en || section.title.ne}>
            <View className="flex-row flex-wrap items-baseline gap-x-2 border-b border-border pb-2">
              <Text className="font-num text-xs font-bold uppercase tracking-wider text-secondary">
                {pick(lang, kicker)}
              </Text>
              <Text className="flex-1 text-lg font-bold text-foreground" style={nepaliTextStyle(18)}>
                {pick(lang, section.title)}
              </Text>
              {gloss ? (
                <Text className="text-xs uppercase tracking-wide text-muted-foreground">{gloss}</Text>
              ) : null}
            </View>
            {section.blocks.map((block, bi) => (
              <Fragment key={bi}>
                <BlockView block={block} lang={lang} />
              </Fragment>
            ))}
          </View>
        );
      })}
      {article.seeAlso && !hideSeeAlso ? <SeeAlso slugs={article.seeAlso} lang={lang} /> : null}
    </>
  );
}
