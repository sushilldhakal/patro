import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { AshtakutaResult, KutaRow } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  TableHeader,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

const KUTA_LABELS: Record<string, { en: string; ne: string }> = {
  varna: { get en() { return tFor("en", "avakahada.col_varna"); }, get ne() { return tFor("ne", "avakahada.col_varna"); } },
  vashya: { get en() { return tFor("en", "kundali.vashya"); }, get ne() { return tFor("ne", "kundali.vashya"); } },
  tara: { get en() { return tFor("en", "kundali.tara"); }, get ne() { return tFor("ne", "kundali.tara"); } },
  yoni: { get en() { return tFor("en", "avakahada.col_yoni"); }, get ne() { return tFor("ne", "avakahada.col_yoni"); } },
  maitri: { get en() { return tFor("en", "kundali.x.kuta_maitri"); }, get ne() { return tFor("ne", "kundali.x.kuta_maitri"); } },
  gana: { get en() { return tFor("en", "kundali.gana"); }, get ne() { return tFor("ne", "kundali.gana"); } },
  bhakuta: { get en() { return tFor("en", "kundali.x.kuta_bhakuta"); }, get ne() { return tFor("ne", "kundali.x.kuta_bhakuta"); } },
  nadi: { get en() { return tFor("en", "kundali.nadi"); }, get ne() { return tFor("ne", "kundali.nadi"); } },
};

const m = kundaliDetailClasses.milanResult;

const RECOMMENDATION_TONE: Record<AshtakutaResult["recommendation"], string> = {
  excellent: m.recExcellent,
  very_good: m.recVeryGood,
  middling: m.recMiddling,
  inauspicious: m.recInauspicious,
};

