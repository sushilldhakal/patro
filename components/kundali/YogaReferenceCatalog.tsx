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
  const { lang, pick } = useLocale();
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
          <Text key="id" className="text-caption font-num text-muted-foreground">
            {e.yogaId}
          </Text>,
          <Text key="n" className="text-caption font-semibold text-foreground" style={nepaliTextStyle(11)}>
            {entryName(e, lang)}
          </Text>,
          <Text key="d" className="text-caption text-foreground" style={nepaliTextStyle(11)}>
            {entryDefinition(e, lang)}
          </Text>,
          <Text key="r" className="text-caption text-foreground" style={nepaliTextStyle(11)}>
            {entryResult(e, lang)}
          </Text>,
        ],
      })),
    [filtered, lang],
  );

  return (
    <View className="mt-4 overflow-hidden rounded-xl border border-border">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between gap-2 px-3.5 py-3 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View className="min-w-0 flex-1">
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
            {kundaliLabel("yoga_reference_catalog", lang)}
          </Text>
          <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(11)}>
            {pick(
              "बी. वी. रमनको “Three Hundred Important Combinations”, भाग I",
              'B. V. Raman\'s "Three Hundred Important Combinations", Part I',
            )}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open ? (
        <View className="border-t border-border p-3">
          {error ? (
            <Text className="text-body py-6 text-center text-muted-foreground" style={nepaliTextStyle(14)}>
              {kundaliLabel("yoga_reference_load_error", lang)}
            </Text>
          ) : !entries ? (
            <View className="flex-row items-center justify-center gap-2 py-6">
              <ActivityIndicator color={colors.secondary} />
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                {kundaliLabel("loading", lang)}
              </Text>
            </View>
          ) : (
            <>
              <View className="mb-3 flex-row items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <Ionicons name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={pick("नाम, नियम वा फलले खोज्नुहोस्…", "Search by name, rule or result…")}
                  placeholderTextColor={colors.mutedForeground}
                  className="text-body min-w-0 flex-1 text-foreground"
                  style={nepaliTextStyle(14)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {filtered.length === 0 ? (
                <Text className="text-body py-6 text-center text-muted-foreground" style={nepaliTextStyle(14)}>
                  {kundaliLabel("yoga_reference_no_match", lang)}
                </Text>
              ) : (
                <DataTable compact columns={columns} rows={tableRows} />
              )}

              <Text className="text-caption mt-2 px-1 text-muted-foreground" style={nepaliTextStyle(11)}>
                {kundaliLabel("yoga_reference_grouped_ids_note", lang)}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
