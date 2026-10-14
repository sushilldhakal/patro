import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaInline } from "@/components/kundali/KundaliGlyphLabels";
import { BhavaBalaChart } from "@/components/kundali/BhavaBalaChart";
import { DataTable, type Column } from "@/components/ui/DataTable";
import type { BhavaBalaData, BhavaBalaHouse, VargaCharts } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { fmtNum } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
const GLANCE_GAP = 8;

function glanceTileLayout(contentWidth: number, twoCol: boolean): ViewStyle {
  if (!twoCol) return { width: "100%" };
  if (contentWidth <= 0) return { flexBasis: "48%", flexGrow: 1, minWidth: 160 };
  const w = Math.floor((contentWidth - GLANCE_GAP) / 2);
  return { width: w };
}

function GlanceTile({
  label,
  children,
  layout,
}: {
  label: string;
  children: ReactNode;
  layout: ViewStyle;
}) {
  return (
    <View style={layout} className={kundaliDetailClasses.glance.card}>
      <Text className={kundaliDetailClasses.glance.label} style={nepaliTextStyle(11)}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function HouseSummary({ house, lang, digits }: { house: BhavaBalaHouse; lang: "ne" | "en"; digits: (v: string | number) => string }) {
  const houseLabel =
    tFor(lang, "ui.kundali.house_house_2", { house: digits(house.house) });
  const lord = GRAHA_NAME[house.lordKey as GrahaKey];
  const lordName = lord ? (lang === "en" ? lord.en : lord.ne) : house.lordKey;

  return (
    <>
      <Text className={kundaliDetailClasses.glance.name} style={nepaliTextStyle(17)}>
        {houseLabel}
      </Text>
      <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
        {kundaliLabel("lord", lang)} {lordName} · {digits(house.percent.toFixed(1))}%
      </Text>
    </>
  );
}

export function BhavaBalaCard({
  data,
  compactHeader = false,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  compactHeader?: boolean;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const { lang, digits } = useLocale();
  const [selectedHouse, setSelectedHouse] = useState(data.strongest.house);
  const { width: windowWidth } = useBreakpoint();
  const [contentWidth, setContentWidth] = useState(0);
  const effectiveWidth = contentWidth || windowWidth;
  const twoGlanceCols = effectiveWidth >= 400;
  const tileLayout = useMemo(
    () => glanceTileLayout(contentWidth || effectiveWidth, twoGlanceCols),
    [contentWidth, effectiveWidth, twoGlanceCols],
  );

  const intro = useMemo(() => {
    const ref = digits(data.referenceVirupas);
    const template = kundaliLabel("bhava_bala_intro", lang);
    return template.replace("{{ref}}", ref);
  }, [data.referenceVirupas, lang, digits]);

  const houseLabel = (house: number) =>
    tFor(lang, "ui.kundali.house_house_2", { house: digits(house) });

  const columns: Column[] = [
    { key: "house", ne: tFor("ne", "kundali.house"), en: tFor("en", "kundali.house"), width: 72 },
    { key: "lord", ne: tFor("ne", "panchanga.wheel.lord"), en: tFor("en", "panchanga.wheel.lord"), width: 108 },
    { key: "bhavadhipati", ne: tFor("ne", "kundali.bhavadhipati"), en: tFor("en", "kundali.bhavadhipati"), width: 88 },
    { key: "disha", ne: tFor("ne", "kundali.disha"), en: tFor("en", "kundali.disha"), width: 64 },
    { key: "drishti", ne: tFor("ne", "kundali.drishti"), en: tFor("en", "kundali.drishti"), width: 64 },
    { key: "total_pinda", ne: tFor("ne", "kundali.total_pinda"), en: tFor("en", "kundali.total_pinda"), width: 80 },
    { key: "rupas", ne: tFor("ne", "kundali.rupas"), en: tFor("en", "kundali.rupas"), width: 64 },
    { key: "bhava_pct", ne: tFor("ne", "kundali.bhava"), en: tFor("en", "kundali.bhava"), width: 72 },
  ];

  const numCell = (value: string) => (
    <View className="items-end">
      <Text className="font-mono text-sm text-foreground" style={nepaliTextStyle(11)} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const rows = data.houses.map((h) => ({
    key: String(h.house),
    highlight: selectedHouse === h.house,
    cells: [
      <Pressable key="h" onPress={() => setSelectedHouse(h.house)} className="active:opacity-70">
        <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(11)} numberOfLines={1}>
          {houseLabel(h.house)}
        </Text>
      </Pressable>,
      <View key="l" className="items-end">
        <GrahaInline
          grahaKey={h.lordKey}
          label={
            GRAHA_NAME[h.lordKey as GrahaKey]
              ? lang === "en"
                ? GRAHA_NAME[h.lordKey as GrahaKey].en
                : GRAHA_NAME[h.lordKey as GrahaKey].ne
              : h.lordKey
          }
          size={18}
          textSize={11}
        />
      </View>,
      numCell(fmtNum(h.bhavadhipati, digits)),
      numCell(fmtNum(h.disha, digits)),
      numCell(fmtNum(h.drishti, digits)),
      numCell(fmtNum(h.totalPinda, digits)),
      numCell(fmtNum(h.rupas, digits)),
      numCell(`${digits(h.percent.toFixed(1))}%`),
    ],
  }));

  return (
    <View
      className="gap-4"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - contentWidth) > 1) setContentWidth(w);
      }}
    >
      <BhavaBalaChart
        data={data}
        selectedHouse={selectedHouse}
        onSelectHouse={setSelectedHouse}
        vargaCharts={vargaCharts}
        combustion={combustion}
      />

      {!compactHeader ? (
        <Text className={kundaliDetailClasses.glance.heading} style={nepaliTextStyle(13)}>
          {kundaliLabel("bhava_bala_house_strength_virupas", lang)}
        </Text>
      ) : null}
      <Text className={kundaliDetailClasses.glance.intro} style={nepaliTextStyle(12)}>
        {intro}
      </Text>

      <View className="flex-row flex-wrap" style={{ gap: GLANCE_GAP }}>
        <GlanceTile layout={tileLayout} label={kundaliLabel("strongest_house", lang)}>
          <HouseSummary house={data.strongest} lang={lang} digits={digits} />
        </GlanceTile>
        <GlanceTile layout={tileLayout} label={kundaliLabel("weakest_house", lang)}>
          <HouseSummary house={data.weakest} lang={lang} digits={digits} />
        </GlanceTile>
      </View>

      <DataTable compact stretch columns={columns} rows={rows} />
    </View>
  );
}
