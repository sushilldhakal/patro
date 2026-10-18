import { useState } from "react";
import type { ReportConfidence, ReportItem, ReportSection } from "@vedic-patro/api-client";
import { Trans } from "@vedic-patro/i18n/react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { REPORT_CONFIDENCE_LEVELS, useKundaliReport, useReportLabels, type ReportMetaCell } from "@vedic-patro/features/kundali";
import { Grid, Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { KundaliReportProps } from "../contract";
import { iconBookOpen, iconChevronDown, iconChevronUp, iconLoader, iconRotateCcw } from "../icons";

const r = kundaliDetailClasses.report;
const CONFIDENCE: Record<ReportConfidence, string> = {
  strong: cn(r.strongBox, r.strongText),
  moderate: cn(r.moderateBox, r.moderateText),
  mixed: cn(r.mixedBox, r.mixedText),
  tentative: r.tentativeBox,
};

function Badge({ level }: { level: ReportConfidence }) {
  const labels = useReportLabels();
  return <Text className={cn(r.badge, r.badgeText, CONFIDENCE[level])}>{labels.confidence(level)}</Text>;
}

function Factors({ factors }: { factors?: string[] }) {
  const labels = useReportLabels();
  const [open, setOpen] = useState(false);
  if (!factors || factors.length === 0) return null;
  return (
    <Box className={r.factorWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} className={cn(r.factorToggle, r.factorToggleText)}>
        <Icon node={open ? iconChevronUp : iconChevronDown} size={12} tone="muted" />
        <Text>{labels.factors(factors.length)}</Text>
      </Pressable>
      {open ? <Box className={r.factorList}>{factors.map((f, i) => <Text key={i} className={r.factorItem}>{f}</Text>)}</Box> : null}
    </Box>
  );
}

function ItemCard({ item }: { item: ReportItem }) {
  const labels = useReportLabels();
  return (
    <Box className={r.itemCard}>
      <Box className={r.itemHead} webClassName="flex"><Text className={r.itemLabel}>{labels.itemLabel(item)}</Text><Badge level={item.confidence} /></Box>
      <Text as="p" className={r.itemText}>{item.text}</Text>
      <Factors factors={item.factors} />
    </Box>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const head = useReportLabels().section(section);
  return (
    <Box className={cn(r.sectionCard, section.optional && "border-dashed")}>
      <Box className={r.sectionHead} webClassName="flex">
        <Text as="h3" className={r.sectionTitle}>{head.title}</Text>
        {head.titleEn ? <Text className={r.sectionTitleEn}>{head.titleEn}</Text> : null}
        {section.confidence ? <Badge level={section.confidence} /> : null}
      </Box>
      {section.body.map((p, i) => <Text key={i} as="p" className={r.sectionParagraph}>{p}</Text>)}
      {section.confidence ? <Factors factors={section.factors} /> : null}
      {section.items && section.items.length > 0 ? (
        <Grid cols={head.grid ? { base: 1, sm: 2, lg: 3 } : { base: 1, sm: 2 }} gap={10} className="mt-3">
          {section.items.map((it, i) => <ItemCard key={i} item={it} />)}
        </Grid>
      ) : null}
    </Box>
  );
}

function Meta({ cells }: { cells: ReportMetaCell[] }) {
  return (
    <Grid cols={{ base: 2, sm: 4 }} gap={8}>
      {cells.map((c) => (
        <Box key={c.label} className={r.metaCell}>
          <Text as="p" className={r.metaLabel}>{c.label}</Text>
          <Text as="p" className={r.metaValue}>{c.value}</Text>
          {c.sub ? <Text as="p" className={r.metaSub}>{c.sub}</Text> : null}
        </Box>
      ))}
    </Grid>
  );
}

export function KundaliReport({ moment, location, ayanamsha, disabled, renderShell }: KundaliReportProps) {
  const report = useKundaliReport({ moment, location, ayanamsha, disabled });
  return renderShell({
    title: report.copy.title,
    children: (
      <Box className="gap-4 p-4">
        <Text className={r.intro}>
          <Trans i18nKey={report.copy.introKey} components={{ 1: <Text className="text-base text-foreground" />, 2: <Text className="text-base text-foreground" /> }} />
        </Text>
        {report.showRegenerate ? (
          <Pressable onPress={report.regenerate} disabled={disabled} className={cn(r.statusPill, r.statusText)}>
            <Icon node={iconRotateCcw} size={16} tone="foreground" />
            <Text>{report.copy.regenerate}</Text>
          </Pressable>
        ) : null}
        {report.busyLabel ? <Text className={cn(r.statusPill, r.statusText)}><Icon node={iconLoader} size={16} tone="muted" webClassName="animate-spin" /> {report.busyLabel}</Text> : null}
        {report.showConfidenceLegend ? (
          <Box className={r.confidenceRow}>
            <Text className={r.confidenceLabel}>{report.copy.confidenceLabel}</Text>
            {REPORT_CONFIDENCE_LEVELS.map((lvl) => <Badge key={lvl} level={lvl} />)}
          </Box>
        ) : null}
        {report.error ? <Text className={cn(r.errorBox, r.errorText)}>{report.error}</Text> : null}
        {report.metaCells ? <Meta cells={report.metaCells} /> : null}
        {report.sections.map((s) => <SectionCard key={s.id} section={s} />)}
        {report.cacheNote ? <Text className={r.cacheNote}>{report.cacheNote}</Text> : null}
        {report.idleHint ? <Text className={cn(r.idleBox, r.idleText)}><Icon node={iconBookOpen} size={20} tone="muted" /> {report.idleHint}</Text> : null}
        {report.disclaimer ? <Text className={r.disclaimer}>{report.disclaimer}</Text> : null}
      </Box>
    ),
  });
}
