import { FlatList, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isVerseDetailKind, useVerseDetailList } from "@vedic-patro/features/documents";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { reportNavScrollJS } from "@/lib/nav-compact";
import { useNavBottomPadding } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/**
 * Every mantra with one देवता / ऋषि / छन्द / स्वर — where each link in a verse's details
 * line goes. The app's drawing of `useVerseDetailList` (@vedic-patro/features).
 */
export default function VerseDetailScreen() {
  const router = useRouter();
  const { isTablet } = useBreakpoint();
  const bottom = useNavBottomPadding(isTablet);
  const { kind, value, slug } = useLocalSearchParams<{ kind: string; value?: string; slug?: string }>();
  const list = useVerseDetailList(isVerseDetailKind(kind) ? kind : null, typeof value === "string" ? value : "", slug);

  const header = (
    <View className="gap-4 pb-6">
      <DocumentBackLink href="/documents" label={list.copy.back} />
      <Text className={documentsClasses.chapterTitle}>{list.copy.heading}</Text>
      {list.status === "ready" ? <Text className={documentsClasses.chapterProgress}>{list.copy.count}</Text> : null}
      {list.status === "loading" ? <LoadingState /> : null}
      {list.status === "error" ? <ErrorState message={list.copy.loadError} /> : null}
      {list.status === "ready" && list.rows.length === 0 ? <Text className={documentsClasses.mutedText}>{list.copy.empty}</Text> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={list.rows}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={header}
        contentContainerClassName="mx-auto w-full max-w-page px-4 pt-3 sm:px-6 md:pt-4"
        contentContainerStyle={{ paddingBottom: bottom + 24 }}
        onScroll={(e) => reportNavScrollJS(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
        onEndReachedThreshold={0.6}
        onEndReached={() => list.hasMore && !list.loadingMore && list.loadMore()}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${list.copy.openVerse}: ${item.reference}`}
            onPress={() =>
              router.push(
                (item.chapter != null
                  ? `/documents/${item.slug}/${item.chapter}?verse=${encodeURIComponent(item.label)}`
                  : `/documents/${item.slug}?verse=${encodeURIComponent(item.label)}`) as never,
              )
            }
            className={cn(documentsClasses.verse, documentsClasses.verseIdle, "mb-3 active:opacity-70")}
          >
            <View className={cn(documentsClasses.verseBadge, "self-start")}>
              <Text className={documentsClasses.verseBadgeText}>{item.reference}</Text>
            </View>
            <Text className={documentsClasses.verseText}>{item.verse.sanskrit}</Text>
          </Pressable>
        )}
        ListFooterComponent={list.loadingMore ? <LoadingState /> : undefined}
      />
    </View>
  );
}
