import { useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDocumentDetail, useDocumentLibraryOptions, type DocumentChapterCard, type DocumentDetailPage } from "@vedic-patro/features/documents";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useDocumentAudio } from "@/lib/documents/use-document-audio";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

function DocHeader({ page, onJumpChapter }: { page: DocumentDetailPage; onJumpChapter?: (anchor: string) => void }) {
  const { header, copy } = page;
  if (!header) return null;
  return (
    <View className="gap-8">
      <DocumentBackLink href="/documents" label={copy.backToList} />
      <View className={documentsClasses.header}>
        <Text className={documentsClasses.headerSanskrit}>{header.sanskrit}</Text>
        <Text className={documentsClasses.headerTitle}>{header.title}</Text>
        {header.subtitle ? <Text className={documentsClasses.headerSubtitle}>{header.subtitle}</Text> : null}
        {header.description ? <Text className={documentsClasses.headerDescription}>{header.description}</Text> : null}
        {header.source ? <Text className={documentsClasses.headerSource}>{header.source}</Text> : null}
      </View>
      {page.stats ? (
        <View className={documentsClasses.statsRow}>
          <Text className={documentsClasses.statsText}>{page.stats[0]}</Text>
          <Text className={documentsClasses.statsText}>·</Text>
          <Text className={documentsClasses.statsText}>{page.stats[1]}</Text>
        </View>
      ) : null}
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
  const title = card.title || card.heading;
  return (
    <Pressable
      onPress={() => router.push(`/documents/${slug}/${card.number}` as never)}
      accessibilityRole="button"
      className={cn(documentsClasses.sectionCard, "mb-0 flex-1 active:opacity-80")}
    >
      <Text className={documentsClasses.sectionCardTitle} numberOfLines={2}>
        {title}
      </Text>
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
  const { doc, copy } = page;
  const audio = useDocumentAudio(page.shlokas, page.fullAudioUrl);
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
    return (
      <View className="flex-1 bg-background">
        <FlatList
          data={page.chapters}
          keyExtractor={(c) => String(c.number)}
          renderItem={({ item }) => <ChapterRow slug={doc.slug} card={item} />}
          ListHeaderComponent={
            <View className="gap-8 pb-8">
              <DocHeader page={page} />
              <DocumentJumpForm
                chapterNumbers={page.chapterNumbers}
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
          numColumns={2}
          columnWrapperClassName="gap-3"
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
          <View className="gap-8 pb-8">
            <DocHeader page={page} onJumpChapter={(anchor) => setJumpKey({ key: anchor, nonce: Date.now() })} />
            <DocumentJumpForm
              chapterNumbers={page.chapterNumbers}
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
