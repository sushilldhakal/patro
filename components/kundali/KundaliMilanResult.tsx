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

const KUTA_LABELS: Record<string, { en: string; ne: string }> = {
  varna: { en: "Varna", ne: "वर्ण" },
  vashya: { en: "Vashya", ne: "वश्य" },
  tara: { en: "Tara", ne: "तारा" },
  yoni: { en: "Yoni", ne: "योनि" },
  maitri: { en: "Maitri", ne: "मैत्री" },
  gana: { en: "Gana", ne: "गण" },
  bhakuta: { en: "Bhakuta", ne: "भकूट" },
  nadi: { en: "Nadi", ne: "नाडी" },
};

const RECOMMENDATION_TONE: Record<AshtakutaResult["recommendation"], string> = {
  excellent: "#059669",
  very_good: "#0284c7",
  middling: "#d97706",
  inauspicious: "#c62828",
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
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const label = KUTA_LABELS[kuta.id];
  const name = label ? pick(label.ne, label.en) : kuta.id;

  return (
    <View
      style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
      className="mx-2 mb-2 rounded-lg border px-4 py-3"
    >
      <Text className="mb-2 text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {name} {pick("कूट विवरण", "Kuta details")}
      </Text>
      <Text className="mb-3 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
        {name} {pick("कूट अङ्क", "Kuta points")}:{" "}
        <Text className="font-num font-semibold text-foreground">
          {digits(formatObtained(kuta.obtained))}/{digits(kuta.max)}
        </Text>
      </Text>
      <View className="mb-3 gap-2">
        {[
          { who: boyName, value: kuta.boyValue },
          { who: girlName, value: kuta.girlValue },
        ].map((r) => (
          <View
            key={r.who}
            style={{ borderColor: colors.border }}
            className="rounded-md border bg-card px-3 py-2"
          >
            <Text
              className="text-[12px] uppercase tracking-wider text-muted-foreground"
              style={nepaliTextStyle(10)}
            >
              {r.who}
            </Text>
            <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
      <Text className="text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(13)}>
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
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [openId, setOpenId] = useState<string | null>(null);

  const tone = RECOMMENDATION_TONE[result.recommendation];

  const columns = [
    { key: "guna", ne: "गुण", en: "Guna", width: 104 },
    { key: "max", ne: "अधिकतम", en: "Max", width: 72 },
    { key: "obt", ne: "प्राप्त", en: "Obt", width: 72 },
    { key: "boy", ne: boyName, en: boyName, width: 118 },
    { key: "girl", ne: girlName, en: girlName, width: 118 },
    { key: "area", ne: "जीवन क्षेत्र", en: "Area of life", width: 150 },
  ];

  return (
    <View className="gap-5">
      {/* total + recommendation */}
      <View
        style={{ borderColor: colors.border }}
        className="rounded-2xl border bg-card p-5"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              style={nepaliTextStyle(11)}
            >
              {pick("कुल गुण मिलान", "Total guna match")}
            </Text>
            <Text style={{ color: tone, ...nepaliTextStyle(22) }} className="mt-1 text-2xl font-bold">
              {lang === "en" ? result.recommendationLabel : result.recommendationLabelNe}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-num text-4xl font-bold text-foreground">
              {digits(formatObtained(result.totalObtained))}
              <Text className="text-lg text-muted-foreground"> / {digits(result.totalMax)}</Text>
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
              {pick("गुण", "guna")}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-3">
          {[
            { label: pick("वर", "Groom"), name: boyName },
            { label: pick("कन्या", "Bride"), name: girlName },
          ].map((p) => (
            <View
              key={p.label}
              style={{ borderColor: colors.border }}
              className="rounded-full border px-3 py-1"
            >
              <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
                {p.label}:{" "}
                <Text className="font-semibold text-foreground">{p.name}</Text>
              </Text>
            </View>
          ))}
        </View>

        {result.nadiDoshaAdvisory || result.nadiDoshaAdvisoryNe ? (
          <View
            style={{
              borderColor: "rgba(245,158,11,0.4)",
              backgroundColor: "rgba(245,158,11,0.1)",
            }}
            className="mt-4 rounded-xl border px-4 py-3"
          >
            <Text
              style={{ color: colors.primary, ...nepaliTextStyle(11) }}
              className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              {pick("नाडी दोष सूचना", "Nadi dosha advisory")}
            </Text>
            <Text
              className="text-sm leading-relaxed text-foreground"
              style={nepaliTextStyle(13)}
            >
              {lang === "en" ? result.nadiDoshaAdvisory : result.nadiDoshaAdvisoryNe}
            </Text>
          </View>
        ) : null}
      </View>

      {/* dosha analysis */}
      <View style={{ borderColor: colors.border }} className="rounded-2xl border bg-card p-5">
        <Text className="mb-4 text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {pick("दोष विश्लेषण", "Dosha analysis")}
        </Text>
        <View>
          {result.doshaAnalysis.map((dosha, i) => (
            <View
              key={dosha.id}
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}
              className="flex-row flex-wrap items-center justify-between gap-2 py-3"
            >
              <Text
                className="min-w-0 flex-1 text-sm font-semibold text-foreground"
                style={nepaliTextStyle(13)}
              >
                {lang === "en" ? dosha.labelEn : dosha.labelNe}
                {lang === "en" ? null : (
                  <Text className="font-normal text-muted-foreground">
                    {" "}
                    ({dosha.labelEn.replace(" Dosha", "")})
                  </Text>
                )}
              </Text>
              <Text
                style={{
                  color: dosha.present ? colors.destructive : "#059669",
                  ...nepaliTextStyle(13),
                }}
                className="shrink-0 text-sm font-semibold"
              >
                {dosha.present ? pick("छ", "Present") : pick("छैन", "Absent")}
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
              className="px-2 py-2.5 text-xs font-semibold text-muted-foreground"
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
                      className="px-2 py-2.5 text-sm font-semibold text-foreground"
                    >
                      {label ? pick(label.ne, label.en) : kuta.id}
                    </Text>
                    <Text
                      style={{ width: columns[1].width }}
                      className="px-2 py-2.5 text-center font-num text-sm text-foreground"
                    >
                      {digits(kuta.max)}
                    </Text>
                    <Text
                      style={{ width: columns[2].width }}
                      className="px-2 py-2.5 text-center font-num text-sm font-semibold text-foreground"
                    >
                      {digits(formatObtained(kuta.obtained))}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[3].width, ...nepaliTextStyle(12) }}
                      className="px-2 py-2.5 text-xs text-foreground"
                    >
                      {kuta.boyValue}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[4].width, ...nepaliTextStyle(12) }}
                      className="px-2 py-2.5 text-xs text-foreground"
                    >
                      {kuta.girlValue}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ width: columns[5].width, ...nepaliTextStyle(12) }}
                      className="px-2 py-2.5 text-xs text-muted-foreground"
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
          className="border-t border-border px-4 py-2 text-xs text-muted-foreground"
          style={nepaliTextStyle(11)}
        >
          *
          {pick(
            "अधिकतम — अधिकतम अङ्क · प्राप्त — प्राप्त अङ्क",
            "Max — maximum point · Obt — obtained point",
          )}
        </Text>
      </TableScrollShell>

      {/* notes */}
      <View style={{ borderColor: colors.border }} className="rounded-2xl border bg-card p-5">
        <Text className="mb-3 text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {pick("टिप्पणी", "Notes")}
        </Text>
        <View className="gap-2">
          {(lang === "en" ? result.notes : result.notesNe).map((note) => (
            <Text
              key={note.slice(0, 40)}
              className="text-sm leading-relaxed text-muted-foreground"
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