function formatObtained(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function KutaDetailPanel({
  kuta,
  boyName,
  girlName,
}: {
  kuta: KutaRow;
  boyName: string;
  girlName: string;
}) {
  const { t, lang, pick, digits } = useLocale();
  const label = KUTA_LABELS[kuta.id];
  const name = label ? pick(label.ne, label.en) : kuta.id;

  return (
    <View className={cn(m.panel, "mx-2 mb-2")}>
      <Text className={m.panelTitle} style={nepaliTextStyle(14)}>
        {name} {t("kundali.x.kuta_details_heading")}
      </Text>
      <Text className={m.panelPoints} style={nepaliTextStyle(13)}>
        {name} {t("kundali.x.kuta_points_label")}:{" "}
        <Text className={cn("font-num", m.panelPointsValue)}>
          {digits(formatObtained(kuta.obtained))}/{digits(kuta.max)}
        </Text>
      </Text>
      <View className={m.panelPeople}>
        {[
          { who: boyName, value: kuta.boyValue },
          { who: girlName, value: kuta.girlValue },
        ].map((r) => (
          <View key={r.who} className={m.panelPerson}>
            <Text className={m.panelPersonName} style={nepaliTextStyle(10)}>
              {r.who}
            </Text>
            <Text className={m.panelPersonValue} style={nepaliTextStyle(13)}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
      <Text className={m.panelInfo} style={nepaliTextStyle(13)}>
        {lang === "en" ? kuta.info : kuta.infoNe}
      </Text>
    </View>
  );
}

export function KundaliMilanResult({
  boyName,
  girlName,
  result,
}: {
  boyName: string;
  girlName: string;
  result: AshtakutaResult;
}) {
  const { t, lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [openId, setOpenId] = useState<string | null>(null);

  const tone = RECOMMENDATION_TONE[result.recommendation];

  const columns = [
    { key: "guna", ne: tFor("ne", "milan.guna"), en: tFor("en", "milan.guna"), width: 104 },
    { key: "max", ne: tFor("ne", "kundali.x.milan_col_max"), en: tFor("en", "kundali.x.milan_col_max"), width: 72 },
    { key: "obt", ne: tFor("ne", "kundali.x.milan_col_obtained"), en: tFor("en", "kundali.x.milan_col_obtained"), width: 72 },
    { key: "boy", ne: boyName, en: boyName, width: 118 },
    { key: "girl", ne: girlName, en: girlName, width: 118 },
    { key: "area", ne: tFor("ne", "kundali.x.milan_col_area_of_life"), en: tFor("en", "kundali.x.milan_col_area_of_life"), width: 150 },
  ];

  return (
    <View className={m.root}>
      {/* total + recommendation */}
      <View className={m.card}>
        <View className={m.totalRow}>
          <View className="min-w-0 flex-1">
            <Text className={m.eyebrow} style={nepaliTextStyle(11)}>
              {t("ui.kundali.total_guna_match")}
            </Text>
            <Text style={nepaliTextStyle(22)} className={cn(m.recommendation, tone)}>
              {lang === "en" ? result.recommendationLabel : result.recommendationLabelNe}
            </Text>
          </View>
          <View className="items-end">
            <Text className={m.totalValue}>
              {digits(formatObtained(result.totalObtained))}
              <Text className={m.totalMax}> / {digits(result.totalMax)}</Text>
            </Text>
            <Text className={m.gunaLabel} style={nepaliTextStyle(11)}>
              {t("ui.kundali.guna")}
            </Text>
          </View>
        </View>

        <View className={m.partners}>
          {[
            { label: t("ui.common.groom"), name: boyName },
            { label: t("ui.common.bride"), name: girlName },
          ].map((p) => (
            <View key={p.label} className={m.partner}>
              <Text className={m.partnerText} style={nepaliTextStyle(12)}>
                {p.label}:{" "}
                <Text className={m.partnerName}>{p.name}</Text>
              </Text>
            </View>
          ))}
        </View>

        {result.nadiDoshaAdvisory || result.nadiDoshaAdvisoryNe ? (
          <View className={m.advisory}>
            <Text className={m.advisoryTitle} style={nepaliTextStyle(11)}>
              {t("ui.kundali.nadi_dosha_advisory")}
            </Text>
            <Text className={m.advisoryText} style={nepaliTextStyle(13)}>
              {lang === "en" ? result.nadiDoshaAdvisory : result.nadiDoshaAdvisoryNe}
            </Text>
          </View>
        ) : null}
      </View>

      {/* dosha analysis */}
      <View className={m.card}>
        <Text className={cn(m.cardTitle, "mb-4")} style={nepaliTextStyle(14)}>
          {t("milan.dosha_analysis_title")}
        </Text>
        <View>
          {result.doshaAnalysis.map((dosha, i) => (
            <View
              key={dosha.id}
              className={cn(m.doshaRow, i > 0 && "border-t border-border/70")}
            >
              <Text className={cn(m.doshaLabel, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
                {lang === "en" ? dosha.labelEn : dosha.labelNe}
                {lang === "en" ? null : (
                  <Text className={m.doshaLabelAlt}>
                    {" "}
                    ({dosha.labelEn.replace(" Dosha", "")})
                  </Text>
                )}
              </Text>
              <Text
                style={nepaliTextStyle(13)}
                className={cn(m.doshaVerdict, dosha.present ? m.doshaPresent : m.doshaAbsent)}
              >
                {dosha.present ? t("kundali.present") : t("ui.kundali.absent")}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ashtakuta table */}
      <TableScrollShell className="rounded-2xl">
        <TableHeader>
          <View style={{ width: 34 }} />
          {columns.map((c) => (
            <Text
              key={c.key}
              numberOfLines={1}
              style={{ width: c.width, ...nepaliTextStyle(11) }}
              className="text-caption px-2 py-2.5 font-semibold text-muted-foreground"
            >
              {pick(c.ne, c.en)}
            </Text>
          ))}
        </TableHeader>

        {result.kutas.map((kuta, kutaIndex) => {
          const label = KUTA_LABELS[kuta.id];
          const isOpen = openId === kuta.id;
          return (
            <View key={kuta.id}>
              <TableRow
                rowIndex={kutaIndex}
                onPress={() => setOpenId(isOpen ? null : kuta.id)}
                className="items-center"
              >
                    <View style={{ width: 34 }} className="items-center">
                      <Ionicons
                        name={isOpen ? "chevron-down" : "chevron-forward"}
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </View>
                    <Text
                      style={{ width: columns[0].width, ...nepaliTextStyle(13) }}
                      className="text-body px-2 py-2.5 font-semibold text-foreground"
                    >
                      {label ? pick(label.ne, label.en) : kuta.id}
                    </Text>
                    <Text
                      style={{ width: columns[1].width }}
                      className="text-body px-2 py-2.5 text-center font-num text-foreground"
                    >
                      {digits(kuta.max)}
                    </Text>
                    <Text
                      style={{ width: columns[2].width }}
                      className="text-body px-2 py-2.5 text-center font-num font-semibold text-foreground"
                    >
                      {digits(formatObtained(kuta.obtained))}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[3].width, ...nepaliTextStyle(12) }}
                      className="text-caption px-2 py-2.5 text-foreground"
                    >
                      {kuta.boyValue}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[4].width, ...nepaliTextStyle(12) }}
                      className="text-caption px-2 py-2.5 text-foreground"
                    >
                      {kuta.girlValue}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[5].width, ...nepaliTextStyle(12) }}
                      className="text-caption px-2 py-2.5 text-muted-foreground"
                    >
                      {lang === "en" ? kuta.areaOfLife : kuta.areaOfLifeNe}
                    </Text>
              </TableRow>
              {isOpen ? (
                <View style={{ width: 34 + columns.reduce((a, c) => a + c.width, 0) }}>
                  <KutaDetailPanel kuta={kuta} boyName={boyName} girlName={girlName} />
                </View>
              ) : null}
            </View>
          );
        })}
        <Text
          className={m.tableFootnote}
          style={nepaliTextStyle(11)}
        >
          *
          {t("kundali.x.milan_points_footnote")}
        </Text>
      </TableScrollShell>

      {/* notes */}
      <View className={m.card}>
        <Text className={cn(m.cardTitle, "mb-3")} style={nepaliTextStyle(14)}>
          {t("ui.common.notes")}
        </Text>
        <View className={m.notesList}>
          {(lang === "en" ? result.notes : result.notesNe).map((note) => (
            <Text
              key={note.slice(0, 40)}
              className={m.noteText}
              style={nepaliTextStyle(13)}
            >
              •  {note}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default KundaliMilanResult;
