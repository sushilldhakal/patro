/**
 * A merged page: several former chapters on one scroll, each under a heading
 * with an anchor, preceded by a jump list.
 *
 * Native port of web's `MergedBody` (`src/lib/learn/learn-topics.tsx`).
 * Section numbers run continuously across chapters via the same `reduce`
 * pattern — that is what stops a long page reading as separate articles that
 * each restart at ०१.
 */

import { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { MergedPage } from "@/lib/learn/merged-pages";
import { DATA_ARTICLES } from "@/lib/learn/articles";
import { ArticleBody } from "@/components/learn/article-render";

const NE_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const toNepaliIndex = (lang: string, n: number) =>
  lang === "en" ? String(n) : String(n).replace(/\d/g, (d) => NE_DIGITS[Number(d)]!);

/** One chapter, however far along its content is. */
function ChapterBody({ slug, offset }: { slug: string; offset: number }): { node: React.ReactNode; sections: number } {
  const data = DATA_ARTICLES[slug];
  if (data) {
    return {
      node: <ArticleBody article={data} sectionOffset={offset} hideSeeAlso />,
      sections: data.sections.length,
    };
  }
  return { node: <ChapterComingSoon />, sections: 0 };
}

function ChapterComingSoon() {
  const { pick } = useLocale();
  return (
    <Text className="text-body italic text-muted-foreground" style={nepaliTextStyle(13)}>
      {pick("यो अध्याय छिट्टै आउँदैछ।", "This chapter is coming soon.")}
    </Text>
  );
}

export function MergedArticleBody({
  page,
  scrollRef,
  initialChapter,
}: {
  page: MergedPage;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialChapter?: string;
}) {
  const { lang, pick } = useLocale();
  const chapterRefs = useRef<Record<string, View | null>>({});

  // Section numbers run continuously across chapters, so each chapter's
  // offset depends on every one before it — threaded via `reduce` rather
  // than an outer counter mutated as the map runs.
  const { chapters } = page.parts.reduce<{
    chapters: { part: MergedPage["parts"][number]; node: React.ReactNode }[];
    offset: number;
  }>(
    (acc, part) => {
      const { node, sections } = ChapterBody({ slug: part.slug, offset: acc.offset });
      return {
        chapters: [...acc.chapters, { part, node }],
        offset: acc.offset + sections,
      };
    },
    { chapters: [], offset: 0 },
  );

  const jumpTo = (slug: string) => {
    const target = chapterRefs.current[slug];
    const scroller = scrollRef?.current;
    if (!target || !scroller) return;
    /* Native refs don't resolve on react-native-web — jumping to a chapter is a convenience, not core content, so a
       platform that can't resolve it just skips the scroll rather than
       crashing the page. Native (iOS/Android) always has a handle here. */
    try {
      if (Platform.OS === "web") return;
      /* measureLayout wants a native ref, not a numeric node handle (newer RN
         warns on the latter). The scroll view's inner content view shares the
         scroll origin, so the measured y is the scroll offset. */
      const content = (scroller as unknown as { getInnerViewRef?: () => unknown }).getInnerViewRef?.();
      if (!content) return;
      target.measureLayout(
        content as Parameters<View["measureLayout"]>[0],
        (_x, y) => scroller.scrollTo({ y: Math.max(y - 12, 0), animated: true }),
        () => {},
      );
    } catch {
      /* no-op — see comment above */
    }
  };

  // Deep link from a retired chapter URL (`?chapter=<slug>`) — jump once refs
  // and layout have settled, same platform guard as `jumpTo` above.
  useEffect(() => {
    if (!initialChapter) return;
    const id = requestAnimationFrame(() => jumpTo(initialChapter));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChapter]);

  return (
    <View className="gap-6">
      <View className="gap-1.5 rounded-xl border border-border bg-muted/20 p-3">
        <Text className="text-caption font-bold uppercase tracking-wide text-muted-foreground">
          {pick("यस पृष्ठमा", "On this page")}
        </Text>
        <View className="gap-1">
          {chapters.map(({ part }, i) => (
            <Pressable key={part.slug} onPress={() => jumpTo(part.slug)} className="flex-row gap-2 py-0.5 active:opacity-70">
              <Text className="text-caption font-num text-secondary">{toNepaliIndex(lang, i + 1)}</Text>
              <Text className="text-caption flex-1 text-foreground" style={nepaliTextStyle(12)}>
                {pick(part.title.ne, part.title.en)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {chapters.map(({ part, node }) => (
        <View
          key={part.slug}
          ref={(el) => {
            chapterRefs.current[part.slug] = el;
          }}
          className="gap-1"
        >
          <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(20)}>
            {pick(part.title.ne, part.title.en)}
          </Text>
          {node}
        </View>
      ))}
    </View>
  );
}
