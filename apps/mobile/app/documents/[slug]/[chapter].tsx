import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useDocumentChapter, useDocumentLibraryOptions } from "@vedic-patro/features/documents";
import { DocumentBackLink } from "@/components/documents/DocumentBackLink";
import { DocumentJumpForm } from "@vedic-patro/ui/kit/jyotish";
import { DocumentReader } from "@/components/documents/DocumentReader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useDocumentAudio } from "@/lib/documents/use-document-audio";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/** One chapter of a chaptered document — the app's drawing of `useDocumentChapter` (@vedic-patro/features). */
export default function DocumentChapterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { slug, chapter: chapterParam, verse } = useLocalSearchParams<{ slug: string; chapter: string; verse?: string }>();
  const chapterNumber = chapterParam != null ? Number(chapterParam) : NaN;
  const page = useDocumentChapter(slug, chapterNumber);
  const library = useDocumentLibraryOptions();
  const { copy } = page;
  const audio = useDocumentAudio(page.shlokas, page.fullAudioUrl, page.docTitle);
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
    <View className="gap-8 pb-8">
      <DocumentBackLink href={backHref} label={copy.backToChapters} />
      <View className={documentsClasses.header}>
        <View className={documentsClasses.chapterTitleRow}>
          <Text className={cn(documentsClasses.headerSanskrit, "min-w-0 flex-1")} numberOfLines={1}>
            {page.docTitle}
          </Text>
          {page.progress ? <Text className={documentsClasses.chapterProgress}>{page.progress}</Text> : null}
        </View>
        <Text className={documentsClasses.chapterTitle}>{page.displayTitle}</Text>
      </View>
      <DocumentJumpForm
        chapterNumbers={page.chapterNumbers}
        currentChapter={chapterNumber}
        documents={library}
        currentSlug={slug}
        onSelectDocument={(next) => router.push(`/documents/${next}` as never)}
        onJump={(chapter, label) => {
          if (chapter !== chapterNumber) {
            router.push(
              (label
                ? `/documents/${slug}/${chapter}?verse=${encodeURIComponent(label)}`
                : `/documents/${slug}/${chapter}`) as never,
            );
            return true;
          }
          if (!label) return true;
          const exists = page.shlokas.some((s) => s.verse_label.trim() === label);
          if (exists) setJump({ label, nonce: Date.now() });
          return exists;
        }}
      />
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
        header={header}
        footer={footer}
        scrollToLabel={jump?.label ?? (typeof verse === "string" ? verse : null)}
        scrollNonce={jump?.nonce}
      />
    </View>
  );
}
