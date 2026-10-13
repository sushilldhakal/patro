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
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

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
    <View className="gap-8">
      <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
      <View className={documentsClasses.header}>
        <Text className={documentsClasses.headerSanskrit}>{doc.title_sa}</Text>
        <Text className={documentsClasses.headerTitle}>{title}</Text>
        {subtitle ? <Text className={documentsClasses.headerSubtitle}>{subtitle}</Text> : null}
        {description ? <Text className={documentsClasses.headerDescription}>{description}</Text> : null}
        {source ? (
          <Text className={documentsClasses.headerSource}>
            {t("documents.source")}: {source}
          </Text>
        ) : null}
      </View>
      {doc.has_chapters ? (
        <View className={documentsClasses.statsRow}>
          <Text className={documentsClasses.statsText}>
            {t("documents.chapters_count", { count: digits(doc.chapter_count) })}
          </Text>
          <Text className={documentsClasses.statsText}>·</Text>
          <Text className={documentsClasses.statsText}>
            {t("documents.shlokas_count", { count: digits(doc.shloka_count) })}
          </Text>
        </View>
      ) : null}
      {chapterPills && chapterPills.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="grow-0"
          contentContainerClassName="gap-1.5 pb-1"
          accessibilityLabel={t("documents.chapter_nav")}
        >
          {chapterPills.map((n) => (
            <Pressable
              key={n}
              onPress={() => onJumpChapter?.(n)}
              accessibilityRole="button"
              className={cn(documentsClasses.chapterPill, "active:opacity-70")}
            >
              <Text className={documentsClasses.chapterPillText}>{digits(n)}</Text>
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
      className={cn(documentsClasses.chapterRow, "mb-2 active:opacity-80")}
    >
      <View className={documentsClasses.chapterRowNumber}>
        <Text className={documentsClasses.chapterRowNumberText}>{digits(chapter.number)}</Text>
      </View>
      <View className={documentsClasses.fill}>
        <Text className={documentsClasses.chapterRowTitle} numberOfLines={1}>
          {t("documents.chapter_label", { number: digits(chapter.number) })}
        </Text>
        {title ? (
          <Text className={documentsClasses.chapterRowSub} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {chapter.shloka_count != null ? (
          <Text className={documentsClasses.chapterRowCount}>
            {t("documents.shlokas_count", { count: digits(chapter.shloka_count) })}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
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
      <View className={cn("flex-1 bg-background", documentsClasses.frame)}>
        <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
        <LoadingState />
      </View>
    );
  }
  if (docQ.isError || !doc) {
    return (
      <View className={cn("flex-1 bg-background", documentsClasses.frame)}>
        <DocumentBackLink href="/documents" label={t("documents.back_to_list")} />
        {isNotFound(docQ.error) ? (
          <Text className={documentsClasses.notFound}>{t("documents.not_found")}</Text>
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
            <View className="gap-8 pb-8">
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
          contentContainerClassName="mx-auto w-full max-w-page px-4 pb-48 pt-8 sm:px-6"
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
          <View className="pb-8">
          <DocHeader
            doc={doc}
            chapterPills={
              inlineChapters.length > 1
                ? inlineChapters.map((c) => c.number).filter((n): n is number => n != null)
                : undefined
            }
            onJumpChapter={(n) => setJumpKey({ key: `chapter-${n}`, nonce: Date.now() })}
          />
          </View>
        }
      />
    </View>
  );
}
