import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { AvakahadaWheel } from "@/components/avakahada/AvakahadaWheel";
import { Text } from "@/components/ui/Text";
import {
  AVAKAHADA,
  BHAUMA_DOSHA_SHLOKAS,
  MANGLI_VARGAS,
  type Gana,
} from "@vedic-patro/domain/avakahada-data";
import {
  formatRashiSwami,
  formatSanjnaMukha,
  formatVarnaVashya,
  formatYoniPair,
  localizeGana,
  localizeJati,
  localizeLord,
  localizeNadi,
  localizeNakshatra,
  localizeVarga,
} from "@vedic-patro/domain/avakahada-locale";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import {
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { avakahadaClasses } from "@vedic-patro/design-tokens/classes/avakahada-classes";


import { webTypeScale } from "@vedic-patro/design-tokens";
interface Row {
  index: number;
  ne: string;
  en: string;
  label: string;
  aksharas: string[];
  charanRashis: string[];
  aksharaText: string;
  swami: string;
  jati: string;
  sanjnaMukha: string;
  rashiSwami: string;
  varnaVashya: string;
  yoniVairi: string;
  gana: Gana;
  nadi: string;
}

function buildRows(lang: string): Row[] {
  return AVAKAHADA.map((r) => ({
    index: r.index,
    ne: r.ne,
    en: r.en,
    label: localizeNakshatra(r, lang),
    aksharas: r.aksharas,
    charanRashis: r.charanRashis,
    aksharaText: r.aksharas.join(" "),
    swami: localizeLord(r.swami, lang),
    jati: localizeJati(r.jati, lang),
    sanjnaMukha: formatSanjnaMukha(r.sanjna, r.mukha, lang),
    rashiSwami: formatRashiSwami(r.charanRashis, lang),
    varnaVashya: formatVarnaVashya(r.charanRashis, lang),
    yoniVairi: formatYoniPair(r.yoni, r.vairiYoni, lang),
    gana: r.gana,
    nadi: localizeNadi(r.nadi, lang),
  }));
}

function matches(row: Row, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.ne,
    row.en,
    row.label,
    row.swami,
    row.jati,
    row.sanjnaMukha,
    row.aksharaText,
    row.rashiSwami,
    row.varnaVashya,
    row.yoniVairi,
    row.gana,
    localizeGana(row.gana, "en"),
    row.nadi,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

type SortKey =
  | "index"
  | "swami"
  | "jati"
  | "sanjnaMukha"
  | "rashiSwami"
  | "varnaVashya"
  | "yoniVairi"
  | "gana"
  | "nadi";

const COLUMNS: {
  key: SortKey | "akshara";
  ne: string;
  en: string;
  width: number;
  sortable: boolean;
}[] = [
  { key: "index", ne: "नक्षत्र", en: "Nakshatra", width: 168, sortable: true },
  { key: "swami", ne: "स्वामी", en: "Swami", width: 84, sortable: true },
  { key: "jati", ne: "जात", en: "Jati", width: 96, sortable: true },
  { key: "sanjnaMukha", ne: "संज्ञा/मुख", en: "Sanjna / Mukha", width: 132, sortable: true },
  {
    key: "akshara",
    ne: "नामाक्षर (चरण १–४)",
    en: "Name syllable (charan 1–4)",
    width: 168,
    sortable: false,
  },
  { key: "rashiSwami", ne: "राशि / स्वामी", en: "Rashi / Lord", width: 196, sortable: true },
  { key: "varnaVashya", ne: "राशि वर्ण/वश्य", en: "Rashi varna / vashya", width: 196, sortable: true },
  { key: "yoniVairi", ne: "योनि / वैरी योनि", en: "Yoni / Enemy yoni", width: 148, sortable: true },
  { key: "gana", ne: "गण", en: "Gana", width: 84, sortable: true },
  { key: "nadi", ne: "नाडी", en: "Nadi", width: 84, sortable: true },
];

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

export default function AvakahadaScreen() {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width, isTablet } = useBreakpoint();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "index",
    dir: "asc",
  });

  const data = useMemo(() => buildRows(lang), [lang]);

  const rows = useMemo(() => {
    const filtered = data.filter((r) => matches(r, query));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  return (
    <AppShell
      title={pick("अवकहडा चक्र", "Avakahada Chakra")}
      subtitle={pick(
        "२७ नक्षत्रका १० वटै स्तम्भ — स्वामी, जात, संज्ञा/मुख, नामाक्षर, राशि / स्वामी, राशि वर्ण/वश्य, योनि / वैरी योनि, गण र नाडी।",
        "All 10 columns for the 27 nakshatras — swami, jati, sanjna/mukha, name syllables, rashi / lord, rashi varna/vashya, yoni / enemy yoni, gana and nadi.",
      )}
      headerRight={<Ionicons name="grid-outline" size={26} color={colors.secondary} />}
    >
      <View className={cn("mb-4", avakahadaClasses.note)}>
        <Text className={avakahadaClasses.noteText} style={nepaliTextStyle(14)}>
          {pick(
            "अभिजित् — उत्तराषाढाको चौथो पाउ र श्रवणको सुरुको १५ भागमध्ये १ भाग मिलेर बन्ने अन्तरकालीन (२८औँ) नक्षत्र हो; नामाक्षर: जु, जे, जो, ख।",
            "Abhijit — the intercalary 28th nakshatra formed by the last quarter of Uttara Ashadha and the first 15th of Shravana; name syllables: Ju, Je, Jo, Kha.",
          )}
        </Text>
      </View>

      <View
        className={cn(
          "flex-row", avakahadaClasses.searchBox,
          isTablet && avakahadaClasses.searchWrap,
        )}
      >
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          className="flex-1 py-2.5"
          value={query}
          onChangeText={setQuery}
          placeholder={pick(
            "नक्षत्र, नामाक्षर, राशि, योनि… खोज्नुहोस्",
            "Search nakshatra, syllable, rashi, yoni…",
          )}
          placeholderTextColor={colors.mutedForeground}
          style={{ color: colors.foreground, fontSize: webTypeScale.sm.size }}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <TableScrollShell stretch={false}>
        <View style={{ minWidth: TABLE_MIN_WIDTH }}>
          <TableHeader>
            {COLUMNS.map((col) => {
              const active = col.sortable && sort.key === col.key;
              return (
                <TableHeaderCell
                  key={col.key}
                  width={col.width}
                  disabled={!col.sortable}
                  onPress={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                >
                  <TableHeaderLabel uppercase={false} numberOfLines={2} className={avakahadaClasses.headLabel}>
                    {pick(col.ne, col.en)}
                  </TableHeaderLabel>
                  {col.sortable ? (
                    <Ionicons
                      name={
                        active ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "swap-vertical"
                      }
                      size={11}
                      color={active ? colors.foreground : colors.mutedForeground}
                    />
                  ) : null}
                </TableHeaderCell>
              );
            })}
          </TableHeader>

          {rows.length === 0 ? (
            <View className={cn("px-4", avakahadaClasses.emptyCell)}>
              <Text className={avakahadaClasses.emptyText} style={nepaliTextStyle(14)}>
                {pick("कुनै नतिजा भेटिएन।", "No results found.")}
              </Text>
            </View>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={row.index} rowIndex={rowIndex}>
                <TableCell width={COLUMNS[0].width}>
                  <Text className={avakahadaClasses.nakLabel} style={nepaliTextStyle(13)}>
                    {digits(row.index)}. {row.label}
                  </Text>
                </TableCell>
                <TableCell width={COLUMNS[1].width}>{row.swami}</TableCell>
                <TableCell width={COLUMNS[2].width}>{row.jati}</TableCell>
                <TableCell width={COLUMNS[3].width}>{row.sanjnaMukha}</TableCell>
                <TableCell width={COLUMNS[4].width}>
                  <View className={cn("flex-row", avakahadaClasses.aksharaList)}>
                    {row.aksharas.map((a, i) => (
                      <View
                        key={`${row.index}-${i}`}
                        className={avakahadaClasses.aksharaChip}
                      >
                        <Text className={avakahadaClasses.aksharaText} style={nepaliTextStyle(13)}>
                          {a}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TableCell>
                <TableCell width={COLUMNS[5].width}>{row.rashiSwami}</TableCell>
                <TableCell width={COLUMNS[6].width}>{row.varnaVashya}</TableCell>
                <TableCell width={COLUMNS[7].width}>{row.yoniVairi}</TableCell>
                <TableCell width={COLUMNS[8].width}>
                  <View
                    className={cn(
                      "self-start",
                      avakahadaClasses.ganaBadge,
                      avakahadaClasses.ganaBg[row.gana],
                    )}
                  >
                    <Text
                      style={nepaliTextStyle(12)}
                      className={cn(avakahadaClasses.ganaBadgeText, avakahadaClasses.ganaFg[row.gana])}
                    >
                      {localizeGana(row.gana, lang)}
                    </Text>
                  </View>
                </TableCell>
                <TableCell width={COLUMNS[9].width}>{row.nadi}</TableCell>
              </TableRow>
            ))
          )}
        </View>
      </TableScrollShell>

      <AvakahadaWheel highlighted={query.trim() ? rows : undefined} />

      <View className={cn("mt-8", avakahadaClasses.notes)}>
        <Text className={avakahadaClasses.notesTitle} style={nepaliTextStyle(20)}>
          {pick("भौमदोष (मङ्गली) विचार", "Bhoomadosha (Mangal) considerations")}
        </Text>
        <View className={cn(width >= 640 && "flex-row", avakahadaClasses.notesGrid)}>
          <View className={cn("flex-1", avakahadaClasses.notesCard)}>
            <Text className={avakahadaClasses.notesCardTitle} style={nepaliTextStyle(14)}>
              {pick("नामाक्षर वर्ग र शत्रु वर्ग", "Name-syllable groups and enemy groups")}
            </Text>
            <View className={avakahadaClasses.vargaList}>
              {MANGLI_VARGAS.map((v) => (
                <View key={v.varga} className={cn("flex-row", avakahadaClasses.vargaRow)}>
                  <Text className={avakahadaClasses.vargaName} style={nepaliTextStyle(14)}>
                    {localizeVarga(v.varga, lang)}
                  </Text>
                  <Text className={avakahadaClasses.vargaVs}>⚔</Text>
                  <Text className={avakahadaClasses.vargaName} style={nepaliTextStyle(14)}>
                    {localizeVarga(v.shatru, lang)}
                  </Text>
                </View>
              ))}
            </View>
            <Text className={avakahadaClasses.vargaNote} style={nepaliTextStyle(12)}>
              {pick(
                "वर र वधूको नामाक्षर वर्ग परस्पर शत्रु परेमा भौमदोष (मङ्गली) मानिन्छ।",
                "Bhoomadosha (Mangal) is considered when bride and groom name-syllable groups are mutual enemies.",
              )}
            </Text>
          </View>
          <View className={cn("flex-1", avakahadaClasses.notesCard)}>
            <Text className={avakahadaClasses.notesCardTitle} style={nepaliTextStyle(14)}>
              {pick("श्लोक", "Shloka")}
            </Text>
            <View className={avakahadaClasses.shlokaList}>
              {BHAUMA_DOSHA_SHLOKAS.map((s, i) => (
                <Text
                  key={i}
                  className={avakahadaClasses.shloka}
                  style={nepaliTextStyle(14)}
                >
                  {s}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <Text className={avakahadaClasses.footnote} style={nepaliTextStyle(12)}>
          {pick(
            "टिप्पणी: मङ्गल लग्न, ४, ७, ८ वा १२ भावमा परेमा भौमदोष लाग्छ; शनि दृष्टि, गुरु/शुक्र/चन्द्रको स्थिति, केन्द्रगत राहु आदिले दोष परिहार हुन सक्छ (माथिका श्लोक हेर्नुहोस्)।",
            "Note: Mangal in lagna, 4th, 7th, 8th or 12th causes bhoomadosha; Saturn's aspect, Jupiter/Venus/Moon placement, kendragata Rahu etc. can cancel it (see shloka above).",
          )}
        </Text>
      </View>
    </AppShell>
  );
}
