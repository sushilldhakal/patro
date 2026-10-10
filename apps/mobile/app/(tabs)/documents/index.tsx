import { useMemo } from "react";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { DOCUMENT_CATEGORY_GROUPS, isDocumentCategoryId } from "@vedic-patro/domain/document-categories";
import { documentsKeys, fetchDocuments } from "@/lib/documents/api";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";

export default function DocumentsScreen() {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ category?: string }>();
  const active =
    typeof params.category === "string" && isDocumentCategoryId(params.category) ? params.category : "all";

  const docsQ = useQuery({
    queryKey: documentsKeys.list(),
    queryFn: fetchDocuments,
    // The list is what changes when a document is added; re-check each visit.
    staleTime: 0,
  });
  const documents = useMemo(() => docsQ.data?.documents ?? [], [docsQ.data]);

  const groups = useMemo(
    () =>
      DOCUMENT_CATEGORY_GROUPS.map((group) => ({
        group,
        docs: documents.filter((d) => d.category === group.id),
      })).filter((entry) => entry.docs.length > 0),
    [documents],
  );
  const visible = active === "all" ? groups : groups.filter((entry) => entry.group.id === active);

  const select = (id: string) => router.setParams({ category: id === "all" ? undefined : id } as never);

  const chip = (id: string, label: string, count?: number) => {
    const selected = active === id;
    return (
      <Pressable
        key={id}
        onPress={() => select(id)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        className={cn(
          "flex-row items-center rounded-lg px-3 py-1.5",
          selected ? "border border-border bg-card shadow-sm" : "border border-transparent",
        )}
      >
        <Text className={cn("text-body font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>
          {label}
          {count != null ? `  ${digits(count)}` : ""}
        </Text>
      </Pressable>
    );
  };

  return (
    <AppShell title={t("documents.page_title")} showHeader={false}>
      <PatroPageHeader
        icon={<AppNavIcon name="book-open" size={24} color={colors.secondary} />}
        title={t("documents.page_title")}
        subtitle={t("documents.page_subtitle")}
      />
      {docsQ.isLoading ? (
        <LoadingState />
      ) : docsQ.isError ? (
        <ErrorState message={t("documents.load_error")} onRetry={() => void docsQ.refetch()} />
      ) : documents.length === 0 ? (
        <Text className="text-body text-muted-foreground">{t("documents.empty")}</Text>
      ) : (
        <>
          <View
            className="mb-6 flex-row flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1"
            accessibilityRole="tablist"
            accessibilityLabel={t("documents.category_tabs_label")}
          >
            {chip("all", t("documents.category.all"))}
            {groups.map(({ group, docs }) =>
              chip(group.id, `${group.emoji} ${lang === "ne" ? group.ne : group.en}`, docs.length),
            )}
          </View>
          {visible.map(({ group, docs }, i) => (
            <View key={group.id} className="mb-5">
              <View className="mb-3 flex-row items-end justify-between border-b border-border pb-2">
                <Text className="text-title font-bold">
                  {digits(i + 1)}. {group.emoji} {lang === "ne" ? group.ne : group.en}
                </Text>
                <Text className="text-caption font-semibold text-muted-foreground">{digits(docs.length)}</Text>
              </View>
              {docs.map((doc) => (
                <DocumentCard key={doc.slug} doc={doc} />
              ))}
            </View>
          ))}
        </>
      )}
    </AppShell>
  );
}
