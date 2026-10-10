import { useMemo } from "react";
import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  GrahaInline,
  GrahaInlineChildren,
  NakshatraInline,
} from "@/components/kundali/KundaliGlyphLabels";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { VargaChartEntry, VargaCharts } from "@/lib/api";
import { rashiToHouse } from "@vedic-patro/domain/bhava";
import {
  DIGNITY_LABELS,
  GRAHA_NAME,
  RELATION_LABELS,
  type GrahaKey,
} from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

type Row = VargaChartEntry & {
  bhava: number;
  ownerBhava?: number;
  rulesBhavas: number[];
};

function grahaLabel(key: string, lang: "ne" | "en"): string {
  if (key === "lagna") return lang === "en" ? "Ascendant" : "लग्न";
  const meta = GRAHA_NAME[key as GrahaKey];
  if (!meta) return key;
  return lang === "en" ? meta.en : meta.ne;
}

export function GrahaDetailsList({
  division,
  anchorKey,
  vargaCharts,
}: {
  division: number;
  anchorKey: string;
  vargaCharts: VargaCharts;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();

  const rows = useMemo<Row[]>(() => {
    const entries = vargaCharts.entries[String(division)] ?? [];
    const anchorEntry = entries.find((e) => e.key === anchorKey);
    if (!anchorEntry) return [];
    const anchorRashi = anchorEntry.vargaRashi;
    const byKey = new Map(entries.map((e) => [e.key, e]));

    return entries.map((entry) => {
      const owner = byKey.get(entry.ownerKey);
      const rules = vargaCharts.ownedRashis[entry.key] ?? [];
      return {
        ...entry,
        bhava: rashiToHouse(entry.vargaRashi, anchorRashi),
        ownerBhava: owner ? rashiToHouse(owner.vargaRashi, anchorRashi) : undefined,
        rulesBhavas:
          entry.key !== "lagna"
            ? rules.map((rashi) => rashiToHouse(rashi, anchorRashi)).sort((a, b) => a - b)
            : [],
      };
    });
  }, [division, anchorKey, vargaCharts]);

  if (rows.length === 0) return null;

  const columns: Column[] = [
    { key: "graha", ne: "ग्रह", en: "Graha", width: 116 },
    { key: "rashi_lon", ne: "राशि / स्पष्ट", en: "Rashi / Long.", width: 196 },
    { key: "bhava", ne: "भाव", en: "Bhava", width: 64 },
    { key: "nak", ne: "नक्षत्र (पद)", en: "Nak (pada)", width: 168 },
    { key: "lord_sub", ne: "नक्षत्रेश / उप", en: "Lord / Sub", width: 164 },
    { key: "owner", ne: "स्वामी", en: "Owner", width: 132 },
    { key: "rel", ne: "सम्बन्ध", en: "Relation", width: 96 },
    { key: "dignity", ne: "स्थिति", en: "Dignity", width: 96 },
    { key: "rules", ne: "स्वामित्व", en: "Rules", width: 88 },
  ];

  return (
    <DataTable
      compact
      columns={columns}
      rows={rows.map((row) => {
        const dmsLine = (
          <View key="dms" className="flex-row items-center gap-1">
            <Text
              className="text-caption font-num font-semibold text-foreground"
              style={nepaliTextStyle(11)}
            >
              {digits(String(row.dms.deg).padStart(2, "0"))}°
            </Text>
            <RashiGlyphIcon number={row.dms.rashiNum} size={14} />
            <Text className="text-caption text-foreground" style={nepaliTextStyle(11)}>
              {formatRashiByNumber(row.dms.rashiNum, lang)}
            </Text>
            <Text className="text-caption font-num text-foreground" style={nepaliTextStyle(11)}>
              {digits(String(row.dms.min).padStart(2, "0"))}′{digits(String(row.dms.sec).padStart(2, "0"))}″
            </Text>
          </View>
        );
        const ownerCell =
          row.ownerBhava != null ? (
            <GrahaInline
              grahaKey={row.ownerKey}
              label={`${grahaLabel(row.ownerKey, lang)} (${digits(row.ownerBhava)})`}
              size={14}
              textSize={11}
            />
          ) : (
            <GrahaInline grahaKey={row.ownerKey} label={grahaLabel(row.ownerKey, lang)} size={14} textSize={11} />
          );

        return {
          key: row.key,
          highlight: Boolean(row.retrograde),
          cells: [
            <GrahaInlineChildren key="g" grahaKey={row.key} size={18}>
              <Text
                className="text-caption font-semibold text-foreground"
                style={nepaliTextStyle(11)}
              >
                {grahaLabel(row.key, lang)}
              </Text>
              {row.retrograde ? (
                <View
                  style={{ backgroundColor: colorWithAlpha(colors.secondary, 0.15) }}
                  className="flex-row items-center gap-0.5 rounded-full px-1 py-px"
                >
                  <Ionicons name="refresh" size={10} color={colors.secondary} />
                  <Text style={{ color: colors.secondary }} className="text-caption font-bold">
                    {pick("व", "R")}
                  </Text>
                </View>
              ) : null}
            </GrahaInlineChildren>,
            dmsLine,
            <Text
              key="b"
              className="text-caption text-center font-num font-semibold text-foreground"
              style={nepaliTextStyle(11)}
            >
              {digits(row.bhava)}
            </Text>,
            <NakshatraInline
              key="nak"
              index={row.nakshatraIndex}
              lang={lang}
              pada={row.pada}
              digits={digits}
              size={16}
            />,
            <View key="ls" className="flex-row items-center gap-0.5">
              <GrahaInline
                grahaKey={row.nakshatraLord}
                label={grahaLabel(row.nakshatraLord, lang)}
                size={14}
                textSize={11}
              />
              <Text style={nepaliTextStyle(11)}>/</Text>
              <GrahaInline grahaKey={row.subLord} label={grahaLabel(row.subLord, lang)} size={14} textSize={11} />
            </View>,
            ownerCell,
            row.relation
              ? pick(RELATION_LABELS[row.relation].ne, RELATION_LABELS[row.relation].en)
              : "—",
            row.dignity
              ? pick(DIGNITY_LABELS[row.dignity].ne, DIGNITY_LABELS[row.dignity].en)
              : "—",
            row.rulesBhavas.length > 0
              ? pick(
                  `${row.rulesBhavas.map((h) => digits(h)).join(",")}`,
                  row.rulesBhavas.map((h) => digits(h)).join(","),
                )
              : "—",
          ],
        };
      })}
    />
  );
}
