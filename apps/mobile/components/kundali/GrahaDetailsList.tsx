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
} from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
type Row = VargaChartEntry & {
  bhava: number;
  ownerBhava?: number;
  rulesBhavas: number[];
};

function grahaLabel(key: string, lang: "ne" | "en"): string {
  if (key === "lagna") return tFor(lang, "ui.kundali.ascendant");
  const meta = GRAHA_NAME[key as GrahaKey];
  if (!meta) return key;
  return lang === "en" ? meta.en : meta.ne;
}

const g = kundaliDetailClasses.grahaList;

export function GrahaDetailsList({
  division,
  anchorKey,
  vargaCharts,
}: {
  division: number;
  anchorKey: string;
  vargaCharts: VargaCharts;
}) {
  const { t, lang, pick, digits } = useLocale();
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
    { key: "graha", ne: tFor("ne", "kundali.graha"), en: tFor("en", "kundali.graha"), width: 116 },
    { key: "rashi_lon", ne: tFor("ne", "ui.kundali.rashi_long"), en: tFor("en", "ui.kundali.rashi_long"), width: 196 },
    { key: "bhava", ne: tFor("ne", "kundali.bhava_19"), en: tFor("en", "kundali.bhava_19"), width: 64 },
    { key: "nak", ne: tFor("ne", "ui.kundali.nak_pada"), en: tFor("en", "ui.kundali.nak_pada"), width: 168 },
    { key: "lord_sub", ne: tFor("ne", "panchanga.day_cycle.lord_sub"), en: tFor("en", "panchanga.day_cycle.lord_sub"), width: 164 },
    { key: "owner", ne: tFor("ne", "kundali.owner"), en: tFor("en", "kundali.owner"), width: 132 },
    { key: "rel", ne: tFor("ne", "ui.kundali.relation"), en: tFor("en", "ui.kundali.relation"), width: 96 },
    { key: "dignity", ne: tFor("ne", "kundali.dignity"), en: tFor("en", "kundali.dignity"), width: 96 },
    { key: "rules", ne: tFor("ne", "kundali.rules"), en: tFor("en", "kundali.rules"), width: 88 },
  ];

  return (
    <DataTable
      compact
      columns={columns}
      rows={rows.map((row) => {
        const dmsLine = (
          <View key="dms" className="flex-row items-center gap-1">
            <Text
              className={cn(g.dms, g.dmsDeg)}
              style={nepaliTextStyle(11)}
            >
              {digits(String(row.dms.deg).padStart(2, "0"))}°
            </Text>
            <RashiGlyphIcon number={row.dms.rashiNum} size={14} />
            <Text className={g.dmsRashi} style={nepaliTextStyle(11)}>
              {formatRashiByNumber(row.dms.rashiNum, lang)}
            </Text>
            <Text className={g.dms} style={nepaliTextStyle(11)}>
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
              <Text className={g.name} style={nepaliTextStyle(11)}>
                {grahaLabel(row.key, lang)}
              </Text>
              {row.retrograde ? (
                <View className={g.retroBadge}>
                  <Ionicons name="refresh" size={10} color={colors.secondary} />
                  <Text className={g.retroText}>
                    {t("ui.kundali.r")}
                  </Text>
                </View>
              ) : null}
            </GrahaInlineChildren>,
            dmsLine,
            <Text
              key="b"
              className={cn(g.dms, g.bhava)}
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
