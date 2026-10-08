import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentJumpForm } from "@/components/documents/DocumentJumpForm";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { PlaybackBar } from "@/components/documents/PlaybackBar";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocumentDetail,
  flattenShlokas,
  isNotFound,
  type DocumentChapter,
  type DocumentDetail,
} from "@/lib/documents/api";
import { inlineChapterRows, versesToRows } from "@/lib/documents/rows";
import { useDocumentAudio } from "@/lib/documents/use-document-audio";
import { useLocale } from "@/lib/i18n";
import { PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { useThemeColors } from "@/lib/theme-context";

function DocHeader({
  doc,
  chapterPills,
  onJumpChapter,
}: {
  doc: DocumentDetail;
  chapterPills?: number[];
  onJumpChapter?: (n: number) => void;
}) {
  const { t, lang, digits } = useLocale();
  const title = lang === "ne" ? doc.title_ne || doc.title_en : doc.title_en || doc.title_ne;
  const subtitle = lang === "ne" ? doc.subtitle_ne || doc.subtitle_en : doc.subtitle_en || doc.subtitle_ne;
  const description = lang === "ne" ? doc.description_ne || doc.description_en : doc.description_en || doc.description_ne;
  const source = lang === "ne" ? doc.source_ne || doc.source_en : doc.source_en || doc.source_ne;
  return (
    <View className="mb-4">
      <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
      <Text className="text-sm font-medium text-secondary">{doc.title_sa}</Text>
      <Text className="mt-1 text-2xl font-bold">{title}</Text>
      {subtitle ? <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text> : null}
      {description ? <Text className="mt-2 text-sm text-muted-foreground">{description}</Text> : null}
      {source ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          {t("documents.source")}: {source}
        </Text>
      ) : null}
      {doc.has_chapters ? (
        <Text className="mt-3 text-xs font-semibold text-muted-foreground">
          {t("documents.chapters_count", { count: digits(doc.chapter_count) })} ·{" "}
          {t("documents.shlokas_count", { count: digits(doc.shloka_count) })}
        </Text>
      ) : null}
      {chapterPills && chapterPills.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 grow-0"
          accessibilityLabel={t("documents.chapter_nav")}
        >
          {chapterPills.map((n) => (
            <Pressable
              key={n}
              onPress={() => onJumpChapter?.(n)}
              accessibilityRole="button"
              className="mr-1.5 h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70"
            >
              <Text className="text-sm font-bold text-muted-foreground">{digits(n)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ChapterRow({ slug, chapter }: { slug: string; chapter: DocumentChapter }) {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  if (chapter.number == null) return null;
  const title = lang === "ne" ? chapter.title_ne || chapter.title_en : chapter.title_en || chapter.title_ne;
  return (
    <Pressable
      onPress={() => router.push(`/documents/${slug}/${chapter.number}` as never)}
      accessibilityRole="button"
      className="mb-2 flex-row items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
        <Text className="text-sm font-bold text-secondary">{digits(chapter.number)}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold" numberOfLines={1}>
          {t("documents.chapter_label", { number: digits(chapter.number) })}
        </Text>
        {title ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {chapter.shloka_count != null ? (
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {t("documents.shlokas_count", { count: digits(chapter.shloka_count) })}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function DocumentDetailScreen() {
  const { t, lang } = useLocale();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
  const doc = docQ.data;

  const shlokas = useMemo(() => (doc ? flattenShlokas(doc) : []), [doc]);
  const audio = useDocumentAudio(shlokas, doc?.full_audio_url);
  const [jumpKey, setJumpKey] = useState<{ key: string; nonce: number } | null>(null);

  const inlineChapters = useMemo(
    () => (doc?.inline_chapters ? doc.chapters.filter((c) => (c.shlokas?.length ?? 0) > 0) : []),
    [doc],
  );
  const rows = useMemo(() => {
    if (!doc) return [];
    if (inlineChapters.length > 1) return inlineChapterRows(inlineChapters);
    return versesToRows(shlokas);
  }, [doc, inlineChapters, shlokas]);

  if (docQ.isLoading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING, paddingTop: 16 }}>
        <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
        <LoadingState />
      </View>
    );
  }
  if (docQ.isError || !doc) {
    return (
      <View className="flex-1 bg-background" style={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING, paddingTop: 16 }}>
        <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
        {isNotFound(docQ.error) ? (
          <Text className="text-sm text-muted-foreground">{t("documents.not_found")}</Text>
        ) : (
          <ErrorState message={t("documents.load_error")} onRetry={() => void docQ.refetch()} />
        )}
      </View>
    );
  }

  const title = lang === "ne" ? doc.title_ne || doc.title_en : doc.title_en || doc.title_ne;

  // Paginated books (Gita, Ashtavakra): chapter cards, verses on their own screen.
  if (doc.has_chapters && !doc.inline_chapters) {
    const numbers = doc.chapters.map((c) => c.number).filter((n): n is number => n != null);
    return (
      <View className="flex-1 bg-background">
        <FlatList
          data={doc.chapters}
          keyExtractor={(c) => String(c.number ?? "single")}
          renderItem={({ item }) => <ChapterRow slug={doc.slug} chapter={item} />}
          ListHeaderComponent={
            <View>
              <DocHeader doc={doc} />
              <DocumentJumpForm
                chapterNumbers={numbers}
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
          contentContainerStyle={{ paddingHorizontal: PAGE_HORIZONTAL_PADDING, paddingTop: 16, paddingBottom: 190 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <PlaybackBar audio={audio} documentTitle={title} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <DocumentReader
        rows={rows}
        audio={audio}
        documentTitle={title}
        scrollToKey={jumpKey}
        header={
          <DocHeader
            doc={doc}
            chapterPills={
              inlineChapters.length > 1
                ? inlineChapters.map((c) => c.number).filter((n): n is number => n != null)
                : undefined
            }
            onJumpChapter={(n) => setJumpKey({ key: `chapter-${n}`, nonce: Date.now() })}
          />
        }
      />
    </View>
  );
}
