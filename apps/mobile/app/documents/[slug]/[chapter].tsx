import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Redirect, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useDocumentChapter, useDocumentLibraryOptions } from "@vedic-patro/features/documents";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentGroupHeading, DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useDocumentAudioSession } from "@/lib/documents/document-audio-session";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/** One chapter of a chaptered document — the app's drawing of `useDocumentChapter` (@vedic-patro/features). */
export default function DocumentChapterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { slug, chapter: chapterParam, verse } = useLocalSearchParams<{ slug: string; chapter: string; verse?: string }>();
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const initialVerse = typeof verse === "string" ? verse : undefined;
  const page = useDocumentChapter(slug, chapterNumber, { verse: initialVerse });
  const library = useDocumentLibraryOptions();
  const { copy } = page;
  // The shared player: it keeps playing after the reader leaves this page.
  const audio = useDocumentAudioSession({
    key: `${slug}:${chapterParam}`,
    route: usePathname(),
    shlokas: page.shlokas,
    fullAudioUrl: page.fullAudioUrl,
    documentTitle: page.docTitle,
    complete: page.complete,
    chapterTitle: page.displayTitle,
  });
  const waitingForPage = useRef(false);
  useEffect(() => {
    const id = audio.activeId;
    if (id == null) return;
    const at = page.shlokas.findIndex((s) => s.id === id);
    if (at < 0) return;
    // A paused verse loads nothing around itself; scrolling loads pages then.
    if (!audio.activePlaying) return;
    waitingForPage.current = at === page.shlokas.length - 1 && page.hasNextPage && !audio.hasNext;
    if (page.hasNextPage && at >= page.shlokas.length - 8) void page.fetchNextPage();
    if (page.hasPreviousPage && at <= 2) void page.fetchPreviousPage();
  }, [audio.activeId, audio.activePlaying, audio.hasNext, page.shlokas, page.hasNextPage, page.hasPreviousPage, page.fetchNextPage, page.fetchPreviousPage]);
  useEffect(() => {
    if (!waitingForPage.current || audio.activePlaying || audio.activeProgress > 0.02) return;
    if (audio.hasNext) {
      waitingForPage.current = false;
      audio.nextVerse();
    }
  }, [audio.activePlaying, audio.activeProgress, audio.hasNext, audio.nextVerse, page.shlokas]);
  const [jump, setJump] = useState<{ label: string; nonce: number } | null>(null);

  if (page.redirectToDocument && slug) {
    return <Redirect href={`/documents/${slug}` as never} />;
  }

  const backHref = slug ? `/documents/${slug}` : "/documents";
  const frame = (children: React.ReactNode) => (
    <View className={cn("flex-1 gap-4 bg-background", documentsClasses.frame)}>
      <DocumentBackLink href={backHref} label={copy.backToChapters} />
      {children}
    </View>
  );

  if (page.status === "not-found") return frame(<Text className={documentsClasses.mutedText}>{copy.notFound}</Text>);
  if (page.status === "error") return frame(<ErrorState message={copy.loadError} onRetry={page.retry} />);
  if (page.status === "loading") return frame(<LoadingState />);

  const go = (n: number) => router.replace(`/documents/${slug}/${n}` as never);

  const header = (
    <View className="gap-2 pb-3">
      <View className={documentsClasses.readerBar}>
        <View className={documentsClasses.readerBarSlot}>
          <DocumentBackLink href={backHref} label={copy.backToChapters} />
        </View>
        <View className={documentsClasses.readerBarHeading}>
          <Text className={documentsClasses.readerBarName} numberOfLines={1}>
            {page.docTitle}
          </Text>
          {page.displayTitle ? (
            <Text className={documentsClasses.readerBarChapter} numberOfLines={1}>
              {page.displayTitle}
            </Text>
          ) : null}
        </View>
        <Text className={cn(documentsClasses.readerBarSlot, documentsClasses.readerBarSide)} numberOfLines={1}>
          {page.progress}
        </Text>
      </View>
      <DocumentJumpForm
        chapterNumbers={page.chapterNumbers}
        chapterPrefixes={page.chapterPrefixes}
        currentChapter={chapterNumber}
        documents={library}
        currentSlug={slug}
        onSelectDocument={(next) => router.push(`/documents/${next}` as never)}
        onJump={async (chapter, label) => {
          if (chapter !== chapterNumber) {
            router.push(
              (label
                ? `/documents/${slug}/${chapter}?verse=${encodeURIComponent(label)}`
                : `/documents/${slug}/${chapter}`) as never,
            );
            return true;
          }
          if (!label) return true;
          const ok = await page.focusVerse(label);
          if (ok) setJump({ label, nonce: Date.now() });
          return ok;
        }}
      />
      {audio.full.available ? (
        // A chapter with one recording of its own (an Atharvaveda kanda): play all of it from here.
        <DocumentGroupHeading
          kind="chapter"
          heading={page.displayTitle || page.docTitle}
          play={{
            playing: audio.mode === "full" && audio.full.playing,
            onPress: () => (audio.mode === "full" ? audio.toggleFull() : audio.startFull()),
          }}
        />
      ) : null}
    </View>
  );

  const footer = (
    <View className={cn(documentsClasses.pager, "mt-8")}>
      {page.prev != null ? (
        <Pressable onPress={() => go(page.prev!)} accessibilityRole="button" className={documentsClasses.pagerButton}>
          <Ionicons name="chevron-back" size={16} color={colors.foreground} />
          <Text className={documentsClasses.pagerButtonText}>{copy.prevChapter}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {page.next != null ? (
        <Pressable onPress={() => go(page.next!)} accessibilityRole="button" className={documentsClasses.pagerButton}>
          <Text className={documentsClasses.pagerButtonText}>{copy.nextChapter}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
        </Pressable>
      ) : (
        <View />
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <DocumentReader
        key={`${slug}-${chapterNumber}`}
        rows={page.rows}
        audio={audio}
        documentTitle={page.docTitle}
        chapterTitle={page.displayTitle || undefined}
        header={header}
        footer={footer}
        scrollToLabel={jump?.label ?? (typeof verse === "string" ? verse : null)}
        scrollNonce={jump?.nonce}
        loadingPrev={page.isFetchingPreviousPage}
        loadingNext={page.isFetchingNextPage}
        loadingLabel={copy.loadingMore}
        onStartReached={() => {
          if (page.hasPreviousPage && !page.isFetchingPreviousPage) void page.fetchPreviousPage();
        }}
        onEndReached={() => {
          if (page.hasNextPage && !page.isFetchingNextPage) void page.fetchNextPage();
        }}
      />
    </View>
  );
}
