import { useState } from "react";
import { FlatList, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { cardGridColumns } from "@vedic-patro/ui";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useDocumentDetail, useDocumentLibraryOptions, type DocumentChapterCard, type DocumentDetailPage } from "@vedic-patro/features/documents";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useDocumentAudioSession } from "@/lib/documents/document-audio-session";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { reportNavScrollJS } from "@/lib/nav-compact";

function DocHeader({ page, onJumpChapter }: { page: DocumentDetailPage; onJumpChapter?: (anchor: string) => void }) {
  const { header, copy } = page;
  if (!header) return null;
  return (
    <View className="gap-2">
      <View className={documentsClasses.readerBar}>
        <View className={documentsClasses.readerBarSlot}>
          <DocumentBackLink href="/documents" label={copy.backToList} />
        </View>
        <Text className={documentsClasses.readerBarTitle} numberOfLines={1}>
          {header.title}
        </Text>
        <Text className={cn(documentsClasses.readerBarSlot, documentsClasses.readerBarSide)} numberOfLines={1}>
          {header.subtitle}
        </Text>
      </View>
      {onJumpChapter && page.chapterPills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="grow-0"
          contentContainerClassName="gap-1.5 pb-1"
          accessibilityLabel={copy.chapterNav}
        >
          {page.chapterPills.map((pill) => (
            <Pressable
              key={pill.number}
              onPress={() => onJumpChapter(pill.anchor)}
              accessibilityRole="button"
              className={cn(documentsClasses.chapterPill, "active:opacity-70")}
            >
              <Text className={documentsClasses.chapterPillText}>{pill.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ChapterRow({ slug, card }: { slug: string; card: DocumentChapterCard }) {
  const router = useRouter();
  const colors = useThemeColors();
  const title = card.title || card.heading;
  return (
    <Pressable
      onPress={() => router.push(`/documents/${slug}/${card.number}` as never)}
      accessibilityRole="button"
      className={cn(documentsClasses.sectionCard, "mb-0 flex-1 active:opacity-80")}
    >
      <View className={documentsClasses.sectionCardTop}>
        <Text className={cn(documentsClasses.sectionCardTitle, "min-w-0 flex-1")} numberOfLines={1}>
          {title}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
      {card.count ? <Text className={documentsClasses.sectionCardCount}>{card.count}</Text> : null}
    </Pressable>
  );
}

/** A document — the app's drawing of `useDocumentDetail` (@vedic-patro/features). */
export default function DocumentDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = useDocumentDetail(slug);
  const library = useDocumentLibraryOptions();
  const { width: windowWidth } = useWindowDimensions();
  const { doc, copy } = page;
  // The shared player: it keeps playing after the reader leaves this page.
  const audio = useDocumentAudioSession({
    key: `${slug}:`,
    route: usePathname(),
    shlokas: page.shlokas,
    fullAudioUrl: page.fullAudioUrl,
    documentTitle: page.title,
    complete: true,
  });
  const [jumpKey, setJumpKey] = useState<{ key: string; nonce: number } | null>(null);
  const [jumpLabel, setJumpLabel] = useState<{ label: string; nonce: number } | null>(null);

  if (page.status === "loading") {
    return (
      <View className={cn("flex-1 bg-background", documentsClasses.frame)}>
        <DocumentBackLink href="/documents" label={copy.backToList} />
        <LoadingState />
      </View>
    );
  }
  if (page.status !== "ready" || !doc) {
    return (
      <View className={cn("flex-1 bg-background", documentsClasses.frame)}>
        <DocumentBackLink href="/documents" label={copy.backToList} />
        {page.status === "error" ? (
          <ErrorState message={copy.loadError} onRetry={page.retry} />
        ) : (
          <Text className={documentsClasses.notFound}>{copy.notFound}</Text>
        )}
      </View>
    );
  }

  // Paginated books (Gita, Ashtavakra): chapter cards, verses on their own screen.
  if (page.layout === "chapters") {
    // 2 across on a phone, 3 on iPad portrait, 4 in landscape (page padding is ~32px; content caps at max-w-page).
    const chapterCols = cardGridColumns(Math.min(windowWidth, 1400) - 32);
    return (
      <View className="flex-1 bg-background">
        <FlatList
          data={page.chapters}
          keyExtractor={(c) => String(c.number)}
          renderItem={({ item }) => <ChapterRow slug={doc.slug} card={item} />}
          // Folds the floating bar to its icons while reading down (lib/nav-compact.ts).
          onScroll={(e) => reportNavScrollJS(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
          ListHeaderComponent={
            <View className="gap-2 pb-3">
              <DocHeader page={page} />
              <DocumentJumpForm
                chapterNumbers={page.chapterNumbers}
                chapterPrefixes={page.chapterPrefixes}
                documents={library}
                currentSlug={doc.slug}
                onSelectDocument={(next) => router.push(`/documents/${next}` as never)}
                onJump={(chapter, verse) => {
                  router.push(
                    (verse
                      ? `/documents/${doc.slug}/${chapter}?verse=${encodeURIComponent(verse)}`
                      : `/documents/${doc.slug}/${chapter}`) as never,
                  );
                  return true;
                }}
              />
            </View>
          }
          key={`cols-${chapterCols}`}
          numColumns={chapterCols}
          columnWrapperClassName={chapterCols > 1 ? "gap-3" : undefined}
          contentContainerClassName="mx-auto w-full max-w-page gap-3 px-4 pb-48 pt-3 sm:px-6 md:pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <PlaybackBar audio={audio} documentTitle={page.title} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <DocumentReader
        rows={page.rows}
        audio={audio}
        documentTitle={page.title}
        scrollToKey={jumpKey}
        scrollToLabel={jumpLabel?.label}
        scrollNonce={jumpLabel?.nonce}
        header={
          <View className="gap-2 pb-3">
            <DocHeader page={page} onJumpChapter={(anchor) => setJumpKey({ key: anchor, nonce: Date.now() })} />
            <DocumentJumpForm
              chapterNumbers={page.chapterNumbers}
              chapterPrefixes={page.chapterPrefixes}
              documents={library}
              currentSlug={doc.slug}
              onSelectDocument={(next) => router.push(`/documents/${next}` as never)}
              onJump={(chapter, verse) => {
                if (verse) {
                  const exists = page.shlokas.some((s) => s.verse_label.trim() === verse);
                  if (!exists) return false;
                  setJumpLabel({ label: verse, nonce: Date.now() });
                  return true;
                }
                if (chapter > 0) {
                  setJumpKey({ key: `chapter-${chapter}`, nonce: Date.now() });
                  return true;
                }
                return false;
              }}
            />
          </View>
        }
      />
    </View>
  );
}
