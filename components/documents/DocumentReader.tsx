import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ShlokaCard } from "@/components/documents/ShlokaCard";
import type { Shloka } from "@/lib/documents/api";
import { suktaAttribution } from "@/lib/documents/sukta-attribution";
import type { ReaderRow } from "@/lib/documents/rows";
import type { DocumentAudio } from "@/lib/documents/use-document-audio";
import { useLocale } from "@/lib/i18n";
import { PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";

interface Props {
  rows: ReaderRow[];
  audio: DocumentAudio;
  documentTitle: string;
  header?: ReactNode;
  footer?: ReactNode;
  /** Verse label to scroll to once the list has laid out (deep link / jump). */
  scrollToLabel?: string | null;
  /** Bumped by the caller to re-trigger scrollToLabel for the same label. */
  scrollNonce?: number;
}

/**
 * Virtualised verse list with the shared transport bar. The active verse is
 * scrolled to centre as playback advances.
 */
export function DocumentReader({
  rows,
  audio,
  documentTitle,
  header,
  footer,
  scrollToLabel,
  scrollNonce,
}: Props) {
  const { t, lang, digits } = useLocale();
  const listRef = useRef<FlatList<ReaderRow>>(null);
  const hasFull = audio.full.available;

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

  useEffect(() => {
    if (audio.activeId == null) return;
    const i = indexByVerseId.get(audio.activeId);
    if (i != null) scrollToIndex(i);
  }, [audio.activeId, indexByVerseId, scrollToIndex]);

  useEffect(() => {
    if (!scrollToLabel) return;
    const wanted = scrollToLabel.trim();
    const i = rows.findIndex((r) => r.kind === "verse" && r.shloka.verse_label.trim() === wanted);
    if (i >= 0) {
      const id = setTimeout(() => scrollToIndex(i), 250);
      return () => clearTimeout(id);
    }
  }, [scrollToLabel, scrollNonce, rows, scrollToIndex]);

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
        const n = item.chapter.number!;
        const title = lang === "ne" ? item.chapter.title_ne || item.chapter.title_en : item.chapter.title_en || item.chapter.title_ne;
        return (
          <View className="mb-3 mt-5 flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
              <Text className="text-base font-bold text-secondary">{digits(n)}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-bold">{t("documents.chapter_label", { number: digits(n) })}</Text>
              {title ? <Text className="text-sm text-muted-foreground">{title}</Text> : null}
            </View>
          </View>
        );
      }
      if (item.kind === "sukta") {
        const parts = [
          item.rishi ? `${t("documents.sukta_rishi")}: ${suktaAttribution(lang, item.rishi)}` : null,
          item.devata ? `${t("documents.sukta_devata")}: ${suktaAttribution(lang, item.devata)}` : null,
          item.chhanda ? `${t("documents.sukta_chhanda")}: ${suktaAttribution(lang, item.chhanda)}` : null,
        ].filter(Boolean);
        return (
          <View className="mb-2 mt-3">
            <Text className="text-sm font-bold text-secondary" style={lang === "ne" ? nepaliTextStyle(14) : undefined}>
              {t("documents.sukta_label", { number: digits(item.number) })}
            </Text>
            {parts.length ? (
              <Text className="mt-0.5 text-xs text-muted-foreground" style={lang === "ne" ? nepaliTextStyle(13) : undefined}>
                {parts.join(" · ")}
              </Text>
            ) : null}
          </View>
        );
      }
      const { shloka } = item;
      const isActive = audio.activeId === shloka.id;
      return (
        <ShlokaCard
          shloka={shloka}
          isActive={isActive}
          isPlaying={isActive && audio.activePlaying}
          progress={isActive ? audio.activeProgress : 0}
          meaningOpen={audio.openMeaningIds.has(shloka.id)}
          playsFromFull={!shloka.audio_url && hasFull && shloka.full_audio_start != null}
          onPlay={onPlay}
          onToggleMeaning={audio.toggleMeaning}
        />
      );
    },
    [audio, hasFull, lang, t, digits, onPlay],
  );

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        ListHeaderComponent={<View>{header}</View>}
        ListFooterComponent={<View>{footer}</View>}
        contentContainerStyle={{
          paddingHorizontal: PAGE_HORIZONTAL_PADDING,
          paddingTop: 16,
          paddingBottom: 190,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
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
      <PlaybackBar audio={audio} documentTitle={documentTitle} />
    </View>
  );
}
