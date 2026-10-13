import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentJumpForm } from "@/components/documents/DocumentJumpForm";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import {
  DOCUMENTS_STALE_TIME,
  documentsKeys,
  fetchDocumentChapter,
  fetchDocumentDetail,
  isNotFound,
} from "@/lib/documents/api";
import { versesToRows } from "@/lib/documents/rows";
import { useDocumentAudio } from "@/lib/documents/use-document-audio";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/domain/utils";

export default function DocumentChapterScreen() {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const { slug, chapter: chapterParam, verse } = useLocalSearchParams<{
    slug: string;
    chapter: string;
    verse?: string;
  }>();
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const valid = Boolean(slug) && Number.isFinite(chapterNumber);

  const docQ = useQuery({
    queryKey: documentsKeys.detail(slug ?? ""),
    queryFn: () => fetchDocumentDetail(slug!),
    enabled: Boolean(slug),
    staleTime: DOCUMENTS_STALE_TIME,
  });
  const chapterQ = useQuery({
    queryKey: documentsKeys.chapter(slug ?? "", chapterNumber),
    queryFn: () => fetchDocumentChapter(slug!, chapterNumber),
    enabled: valid && !docQ.data?.inline_chapters,
    staleTime: DOCUMENTS_STALE_TIME,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
  const data = chapterQ.data;

  const shlokas = useMemo(() => data?.chapter.shlokas ?? [], [data]);
  const rows = useMemo(() => versesToRows(shlokas), [shlokas]);
  const audio = useDocumentAudio(shlokas, data?.full_audio_url);
  const [jump, setJump] = useState<{ label: string; nonce: number } | null>(null);

  if (docQ.data?.inline_chapters && slug) {
    return <Redirect href={`/documents/${slug}` as never} />;
  }

  const backHref = slug ? `/documents/${slug}` : "/documents";
  const backLabel = t("documents.back_to_chapters");
  const frame = (children: React.ReactNode) => (
    <View className={cn("flex-1 gap-4 bg-background", documentsClasses.frame)}>
      <DocumentBackLink href={backHref} label={backLabel} />
      {children}
    </View>
  );

  if (!valid || (chapterQ.isError && isNotFound(chapterQ.error))) {
    return frame(<Text className={documentsClasses.mutedText}>{t("documents.not_found")}</Text>);
  }
  if (chapterQ.isError) {
    return frame(<ErrorState message={t("documents.load_error")} onRetry={() => void chapterQ.refetch()} />);
  }
  if (!data) return frame(<LoadingState />);

  const docTitle = lang === "ne" ? data.title_ne || data.title_en : data.title_en || data.title_ne;
  const chapterTitle =
    lang === "ne" ? data.chapter.title_ne || data.chapter.title_en : data.chapter.title_en || data.chapter.title_ne;
  const numbers = (docQ.data?.chapters ?? [])
    .map((c) => c.number)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const idx = numbers.indexOf(chapterNumber);
  const prev = idx > 0 ? numbers[idx - 1]! : null;
  const next = idx >= 0 && idx < numbers.length - 1 ? numbers[idx + 1]! : null;
  const go = (n: number) => router.replace(`/documents/${slug}/${n}` as never);

  const header = (
    <View className="gap-8 pb-8">
      <DocumentBackLink href={backHref} label={backLabel} />
      <View className={documentsClasses.header}>
        <View className={documentsClasses.chapterTitleRow}>
          <Text className={cn(documentsClasses.headerSanskrit, "min-w-0 flex-1")} numberOfLines={1}>
            {docTitle}
          </Text>
          {numbers.length > 0 ? (
            <Text className={documentsClasses.chapterProgress}>
              {t("documents.chapter_progress", { current: digits(chapterNumber), total: digits(numbers.length) })}
            </Text>
          ) : null}
        </View>
        <View className={documentsClasses.statsRow}>
          <View className={documentsClasses.chapterBubble}>
            <Text className={documentsClasses.chapterBubbleText}>{digits(chapterNumber)}</Text>
          </View>
          <View className={documentsClasses.fill}>
            <Text className={documentsClasses.chapterTitle}>{t("documents.chapter_label", { number: digits(chapterNumber) })}</Text>
            {chapterTitle ? (
              <Text className={documentsClasses.chapterTitleSub}>{chapterTitle}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <DocumentJumpForm
        chapterNumbers={numbers}
        currentChapter={chapterNumber}
        onJump={(_, label) => {
          const exists = shlokas.some((s) => s.verse_label.trim() === label);
          if (exists) setJump({ label, nonce: Date.now() });
          return exists;
        }}
      />
    </View>
  );

  const footer = (
    <View className={cn(documentsClasses.pager, "mt-8")}>
      {prev != null ? (
        <Pressable
          onPress={() => go(prev)}
          accessibilityRole="button"
          className={documentsClasses.pagerButton}
        >
          <Ionicons name="chevron-back" size={16} color={colors.foreground} />
          <Text className={documentsClasses.pagerButtonText}>{t("documents.prev_chapter")}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {next != null ? (
        <Pressable
          onPress={() => go(next)}
          accessibilityRole="button"
          className={documentsClasses.pagerButton}
        >
          <Text className={documentsClasses.pagerButtonText}>{t("documents.next_chapter")}</Text>
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
        rows={rows}
        audio={audio}
        documentTitle={docTitle}
        header={header}
        footer={footer}
        scrollToLabel={jump?.label ?? (typeof verse === "string" ? verse : null)}
        scrollNonce={jump?.nonce}
      />
    </View>
  );
}
