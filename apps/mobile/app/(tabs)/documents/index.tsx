import { useMemo } from "react";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

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
          documentsClasses.tab,
          "flex-row items-center border",
          selected ? cn(documentsClasses.tabSelected, "border-border/60") : "border-transparent",
        )}
      >
        <Text className={cn(documentsClasses.tabLabel, selected ? documentsClasses.tabLabelSelected : documentsClasses.tabLabelIdle)}>
          {label}
        </Text>
        {count != null ? <Text className={documentsClasses.tabCount}>{digits(count)}</Text> : null}
      </Pressable>
    );
  };

  return (
    <AppShell title={t("documents.page_title")} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="book-open" size={24} color={colors.secondary} />}
          title={t("documents.page_title")}
          subtitle={t("documents.page_subtitle")}
        />
        {docsQ.isLoading ? (
          <LoadingState />
        ) : docsQ.isError ? (
          <ErrorState message={t("documents.load_error")} onRetry={() => void docsQ.refetch()} />
        ) : documents.length === 0 ? (
          <Text className={documentsClasses.mutedText}>{t("documents.empty")}</Text>
        ) : (
          <>
            <View
              className={documentsClasses.tabsBar}
              accessibilityRole="tablist"
              accessibilityLabel={t("documents.category_tabs_label")}
            >
              {chip("all", t("documents.category.all"))}
              {groups.map(({ group, docs }) =>
                chip(group.id, `${group.emoji} ${lang === "ne" ? group.ne : group.en}`, docs.length),
              )}
            </View>
            <View className="gap-10">
              {visible.map(({ group, docs }, i) => (
                <View key={group.id} className="gap-3">
                  <View className={documentsClasses.sectionHeader}>
                    <Text className={cn(documentsClasses.sectionTitle, "min-w-0 flex-1")}>
                      <Text className={cn(documentsClasses.sectionTitle, documentsClasses.sectionIndex)}>{digits(i + 1)}. </Text>
                      {group.emoji} {lang === "ne" ? group.ne : group.en}
                    </Text>
                    <Text className={documentsClasses.sectionCount}>{digits(docs.length)}</Text>
                  </View>
                  <View className="gap-4">
                    {docs.map((doc) => (
                      <DocumentCard key={doc.slug} doc={doc} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </AppShell>
  );
}
