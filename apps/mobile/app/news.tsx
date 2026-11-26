import { Pressable, ScrollView, View } from "react-native";
import { useNewsPage, type NewsCardView } from "@vedic-patro/features/news";
import { cn } from "@vedic-patro/design-tokens/cn";
import { newsClasses as nc } from "@vedic-patro/design-tokens/classes/news-classes";
import { AppShell } from "@/components/AppShell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { __iconNode as ExternalLinkNode } from "lucide-react/dist/esm/icons/external-link";
import { LucideNative } from "@/components/icons/LucideNative";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { openInApp } from "@/lib/open-in-app";

const open = openInApp;

/** One story: category and time, headline, the outlet's summary, and a chip per outlet. */
function StoryCard({ story, top, sourceLabel }: { story: NewsCardView; top?: boolean; sourceLabel: string }) {
  const colors = useThemeColors();
  const ne = story.language === "ne" ? nepaliTextStyle() : undefined;
  const first = story.sources[0];
  return (
    <View className={cn(nc.card, top && nc.cardTop)}>
      <View className={cn("flex-row flex-wrap", nc.meta)}>
        <Text className={nc.metaCategory}>{story.category}</Text>
        <Text className={nc.metaText}>· {story.ago}</Text>
        {story.sourcesCount ? <Text className={nc.metaText}>· {story.sourcesCount}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={first?.label}
        onPress={() => first && open(first.url, first.name)}
        className="active:opacity-70"
      >
        <Text className={top ? nc.titleTop : nc.title} style={ne}>
          {story.title}
        </Text>
      </Pressable>
      {story.summary ? (
        <Text className={nc.summary} style={ne} numberOfLines={3}>
          {story.summary}
        </Text>
      ) : null}
      <View className={cn("flex-row", nc.sources)}>
        <Text className={nc.sourcesLabel}>{sourceLabel}:</Text>
        {story.sources.map((s) => (
          <Pressable
            key={s.url}
            accessibilityRole="link"
            accessibilityLabel={s.label}
            onPress={() => open(s.url, s.name)}
            hitSlop={6}
            className={cn("flex-row active:opacity-70", nc.sourceChip)}
          >
            <Text className={nc.sourceLabel}>{s.name}</Text>
            <LucideNative node={ExternalLinkNode} size={12} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * News — the app's drawing of `useNewsPage` (@vedic-patro/features): publisher
 * headlines grouped by story; each source opens the outlet's article in the browser.
 */
export default function NewsScreen() {
  const page = useNewsPage();
  const { copy } = page;
  const colors = useThemeColors();

  return (
    <AppShell title={copy.title} showHeader={false}>
      <PatroPageHeader
        className="mb-6"
        icon={<AppNavIcon name="newspaper" size={24} color={colors.secondary} />}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <View accessibilityLabel={copy.language} className={cn("mb-4 flex-row self-start", nc.toggle)}>
        {page.languages.map((l) => (
          <Pressable
            key={l.id}
            accessibilityRole="button"
            accessibilityState={{ selected: l.active }}
            onPress={() => page.setLanguage(l.id)}
            className={cn("flex-row active:opacity-80", nc.toggleButton, l.active && nc.toggleButtonActive)}
          >
            <Text className={cn(nc.toggleLabel, l.active ? nc.toggleLabelActive : nc.toggleLabelIdle)}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerClassName={nc.chips}>
        {page.categories.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: c.active }}
            onPress={() => page.setCategory(c.id)}
            className={cn("active:opacity-80", nc.chip, c.active && nc.chipActive)}
          >
            <Text className={cn(nc.chipLabel, c.active ? nc.chipLabelActive : nc.chipLabelIdle)}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {page.status === "error" ? (
        <View className={nc.stateBox}>
          <Text className={nc.stateText}>{copy.loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void page.refresh()} className={cn("active:opacity-70", nc.moreButton)}>
            <Text className={nc.moreLabel}>{copy.retry}</Text>
          </Pressable>
        </View>
      ) : page.status === "loading" ? (
        <Text className={nc.stateText}>{copy.loading}</Text>
      ) : (
        <View className="gap-6">
          {page.topStories.length > 0 ? (
            <View className="gap-3">
              <Text className={nc.sectionTitle}>{copy.topStories}</Text>
              <View className={nc.list}>
                {page.topStories.map((s) => (
                  <StoryCard key={s.id} story={s} top sourceLabel={copy.source} />
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-3">
            <Text className={nc.sectionTitle}>{copy.latest}</Text>
            {page.latest.length === 0 && page.topStories.length === 0 ? (
              <Text className={nc.stateText}>{copy.empty}</Text>
            ) : (
              <View className={nc.list}>
                {page.latest.map((s) => (
                  <StoryCard key={s.id} story={s} sourceLabel={copy.source} />
                ))}
              </View>
            )}
            {page.hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={page.loadingMore}
                onPress={page.loadMore}
                className={cn("active:opacity-70", nc.moreButton, page.loadingMore && "opacity-60")}
              >
                <Text className={nc.moreLabel}>{page.loadingMore ? copy.loading : copy.loadMore}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text className={nc.note}>{copy.note}</Text>
        </View>
      )}
    </AppShell>
  );
}
