import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { AshtakutaResult } from "@/lib/api";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { TableHeader, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { useKundaliMilanResult } from "@vedic-patro/features/kundali";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const m = kundaliDetailClasses.milanResult;

const RECOMMENDATION_TONE: Record<AshtakutaResult["recommendation"], string> = {
  excellent: m.recExcellent,
  very_good: m.recVeryGood,
  middling: m.recMiddling,
  inauspicious: m.recInauspicious,
};

/** Column widths, in the order of `columns` from the hook. */
const WIDTHS = [104, 72, 72, 118, 118, 150];
const CHEVRON = 34;

type Kuta = ReturnType<typeof useKundaliMilanResult>["kutas"][number];

function KutaDetailPanel({ detail }: { detail: Kuta["detail"] }) {
  return (
    <View className={cn(m.panel, "mx-2 mb-2")}>
      <Text className={m.panelTitle} style={nepaliTextStyle(14)}>
        {detail.title}
      </Text>
      <Text className={m.panelPoints} style={nepaliTextStyle(13)}>
        {detail.pointsLabel} <Text className={cn("font-num", m.panelPointsValue)}>{detail.points}</Text>
      </Text>
      <View className={m.panelPeople}>
        {detail.people.map((p, i) => (
          <View key={i} className={m.panelPerson}>
            <Text className={m.panelPersonName} style={nepaliTextStyle(10)}>
              {p.who}
            </Text>
            <Text className={m.panelPersonValue} style={nepaliTextStyle(13)}>
              {p.value}
            </Text>
          </View>
        ))}
      </View>
      <Text className={m.panelInfo} style={nepaliTextStyle(13)}>
        {detail.info}
      </Text>
    </View>
  );
}

export function KundaliMilanResult({ boyName, girlName, result }: { boyName: string; girlName: string; result: AshtakutaResult }) {
  const colors = useThemeColors();
  const view = useKundaliMilanResult({ boyName, girlName, result });
  const cell = "px-2 py-2.5";

  return (
    <View className={m.root}>
      {/* total + recommendation */}
      <View className={m.card}>
        <View className={m.totalRow}>
          <View className="min-w-0 flex-1">
            <Text className={m.eyebrow} style={nepaliTextStyle(11)}>
              {view.copy.totalGuna}
            </Text>
            <Text style={nepaliTextStyle(22)} className={cn(m.recommendation, RECOMMENDATION_TONE[view.recommendation])}>
              {view.recommendationLabel}
            </Text>
          </View>
          <View className="items-end">
            <Text className={m.totalValue}>
              {view.total}
              <Text className={m.totalMax}>{view.totalMax}</Text>
            </Text>
            <Text className={m.gunaLabel} style={nepaliTextStyle(11)}>
              {view.copy.guna}
            </Text>
          </View>
        </View>

        <View className={m.partners}>
          {view.partners.map((p) => (
            <View key={p.label} className={m.partner}>
              <Text className={m.partnerText} style={nepaliTextStyle(12)}>
                {p.label}: <Text className={m.partnerName}>{p.name}</Text>
              </Text>
            </View>
          ))}
        </View>

        {view.advisory ? (
          <View className={m.advisory}>
            <Text className={m.advisoryTitle} style={nepaliTextStyle(11)}>
              {view.advisory.title}
            </Text>
            <Text className={m.advisoryText} style={nepaliTextStyle(13)}>
              {view.advisory.text}
            </Text>
          </View>
        ) : null}
      </View>

      {/* dosha analysis */}
      <View className={m.card}>
        <Text className={cn(m.cardTitle, "mb-4")} style={nepaliTextStyle(14)}>
          {view.copy.doshaTitle}
        </Text>
        <View>
          {view.doshas.map((dosha, i) => (
            <View key={dosha.id} className={cn(m.doshaRow, i > 0 && "border-t border-border/70")}>
              <Text className={cn(m.doshaLabel, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
                {dosha.label}
                {dosha.alt ? <Text className={m.doshaLabelAlt}> {dosha.alt}</Text> : null}
              </Text>
              <Text style={nepaliTextStyle(13)} className={cn(m.doshaVerdict, dosha.present ? m.doshaPresent : m.doshaAbsent)}>
                {dosha.verdict}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ashtakuta table */}
      <TableScrollShell className="rounded-2xl">
        <TableHeader>
          <View style={{ width: CHEVRON }} />
          {view.columns.map((c, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={{ width: WIDTHS[i], ...nepaliTextStyle(11) }}
              className="text-caption px-2 py-2.5 font-semibold text-muted-foreground"
            >
              {c}
            </Text>
          ))}
        </TableHeader>

        {view.kutas.map((kuta, kutaIndex) => (
          <View key={kuta.id}>
            <TableRow rowIndex={kutaIndex} onPress={kuta.toggle} className="items-center">
              <View style={{ width: CHEVRON }} className="items-center">
                <Ionicons name={kuta.open ? "chevron-down" : "chevron-forward"} size={14} color={colors.mutedForeground} />
              </View>
              <Text style={{ width: WIDTHS[0], ...nepaliTextStyle(13) }} className={cn("text-body font-semibold text-foreground", cell)}>
                {kuta.label}
              </Text>
              <Text style={{ width: WIDTHS[1] }} className={cn("text-body text-center font-num text-foreground", cell)}>
                {kuta.max}
              </Text>
              <Text style={{ width: WIDTHS[2] }} className={cn("text-body text-center font-num font-semibold text-foreground", cell)}>
                {kuta.obtained}
              </Text>
              {[kuta.boyValue, kuta.girlValue, kuta.area].map((value, i) => (
                <Text
                  key={i}
                  numberOfLines={2}
                  style={{ width: WIDTHS[3 + i], ...nepaliTextStyle(12) }}
                  className={cn("text-caption", cell, i === 2 ? "text-muted-foreground" : "text-foreground")}
                >
                  {value}
                </Text>
              ))}
            </TableRow>
            {kuta.open ? (
              <View style={{ width: CHEVRON + WIDTHS.reduce((a, w) => a + w, 0) }}>
                <KutaDetailPanel detail={kuta.detail} />
              </View>
            ) : null}
          </View>
        ))}
        <Text className={m.tableFootnote} style={nepaliTextStyle(11)}>
          {view.footnote}
        </Text>
      </TableScrollShell>

      {/* notes */}
      <View className={m.card}>
        <Text className={cn(m.cardTitle, "mb-3")} style={nepaliTextStyle(14)}>
          {view.copy.notesTitle}
        </Text>
        <View className={m.notesList}>
          {view.notes.map((note) => (
            <Text key={note.slice(0, 40)} className={m.noteText} style={nepaliTextStyle(13)}>
              •  {note}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default KundaliMilanResult;
