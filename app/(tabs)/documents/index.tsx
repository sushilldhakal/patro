import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { DOCUMENT_CATEGORY_GROUPS, isDocumentCategoryId } from "@/lib/documents/categories";
import { documentsKeys, fetchDocuments } from "@/lib/documents/api";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function DocumentsScreen() {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
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
          "mr-2 rounded-full border px-3.5 py-2",
          selected ? "border-secondary bg-secondary" : "border-border bg-card",
        )}
      >
        <Text className={cn("text-sm font-semibold", selected ? "text-secondary-foreground" : "text-foreground")}>
          {label}
          {count != null ? `  ${digits(count)}` : ""}
        </Text>
      </Pressable>
    );
  };

  return (
    <AppShell title={t("documents.page_title")} subtitle={t("documents.page_subtitle")}>
      {docsQ.isLoading ? (
        <LoadingState />
      ) : docsQ.isError ? (
        <ErrorState message={t("documents.load_error")} onRetry={() => void docsQ.refetch()} />
      ) : documents.length === 0 ? (
        <Text className="text-sm text-muted-foreground">{t("documents.empty")}</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 grow-0"
            accessibilityLabel={t("documents.category_tabs_label")}
          >
            {chip("all", t("documents.category.all"))}
            {groups.map(({ group, docs }) =>
              chip(group.id, `${group.emoji} ${lang === "ne" ? group.ne : group.en}`, docs.length),
            )}
          </ScrollView>
          {visible.map(({ group, docs }, i) => (
            <View key={group.id} className="mb-5">
              <View className="mb-3 flex-row items-end justify-between border-b border-border pb-2">
                <Text className="text-lg font-bold">
                  {digits(i + 1)}. {group.emoji} {lang === "ne" ? group.ne : group.en}
                </Text>
                <Text className="text-xs font-semibold text-muted-foreground">{digits(docs.length)}</Text>
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
