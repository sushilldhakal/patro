import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppShell } from "@/components/AppShell";
import { Text } from "@/components/ui/Text";
import {
  LEARN_SECTIONS,
  LEARN_SECTIONS_BY_ID,
  PUBLISHED_TOPICS,
  plannedCountInSection,
  publishedInSection,
  type LibraryTopic,
} from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

interface LearnModule {
  id: string;
  title: { ne: string; en: string };
  blurb: { ne: string; en: string };
  sections: string[];
}

/** Same six learning paths, in the same order, as web's Learn hub. */
const LEARN_MODULES: LearnModule[] = [
  {
    id: "basics",
    title: { ne: "पहिले बुझ्ने कुरा", en: "Start Here" },
    blurb: {
      ne: "पात्रो, पञ्चाङ्ग र विक्रम सम्वत् बुझ्ने आधार।",
      en: "The base ideas behind the patro, panchanga and Bikram Sambat.",
    },
    sections: ["start"],
  },
  {
    id: "sky-sun",
    title: { ne: "आकाश, पृथ्वी र सूर्य", en: "Sky, Earth and Sun" },
    blurb: {
      ne: "दिन, ऋतु, राशि, सङ्क्रान्ति र अयनांश एउटै प्रवाहमा।",
      en: "Day, seasons, rashi, sankranti and ayanamsha in one flow.",
    },
    sections: ["earth-sky", "sun"],
  },
  {
    id: "moon-panchanga",
    title: { ne: "चन्द्र र पञ्चाङ्ग", en: "Moon and Panchanga" },
    blurb: {
      ne: "तिथि, पक्ष, मास र पञ्चाङ्गका पाँच अङ्ग।",
      en: "Tithi, paksha, months and the five limbs of the panchanga.",
    },
    sections: ["moon", "panchanga"],
  },
  {
    id: "calculation",
    title: { ne: "गणना कसरी हुन्छ", en: "How Calculation Works" },
    blurb: {
      ne: "सूर्योदय, तिथि, नक्षत्र र स्थानअनुसार फरक पर्ने कारण।",
      en: "Sunrise, tithi, nakshatra and why location changes the answer.",
    },
    sections: ["calculation"],
  },
  {
    id: "deeper",
    title: { ne: "अलि गहिरो खगोल", en: "Deeper Astronomy" },
    blurb: {
      ne: "वक्री गति, अयन चलन, ध्रुव तारा र ग्रहण।",
      en: "Retrograde motion, precession, pole stars and eclipses.",
    },
    sections: ["deeper"],
  },
  {
    id: "comparison",
    title: { ne: "तुलना र इतिहास", en: "Comparison and History" },
    blurb: {
      ne: "नेपाली, वैदिक र ग्रेगोरियन पात्रो, अनि सूर्य सिद्धान्त।",
      en: "Nepali, Vedic and Gregorian calendars, plus Surya Siddhanta.",
    },
    sections: ["comparison"],
  },
];

function topicMatchesQuery(topic: LibraryTopic, query: string) {
  if (!query) return true;
  return (
    topic.title.ne.toLowerCase().includes(query) ||
    topic.title.en.toLowerCase().includes(query) ||
    topic.summary.ne.toLowerCase().includes(query) ||
    topic.summary.en.toLowerCase().includes(query) ||
    topic.slug.includes(query)
  );
}

function Chip({
  active,
  label,
  count,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  count?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { digits } = useLocale();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "flex-row items-center gap-1.5 rounded-full border px-4 py-2 active:opacity-80",
        active ? "border-secondary bg-secondary" : "border-border bg-card",
      )}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? colors.card : colors.secondary} />
      ) : null}
      <Text
        className={cn("text-sm font-semibold", active ? "text-white" : "text-foreground")}
        style={nepaliTextStyle(14)}
      >
        {label}
        {count != null ? ` (${digits(count)})` : ""}
      </Text>
    </Pressable>
  );
}

