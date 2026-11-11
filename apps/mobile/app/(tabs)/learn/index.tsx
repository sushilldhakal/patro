import { useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { Text } from "@/components/ui/Text";
import { useLearnHub, type LearnHubModule, type LearnTopicCard as LearnTopic } from "@vedic-patro/features/learn";
import { LearnTopicCard } from "@vedic-patro/ui/kit/learn";
import { Grid } from "@vedic-patro/ui";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { inkOn } from "@/lib/theme";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

/** The website paints the hero and the stat pill with `color-mix` gradients, which NativeWind cannot, so the app uses the same shapes with flat tints. */
const learnHero = cn(learnPageClasses.hero, "bg-card");
const learnStatPill = "flex-row items-center gap-2 rounded-full border border-secondary/25 bg-secondary/8 px-4 py-2.5";

function Chip({
  active,
  label,
  count,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  count?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        learnPageClasses.chip,
        "flex-row items-center active:opacity-80",
        active ? learnPageClasses.chipActive : learnPageClasses.chipIdle,
      )}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? inkOn(colors.secondary) : colors.foreground} />
      ) : null}
      <Text
        className={cn(learnPageClasses.chipText, active ? learnPageClasses.chipActiveText : "text-foreground")}
        style={nepaliTextStyle(14)}
      >
        {label}
      </Text>
      {count != null ? (
        <Text
          className={cn(learnPageClasses.chipText, learnPageClasses.chipCount, active ? learnPageClasses.chipActiveText : "text-foreground")}
          style={nepaliTextStyle(14)}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TopicCard({ topic, readMore, onOpen }: { topic: LearnTopic; readMore: string; onOpen: (slug: string) => void }) {
  const colors = useThemeColors();
  return (
    <LearnTopicCard
      topic={topic}
      readMore={readMore}
      icon={<Ionicons name={LEARN_ICONS[topic.icon]} size={20} color={colors.secondary} />}
      href={`/learn/${topic.slug}`}
      onOpen={() => onOpen(topic.slug)}
    />
  );
}

/** The hero's course map: every learning path in order, each a jump to its section — as on the website. */
function PathMap({ heading, paths, onJump }: { heading: string; paths: LearnHubModule[]; onJump: (id: string) => void }) {
  const colors = useThemeColors();
  return (
    <View className={learnPageClasses.pathMap} accessibilityRole="menu" accessibilityLabel={heading}>
      <View className={cn(learnPageClasses.pathMapHead, "flex-row")}>
        <Ionicons name="school-outline" size={16} color={colors.secondary} />
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {heading}
        </Text>
      </View>
      <View className="relative gap-1">
        {/* The rail behind the numbers. */}
        <View className={learnPageClasses.pathRail} style={{ left: 23.5 }} />
        {paths.map((path) => (
          <Pressable
            key={path.id}
            onPress={() => onJump(path.id)}
            accessibilityRole="button"
            className={cn(learnPageClasses.pathItem, "flex-row active:bg-secondary/10")}
          >
            <View className={learnPageClasses.pathNumBox}>
              <Text className="text-sm font-bold text-secondary">{path.indexLabel}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className={learnPageClasses.pathTitle} style={nepaliTextStyle(14)}>
                {path.title}
              </Text>
              <Text className={learnPageClasses.pathCount} style={nepaliTextStyle(12)}>
                {path.countLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Learn hub — the app's drawing of `useLearnHub` (@vedic-patro/features). */
export default function LearnScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const hub = useLearnHub();
  const { copy } = hub;
  const openTopic = (slug: string) => router.push(hrefForLearnSlug(slug));
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  /* Where each path's section sits in the scroll content: page column + modules list + module. */
  const pageY = useRef(0);
  const modulesY = useRef(0);
  const moduleY = useRef(new Map<string, number>());
  /* A path's section is only drawn while nothing is filtered, so a jump made
     during a search clears it first and scrolls once the paths are back. */
  const jumpToPath = (id: string) => {
    if (hub.isFiltering) hub.clearFilters();
    requestAnimationFrame(() =>
      setTimeout(() => {
        const y = moduleY.current.get(id);
        if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, pageY.current + modulesY.current + y - 16), animated: true });
      }, 60),
    );
  };

  return (
    <AppShell showHeader={false} title={copy.navTitle} scrollRef={scrollRef}>
      <View className="gap-8" onLayout={(e) => (pageY.current = e.nativeEvent.layout.y)}>
        <View className={cn(learnHero, "gap-8")}>
          <View>
            <View className={cn(learnPageClasses.eyebrow, "flex-row self-start")}>
              <Ionicons name="book-outline" size={16} color={colors.secondary} />
              <Text className={learnPageClasses.eyebrowText}>{copy.eyebrow}</Text>
            </View>
            <Text className={learnPageClasses.title}>{copy.title}</Text>
            <Text className={cn(learnPageClasses.title, learnPageClasses.titleAccent)}>{copy.titleAccent}</Text>
            <Text className={learnPageClasses.subtitle}>{copy.subtitle}</Text>
            <View className="mt-6">
              <View className={cn(learnPageClasses.searchWrap, learnPageClasses.searchInput, "flex-row items-center rounded-xl border border-border bg-card")}>
                <View className="ml-3.5">
                  <Ionicons name="search" size={20} color={colors.mutedForeground} />
                </View>
                <TextInput
                  value={hub.query}
                  onChangeText={hub.setQuery}
                  placeholder={copy.searchPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  accessibilityLabel={copy.searchLabel}
                  autoCorrect={false}
                  className={cn(learnPageClasses.searchInput, "flex-1 px-2.5 text-foreground")}
                  style={nepaliTextStyle(16)}
                />
                {hub.query ? (
                  <Pressable
                    onPress={() => hub.setQuery("")}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={copy.clearSearch}
                    className={cn(learnPageClasses.searchClear, "mr-2")}
                  >
                    <Ionicons name="close" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View className={learnPageClasses.stats}>
              <View className={learnStatPill}>
                <Ionicons name="book-outline" size={16} color={colors.secondary} />
                <Text className={learnPageClasses.statText}>{copy.articlesStat}</Text>
              </View>
            </View>
          </View>

          <PathMap heading={copy.pathsStat} paths={hub.paths} onJump={jumpToPath} />
        </View>

        {/* The filter bar: one scrolling row on a phone, wrapping from 640 wide — as on the website. */}
        <View className={cn(learnPageClasses.filterBar, wide && "flex-row items-center justify-between")}>
          <ScrollView horizontal={!wide} scrollEnabled={!wide} showsHorizontalScrollIndicator={false} contentContainerClassName={wide ? "flex-row flex-wrap gap-2" : "flex-row gap-2 px-1"}>
            {hub.chips.map((chip) => (
              <Chip
                key={chip.id}
                active={chip.active}
                label={chip.label}
                count={chip.count}
                icon={chip.icon ? LEARN_ICONS[chip.icon] : undefined}
                onPress={() => hub.setCategory(chip.id)}
              />
            ))}
          </ScrollView>
          {copy.results ? <Text className={learnPageClasses.resultsPill}>{copy.results}</Text> : null}
        </View>

        {hub.results.length === 0 ? (
          <View className={cn(learnPageClasses.emptyState, "items-center")}>
            <Text className={learnPageClasses.emptyTitle}>{copy.empty}</Text>
            <Text className={cn(learnPageClasses.emptyHint, "text-foreground")}>{copy.emptyHint}</Text>
            <Pressable onPress={hub.clearFilters} className="mt-4 active:opacity-80">
              <Text className={learnPageClasses.topicFooterText}>{copy.clearFilters}</Text>
            </Pressable>
          </View>
        ) : hub.isFiltering ? (
          <Grid cols={4} cards gap={12}>
            {hub.results.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} onOpen={openTopic} />
            ))}
          </Grid>
        ) : (
          <View className="gap-14" onLayout={(e) => (modulesY.current = e.nativeEvent.layout.y)}>
            {hub.modules.map((module) => (
              <View key={module.id} onLayout={(e) => moduleY.current.set(module.id, e.nativeEvent.layout.y)}>
                <View className={cn(learnPageClasses.moduleHead, "flex-row")}>
                  <View className={learnPageClasses.moduleNumBox}>
                    <Text className="text-xl font-bold text-secondary-foreground">{module.indexLabel}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className={learnPageClasses.moduleTitle}>{module.title}</Text>
                    <Text className={cn(learnPageClasses.moduleBlurb, "text-foreground")}>
                      {module.blurb}
                      {module.more ? <Text className={learnPageClasses.moduleMore}>{` · ${module.more}`}</Text> : null}
                    </Text>
                  </View>
                  {wide ? (
                    <View className={learnPageClasses.moduleCountPill}>
                      <Ionicons name={LEARN_ICONS[module.icon]} size={14} color={colors.secondary} />
                      <Text className="text-xs font-semibold text-muted-foreground">{module.countLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <View className="gap-8">
                  {module.sections.map((section) => (
                    <View key={section.id}>
                      {module.showSectionHeads ? (
                        <View className={learnPageClasses.catHeader}>
                          <View className={cn(learnPageClasses.catTitle, "min-w-0 flex-1")}>
                            <Ionicons name={LEARN_ICONS[section.icon]} size={16} color={colors.secondary} />
                            <Text className={cn(learnPageClasses.catTitleText, "shrink")} numberOfLines={1}>
                              {section.label}
                              <Text className={learnPageClasses.catCount}> {section.countLabel}</Text>
                            </Text>
                          </View>
                          <Pressable onPress={() => hub.setCategory(section.id)} hitSlop={6}>
                            <Text className={learnPageClasses.catLink}>{copy.viewCategory}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      <Grid cols={4} cards gap={12}>
                        {section.topics.map((topic) => (
                          <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} onOpen={openTopic} />
                        ))}
                      </Grid>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
}
