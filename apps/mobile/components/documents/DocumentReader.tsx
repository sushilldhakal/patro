import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { FlatList, Image, View } from "react-native";
import { spaceUnit } from "@vedic-patro/design-tokens";
import { Text } from "@/components/ui/Text";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ShlokaCard } from "@/components/documents/ShlokaCard";
import type { Shloka } from "@/lib/documents/api";
import { canonVerseLabel, playsFromFullRecording, type ReaderRow } from "@vedic-patro/features/documents";
import { DocumentGroupHeading } from "@vedic-patro/ui/kit/jyotish";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { reportNavScrollJS } from "@/lib/nav-compact";

const LIST_BOTTOM_INSET = 48 * spaceUnit;

interface Props {
  rows: ReaderRow[];
  audio: DocumentAudio;
  documentTitle: string;
  /** The chapter a full recording belongs to (an Atharvaveda kanda), named in the bar. */
  chapterTitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  /** Verse label to scroll to once the list has laid out (deep link / jump). */
  scrollToLabel?: string | null;
  /** Bumped by the caller to re-trigger scrollToLabel for the same label. */
  scrollNonce?: number;
  /** Scroll to a row by its key (chapter jump pills). */
  scrollToKey?: { key: string; nonce: number } | null;
  /** Load the next page of a chapter. Omitted on documents that already hold every verse. */
  onEndReached?: () => void;
  /** Load the previous page after a jump into the middle. */
  onStartReached?: () => void;
  loadingNext?: boolean;
  loadingPrev?: boolean;
  loadingLabel?: string;
}

/**
 * Virtualised verse list with the shared transport bar. The active verse is
 * scrolled to centre as playback advances.
 */