function TopicCard({ topic, onOpen }: { topic: LibraryTopic; onOpen: (slug: string) => void }) {
  const { pick, t } = useLocale();
  const colors = useThemeColors();
  const section = LEARN_SECTIONS_BY_ID[topic.section];
  return (
    <Pressable
      onPress={() => onOpen(topic.slug)}
      accessibilityRole="button"
      className="w-full rounded-2xl border border-border bg-card active:opacity-90"
    >
      <View className="flex-row items-start gap-3 px-5 pt-5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
          <Ionicons name={topic.icon} size={20} color={colors.secondary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold leading-snug text-foreground" style={nepaliTextStyle(16)}>
            {pick(topic.title.ne, topic.title.en)}
          </Text>
        </View>
        {section ? (
          <View className="shrink rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-0.5">
            <Text
              className="text-[11px] font-semibold uppercase tracking-wide text-secondary"
              style={nepaliTextStyle(11)}
              numberOfLines={1}
            >
              {pick(section.title.ne, section.title.en)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="px-5 pt-3 text-sm leading-relaxed text-foreground/80" style={nepaliTextStyle(14)}>
        {pick(topic.summary.ne, topic.summary.en)}
      </Text>
      <View className="mt-4 flex-row items-center justify-between border-t border-border/70 px-5 py-3">
        <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(14)}>
          {t("learn_page.read_detail")}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.secondary} />
      </View>
    </Pressable>
  );
}

export default function LearnScreen() {
  const { pick, t, lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0 || activeCategory !== "all";
  const openTopic = (slug: string) => router.push(hrefForLearnSlug(slug));

  const topicsInModule = (module: LearnModule) =>
    PUBLISHED_TOPICS.filter((topic) => module.sections.includes(topic.section));
  const liveModuleCount = useMemo(
    () => LEARN_MODULES.filter((m) => PUBLISHED_TOPICS.some((x) => m.sections.includes(x.section))).length,
    [],
  );
  const filteredTopics = useMemo(
    () =>
      PUBLISHED_TOPICS.filter(
        (topic) =>
          (activeCategory === "all" || topic.section === activeCategory) &&
          topicMatchesQuery(topic, normalizedQuery),
      ),
    [activeCategory, normalizedQuery],
  );

  const resultsLine = isFiltering ? t("learn_page.results_count", { count: digits(filteredTopics.length) }) : null;

  return (
    <AppShell showHeader={false} title={pick("सिकाइ", "Learn")}>
      <View className="gap-6">
        {/* hero */}
        <View className="rounded-2xl border border-border bg-card p-5">
          <View className="mb-4 flex-row items-center gap-2 self-start rounded-full border border-secondary/25 bg-secondary/10 px-3.5 py-1.5">
            <Ionicons name="book-outline" size={14} color={colors.secondary} />
            <Text
              className="text-xs font-semibold uppercase tracking-wide text-secondary"
              style={nepaliTextStyle(12)}
            >
              {t("learn_page.eyebrow")}
            </Text>
          </View>
          <Text className="text-3xl font-bold tracking-tight text-foreground" style={nepaliTextStyle(30)}>
            {t("learn_page.title")}
          </Text>
          <Text className="text-3xl font-bold tracking-tight text-secondary" style={nepaliTextStyle(30)}>
            {t("learn_page.title_accent")}
          </Text>
          <Text className="mt-3 text-base leading-relaxed text-foreground/80" style={nepaliTextStyle(16)}>
            {t("learn_page.subtitle")}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <View className="flex-row items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <Ionicons name="school-outline" size={16} color={colors.secondary} />
              <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
                {t("learn_page.learning_paths_count", { count: digits(liveModuleCount) })}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <Ionicons name="book-outline" size={16} color={colors.secondary} />
              <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
                {t("learn_page.articles_count", { count: digits(PUBLISHED_TOPICS.length) })}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center rounded-xl border border-border bg-background px-3.5">
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("learn_page.search_placeholder")}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={t("learn_page.search_label")}
              autoCorrect={false}
              className="h-12 flex-1 px-2.5 text-base text-foreground"
              style={nepaliTextStyle(16)}
            />
            {query ? (
              <Pressable
                onPress={() => setQuery("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("common.clear_search")}
              >
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* category filter */}
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            <Chip
              active={activeCategory === "all"}
              label={t("common.all")}
              onPress={() => setActiveCategory("all")}
            />
            {LEARN_SECTIONS.map((section) => {
              const count = publishedInSection(section.id).length;
              if (count === 0) return null;
              return (
                <Chip
                  key={section.id}
                  active={activeCategory === section.id}
                  label={pick(section.title.ne, section.title.en)}
                  count={count}
                  icon={section.icon}
                  onPress={() => setActiveCategory(section.id)}
                />
              );
            })}
          </View>
          {resultsLine ? (
            <Text className="text-base text-muted-foreground" style={nepaliTextStyle(14)}>
              {resultsLine}
            </Text>
          ) : null}
        </View>

        {filteredTopics.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12">
            <Text className="text-base text-foreground" style={nepaliTextStyle(16)}>
              {t("learn_page.no_topics")}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
              {t("learn_page.no_topics_hint")}
            </Text>
            <Pressable
              onPress={() => {
                setQuery("");
                setActiveCategory("all");
              }}
              className="mt-4 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(14)}>
                {t("learn_page.clear_filters")}
              </Text>
            </Pressable>
          </View>
        ) : isFiltering ? (
          <View className="gap-4">
            {filteredTopics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} onOpen={openTopic} />
            ))}
          </View>
        ) : (
          <View className="gap-10">
            {LEARN_MODULES.map((module) => {
              const moduleTopics = topicsInModule(module);
              if (moduleTopics.length === 0) return null;
              const firstSection = LEARN_SECTIONS_BY_ID[module.sections[0] ?? ""];
              const upcoming = module.sections.reduce((n, id) => n + plannedCountInSection(id), 0);
              const moduleSections = LEARN_SECTIONS.filter((s) => module.sections.includes(s.id));
              return (
                <View key={module.id}>
                  <View className="mb-5 flex-row items-start gap-3 border-b border-border pb-4">
                    <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                      <Ionicons name={firstSection?.icon ?? "book-outline"} size={20} color={colors.secondary} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-2xl font-bold text-foreground" style={nepaliTextStyle(24)}>
                        {pick(module.title.ne, module.title.en)}
                      </Text>
                      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
                        {pick(module.blurb.ne, module.blurb.en)} ·{" "}
                        {t("learn_page.articles_count", { count: digits(moduleTopics.length) })}
                        {upcoming > 0 ? ` · ${t("learn_page.more_coming", { count: digits(upcoming) })}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View className="gap-8">
                    {moduleSections.map((section) => {
                      const topics = publishedInSection(section.id);
                      if (topics.length === 0) return null;
                      return (
                        <View key={section.id}>
                          {moduleSections.length > 1 ? (
                            <View className="mb-3 flex-row items-center justify-between gap-3">
                              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                                <Ionicons name={section.icon} size={16} color={colors.secondary} />
                                <Text
                                  className="shrink text-sm font-bold text-foreground"
                                  style={nepaliTextStyle(14)}
                                  numberOfLines={1}
                                >
                                  {pick(section.title.ne, section.title.en)}
                                </Text>
                              </View>
                              <Pressable onPress={() => setActiveCategory(section.id)} hitSlop={6}>
                                <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(14)}>
                                  {t("learn_page.view_category")}
                                </Text>
                              </Pressable>
                            </View>
                          ) : null}
                          <View className="gap-4">
                            {topics.map((topic) => (
                              <TopicCard key={topic.slug} topic={topic} onOpen={openTopic} />
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </AppShell>
  );
}
