import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import { fetchYogaReference, type YogaReferenceEntry } from "@/lib/api";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  /** 162-ids present in this chart — hidden here so they are not shown twice. */
  excludeIds?: ReadonlySet<string>;
};

function entryName(entry: YogaReferenceEntry, lang: "ne" | "en"): string {
  if (lang === "en") return entry.name;
  return entry.nameNe?.trim() ? entry.nameNe : entry.name;
}

function entryDefinition(entry: YogaReferenceEntry, lang: "ne" | "en"): string {
  if (lang === "en") return entry.definition;
  return entry.definitionNe?.trim() ? entry.definitionNe : entry.definition;
}

function entryResult(entry: YogaReferenceEntry, lang: "ne" | "en"): string {
  if (lang === "en") return entry.result;
  return entry.resultNe?.trim() ? entry.resultNe : entry.result;
}

export function YogaReferenceCatalog({ excludeIds }: Props) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const [entries, setEntries] = useState<YogaReferenceEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || entries || error) return;
    let alive = true;
    fetchYogaReference()
      .then((res) => alive && setEntries(res.combinations))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [open, entries, error]);

  const available = useMemo(
    () => entries?.filter((e) => !(excludeIds?.has(e.yogaId) ?? false)) ?? [],
    [entries, excludeIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((e) =>
      [e.name, e.nameNe, e.yogaId, e.definition, e.definitionNe, e.result, e.resultNe].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [available, query]);

  const columns: Column[] = useMemo(
    () => [
      { key: "id", ne: "ID", en: "ID", width: 48 },
      { key: "name", ne: "योग", en: "Yoga", width: 100 },
      { key: "rule", ne: "नियम", en: "Rule", width: 220 },
      { key: "result", ne: "फल", en: "Result", width: 200 },
    ],
    [],
  );

  const tableRows = useMemo(
    () =>
      filtered.map((e) => ({
        key: e.yogaId,
        cells: [
          <Text key="id" className={kundaliDetailClasses.yogaCatalog.idText}>
            {e.yogaId}
          </Text>,
          <Text key="n" className={kundaliDetailClasses.yogaCatalog.nameText} style={nepaliTextStyle(11)}>
            {entryName(e, lang)}
          </Text>,
          <Text key="d" className={kundaliDetailClasses.yogaCatalog.cellText} style={nepaliTextStyle(11)}>
            {entryDefinition(e, lang)}
          </Text>,
          <Text key="r" className={kundaliDetailClasses.yogaCatalog.cellText} style={nepaliTextStyle(11)}>
            {entryResult(e, lang)}
          </Text>,
        ],
      })),
    [filtered, lang],
  );

  return (
    <View className={cn(kundaliDetailClasses.yogaCatalog.root, "overflow-hidden")}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className={cn(kundaliDetailClasses.yogaCatalog.toggle, "active:opacity-80")}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View className="min-w-0 flex-1">
          <Text className={kundaliDetailClasses.yogaCatalog.title} style={nepaliTextStyle(14)}>
            {kundaliLabel("yoga_reference_catalog", lang)}
          </Text>
          <Text className={kundaliDetailClasses.yogaCatalog.source} style={nepaliTextStyle(11)}>
            {t("ui.kundali.b_v_raman_s_three_hundred")}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className={kundaliDetailClasses.yogaCatalog.body}>
          {error ? (
            <Text className={kundaliDetailClasses.yogaCatalog.message} style={nepaliTextStyle(14)}>
              {kundaliLabel("yoga_reference_load_error", lang)}
            </Text>
          ) : !entries ? (
            <View className={kundaliDetailClasses.yogaCatalog.loadingRow}>
              <ActivityIndicator color={colors.secondary} />
              <Text className={kundaliDetailClasses.yogaCatalog.loadingText} style={nepaliTextStyle(14)}>
                {kundaliLabel("loading", lang)}
              </Text>
            </View>
          ) : (
            <>
              <View className={kundaliDetailClasses.yogaCatalog.search}>
                <Ionicons name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("kundali.x.yoga_catalog_search_placeholder")}
                  placeholderTextColor={colors.mutedForeground}
                  className={cn(kundaliDetailClasses.yogaCatalog.searchInput, "min-w-0 flex-1 text-foreground")}
                  style={nepaliTextStyle(14)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {filtered.length === 0 ? (
                <Text className={kundaliDetailClasses.yogaCatalog.message} style={nepaliTextStyle(14)}>
                  {kundaliLabel("yoga_reference_no_match", lang)}
                </Text>
              ) : (
                <DataTable compact columns={columns} rows={tableRows} />
              )}

              <Text className={kundaliDetailClasses.yogaCatalog.note} style={nepaliTextStyle(11)}>
                {kundaliLabel("yoga_reference_grouped_ids_note", lang)}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