export function DocumentReader({
  rows,
  audio,
  documentTitle,
  chapterTitle,
  header,
  footer,
  scrollToLabel,
  scrollNonce,
  scrollToKey,
  onEndReached,
  onStartReached,
  loadingNext = false,
  loadingPrev = false,
  loadingLabel,
}: Props) {
  const { lang } = useLocale();
  const listRef = useRef<FlatList<ReaderRow>>(null);
  const hasFull = audio.full.available;
  const edges = useRef(false);
  useEffect(() => {
    edges.current = false;
    const t = setTimeout(() => {
      edges.current = true;
    }, 800);
    return () => clearTimeout(t);
  }, [scrollToLabel, scrollNonce]);

  const indexByVerseId = useMemo(() => {
    const map = new Map<number, number>();
    rows.forEach((r, i) => {
      if (r.kind === "verse") map.set(r.shloka.id, i);
    });
    return map;
  }, [rows]);

  const scrollToIndex = useCallback((index: number) => {
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, viewPosition: 0.35, animated: true });
  }, []);

  // Follow the sounding verse when it changes — not again when a page loads, or a paused verse
  // would pull the reader back every time scrolling loads more.
  const followed = useRef<number | null>(null);
  useEffect(() => {
    if (audio.activeId == null) {
      followed.current = null;
      return;
    }
    if (followed.current === audio.activeId) return;
    const i = indexByVerseId.get(audio.activeId);
    if (i == null) return;
    followed.current = audio.activeId;
    scrollToIndex(i);
  }, [audio.activeId, indexByVerseId, scrollToIndex]);

  // A jump (search or deep link) scrolls to its verse once, as soon as its row is there. Pages
  // loaded later by scrolling up or down must not send the reader back to it.
  const jumped = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollToLabel) return;
    const jumpKey = `${scrollToLabel}|${scrollNonce ?? 0}`;
    if (jumped.current === jumpKey) return;
    const wanted = canonVerseLabel(scrollToLabel);
    const i = rows.findIndex((r) => r.kind === "verse" && canonVerseLabel(r.shloka.verse_label) === wanted);
    if (i < 0) return;
    // Marked done when the scroll fires: rows changing inside the delay re-run this with the new
    // index instead of cancelling the jump for good.
    const id = setTimeout(() => {
      jumped.current = jumpKey;
      scrollToIndex(i);
    }, 250);
    return () => clearTimeout(id);
  }, [scrollToLabel, scrollNonce, rows, scrollToIndex]);

  useEffect(() => {
    if (!scrollToKey) return;
    const i = rows.findIndex((r) => r.key === scrollToKey.key);
    if (i >= 0) listRef.current?.scrollToIndex({ index: i, viewPosition: 0, animated: true });
  }, [scrollToKey, rows]);

  const onPlay = useCallback(
    (shloka: Shloka) => {
      if (shloka.audio_url) audio.toggleVerse(shloka.id);
      else audio.playFullAt(shloka.id);
    },
    [audio],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReaderRow }) => {
      if (item.kind === "chapter") {
        return (
          <View className={cn(documentsClasses.statsRow, "mb-3 mt-10")}>
            <View className={documentsClasses.chapterBubble}>
              <Text className={documentsClasses.chapterBubbleText}>{item.numberLabel}</Text>
            </View>
            <View className={documentsClasses.fill}>
              <Text className={documentsClasses.chapterHeading}>{item.heading}</Text>
              {item.title ? <Text className={documentsClasses.chapterHeadingSub}>{item.title}</Text> : null}
            </View>
          </View>
        );
      }
      if (item.kind === "sukta") {
        const sukta = item.sukta;
        if (audio.sukta.has(sukta)) {
          // One continuous file for the whole sukta: play it from the heading.
          return (
            <DocumentGroupHeading
              heading={item.heading}
              meta={item.meta}
              play={{ playing: audio.sukta.playing === sukta, onPress: () => audio.sukta.toggle(sukta) }}
            />
          );
        }
        return (
          <View className="mb-3 mt-3">
            <Text className={documentsClasses.suktaLabel} style={lang === "ne" ? nepaliTextStyle(14) : undefined}>
              {item.heading}
            </Text>
            {item.meta ? (
              <Text className={documentsClasses.suktaMeta} style={lang === "ne" ? nepaliTextStyle(13) : undefined}>
                {item.meta}
              </Text>
            ) : null}
          </View>
        );
      }
      if (item.kind === "images") {
        return (
          <View className={cn(documentsClasses.chapterImages, "mb-3")}>
            {item.urls.map((url) => (
              <Image key={url} source={{ uri: url }} className={documentsClasses.chapterImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            ))}
          </View>
        );
      }
      const { shloka } = item;
      const isActive = audio.activeId === shloka.id;
      return (
        <ShlokaCard
          // A play button only once the verse's recording is confirmed in storage.
          shloka={audio.verifiedIds.has(shloka.id) ? shloka : { ...shloka, audio_url: null }}
          isActive={isActive}
          isPlaying={isActive && audio.activePlaying}
          progress={isActive ? audio.activeProgress : 0}
          meaningOpen={audio.openMeaningIds.has(shloka.id)}
          playsFromFull={playsFromFullRecording(shloka, hasFull)}
          onPlay={onPlay}
          onToggleMeaning={audio.toggleMeaning}
        />
      );
    },
    [audio, hasFull, lang, onPlay],
  );

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            {header}
            {loadingPrev && loadingLabel ? <Text className={documentsClasses.edgeNote}>{loadingLabel}</Text> : null}
          </View>
        }
        ListFooterComponent={
          <View>
            {loadingNext && loadingLabel ? <Text className={documentsClasses.edgeNote}>{loadingLabel}</Text> : null}
            {footer}
          </View>
        }
        onEndReached={() => {
          if (edges.current) onEndReached?.();
        }}
        onEndReachedThreshold={0.6}
        onStartReached={() => {
          if (edges.current) onStartReached?.();
        }}
        onStartReachedThreshold={0.6}
        maintainVisibleContentPosition={onStartReached ? { minIndexForVisible: 1 } : undefined}
        contentContainerClassName="mx-auto w-full max-w-page px-4 pt-3 sm:px-6 md:pt-4"
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_INSET }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        // Folds the floating bar to its icons while reading down (lib/nav-compact.ts).
        onScroll={(e) => reportNavScrollJS(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
        windowSize={9}
        onScrollToIndexFailed={(info) => {
          // Row not measured yet: jump near it, then retry once it has rendered.
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(() => scrollToIndex(info.index), 120);
        }}
      />
      <PlaybackBar audio={audio} documentTitle={documentTitle} chapterTitle={chapterTitle} />
    </View>
  );
}
