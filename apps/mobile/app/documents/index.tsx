import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDocumentsPage } from "@vedic-patro/features/documents";
import { isDocumentCategoryId } from "@vedic-patro/domain/learn/document-categories";
import { cn } from "@vedic-patro/design-tokens/cn";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppShell } from "@/components/AppShell";
import { DocumentCard } from "@vedic-patro/ui/kit/jyotish";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";

/** Documents library — the app's drawing of `useDocumentsPage` (@vedic-patro/features). */
export default function DocumentsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ category?: string; view?: string }>();
  const active = typeof params.category === "string" && isDocumentCategoryId(params.category) ? params.category : "all";
  const view = params.view === "list" ? "list" : "grid";
  const page = useDocumentsPage(active);
  const select = (id: string, nextView: string = view) =>
    router.setParams({
      category: id === "all" ? undefined : id,
      view: nextView === "list" ? "list" : undefined,
    } as never);

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="book-open" size={24} color={colors.secondary} />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />
        {page.status === "loading" ? (
          <LoadingState />
        ) : page.status === "error" ? (
          <ErrorState message={page.copy.loadError} onRetry={page.retry} />
        ) : page.documents.length === 0 ? (
          <Text className={documentsClasses.mutedText}>{page.copy.empty}</Text>
        ) : (
          <>
            <View className="gap-3">
              <View className={cn(documentsClasses.viewToggle, "self-end")}>
                {(["grid", "list"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => select(active, mode)}
                    className={cn(
                      documentsClasses.viewBtn,
                      view === mode ? documentsClasses.viewBtnActive : documentsClasses.viewBtnIdle,
                    )}
                  >
                    <Text className={cn(documentsClasses.viewBtn, view === mode ? documentsClasses.viewBtnActive : documentsClasses.viewBtnIdle)}>
                      {mode === "grid" ? page.copy.viewGrid : page.copy.viewList}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className={documentsClasses.tabsBar} accessibilityRole="tablist" accessibilityLabel={page.copy.tabsLabel}>
                {page.tabs.map((tab) => (
                  <Pressable
                    key={tab.id}
                    onPress={() => select(tab.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab.active }}
                    className={cn(
                      documentsClasses.tab,
                      "flex-row items-center border",
                      tab.active ? cn(documentsClasses.tabSelected, "border-border/60") : "border-transparent shadow-none",
                    )}
                  >
                    <Text className={cn(documentsClasses.tabLabel, tab.active ? documentsClasses.tabLabelSelected : documentsClasses.tabLabelIdle)}>
                      {tab.label}
                    </Text>
                    {"countLabel" in tab ? <Text className={documentsClasses.tabCount}>{tab.countLabel}</Text> : null}
                  </Pressable>
                ))}
              </View>
            </View>

            {view === "list" || !page.isHub ? (
              <View className="gap-10">
                {page.sections.map((section) => (
                  <View key={section.group.id} className="gap-3">
                    <View className={documentsClasses.sectionHeader}>
                      <Text className={cn(documentsClasses.sectionTitle, "min-w-0 flex-1")}>
                        <Text className={cn(documentsClasses.sectionTitle, documentsClasses.sectionIndex)}>{section.indexLabel}. </Text>
                        {section.title}
                      </Text>
                      <Text className={documentsClasses.sectionCount}>{section.countLabel}</Text>
                    </View>
                    <View className="gap-4">
                      {section.documents.map((doc) => (
                        <DocumentCard key={doc.slug} doc={doc} onPress={() => router.push(`/documents/${doc.slug}` as never)} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="gap-4">
                <View>
                  <Text className={documentsClasses.sectionTitle}>{page.copy.hubTitle}</Text>
                  <Text className={documentsClasses.mutedText}>{page.copy.hubSubtitle}</Text>
                </View>
                {page.sections.map((section) => (
                  <Pressable
                    key={section.group.id}
                    onPress={() => select(section.group.id)}
                    className={cn(documentsClasses.hubCard, "border border-border")}
                  >
                    <View className={documentsClasses.hubCardTop}>
                      <Text className={documentsClasses.hubEmoji}>{section.group.emoji}</Text>
                    </View>
                    <Text className={documentsClasses.hubTitle}>{section.name}</Text>
                    {section.blurb ? <Text className={documentsClasses.hubBlurb}>{section.blurb}</Text> : null}
                    <View className={documentsClasses.hubPreview}>
                      {section.preview.map((title) => (
                        <View key={title} className={documentsClasses.hubPreviewItem}>
                          <View className={documentsClasses.hubPreviewDot} />
                          <Text className="min-w-0 flex-1 text-sm text-foreground/85" numberOfLines={1}>
                            {title}
                          </Text>
                        </View>
                      ))}
                      {section.moreLabel ? <Text className={documentsClasses.hubMore}>{section.moreLabel}</Text> : null}
                    </View>
                    <Text className={documentsClasses.hubMeta}>{page.copy.docsInCategory(section.count)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </AppShell>
  );
}
