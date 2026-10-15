import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { Text } from "@/components/ui/Text";
import { useLearnHub, type LearnTopicCard as LearnTopic } from "@vedic-patro/features/learn";
import { LearnTopicCard } from "@vedic-patro/ui/kit/learn";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
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

/** Learn hub — the app's drawing of `useLearnHub` (@vedic-patro/features). */
export default function LearnScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const hub = useLearnHub();
  const { copy } = hub;
  const openTopic = (slug: string) => router.push(hrefForLearnSlug(slug));

  return (
    <AppShell showHeader={false} title={copy.navTitle}>
      <View className="gap-8">
        <View className={cn(learnHero, "gap-8")}>
          <View>
            <View className={cn(learnPageClasses.eyebrow, "flex-row self-start")}>
              <Ionicons name="book-outline" size={16} color={colors.secondary} />
              <Text className={learnPageClasses.eyebrowText}>{copy.eyebrow}</Text>
            </View>
            <Text className={learnPageClasses.title}>{copy.title}</Text>
            <Text className={cn(learnPageClasses.title, learnPageClasses.titleAccent)}>{copy.titleAccent}</Text>
            <Text className={learnPageClasses.subtitle}>{copy.subtitle}</Text>
            <View className={learnPageClasses.stats}>
              <View className={learnStatPill}>
                <Ionicons name="school-outline" size={16} color={colors.secondary} />
                <Text className={learnPageClasses.statText}>{copy.pathsStat}</Text>
              </View>
              <View className={learnStatPill}>
                <Ionicons name="book-outline" size={16} color={colors.secondary} />
                <Text className={learnPageClasses.statText}>{copy.articlesStat}</Text>
              </View>
            </View>
          </View>

          <View className={cn(learnPageClasses.searchWrap, learnPageClasses.searchInput, "flex-row items-center rounded-lg border border-border")}>
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

        {/* category filter */}
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-2">
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
          </View>
          {copy.results ? <Text className={cn(learnPageClasses.resultsText, "text-foreground")}>{copy.results}</Text> : null}
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
          <View className="gap-4">
            {hub.results.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} onOpen={openTopic} />
            ))}
          </View>
        ) : (
          <View className="gap-12">
            {hub.modules.map((module) => (
              <View key={module.id}>
                <View className={cn(learnPageClasses.moduleHeader, learnPageClasses.moduleHeaderRow)}>
                  <View className={learnPageClasses.moduleIcon}>
                    <Ionicons name={LEARN_ICONS[module.icon]} size={20} color={colors.secondary} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className={learnPageClasses.moduleTitle}>{module.title}</Text>
                    <Text className={cn(learnPageClasses.moduleBlurb, "text-foreground")}>
                      {module.blurb}
                      {module.more ? <Text className={learnPageClasses.moduleMore}>{` · ${module.more}`}</Text> : null}
                    </Text>
                  </View>
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
                      <View className="gap-4">
                        {section.topics.map((topic) => (
                          <TopicCard key={topic.slug} topic={topic} readMore={copy.readMore} onOpen={openTopic} />
                        ))}
                      </View>
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
