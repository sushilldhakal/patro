import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Trans } from "@vedic-patro/i18n/react";
import { Ionicons } from "@/components/icons/Ionicons";
import { KundaliSection } from "@/components/kundali/KundaliSections";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { LocationParams, ReportConfidence, ReportItem, ReportSection } from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import { REPORT_CONFIDENCE_LEVELS, useKundaliReport, useReportLabels, type ReportMetaCell } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

import { illustration } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const r = kundaliDetailClasses.report;

const CONFIDENCE_TONE: Record<ReportConfidence, { box: string; text?: string }> = {
  strong: { box: r.strongBox, text: r.strongText },
  moderate: { box: r.moderateBox, text: r.moderateText },
  mixed: { box: r.mixedBox, text: r.mixedText },
  tentative: { box: r.tentativeBox },
};

function ConfidenceBadge({ level }: { level: ReportConfidence }) {
  const labels = useReportLabels();
  return (
    <View className={cn(r.badge, CONFIDENCE_TONE[level].box)}>
      <Text className={cn(r.badgeText, CONFIDENCE_TONE[level].text)} style={nepaliTextStyle(11)}>
        {labels.confidence(level)}
      </Text>
    </View>
  );
}

function FactorList({ factors }: { factors?: string[] }) {
  const labels = useReportLabels();
  const [open, setOpen] = useState(false);
  if (!factors?.length) return null;
  return (
    <View className={r.factorWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} className={cn(r.factorToggle, "active:opacity-70")}>
        <Ionicons name="information-circle-outline" size={14} color={illustration.gray53} />
        <Text className={r.factorToggleText} style={nepaliTextStyle(12)}>
          {labels.factors(factors.length)}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={illustration.gray53} />
      </Pressable>
      {open ? (
        <View className={r.factorList}>
          {factors.map((f, i) => (
            <Text key={i} className={r.factorItem} style={nepaliTextStyle(12)}>
              {f}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ItemCard({ item }: { item: ReportItem }) {
  const labels = useReportLabels();
  return (
    <View className={r.itemCard}>
      <View className={r.itemHead}>
        <Text className={cn(r.itemLabel, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
          {labels.itemLabel(item)}
        </Text>
        <ConfidenceBadge level={item.confidence} />
      </View>
      <Text className={r.itemText} style={nepaliTextStyle(14)}>
        {item.text}
      </Text>
      <FactorList factors={item.factors} />
    </View>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const head = useReportLabels().section(section);
  const { width } = useBreakpoint();
  const itemCols = width >= BREAKPOINTS.md && head.grid ? 2 : 1;

  return (
    <Card className={cn(r.sectionCard, section.optional ? "border-dashed" : undefined)}>
      <View className={r.sectionHead}>
        <Text className={r.sectionTitle} style={nepaliTextStyle(16)}>
          {head.title}
        </Text>
        {head.titleEn ? (
          <Text className={r.sectionTitleEn} style={nepaliTextStyle(11)}>
            {head.titleEn}
          </Text>
        ) : null}
        {section.confidence ? (
          <View className="ml-auto">
            <ConfidenceBadge level={section.confidence} />
          </View>
        ) : null}
      </View>

      {section.body.length > 0 ? (
        <View className={r.sectionBody}>
          {section.body.map((p, i) => (
            <Text key={i} className={r.sectionParagraph} style={nepaliTextStyle(14)}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}

      {section.confidence ? <FactorList factors={section.factors} /> : null}

      {section.items && section.items.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2.5">
          {section.items.map((it, i) => (
            <View key={i} style={{ width: itemCols === 2 ? "48%" : "100%" }}>
              <ItemCard item={it} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function MetaStrip({ cells }: { cells: ReportMetaCell[] }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {cells.map((c) => (
        <View key={c.label} className={cn(r.metaCell, "min-w-[46%] flex-1")}>
          <Text className={r.metaLabel} style={nepaliTextStyle(10)}>
            {c.label}
          </Text>
          <Text className={r.metaValue} style={nepaliTextStyle(14)}>
            {c.value}
          </Text>
          {c.sub ? (
            <Text className={r.metaSub} style={nepaliTextStyle(11)}>
              {c.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function KundaliReport({
  moment,
  location,
  ayanamsha,
  disabled,
}: {
  moment: InstantQuery;
  location?: LocationParams;
  ayanamsha?: string;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const report = useKundaliReport({ moment, location, ayanamsha, disabled });

  return (
    <KundaliSection title={report.copy.title} icon="document-text-outline">
      <Text className={r.intro} style={nepaliTextStyle(14)}>
        <Trans
          i18nKey={report.copy.introKey}
          components={{
            1: <Text className="text-foreground" />,
            2: <Text className="text-foreground" />,
          }}
        />
      </Text>

      <View className="mt-4 flex-row flex-wrap items-center gap-2">
        {report.showRegenerate && (
          <Button label={report.copy.regenerate} variant="outline" size="sm" onPress={report.regenerate} disabled={disabled} />
        )}
        {report.busyLabel ? (
          <View className={r.statusPill}>
            <ActivityIndicator size="small" color={colors.secondary} />
            <Text className={r.statusText} style={nepaliTextStyle(13)}>
              {report.busyLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {report.showConfidenceLegend && (
        <View className={cn("mt-4", r.confidenceRow)}>
          <Text className={r.confidenceLabel} style={nepaliTextStyle(12)}>
            {report.copy.confidenceLabel}
          </Text>
          {REPORT_CONFIDENCE_LEVELS.map((lvl) => (
            <ConfidenceBadge key={lvl} level={lvl} />
          ))}
        </View>
      )}

      {report.error ? (
        <View className={cn("mt-4", r.errorBox)}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
          <Text className={cn(r.errorText, "flex-1")} style={nepaliTextStyle(14)}>
            {report.error}
          </Text>
        </View>
      ) : null}

      {report.metaCells ? (
        <View className="mt-4">
          <MetaStrip cells={report.metaCells} />
        </View>
      ) : null}

      {report.sections.length > 0 ? (
        <View className="mt-4 gap-3">
          {report.sections.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </View>
      ) : null}

      {report.cacheNote ? (
        <Text className={cn("mt-4", r.cacheNote)} style={nepaliTextStyle(12)}>
          {report.cacheNote}
        </Text>
      ) : null}

      {report.idleHint ? (
        <View className={cn("mt-4", r.idleBox)}>
          <Ionicons name="document-text-outline" size={22} color={colors.mutedForeground} />
          <Text className={cn(r.idleText, "flex-1")} style={nepaliTextStyle(14)}>
            {report.idleHint}
          </Text>
        </View>
      ) : null}

      {report.disclaimer ? (
        <Text className={cn("mt-4", r.disclaimer)} style={nepaliTextStyle(12)}>
          {report.disclaimer}
        </Text>
      ) : null}
    </KundaliSection>
  );
}
